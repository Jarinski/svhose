import { createClient } from '@sanity/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

if (!projectId) {
  console.error('Fehlt: NEXT_PUBLIC_SANITY_PROJECT_ID')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
})

const normalize = (v) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim()

const normKey = (v) => normalize(v).toLowerCase()

const MANUAL_TEAM_RESOLUTIONS = {
  'mannschaft.judo--kinder-anfanger-5-7-jahre': {
    trainerOrder: ['Nils Hausmann', 'Friedhelm Iske', 'Nils Aepler'],
    skipPersonContactAutoAssign: true,
  },
}

function splitTrainer(raw) {
  if (!raw) return []
  return raw
    .split(/[;,]/g)
    .map((p) => normalize(p))
    .filter(Boolean)
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

const [mannschaften, trainingszeiten] = await Promise.all([
  client.fetch(`*[_type == "mannschaft"]{_id, name}`),
  client.fetch(`
    *[_type == "trainingszeit" && defined(mannschaft._ref) && defined(trainer) && trainer != ""]{
      _id,
      tag,
      uhrzeit,
      gruppe,
      sparte,
      trainer,
      email,
      telefon,
      mannschaft->{_id, name}
    }
  `),
])

const personByKey = new Map()
const trainerVariants = new Map()
const teamState = new Map()
const sharedContacts = []
const personTeams = new Map()

for (const tz of trainingszeiten) {
  const team = tz.mannschaft
  if (!team?._id) continue
  const manualResolution = MANUAL_TEAM_RESOLUTIONS[team._id]

  const rawNames = splitTrainer(tz.trainer)
  if (rawNames.length === 0) continue

  const trainerKeysOrdered = rawNames.map((n) => normKey(n))

  for (let i = 0; i < rawNames.length; i++) {
    const displayName = rawNames[i]
    const key = trainerKeysOrdered[i]

    if (!trainerVariants.has(key)) trainerVariants.set(key, new Set())
    trainerVariants.get(key).add(displayName)

    if (!personByKey.has(key)) {
      personByKey.set(key, {
        key,
        name: displayName,
        rollen: ['Trainer'],
        emailCandidates: new Set(),
        telefonCandidates: new Set(),
        sourceTrainingszeiten: new Set(),
      })
    }

    const person = personByKey.get(key)
    person.sourceTrainingszeiten.add(tz._id)

    if (!personTeams.has(key)) personTeams.set(key, new Set())
    personTeams.get(key).add(team._id)
  }

  if (rawNames.length === 1 && !manualResolution?.skipPersonContactAutoAssign) {
    const onlyKey = trainerKeysOrdered[0]
    const person = personByKey.get(onlyKey)
    const email = normalize(tz.email)
    const telefon = normalize(tz.telefon)
    if (email) person.emailCandidates.add(email)
    if (telefon) person.telefonCandidates.add(telefon)
  } else {
    const email = normalize(tz.email)
    const telefon = normalize(tz.telefon)
    if (email || telefon) {
      sharedContacts.push({
        trainingszeitId: tz._id,
        mannschaftId: team._id,
        mannschaftName: team.name || null,
        trainer: rawNames,
        email: email || null,
        telefon: telefon || null,
        markierung: 'SHARED_CONTACT',
      })
    }
  }

  if (!teamState.has(team._id)) {
    teamState.set(team._id, {
      mannschaftId: team._id,
      mannschaftName: team.name || null,
      observedLists: [],
      uniqueSignatures: new Map(),
      conflict: false,
      proposedTrainerKeys: [],
    })
  }

  const state = teamState.get(team._id)
  const signature = trainerKeysOrdered.join(' | ')
  state.observedLists.push({
    trainingszeitId: tz._id,
    tag: normalize(tz.tag) || null,
    uhrzeit: normalize(tz.uhrzeit) || null,
    legacyGruppe: normalize(tz.gruppe) || null,
    legacySparte: normalize(tz.sparte) || null,
    trainerRaw: tz.trainer,
    trainerSplit: rawNames,
    signature,
  })
  if (!state.uniqueSignatures.has(signature)) {
    state.uniqueSignatures.set(signature, {
      signature,
      names: rawNames,
      count: 0,
      firstSeenTrainingszeitId: tz._id,
    })
  }
  state.uniqueSignatures.get(signature).count += 1
}

const teamProposals = []
const conflicts = []

for (const state of teamState.values()) {
  const variants = [...state.uniqueSignatures.values()].sort((a, b) => b.count - a.count)
  const winner = variants[0]
  const manualResolution = MANUAL_TEAM_RESOLUTIONS[state.mannschaftId]

  if (manualResolution?.trainerOrder?.length) {
    const manualKeys = manualResolution.trainerOrder.map((name) => normKey(name))
    state.proposedTrainerKeys = manualKeys
    state.conflict = false

    for (const manualName of manualResolution.trainerOrder) {
      const key = normKey(manualName)
      if (!trainerVariants.has(key)) trainerVariants.set(key, new Set())
      trainerVariants.get(key).add(manualName)
      if (!personByKey.has(key)) {
        personByKey.set(key, {
          key,
          name: manualName,
          rollen: ['Trainer'],
          emailCandidates: new Set(),
          telefonCandidates: new Set(),
          sourceTrainingszeiten: new Set(),
        })
      }
      if (!personTeams.has(key)) personTeams.set(key, new Set())
      personTeams.get(key).add(state.mannschaftId)
    }
  } else {
    state.proposedTrainerKeys = winner.signature ? winner.signature.split(' | ') : []
    state.conflict = variants.length > 1
  }

  teamProposals.push({
    mannschaftId: state.mannschaftId,
    mannschaftName: state.mannschaftName,
    trainer: state.proposedTrainerKeys.map((key, idx) => ({
      order: idx,
      personKey: key,
      personName: personByKey.get(key)?.name || key,
      isHauptkontakt: idx === 0,
    })),
    konflikt: state.conflict,
    observedListCount: variants.length,
    manuellAufgeloest: Boolean(manualResolution),
  })

  if (state.conflict && !manualResolution) {
    const affectedTrainingszeiten = state.observedLists.map((it) => ({
      trainingszeitId: it.trainingszeitId,
      tag: it.tag,
      uhrzeit: it.uhrzeit,
      legacyGruppe: it.legacyGruppe,
      legacySparte: it.legacySparte,
      trainerliste: it.trainerSplit,
    }))

    const recommendationReason =
      variants.length > 1
        ? `Häufigste Liste gewählt (${winner.count} von ${state.observedLists.length} Trainingszeiten).`
        : 'Einzige beobachtete Liste.'

    conflicts.push({
      mannschaftId: state.mannschaftId,
      mannschaftName: state.mannschaftName,
      sparte: affectedTrainingszeiten.find((t) => t.legacySparte)?.legacySparte || null,
      varianten: variants.map((v) => ({
        signature: v.signature,
        trainer: v.names,
        seenCount: v.count,
        firstSeenTrainingszeitId: v.firstSeenTrainingszeitId,
      })),
      betroffeneTrainingszeiten: affectedTrainingszeiten,
      empfehlung: {
        trainerliste: winner.names,
        reason: recommendationReason,
      },
      markierung: 'KONFLIKT',
    })
  }
}

const persons = [...personByKey.values()].map((p) => ({
  key: p.key,
  name: p.name,
  rollen: p.rollen,
  emailCandidates: [...p.emailCandidates],
  telefonCandidates: [...p.telefonCandidates],
  sourceCount: p.sourceTrainingszeiten.size,
  variants: [...(trainerVariants.get(p.key) || [])],
}))

const possibleNameDuplicates = []
for (let i = 0; i < persons.length; i++) {
  for (let j = i + 1; j < persons.length; j++) {
    const a = persons[i]
    const b = persons[j]
    const d = levenshtein(a.key, b.key)
    if (d > 0 && d <= 2) {
      possibleNameDuplicates.push({
        a: a.name,
        b: b.name,
        distance: d,
        aKey: a.key,
        bKey: b.key,
      })
    }
  }
}

const canonicalNameSuggestion = (a, b) => {
  const pair = [a, b].map((n) => normalize(n))
  if (pair.includes('Vincent Heitmann') && pair.includes('Vincent Heitman')) {
    return 'Vincent Heitmann'
  }

  const score = (name) => {
    let s = 0
    if (/nn\b/i.test(name)) s += 2
    if (/\b[A-ZÄÖÜ]/.test(name)) s += 1
    s += name.length * 0.01
    return s
  }

  return score(a) >= score(b) ? a : b
}

const duplicateCompact = possibleNameDuplicates.map((d) => {
  const aKey = normKey(d.a)
  const bKey = normKey(d.b)
  const teamIds = new Set([...(personTeams.get(aKey) || []), ...(personTeams.get(bKey) || [])])
  const teams = [...teamIds].map((id) => {
    const t = teamProposals.find((tp) => tp.mannschaftId === id)
    return { mannschaftId: id, mannschaftName: t?.mannschaftName || null }
  })

  return {
    varianteA: d.a,
    varianteB: d.b,
    betroffeneMannschaften: teams,
    kanonischVorschlag: canonicalNameSuggestion(d.a, d.b),
  }
})

const sharedCompactByTeamMap = new Map()
for (const entry of sharedContacts) {
  if (!sharedCompactByTeamMap.has(entry.mannschaftId)) {
    sharedCompactByTeamMap.set(entry.mannschaftId, {
      mannschaftId: entry.mannschaftId,
      mannschaftName: entry.mannschaftName,
      trainerlisten: new Map(),
      emails: new Set(),
      telefone: new Set(),
      hinweis: 'Kontakt wird nicht auf Personen übernommen, weil mehrere Trainer im Feld stehen.',
    })
  }
  const item = sharedCompactByTeamMap.get(entry.mannschaftId)
  item.trainerlisten.set(entry.trainer.join(' | '), entry.trainer)
  if (entry.email) item.emails.add(entry.email)
  if (entry.telefon) item.telefone.add(entry.telefon)
}

const sharedContactsCompact = [...sharedCompactByTeamMap.values()].map((it) => ({
  mannschaftId: it.mannschaftId,
  mannschaftName: it.mannschaftName,
  trainerlisten: [...it.trainerlisten.values()],
  legacyEmail: [...it.emails],
  legacyTelefon: [...it.telefone],
  hinweis: it.hinweis,
}))

const singleTrainerContactsCompact = persons
  .filter((p) => p.emailCandidates.length > 0 || p.telefonCandidates.length > 0)
  .map((p) => ({
    name: p.name,
    email: p.emailCandidates,
    telefon: p.telefonCandidates,
    mannschaften: [...(personTeams.get(p.key) || [])].map((teamId) => {
      const t = teamProposals.find((tp) => tp.mannschaftId === teamId)
      return { mannschaftId: teamId, mannschaftName: t?.mannschaftName || null }
    }),
  }))

const report = {
  mode: 'READ_ONLY_DRY_RUN',
  guard: {
    noWriteOps: true,
    usedCreatePatchCommit: false,
    usedApplyFlag: false,
  },
  source: {
    mannschaftenTotal: mannschaften.length,
    trainingszeitenLinkedWithTrainer: trainingszeiten.length,
  },
  summary: {
    personDocsWouldBeCreated: persons.length,
    mannschaftenWouldGetTrainerRefs: teamProposals.length,
    konfliktCount: conflicts.length,
    possibleNameDuplicateCount: possibleNameDuplicates.length,
    sharedContactCount: sharedContacts.length,
    sharedContactMannschaftenCount: sharedContactsCompact.length,
    singleTrainerKontaktCount: singleTrainerContactsCompact.length,
  },
  compactDecisionView: {
    konflikte: conflicts,
    namensdubletten: duplicateCompact,
    sharedContactsGruppiert: sharedContactsCompact,
    singleTrainerKontakte: singleTrainerContactsCompact,
    summary: {
      personenWuerdenErzeugt: persons.length,
      mannschaftenWuerdenTrainerBekommen: teamProposals.length,
      konflikte: conflicts.length,
      dubletten: duplicateCompact.length,
      sharedContactMannschaften: sharedContactsCompact.length,
      eindeutigeSingleTrainerKontakte: singleTrainerContactsCompact.length,
    },
  },
  possibleNameDuplicates,
  sharedContacts,
  conflicts,
  byMannschaft: teamProposals,
  sampleByMannschaft: teamProposals.slice(0, 12),
}

console.log(JSON.stringify(report, null, 2))
