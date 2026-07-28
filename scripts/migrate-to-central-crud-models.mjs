import { createClient } from '@sanity/client'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const isApply = process.argv.includes('--apply')
const isVerbose = process.argv.includes('--verbose')
const isJson = process.argv.includes('--json')
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const apiVersion = '2024-01-01'
const readToken = process.env.SANITY_API_READ_TOKEN
const writeToken = process.env.SANITY_API_WRITE_TOKEN
const tokenUsed = isApply ? 'write' : readToken ? 'read' : 'none'

if (!projectId) {
  console.error('Fehlt: NEXT_PUBLIC_SANITY_PROJECT_ID')
  process.exit(1)
}

if (isApply && !writeToken) {
  console.error('APPLY_ABORTED_MISSING_TOKEN: Für --apply muss SANITY_API_WRITE_TOKEN in process.env gesetzt sein.')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  ...(isApply ? { token: writeToken } : readToken ? { token: readToken } : {}),
})

const sanityClientConfigInfo = {
  projectId,
  dataset,
  apiVersion,
  mode: isApply ? 'APPLY' : 'DRY_RUN',
  hasReadToken: Boolean(readToken),
  hasWriteToken: Boolean(writeToken),
  tokenUsed,
}

const normalize = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim()

const normKey = (value) => normalize(value).toLowerCase()
const slugify = (value) => normKey(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unbenannt'
const unique = (items) => [...new Set(items.filter(Boolean))]
const ref = (id) => ({ _type: 'reference', _ref: id })
const refKey = (id, index = 0) => `${slugify(id)}-${index}`.slice(0, 96)
const teamSemanticKey = (sparteName, teamName) => `${normKey(sparteName)}::${normKey(teamName)}`
const teamPlanId = (sparteName, teamName) => `mannschaft.${slugify(sparteName)}--${slugify(teamName)}`

const SPARTE_ALIASES = {
  'fussball damen': 'Fußball',
  'fußball damen': 'Fußball',
  'fussball herren': 'Fußball',
  'fußball herren': 'Fußball',
  'fussball junioren': 'Fußball',
  'fußball junioren': 'Fußball',
  'fussball juniorinnen': 'Fußball',
  'fußball juniorinnen': 'Fußball',
  'fussball freizeit': 'Fußball',
  'fußball freizeit': 'Fußball',
  fussball: 'Fußball',
  'nordic walking': 'Nordic-Walking',
}

const BEREICHE = ['Junioren', 'Juniorinnen', 'Herren', 'Damen', 'Senioren', 'Freizeit']

const BEREICH_RULES = [
  ['Juniorinnen', [/juniorinnen/i, /mädchen/i, /maedchen/i, /girls/i]],
  ['Junioren', [/junior/i, /jugend/i, /\bjg\.?\b/i, /\bu0?7\b|\bu0?8\b|\bu0?9\b|\bu10\b|\bu11\b|\bu12\b|\bu13\b|\bu14\b|\bu15\b|\bu16\b|\bu17\b|\bu18\b/i, /minikicker/i, /kinder/i, /anfänger/i, /anfaenger/i]],
  ['Damen', [/damen/i, /frauen/i]],
  ['Herren', [/herren/i]],
  ['Senioren', [/senior/i]],
  ['Freizeit', [/hobby/i, /freizeit/i, /jedermann/i, /walking/i, /fit am nachmittag/i, /just4fun/i, /hoseunited/i, /friends/i, /sportakrobatik/i]],
]

function resolveSparteName(rawSparte = '') {
  const legacy = normalize(rawSparte)
  return SPARTE_ALIASES[normKey(legacy)] || legacy
}

function inferBereich({ explicit, name = '', sparte = '', jahrgangText = '' }) {
  const normalizedExplicit = normalize(explicit)
  if (BEREICHE.includes(normalizedExplicit)) return normalizedExplicit

  const haystack = `${normalize(name)} ${normalize(sparte)} ${normalize(jahrgangText)}`
  for (const [bereich, rules] of BEREICH_RULES) {
    if (rules.some((rule) => rule.test(haystack))) return bereich
  }
  return 'Freizeit'
}

function splitNames(raw) {
  if (!raw) return []
  return raw
    .split(/(?:,|;|\/|\bund\b|\+|&)/gi)
    .map((part) => normalize(part))
    .filter(Boolean)
}

function isReference(value) {
  return value?._type === 'reference' && Boolean(value._ref)
}

function imageRef(image) {
  if (image?.asset?._ref) return image
  return undefined
}

function getContactFromObject(value, defaultRole = 'Ansprechpartner') {
  if (!value || isReference(value)) return null
  const name = normalize(value.name || value.titel)
  if (!name) return null
  return {
    name,
    rollen: unique([normalize(value.rolle || value.funktion || defaultRole)]),
    email: normalize(value.email),
    telefon: normalize(value.telefon),
    whatsapp: normalize(value.whatsapp),
    foto: imageRef(value.foto),
    source: value,
  }
}

function mergePersonCandidate(target, candidate) {
  target.name ||= candidate.name
  for (const role of candidate.rollen || []) target.rollen.add(role)
  if (candidate.email) target.emails.add(candidate.email)
  if (candidate.telefon) target.telefone.add(candidate.telefon)
  if (candidate.whatsapp) target.whatsapps.add(candidate.whatsapp)
  if (!target.foto && candidate.foto) target.foto = candidate.foto
  target.sources.add(candidate.sourceType || 'unknown')
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

function tokenSet(value) {
  return new Set(normKey(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 2))
}

function jaccard(a, b) {
  const aTokens = tokenSet(a)
  const bTokens = tokenSet(b)
  if (aTokens.size === 0 && bTokens.size === 0) return 1
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length
  const union = new Set([...aTokens, ...bTokens]).size
  return union === 0 ? 0 : intersection / union
}

function similarityScore(a, b) {
  const aKey = normKey(a)
  const bKey = normKey(b)
  if (!aKey && !bKey) return 100
  if (!aKey || !bKey) return 0
  if (aKey === bKey) return 100
  if (aKey.includes(bKey) || bKey.includes(aKey)) return 88

  const maxLength = Math.max(aKey.length, bKey.length)
  const distanceScore = maxLength === 0 ? 0 : Math.max(0, 1 - levenshtein(aKey, bKey) / maxLength)
  const tokenScore = jaccard(aKey, bKey)
  return Math.round((distanceScore * 0.6 + tokenScore * 0.4) * 100)
}

function scoreCandidateForTrainingszeit({ sparteName, gruppeName, candidate }) {
  const sparteScore = similarityScore(sparteName, candidate.sparteName)
  const gruppeScore = similarityScore(gruppeName, candidate.name)
  const score = Math.round(sparteScore * 0.35 + gruppeScore * 0.65)
  const reasons = []
  if (sparteScore === 100) reasons.push('Sparte exakt')
  else if (sparteScore >= 70) reasons.push(`Sparte ähnlich (${sparteScore})`)
  if (gruppeScore === 100) reasons.push('Gruppe exakt')
  else if (gruppeScore >= 55) reasons.push(`Gruppenname ähnlich (${gruppeScore})`)
  if (normKey(sparteName) === normKey(candidate.sparteName) && gruppeScore < 100 && gruppeScore >= 55) reasons.push('gleiche Sparte, abweichender Gruppenname')
  if (normKey(gruppeName) === normKey(candidate.name) && sparteScore < 100 && sparteScore >= 55) reasons.push('gleicher Gruppenname, abweichende Sparte')

  return {
    mannschaftId: candidate.targetMannschaftId,
    mannschaftName: candidate.name,
    sparte: candidate.sparteName,
    normalizedKey: `${normKey(candidate.sparteName)}::${normKey(candidate.name)}`,
    matchScore: score,
    sparteScore,
    gruppeScore,
    reason: reasons.join('; ') || 'niedrige Ähnlichkeit, nur als Diagnosekandidat gelistet',
  }
}

const [sparten, existingMannschaften, existingPersons, trainingszeiten, globaleAnsprechpartner] = await Promise.all([
  client.fetch(`*[_type == "sparte"]{_id, name, slug, mannschaften, ansprechpartner}`),
  client.fetch(`*[_type == "mannschaft"]{_id, name, bereich, sparte, trainer, jahrgang, beschreibung, foto, reihenfolge}`),
  client.fetch(`*[_type == "person"]{_id, name, rollen, email, telefon, whatsapp, foto}`),
  client.fetch(`*[_type == "trainingszeit"]{_id, sparte, gruppe, tag, uhrzeit, trainer, email, telefon, mannschaft}`),
  client.fetch(`*[_type == "ansprechpartner"]{_id, name, funktion, email, telefon, foto, person, gruppe, sparte}`),
])

const sparteById = new Map(sparten.map((sparte) => [sparte._id, sparte]))
const existingMannschaftById = new Map(existingMannschaften.map((team) => [team._id, team]))
const existingMannschaftIds = new Set(existingMannschaften.map((team) => team._id))
const existingPersonById = new Map(existingPersons.map((person) => [person._id, person]))

const existingPersonsByName = new Map()
for (const person of existingPersons) {
  const key = normKey(person.name)
  if (!key) continue
  if (!existingPersonsByName.has(key)) existingPersonsByName.set(key, [])
  existingPersonsByName.get(key).push(person)
}

const personCandidates = new Map()
const getPersonCandidate = (name) => {
  const key = normKey(name)
  if (!key) return null
  if (!personCandidates.has(key)) {
    personCandidates.set(key, {
      key,
      name: normalize(name),
      rollen: new Set(),
      emails: new Set(),
      telefone: new Set(),
      whatsapps: new Set(),
      sources: new Set(),
      foto: undefined,
      targetPersonId: undefined,
      existingMatches: existingPersonsByName.get(key) || [],
    })
  }
  return personCandidates.get(key)
}

const embeddedTeamPlans = []
const trainerRefsByTeamPlanId = new Map()
const globalAnsprechpartnerPersonLinkPatches = []
const sparteAnsprechpartnerReferenceSources = []
let embeddedMannschaftenCount = 0

for (const sparte of sparten) {
  const embeddedTeams = Array.isArray(sparte.mannschaften) ? sparte.mannschaften : []
  embeddedMannschaftenCount += embeddedTeams.length

  embeddedTeams.forEach((team, index) => {
    const name = normalize(team?.name)
    if (!name) return

    const planId = teamPlanId(sparte.name, name)
    const trainerSourceRefs = []
    const trainerItems = Array.isArray(team.trainer) ? team.trainer : []

    for (const trainer of trainerItems) {
      if (isReference(trainer)) {
        trainerSourceRefs.push(trainer._ref)
        continue
      }
      const contact = getContactFromObject(trainer, 'Trainer')
      if (!contact) continue
      const candidate = getPersonCandidate(contact.name)
      mergePersonCandidate(candidate, { ...contact, sourceType: 'sparte.mannschaften[].trainer' })
      trainerSourceRefs.push({ personKey: candidate.key })
    }

    embeddedTeamPlans.push({
      _id: planId,
      _type: 'mannschaft',
      name,
      bereich: inferBereich({ explicit: team.bereich, name, sparte: sparte.name, jahrgangText: team.jahrgangText }),
      sparteId: sparte._id,
      sparteName: sparte.name,
      jahrgangText: normalize(team.jahrgangText),
      beschreibung: normalize(team.beschreibung),
      foto: imageRef(team.foto),
      reihenfolge: typeof team.reihenfolge === 'number' ? team.reihenfolge : index,
      source: 'sparte.mannschaften',
      embeddedKey: team._key || null,
    })
    trainerRefsByTeamPlanId.set(planId, trainerSourceRefs)
  })

  for (const item of Array.isArray(sparte.ansprechpartner) ? sparte.ansprechpartner : []) {
    if (isReference(item)) {
      sparteAnsprechpartnerReferenceSources.push({ sparteId: sparte._id, personId: item._ref })
      continue
    }
    const contact = getContactFromObject(item, 'Ansprechpartner')
    if (!contact) continue
    const candidate = getPersonCandidate(contact.name)
    mergePersonCandidate(candidate, { ...contact, sourceType: 'sparte.ansprechpartner[]' })
  }
}

for (const item of globaleAnsprechpartner) {
  if (item.person?._ref) {
    const existing = existingPersonById.get(item.person._ref)
    if (existing?.name) {
      const candidate = getPersonCandidate(existing.name)
      candidate.targetPersonId = existing._id
      mergePersonCandidate(candidate, { name: existing.name, rollen: ['Ansprechpartner'], sourceType: 'ansprechpartner.person' })
    }
    continue
  }

  const contact = getContactFromObject(item, item.funktion || 'Ansprechpartner')
  if (!contact) continue
  const candidate = getPersonCandidate(contact.name)
  mergePersonCandidate(candidate, { ...contact, sourceType: 'ansprechpartner' })
}

const teamPlanByKey = new Map()
const plannedTeamIds = new Set()
function addTeamPlanToIndex(plan) {
  const key = teamSemanticKey(plan.sparteName, plan.name)
  if (!teamPlanByKey.has(key)) teamPlanByKey.set(key, [])
  teamPlanByKey.get(key).push(plan)
  plannedTeamIds.add(plan._id)
}

for (const plan of embeddedTeamPlans) {
  addTeamPlanToIndex(plan)
}

const existingTeamsBySparteName = new Map()
for (const team of existingMannschaften) {
  const sparteName = sparteById.get(team.sparte?._ref)?.name
  if (!sparteName || !team.name) continue
  const key = teamSemanticKey(sparteName, team.name)
  if (!existingTeamsBySparteName.has(key)) existingTeamsBySparteName.set(key, [])
  existingTeamsBySparteName.get(key).push(team)
}

for (const plan of embeddedTeamPlans) {
  const key = teamSemanticKey(plan.sparteName, plan.name)
  const existingBySemanticKey = existingTeamsBySparteName.get(key) || []
  if (existingBySemanticKey.length === 1) plan.targetMannschaftId = existingBySemanticKey[0]._id
  else plan.targetMannschaftId = plan._id
}

const trainingszeitGroupPlans = []
const trainingszeitGroupPlanKeys = new Set()
const trainingszeitGroupDuplicateCandidates = []
const existingAndEmbeddedTeamIds = new Set([
  ...existingMannschaftIds,
  ...embeddedTeamPlans.map((plan) => plan.targetMannschaftId),
])

for (const tz of trainingszeiten) {
  const sparteName = resolveSparteName(tz.sparte)
  const gruppeName = normalize(tz.gruppe)
  if (!sparteName || !gruppeName) continue

  const key = teamSemanticKey(sparteName, gruppeName)
  const alreadyPlannedExact = (teamPlanByKey.get(key) || []).length > 0
  if (alreadyPlannedExact) {
    trainingszeitGroupDuplicateCandidates.push({
      type: 'SPARTE_MANNSCHAFTEN_TRAININGSZEIT_GRUPPE_EXACT_DUPLICATE',
      sparte: sparteName,
      name: gruppeName,
      normalizedKey: key,
      trainingszeitId: tz._id,
      plannedSources: (teamPlanByKey.get(key) || []).map((plan) => ({ _id: plan._id, source: plan.source })),
    })
    continue
  }

  if (trainingszeitGroupPlanKeys.has(key)) continue

  const currentRef = tz.mannschaft?._ref
  const hasBrokenRef = Boolean(currentRef && !existingAndEmbeddedTeamIds.has(currentRef))
  const existingExactIds = (existingTeamsBySparteName.get(key) || []).map((team) => team._id)
  const uniquelyMatchesExistingOrPlanned = unique(existingExactIds).length === 1
  if (!hasBrokenRef && uniquelyMatchesExistingOrPlanned) continue

  const baseId = teamPlanId(sparteName, gruppeName)
  let id = baseId
  let dedupeIndex = 2
  while (plannedTeamIds.has(id) || existingMannschaftIds.has(id)) {
    id = `${baseId}-${dedupeIndex}`
    dedupeIndex += 1
  }

  const plan = {
    _id: id,
    _type: 'mannschaft',
    name: gruppeName,
    bereich: inferBereich({ name: gruppeName, sparte: sparteName }),
    sparteId: sparten.find((sparte) => normKey(sparte.name) === normKey(sparteName))?._id || null,
    sparteName,
    jahrgangText: '',
    beschreibung: '',
    foto: undefined,
    reihenfolge: embeddedMannschaftenCount + trainingszeitGroupPlans.length,
    source: 'trainingszeit.gruppe',
    embeddedKey: null,
    targetMannschaftId: id,
    trainingszeitSourceIds: [tz._id],
    creationReason: hasBrokenRef ? 'Aktuelle mannschaft-Referenz ist kaputt' : 'Keine eindeutige bestehende/geplante Mannschaft für sparte + gruppe',
  }

  trainingszeitGroupPlans.push(plan)
  trainingszeitGroupPlanKeys.add(key)
  addTeamPlanToIndex(plan)
  trainerRefsByTeamPlanId.set(id, [])
}

for (const tz of trainingszeiten) {
  const sparteName = resolveSparteName(tz.sparte)
  const gruppeName = normalize(tz.gruppe)
  const plan = trainingszeitGroupPlans.find((candidate) => teamSemanticKey(candidate.sparteName, candidate.name) === teamSemanticKey(sparteName, gruppeName))
  if (plan && !plan.trainingszeitSourceIds.includes(tz._id)) plan.trainingszeitSourceIds.push(tz._id)
}

const allTeamPlans = [...embeddedTeamPlans, ...trainingszeitGroupPlans]

for (const tz of trainingszeiten) {
  const trainerNames = splitNames(tz.trainer)
  if (trainerNames.length !== 1) continue
  const sparteName = resolveSparteName(tz.sparte)
  const gruppeName = normalize(tz.gruppe)
  if (!sparteName || !gruppeName) continue
  const matchKey = teamSemanticKey(sparteName, gruppeName)
  const plans = teamPlanByKey.get(matchKey) || []
  const existing = existingTeamsBySparteName.get(matchKey) || []
  const uniqueTargetIds = unique([...plans.map((plan) => plan.targetMannschaftId), ...existing.map((team) => team._id)])
  if (uniqueTargetIds.length !== 1) continue

  const candidate = getPersonCandidate(trainerNames[0])
  mergePersonCandidate(candidate, {
    name: trainerNames[0],
    rollen: ['Trainer'],
    email: normalize(tz.email),
    telefon: normalize(tz.telefon),
    sourceType: 'trainingszeit.trainer/eindeutig',
  })
}

for (const candidate of personCandidates.values()) {
  if (candidate.targetPersonId) continue
  if (candidate.existingMatches.length === 1) candidate.targetPersonId = candidate.existingMatches[0]._id
  else candidate.targetPersonId = `person.${slugify(candidate.name)}`
}

const personCreateOps = []
const personDuplicateCandidates = []
const persons = [...personCandidates.values()]

for (const person of persons) {
  if (person.existingMatches.length > 1) {
    personDuplicateCandidates.push({ type: 'EXISTING_PERSON_NAME_DUPLICATE', name: person.name, matches: person.existingMatches.map((p) => ({ _id: p._id, name: p.name })) })
    continue
  }
  if (person.existingMatches.length === 0) {
    const emails = [...person.emails]
    const telefone = [...person.telefone]
    const whatsapps = [...person.whatsapps]
    personCreateOps.push({
      _id: person.targetPersonId,
      _type: 'person',
      name: person.name,
      rollen: unique([...person.rollen]),
      ...(emails.length === 1 ? { email: emails[0] } : {}),
      ...(telefone.length === 1 ? { telefon: telefone[0] } : {}),
      ...(whatsapps.length === 1 ? { whatsapp: whatsapps[0] } : {}),
      ...(person.foto ? { foto: person.foto } : {}),
    })
  }
}

for (let i = 0; i < persons.length; i++) {
  for (let j = i + 1; j < persons.length; j++) {
    const distance = levenshtein(persons[i].key, persons[j].key)
    if (distance > 0 && distance <= 2) {
      personDuplicateCandidates.push({ type: 'POSSIBLE_PERSON_NAME_VARIANT', a: persons[i].name, b: persons[j].name, distance })
    }
  }
}

const mannschaftCreateOps = []
const mannschaftPatchOps = []
const mannschaftDuplicateCandidates = []
const plannedCentralMannschaften = []

for (const plan of allTeamPlans) {
  const key = teamSemanticKey(plan.sparteName, plan.name)
  const sameKeyPlans = teamPlanByKey.get(key) || []
  if (sameKeyPlans.length > 1) {
    mannschaftDuplicateCandidates.push({
      type: sameKeyPlans.some((samePlan) => samePlan.source === 'trainingszeit.gruppe') ? 'MANNSCHAFT_TRAININGSGRUPPE_DUPLICATE' : 'EMBEDDED_MANNSCHAFT_DUPLICATE',
      sparte: plan.sparteName,
      name: plan.name,
      normalizedKey: key,
      count: sameKeyPlans.length,
      sources: unique(sameKeyPlans.map((samePlan) => samePlan.source)),
    })
  }

  const targetId = plan.targetMannschaftId
  const existingDoc = existingMannschaftById.get(targetId)
  const trainerRefs = (trainerRefsByTeamPlanId.get(plan._id) || [])
    .map((item, index) => {
      const id = typeof item === 'string' ? item : personCandidates.get(item.personKey)?.targetPersonId
      return id ? { ...ref(id), _key: refKey(id, index) } : null
    })
    .filter(Boolean)

  plannedCentralMannschaften.push({ ...plan, targetMannschaftId: targetId, trainerRefs })

  if (!existingDoc) {
    if (!plan.sparteId) {
      mannschaftDuplicateCandidates.push({
        type: 'TRAININGSGRUPPE_OHNE_AUFLOESBARE_SPARTE',
        sparte: plan.sparteName,
        name: plan.name,
        source: plan.source,
        targetMannschaftId: targetId,
      })
      continue
    }

    mannschaftCreateOps.push({
      _id: targetId,
      _type: 'mannschaft',
      name: plan.name,
      bereich: plan.bereich,
      sparte: ref(plan.sparteId),
      ...(plan.beschreibung ? { beschreibung: plan.beschreibung } : {}),
      ...(plan.foto ? { foto: plan.foto } : {}),
      reihenfolge: plan.reihenfolge,
      ...(trainerRefs.length ? { trainer: trainerRefs } : {}),
    })
    continue
  }

  const setIfMissing = {}
  if (!existingDoc.sparte?._ref) setIfMissing.sparte = ref(plan.sparteId)
  if (!normalize(existingDoc.bereich)) setIfMissing.bereich = plan.bereich
  if (!normalize(existingDoc.beschreibung) && plan.beschreibung) setIfMissing.beschreibung = plan.beschreibung
  if (!existingDoc.foto?.asset?._ref && plan.foto) setIfMissing.foto = plan.foto
  if (typeof existingDoc.reihenfolge !== 'number') setIfMissing.reihenfolge = plan.reihenfolge
  if ((!Array.isArray(existingDoc.trainer) || existingDoc.trainer.length === 0) && trainerRefs.length) setIfMissing.trainer = trainerRefs

  if (Object.keys(setIfMissing).length > 0) {
    mannschaftPatchOps.push({ _id: existingDoc._id, set: setIfMissing, reason: 'Nur fehlende zentrale Felder/Referenzen setzen' })
  }
}

const targetTeamIds = new Set(plannedCentralMannschaften.map((plan) => plan.targetMannschaftId))
const allKnownTeamIdsAfterPlan = new Set([...existingMannschaftIds, ...targetTeamIds])
const unsafeTrainingszeitMatches = []
const trainingszeitPatchOps = []
const eindeutigVerknuepfbareTrainingszeitMatches = []
const plannedMannschaftDiagnostics = plannedCentralMannschaften.map((plan) => ({
  mannschaftId: plan.targetMannschaftId,
  mannschaftName: plan.name,
  sparte: plan.sparteName,
  source: plan.source,
  normalizedKey: teamSemanticKey(plan.sparteName, plan.name),
  plan,
}))
let brokenMannschaftRefCount = 0
let eindeutigVerknuepfbarCount = 0
let unsicherCount = 0

function getDiagnosticCandidates({ sparteName, gruppeName }) {
  return plannedCentralMannschaften
    .map((candidate) => scoreCandidateForTrainingszeit({ sparteName, gruppeName, candidate }))
    .filter((candidate) => candidate.matchScore >= 45 || candidate.sparteScore >= 90 || candidate.gruppeScore >= 55)
    .sort((a, b) => b.matchScore - a.matchScore || b.gruppeScore - a.gruppeScore)
    .slice(0, 8)
}

function getNoUniqueMatchReason({ candidates, diagnosticCandidates, hasBrokenRef }) {
  if (candidates.length > 1) return 'Mehr als ein exakter Kandidat nach Sparte + Gruppe gefunden.'
  if (diagnosticCandidates.length === 0) return hasBrokenRef ? 'Aktuelle Referenz ist kaputt und es gibt keinen ähnlichen geplanten Mannschaftskandidaten.' : 'Kein ähnlicher geplanter Mannschaftskandidat gefunden.'

  const best = diagnosticCandidates[0]
  const exactSparte = best.sparteScore === 100
  const exactGruppe = best.gruppeScore === 100
  if (exactSparte && !exactGruppe) return 'Sparte passt, aber Gruppenname weicht vom geplanten Mannschaftsnamen ab.'
  if (!exactSparte && exactGruppe) return 'Gruppenname passt, aber Sparte weicht ab.'
  return 'Nur ähnliche Kandidaten gefunden; kein exakter eindeutiger Match nach Sparte + Gruppe.'
}

for (const tz of trainingszeiten) {
  const currentRef = tz.mannschaft?._ref
  const hasBrokenRef = Boolean(currentRef && !allKnownTeamIdsAfterPlan.has(currentRef))
  if (hasBrokenRef) brokenMannschaftRefCount += 1

  const sparteName = resolveSparteName(tz.sparte)
  const gruppeName = normalize(tz.gruppe)
  if (!sparteName || !gruppeName) {
    if (currentRef && !hasBrokenRef) continue
    unsicherCount += 1
    const diagnosticCandidates = getDiagnosticCandidates({ sparteName, gruppeName })
    unsafeTrainingszeitMatches.push({
      _id: tz._id,
      trainingszeitId: tz._id,
      type: 'SPARTE_ODER_GRUPPE_FEHLT',
      sparte: sparteName || tz.sparte || null,
      gruppe: gruppeName || tz.gruppe || null,
      tag: normalize(tz.tag) || null,
      uhrzeit: normalize(tz.uhrzeit) || null,
      currentMannschaftRef: currentRef || null,
      currentRef: currentRef || null,
      isCurrentMannschaftRefBroken: hasBrokenRef,
      normalizedMatchKey: `${normKey(sparteName)}::${normKey(gruppeName)}`,
      plannedMannschaftCandidates: diagnosticCandidates,
      noUniqueMatchReason: 'Sparte oder Gruppe fehlt; kein sicherer Match-Key möglich.',
    })
    continue
  }

  const matchKey = teamSemanticKey(sparteName, gruppeName)
  const planned = (teamPlanByKey.get(matchKey) || []).map((plan) => plan.targetMannschaftId)
  const existing = (existingTeamsBySparteName.get(matchKey) || []).map((team) => team._id)
  const candidates = unique([...planned, ...existing])
  const diagnosticCandidates = getDiagnosticCandidates({ sparteName, gruppeName })

  if (candidates.length === 1) {
    eindeutigVerknuepfbarCount += 1
    const targetId = candidates[0]
    const targetPlan = plannedCentralMannschaften.find((plan) => plan.targetMannschaftId === targetId)
    eindeutigVerknuepfbareTrainingszeitMatches.push({
      _id: tz._id,
      trainingszeitId: tz._id,
      sparte: sparteName,
      gruppe: gruppeName,
      tag: normalize(tz.tag) || null,
      uhrzeit: normalize(tz.uhrzeit) || null,
      currentMannschaftRef: currentRef || null,
      isCurrentMannschaftRefBroken: hasBrokenRef,
      normalizedMatchKey: matchKey,
      targetMannschaftId: targetId,
      targetMannschaftName: targetPlan?.name || null,
      targetSource: targetPlan?.source || (existingMannschaftIds.has(targetId) ? 'existing.mannschaft' : null),
      needsPatch: currentRef !== targetId,
      reason: currentRef === targetId ? 'Vorhandene mannschaft-Referenz ist nach Planung eindeutig bekannt' : hasBrokenRef ? 'Kaputte mannschaft-Referenz eindeutig ersetzbar' : 'Fehlende/abweichende mannschaft-Referenz eindeutig setzbar',
    })
    if (currentRef !== targetId) {
      trainingszeitPatchOps.push({ _id: tz._id, set: { mannschaft: ref(targetId) }, currentRef: currentRef || null, reason: hasBrokenRef ? 'Kaputte mannschaft-Referenz eindeutig ersetzt' : 'Fehlende/abweichende mannschaft-Referenz eindeutig gesetzt' })
    }
  } else {
    if (currentRef && !hasBrokenRef) continue
    unsicherCount += 1
    unsafeTrainingszeitMatches.push({
      _id: tz._id,
      trainingszeitId: tz._id,
      type: candidates.length === 0 ? 'KEIN_MATCH' : 'MEHRDEUTIGER_MATCH',
      sparte: sparteName,
      gruppe: gruppeName,
      tag: normalize(tz.tag) || null,
      uhrzeit: normalize(tz.uhrzeit) || null,
      currentMannschaftRef: currentRef || null,
      currentRef: currentRef || null,
      isCurrentMannschaftRefBroken: hasBrokenRef,
      normalizedMatchKey: matchKey,
      exactCandidateIds: candidates,
      plannedMannschaftCandidates: diagnosticCandidates,
      noUniqueMatchReason: getNoUniqueMatchReason({ candidates, diagnosticCandidates, hasBrokenRef }),
    })
  }
}

const groupUnsafeMatches = (predicate) =>
  unsafeTrainingszeitMatches
    .filter(predicate)
    .map((match) => ({
      _id: match._id,
      sparte: match.sparte,
      gruppe: match.gruppe,
      normalizedMatchKey: match.normalizedMatchKey,
      currentMannschaftRef: match.currentMannschaftRef,
      isCurrentMannschaftRefBroken: match.isCurrentMannschaftRefBroken,
      bestCandidate: match.plannedMannschaftCandidates?.[0]
        ? {
            mannschaftId: match.plannedMannschaftCandidates[0].mannschaftId,
            mannschaftName: match.plannedMannschaftCandidates[0].mannschaftName,
            sparte: match.plannedMannschaftCandidates[0].sparte,
            matchScore: match.plannedMannschaftCandidates[0].matchScore,
            reason: match.plannedMannschaftCandidates[0].reason,
          }
        : null,
      noUniqueMatchReason: match.noUniqueMatchReason,
    }))

const unsichereTrainingszeitenSummary = {
  gruppenOhnePassendenMannschaftskandidaten: groupUnsafeMatches((match) => (match.plannedMannschaftCandidates || []).length === 0),
  gruppenMitMehrerenKandidaten: groupUnsafeMatches((match) => match.type === 'MEHRDEUTIGER_MATCH' || (match.exactCandidateIds || []).length > 1),
  scheiternNurAnSparteNamensabweichung: groupUnsafeMatches((match) => {
    const best = match.plannedMannschaftCandidates?.[0]
    return Boolean(best && best.gruppeScore === 100 && best.sparteScore < 100 && best.sparteScore >= 55)
  }),
  scheiternNurAnLeichtAbweichendemGruppennamen: groupUnsafeMatches((match) => {
    const best = match.plannedMannschaftCandidates?.[0]
    return Boolean(best && best.sparteScore === 100 && best.gruppeScore < 100 && best.gruppeScore >= 55)
  }),
  diagnostikBasis: {
    geplanteMannschaftskandidatenGesamt: plannedMannschaftDiagnostics.length,
    kandidatenschwelle: 'matchScore >= 45 oder sparteScore >= 90 oder gruppeScore >= 55',
  },
}

const plannedMannschaftenFromSparte = plannedCentralMannschaften.filter((plan) => plan.source === 'sparte.mannschaften')
const plannedTrainingsgruppenFromTrainingszeit = plannedCentralMannschaften.filter((plan) => plan.source === 'trainingszeit.gruppe')
const eindeutigVerknuepfbareTrainingszeiten = eindeutigVerknuepfbareTrainingszeitMatches

const sourceReport = {
  mannschaftenAusSparteMannschaften: plannedMannschaftenFromSparte.map((plan) => ({
    _id: plan.targetMannschaftId,
    name: plan.name,
    sparte: plan.sparteName,
    bereich: plan.bereich,
    source: plan.source,
  })),
  trainingsgruppenAusTrainingszeitGruppe: plannedTrainingsgruppenFromTrainingszeit.map((plan) => ({
    _id: plan.targetMannschaftId,
    name: plan.name,
    sparte: plan.sparteName,
    bereich: plan.bereich,
    source: plan.source,
    creationReason: plan.creationReason,
    trainingszeitSourceIds: plan.trainingszeitSourceIds,
  })),
  eindeutigVerknuepfbareTrainingszeiten,
  weiterhinUnsichereTrainingszeiten: unsafeTrainingszeitMatches,
  potenzielleDuplikateZwischenSparteMannschaftenUndTrainingszeitGruppe: trainingszeitGroupDuplicateCandidates,
}

for (const item of globaleAnsprechpartner) {
  if (item.person?._ref) continue
  const person = personCandidates.get(normKey(item.name))
  if (person?.targetPersonId) {
    globalAnsprechpartnerPersonLinkPatches.push({ _id: item._id, set: { person: ref(person.targetPersonId) }, reason: 'Fehlende ansprechpartner.person-Referenz aus zentraler Person gesetzt' })
  }
}

const duplicateCandidates = [...mannschaftDuplicateCandidates, ...trainingszeitGroupDuplicateCandidates, ...personDuplicateCandidates]

if (isApply) {
  for (const doc of personCreateOps) await client.createIfNotExists(doc)
  for (const doc of mannschaftCreateOps) await client.createIfNotExists(doc)
  for (const patch of mannschaftPatchOps) await client.patch(patch._id).set(patch.set).commit()
  for (const patch of trainingszeitPatchOps) await client.patch(patch._id).set(patch.set).commit()
  for (const patch of globalAnsprechpartnerPersonLinkPatches) await client.patch(patch._id).set(patch.set).commit()
}

const report = {
  mode: isApply ? 'APPLY' : 'DRY_RUN',
  sanityClientConfig: sanityClientConfigInfo,
  guard: {
    dryRunDefault: !isApply,
    applyOnlyWithApplyFlag: true,
    tokenRequiredOnlyForApply: true,
    noHardcodedSecrets: true,
    noLegacyDelete: true,
    noSparteMannschaftenDelete: true,
    noTrainingszeitenEmbeddedInMannschaften: true,
    teamsAndTrainingGroupsCreatedFromSparteMannschaftenAndTrainingszeitGruppe: true,
    noOverwriteExistingContentExceptMissingReferences: true,
    noFrontendChanges: true,
    noQueryChanges: true,
    noSchemaChanges: true,
  },
  counts: {
    sparten: sparten.length,
    embeddedMannschaften: embeddedMannschaftenCount,
    geplanteMannschaftenAusSparteMannschaften: plannedMannschaftenFromSparte.length,
    geplanteTrainingsgruppenAusTrainingszeitGruppe: plannedTrainingsgruppenFromTrainingszeit.length,
    geplanteZentraleMannschaften: plannedCentralMannschaften.length,
    vorhandeneZentraleMannschaften: existingMannschaften.length,
    geplantePersonen: personCandidates.size,
    vorhandenePersonen: existingPersons.length,
    trainingszeitenGesamt: trainingszeiten.length,
    trainingszeitenMitKaputterMannschaftReferenz: brokenMannschaftRefCount,
    eindeutigVerknuepfbareTrainingszeiten: eindeutigVerknuepfbarCount,
    unsichereTrainingszeiten: unsicherCount,
    applyOps: {
      createPersons: isApply ? personCreateOps.length : 0,
      createMannschaften: isApply ? mannschaftCreateOps.length : 0,
      patchMannschaftenMissingFields: isApply ? mannschaftPatchOps.length : 0,
      patchTrainingszeitenMannschaft: isApply ? trainingszeitPatchOps.length : 0,
      patchAnsprechpartnerPerson: isApply ? globalAnsprechpartnerPersonLinkPatches.length : 0,
    },
    dryRunPlannedOps: {
      createPersons: personCreateOps.length,
      createMannschaften: mannschaftCreateOps.length,
      patchMannschaftenMissingFields: mannschaftPatchOps.length,
      patchTrainingszeitenMannschaft: trainingszeitPatchOps.length,
      patchAnsprechpartnerPerson: globalAnsprechpartnerPersonLinkPatches.length,
    },
  },
  sourceReport,
  unsichereMatches: unsafeTrainingszeitMatches,
  unsichereTrainingszeitenSummary,
  potenzielleDuplikate: duplicateCandidates,
  samples: {
    createPersons: personCreateOps.slice(0, 30),
    createMannschaften: mannschaftCreateOps.slice(0, 30),
    patchMannschaftenMissingFields: mannschaftPatchOps.slice(0, 30),
    patchTrainingszeitenMannschaft: trainingszeitPatchOps.slice(0, 30),
    patchAnsprechpartnerPerson: globalAnsprechpartnerPersonLinkPatches.slice(0, 30),
    sparteAnsprechpartnerReferenceSources: sparteAnsprechpartnerReferenceSources.slice(0, 30),
  },
  note: isApply
    ? 'Apply abgeschlossen. Legacy-Felder und sparte.mannschaften[] wurden nicht gelöscht.'
    : 'Dry-Run: keine create/patch/commit-Aufrufe. Mit --apply wird geschrieben; SANITY_API_WRITE_TOKEN muss dann gesetzt sein.',
}

const compactReport = {
  mode: report.mode,
  sanityClientConfig: sanityClientConfigInfo,
  entscheidungshilfe: {
    applySicherWenn: [
      'unsichereTrainingszeiten === 0',
      'trainingszeitenMitKaputterMannschaftReferenz === 0 oder durch eindeutige Patch-Operationen abgedeckt',
      'potenzielleDuplikate fachlich geprüft bzw. erwartbar sind',
    ],
    hinweis: isApply
      ? 'APPLY-Modus wurde ausgeführt.'
      : 'DRY_RUN: keine Sanity-Mutationen. Mit --verbose Details anzeigen, mit --json vollständigen Report ausgeben.',
  },
  counts: {
    spartenGesamt: sparten.length,
    geplanteMannschaftenAusSparteMannschaften: plannedMannschaftenFromSparte.length,
    geplanteTrainingsgruppenAusTrainingszeitGruppe: plannedTrainingsgruppenFromTrainingszeit.length,
    geplanteZentraleMannschaftenGesamt: plannedCentralMannschaften.length,
    vorhandeneZentraleMannschaften: existingMannschaften.length,
    geplantePersonen: personCandidates.size,
    vorhandenePersonen: existingPersons.length,
    trainingszeitenGesamt: trainingszeiten.length,
    trainingszeitenEindeutigVerknuepfbar: eindeutigVerknuepfbarCount,
    unsichereTrainingszeiten: unsicherCount,
    kaputteMannschaftsreferenzen: brokenMannschaftRefCount,
    potenzielleDuplikateAnzahl: duplicateCandidates.length,
  },
  geplanteTrainingsgruppenAusTrainingszeitGruppe: plannedTrainingsgruppenFromTrainingszeit.map((plan) => ({
    name: plan.name,
    sparte: plan.sparteName,
    geplanteId: plan.targetMannschaftId,
    verknuepfteTrainingszeiten: plan.trainingszeitSourceIds.length,
  })),
  geplanteOperationenImDryRun: report.counts.dryRunPlannedOps,
}

if (isJson) {
  console.log(JSON.stringify(report, null, 2))
} else if (isVerbose) {
  console.log(JSON.stringify({ ...compactReport, details: report }, null, 2))
} else {
  console.log(JSON.stringify(compactReport, null, 2))
}