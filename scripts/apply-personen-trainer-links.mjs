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

const isApply = process.argv.includes('--apply')

const normalize = (v) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeName = (name) => {
  const n = normalize(name)
  if (!n) return ''
  if (n.toLowerCase() === 'vincent heitman') return 'Vincent Heitmann'
  return n
}

const normKey = (v) => normalizeName(v).toLowerCase()
const splitTrainer = (raw) => (raw || '').split(/[;,]/g).map((p) => normalizeName(p)).filter(Boolean)
const slugify = (v) => normKey(v).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const trainerKey = (id) => `trainer-${slugify(String(id || '').replace(/^person\./, ''))}`

const MANUAL_TEAM_RESOLUTIONS = {
  'mannschaft.judo--kinder-anfanger-5-7-jahre': {
    trainerOrder: ['Nils Hausmann', 'Friedhelm Iske', 'Nils Aepler'],
    skipPersonContactAutoAssign: true,
  },
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

const [mannschaften, trainingszeiten, existingPersons] = await Promise.all([
  client.fetch(`*[_type=="mannschaft"]{_id,name}`),
  client.fetch(`*[_type=="trainingszeit" && defined(mannschaft._ref) && defined(trainer) && trainer!=""]{_id,trainer,email,telefon,mannschaft}`),
  client.fetch(`*[_type=="person"]{_id,name,email,telefon}`),
])

const teamById = new Map(mannschaften.map((m) => [m._id, m]))
const personByKey = new Map()
const personTeams = new Map()
const teamState = new Map()
const sharedContacts = []
const warnings = []

for (const ep of existingPersons) {
  const key = normKey(ep.name)
  if (!key) continue
  if (!personByKey.has(key)) {
    personByKey.set(key, {
      key,
      name: normalizeName(ep.name),
      existing: ep,
      emailCandidates: new Set(),
      telefonCandidates: new Set(),
      sourceTrainingszeiten: new Set(),
    })
  }
}

for (const tz of trainingszeiten) {
  const teamId = tz.mannschaft?._ref
  if (!teamId) {
    warnings.push({ type: 'MISSING_MANNSCHAFT_REF', trainingszeitId: tz._id })
    continue
  }
  const team = teamById.get(teamId)
  if (!team) {
    warnings.push({ type: 'MANNSCHAFT_NOT_FOUND', trainingszeitId: tz._id, mannschaftId: teamId })
    continue
  }

  const manualResolution = MANUAL_TEAM_RESOLUTIONS[teamId]
  const trainerNames = splitTrainer(tz.trainer)
  if (trainerNames.length === 0) continue
  const trainerKeys = trainerNames.map((n) => normKey(n))

  if (!teamState.has(teamId)) {
    teamState.set(teamId, {
      mannschaftId: teamId,
      mannschaftName: team.name,
      uniqueSignatures: new Map(),
      proposedTrainerKeys: [],
      conflict: false,
    })
  }
  const state = teamState.get(teamId)
  const signature = trainerKeys.join(' | ')
  if (!state.uniqueSignatures.has(signature)) {
    state.uniqueSignatures.set(signature, { trainerNames, count: 0 })
  }
  state.uniqueSignatures.get(signature).count += 1

  trainerNames.forEach((name, idx) => {
    const key = trainerKeys[idx]
    if (!personByKey.has(key)) {
      personByKey.set(key, {
        key,
        name,
        existing: null,
        emailCandidates: new Set(),
        telefonCandidates: new Set(),
        sourceTrainingszeiten: new Set(),
      })
    }
    const person = personByKey.get(key)
    person.sourceTrainingszeiten.add(tz._id)
    if (!personTeams.has(key)) personTeams.set(key, new Set())
    personTeams.get(key).add(teamId)
  })

  const email = normalize(tz.email)
  const telefon = normalize(tz.telefon)
  if (trainerNames.length === 1 && !manualResolution?.skipPersonContactAutoAssign) {
    const only = personByKey.get(trainerKeys[0])
    if (email) only.emailCandidates.add(email)
    if (telefon) only.telefonCandidates.add(telefon)
  } else if (email || telefon) {
    sharedContacts.push({ trainingszeitId: tz._id, mannschaftId: teamId, email: email || null, telefon: telefon || null })
  }
}

for (const state of teamState.values()) {
  const manual = MANUAL_TEAM_RESOLUTIONS[state.mannschaftId]
  if (manual?.trainerOrder?.length) {
    state.proposedTrainerKeys = manual.trainerOrder.map((n) => normKey(n))
    state.conflict = false
    for (const n of manual.trainerOrder) {
      const k = normKey(n)
      if (!personByKey.has(k)) {
        personByKey.set(k, { key: k, name: n, existing: null, emailCandidates: new Set(), telefonCandidates: new Set(), sourceTrainingszeiten: new Set() })
      }
      if (!personTeams.has(k)) personTeams.set(k, new Set())
      personTeams.get(k).add(state.mannschaftId)
    }
  } else {
    const variants = [...state.uniqueSignatures.entries()].sort((a, b) => b[1].count - a[1].count)
    state.proposedTrainerKeys = variants[0]?.[0] ? variants[0][0].split(' | ') : []
    state.conflict = variants.length > 1
  }
}

const persons = [...personByKey.values()]
const possibleNameDuplicates = []
for (let i = 0; i < persons.length; i++) {
  for (let j = i + 1; j < persons.length; j++) {
    const a = persons[i]
    const b = persons[j]
    const d = levenshtein(a.key, b.key)
    if (d > 0 && d <= 2) {
      possibleNameDuplicates.push({ a: a.name, b: b.name, distance: d })
    }
  }
}

const unresolvedDuplicates = possibleNameDuplicates.filter(
  (d) => !(normKey(d.a) === 'vincent heitmann' && normKey(d.b) === 'vincent heitmann'),
)
const conflicts = [...teamState.values()].filter((t) => t.conflict)

if (isApply) {
  if (conflicts.length > 0 || unresolvedDuplicates.length > 0 || warnings.length > 0) {
    console.error(
      JSON.stringify(
        {
          error: 'APPLY_ABORTED_PRECHECK_FAILED',
          checks: {
            konfliktCount: conflicts.length,
            unresolvedNameDuplicateCount: unresolvedDuplicates.length,
            warningsCount: warnings.length,
          },
          warnings,
          unresolvedDuplicates,
        },
        null,
        2,
      ),
    )
    process.exit(2)
  }
}

const existingById = new Map(existingPersons.map((p) => [p._id, p]))
const personCreateOps = []
const personContactPatchOps = []

for (const p of persons) {
  if (!p.existing) {
    const pid = `person.${slugify(p.name)}`
    personCreateOps.push({ _id: pid, _type: 'person', name: p.name, rollen: ['Trainer'] })
    p.targetPersonId = pid
  } else {
    p.targetPersonId = p.existing._id
  }

  const existing = p.existing || existingById.get(p.targetPersonId)
  const emailCandidates = [...p.emailCandidates]
  const telefonCandidates = [...p.telefonCandidates]
  const canSetEmail = emailCandidates.length === 1 && !normalize(existing?.email)
  const canSetTelefon = telefonCandidates.length === 1 && !normalize(existing?.telefon)
  if (canSetEmail || canSetTelefon) {
    personContactPatchOps.push({
      personId: p.targetPersonId,
      set: {
        ...(canSetEmail ? { email: emailCandidates[0] } : {}),
        ...(canSetTelefon ? { telefon: telefonCandidates[0] } : {}),
      },
    })
  }
}

const teamPatchOps = []
for (const t of teamState.values()) {
  const refs = t.proposedTrainerKeys
    .map((k) => personByKey.get(k)?.targetPersonId)
    .filter(Boolean)
    .map((id) => ({ _type: 'reference', _ref: id, _key: trainerKey(id) }))
  teamPatchOps.push({ mannschaftId: t.mannschaftId, trainer: refs })
}

if (isApply) {
  for (const doc of personCreateOps) await client.createIfNotExists(doc)
  for (const patch of personContactPatchOps) await client.patch(patch.personId).set(patch.set).commit()
  for (const patch of teamPatchOps) await client.patch(patch.mannschaftId).set({ trainer: patch.trainer }).commit()
}

const report = {
  mode: isApply ? 'APPLY' : 'DRY_RUN',
  guard: {
    writeOnlyWithApplyFlag: true,
    applyFlagActive: isApply,
  },
  counts: {
    personsProposed: persons.length,
    personsExisting: persons.filter((p) => p.existing).length,
    personsCreated: isApply ? personCreateOps.length : 0,
    personsUpdatedWithContact: isApply ? personContactPatchOps.length : 0,
    mannschaftenProposedForTrainerRefs: teamPatchOps.length,
    mannschaftenPatched: isApply ? teamPatchOps.length : 0,
    skipped: isApply ? 0 : personCreateOps.length + personContactPatchOps.length + teamPatchOps.length,
    sharedContactsNichtUebernommen: sharedContacts.length,
    konfliktCount: conflicts.length,
    unresolvedNameDuplicateCount: unresolvedDuplicates.length,
    warnings: warnings.length,
  },
  checks: {
    konfliktCount: conflicts.length,
    unresolvedNameDuplicateCount: unresolvedDuplicates.length,
    missingMannschaftRefCount: warnings.filter((w) => w.type === 'MISSING_MANNSCHAFT_REF').length,
    missingMannschaftCount: warnings.filter((w) => w.type === 'MANNSCHAFT_NOT_FOUND').length,
  },
  canonical: {
    vincentHeitmanMappedTo: 'Vincent Heitmann',
  },
  sample: {
    createPersons: personCreateOps.slice(0, 20),
    updatePersonsContact: personContactPatchOps.slice(0, 20),
    patchMannschaften: teamPatchOps.slice(0, 20),
    warnings: warnings.slice(0, 20),
  },
}

console.log(JSON.stringify(report, null, 2))
