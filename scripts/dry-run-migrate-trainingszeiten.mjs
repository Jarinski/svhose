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

const normKey = (name) => normalize(name).toLowerCase()

// Explizite Dry-Run-Konfiguration für Diagnose/Mapping (read-only)
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

const BEREICH_OVERRIDES = {
  junioren: [
    /junior/i,
    /jugend/i,
    /\bjg\.?\b/i,
    /\bu0?7\b|\bu0?8\b|\bu0?9\b|\bu10\b|\bu11\b|\bu12\b|\bu13\b|\bu14\b|\bu15\b|\bu16\b|\bu17\b|\bu18\b/i,
    /e[-\s]?madchen/i,
    /e[-\s]?maedchen/i,
    /e[-\s]?juniorinnen/i,
  ],
  damen: [/damen/i, /girls/i, /frauen/i, /madchen/i, /maedchen/i],
  herren: [/herren/i],
  senioren: [/senior/i],
  freizeit: [/hobby/i, /freizeit/i, /fur jedermann/i, /fuer jedermann/i, /erwachsene/i, /walking/i, /fit am nachmittag/i, /just4fun/i, /hoseunited/i, /jedermann/i, /\bfriends\b/i, /sportakrobatik/i],
  juniorenLikely: [/\bkinder\b/i, /\banfanger\b/i, /\banfaenger\b/i, /grundschule/i, /jahre/i, /torwart/i],
}

function resolveSparteName(rawSparte = '') {
  const legacy = normalize(rawSparte)
  const aliasTarget = SPARTE_ALIASES[normKey(legacy)]
  return {
    legacy,
    resolved: aliasTarget || legacy,
    mapped: Boolean(aliasTarget),
  }
}

function inferBereich({ sparte = '', gruppe = '' }) {
  const s = normKey(sparte)
  const g = normKey(gruppe)

  const haystack = `${s} ${g}`

  if (BEREICH_OVERRIDES.junioren.some((rx) => rx.test(haystack)) || g.includes('minikicker')) return 'Junioren'
  if (BEREICH_OVERRIDES.damen.some((rx) => rx.test(haystack))) return 'Damen'
  if (BEREICH_OVERRIDES.herren.some((rx) => rx.test(haystack))) return 'Herren'
  if (BEREICH_OVERRIDES.senioren.some((rx) => rx.test(haystack))) return 'Senioren'
  if (BEREICH_OVERRIDES.freizeit.some((rx) => rx.test(haystack))) return 'Freizeit'
  if (BEREICH_OVERRIDES.juniorenLikely.some((rx) => rx.test(haystack))) return 'Junioren'

  return null
}

function suggestBereichForUnclear({ sparte = '', gruppe = '' }) {
  const h = `${normKey(sparte)} ${normKey(gruppe)}`
  if (BEREICH_OVERRIDES.juniorenLikely.some((rx) => rx.test(h))) {
    return { vorgeschlagen: 'Junioren', reason: 'Kinder-/Alters-/Anfänger-/Torwart-Muster erkannt' }
  }
  return { vorgeschlagen: 'NEEDS_MANUAL_DECISION', reason: 'Kein eindeutiges Muster für Bereich gefunden' }
}

function splitTrainer(raw) {
  if (!raw) return []
  return raw
    .split(/[;,]/g)
    .map((n) => normalize(n))
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

const trainingszeiten = await client.fetch(`
  *[_type == "trainingszeit"]{
    _id,
    tag,
    uhrzeit,
    sparte,
    gruppe,
    trainer,
    email,
    telefon,
    ort,
    mannschaft
  }
`)

const sparten = await client.fetch(`*[_type == "sparte"]{_id, name, slug}`)
const sparteByNameKey = new Map(sparten.map((s) => [normKey(s.name), s]))

const personMap = new Map()
const teamMap = new Map()
const links = []
const unsure = []
const legacySparteCounts = new Map()
const mappedSparteCounts = new Map()

const incCount = (map, key) => {
  if (!key) return
  map.set(key, (map.get(key) || 0) + 1)
}

for (const tz of trainingszeiten) {
  const sparteResolution = resolveSparteName(tz.sparte)
  const sparteName = sparteResolution.resolved
  const legacySparteName = sparteResolution.legacy
  const gruppeName = normalize(tz.gruppe)
  const contactEmail = normalize(tz.email)
  const contactTelefon = normalize(tz.telefon)
  const trainerNames = splitTrainer(tz.trainer)

  if (legacySparteName) incCount(legacySparteCounts, legacySparteName)
  if (sparteResolution.mapped) {
    const mKey = `${legacySparteName} -> ${sparteName}`
    incCount(mappedSparteCounts, mKey)
  }

  // Personen aus Trainer-Feld
  for (const trainerName of trainerNames) {
    const pKey = normKey(trainerName)
    if (!personMap.has(pKey)) {
      personMap.set(pKey, {
        name: trainerName,
        rollen: ['Trainer'],
        emails: new Set(),
        telefone: new Set(),
        sourceTrainingszeiten: new Set(),
      })
    }
    const p = personMap.get(pKey)
    p.sourceTrainingszeiten.add(tz._id)
    if (contactEmail) p.emails.add(contactEmail)
    if (contactTelefon) p.telefone.add(contactTelefon)
  }

  // Mannschaften aus sparte + gruppe
  if (sparteName && gruppeName) {
    const tKey = `${normKey(sparteName)}::${normKey(gruppeName)}`
    const bereich = inferBereich({ sparte: sparteName, gruppe: gruppeName })
    const sparteDoc = sparteByNameKey.get(normKey(sparteName))

    if (!teamMap.has(tKey)) {
      teamMap.set(tKey, {
        key: tKey,
        name: gruppeName,
        sparteName,
        legacySparteName,
        sparteId: sparteDoc?._id || null,
        bereich,
        trainers: new Set(trainerNames.map(normKey)),
        sourceTrainingszeiten: new Set(),
      })
    }

    const team = teamMap.get(tKey)
    team.sourceTrainingszeiten.add(tz._id)
    trainerNames.forEach((n) => team.trainers.add(normKey(n)))

    links.push({
      trainingszeitId: tz._id,
      proposedMannschaftKey: tKey,
      hasExistingMannschaftRef: Boolean(tz.mannschaft?._ref),
    })

    if (!sparteDoc) {
      unsure.push({
        type: 'SPARTE_NOT_FOUND',
        trainingszeitId: tz._id,
        sparte: sparteName,
        legacySparte: legacySparteName,
        gruppe: gruppeName,
      })
    }
    if (!bereich) {
      const suggestion = suggestBereichForUnclear({ sparte: sparteName, gruppe: gruppeName })
      unsure.push({
        type: 'BEREICH_UNKLAR',
        trainingszeitId: tz._id,
        sparte: sparteName,
        legacySparte: legacySparteName,
        gruppe: gruppeName,
        proposedBereich: suggestion.vorgeschlagen,
        reason: suggestion.reason,
      })
      if (suggestion.vorgeschlagen === 'NEEDS_MANUAL_DECISION') {
        unsure.push({
          type: 'NEEDS_MANUAL_DECISION',
          trainingszeitId: tz._id,
          sparte: sparteName,
          legacySparte: legacySparteName,
          gruppe: gruppeName,
          reason: suggestion.reason,
        })
      }
    }
    if (bereich === 'Junioren') {
      unsure.push({
        type: 'APPLY_WARNING_JUNIOREN_OHNE_JAHRGANG',
        trainingszeitId: tz._id,
        sparte: sparteName,
        legacySparte: legacySparteName,
        gruppe: gruppeName,
        reason: 'bereich=Junioren ohne jahrgang ist migrierbar (Schema-Warning), aber redaktionell nachpflegebedürftig',
      })
    }
  } else {
    unsure.push({
      type: 'SPARTE_GRUPPE_FEHLT',
      trainingszeitId: tz._id,
      sparte: sparteName || null,
      gruppe: gruppeName || null,
    })
  }

  if (trainerNames.length > 1 && (contactEmail || contactTelefon)) {
    unsure.push({
      type: 'SHARED_CONTACT_MULTI_TRAINER',
      trainingszeitId: tz._id,
      trainer: trainerNames,
      email: contactEmail || null,
      telefon: contactTelefon || null,
    })
  }
}

// Mögliche Namensdubletten / Schreibvarianten
const persons = [...personMap.values()].map((p) => ({
  name: p.name,
  key: normKey(p.name),
  emails: [...p.emails],
  telefone: [...p.telefone],
  sourceCount: p.sourceTrainingszeiten.size,
}))

const possibleNameVariants = []
for (let i = 0; i < persons.length; i++) {
  for (let j = i + 1; j < persons.length; j++) {
    const a = persons[i]
    const b = persons[j]
    const d = levenshtein(a.key, b.key)
    if (d > 0 && d <= 2) {
      possibleNameVariants.push({ a: a.name, b: b.name, distance: d })
    }
  }
}

const teams = [...teamMap.values()].map((t) => ({
  key: t.key,
  name: t.name,
  sparteName: t.sparteName,
  legacySparteName: t.legacySparteName,
  sparteId: t.sparteId,
  bereich: t.bereich,
  trainerCount: t.trainers.size,
  sourceCount: t.sourceTrainingszeiten.size,
}))

const legacySparteValues = [...legacySparteCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([value, count]) => ({ value, count }))

const mappedSparteValues = [...mappedSparteCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([mapping, count]) => ({ mapping, count }))

const spartenNotFound = unsure.filter((u) => u.type === 'SPARTE_NOT_FOUND')
const bereichUnklar = unsure.filter((u) => u.type === 'BEREICH_UNKLAR')
const applyWarningJunioren = unsure.filter((u) => u.type === 'APPLY_WARNING_JUNIOREN_OHNE_JAHRGANG')
const potentialMannschaftenFinal = teams.filter((t) => t.sparteId && t.bereich).length

const report = {
  mode: 'DRY_RUN_ONLY',
  source: {
    trainingszeiten: trainingszeiten.length,
    sparten: sparten.length,
  },
  requiredFields: {
    person: ['name'],
    mannschaft: ['name', 'bereich', 'sparte'],
    mannschaftConditional: ['jahrgang required if bereich == Junioren'],
  },
  proposedCreates: {
    persons: persons.length,
    mannschaften: teams.length,
    mannschaftenPotentialFinalMapping: potentialMannschaftenFinal,
  },
  proposedLinks: {
    trainingszeitToMannschaft: links.length,
  },
  uncertainCases: {
    total: unsure.length,
    byType: unsure.reduce((acc, it) => {
      acc[it.type] = (acc[it.type] || 0) + 1
      return acc
    }, {}),
  },
  diagnostics: {
    config: {
      sparteAliases: SPARTE_ALIASES,
      bereichOverrides: {
        juniorenRules: BEREICH_OVERRIDES.junioren.map(String),
        damenRules: BEREICH_OVERRIDES.damen.map(String),
        herrenRules: BEREICH_OVERRIDES.herren.map(String),
        seniorenRules: BEREICH_OVERRIDES.senioren.map(String),
        freizeitRules: BEREICH_OVERRIDES.freizeit.map(String),
      },
    },
    legacySparteValues,
    mappedSparteValues,
    spartenNotFound,
    bereichUnklar,
    applyWarningJunioren,
    notes: [
      'Read-only Dry-Run: keine create/patch/commit-Aufrufe.',
      'SHARED_CONTACT_MULTI_TRAINER wird nur markiert, Kontakte werden nicht auf Personen geschrieben.',
      'Junioren ohne Jahrgang sind migrierbar (Warning), aber redaktionell nachpflegebedürftig.',
    ],
  },
  samples: {
    persons: persons.slice(0, 20),
    mannschaften: teams.slice(0, 20),
    links: links.slice(0, 20),
    unsure: unsure.slice(0, 30),
    possibleNameVariants: possibleNameVariants.slice(0, 30),
  },
}

console.log(JSON.stringify(report, null, 2))
