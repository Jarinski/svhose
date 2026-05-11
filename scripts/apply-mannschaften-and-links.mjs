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

const normKey = (name) => normalize(name).toLowerCase()
const slugify = (v) => normKey(v).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// 1:1 aus Dry-Run übernommen
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

// 1:1 aus Dry-Run übernommen
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

const trainingszeiten = await client.fetch(`
  *[_type == "trainingszeit"]{
    _id,
    sparte,
    gruppe,
    trainer,
    email,
    telefon,
    ort,
    mannschaft
  }
`)

const sparten = await client.fetch(`*[_type == "sparte"]{_id, name}`)
const sparteByNameKey = new Map(sparten.map((s) => [normKey(s.name), s]))

const proposalsByKey = new Map()
const links = []
const warnings = []

for (const tz of trainingszeiten) {
  const sparteResolution = resolveSparteName(tz.sparte)
  const sparteName = sparteResolution.resolved
  const legacySparteName = sparteResolution.legacy
  const gruppeName = normalize(tz.gruppe)

  if (!sparteName || !gruppeName) continue

  const bereich = inferBereich({ sparte: sparteName, gruppe: gruppeName })
  const sparteDoc = sparteByNameKey.get(normKey(sparteName))
  const teamKey = `${normKey(sparteName)}::${normKey(gruppeName)}`
  const mannschaftId = `mannschaft.${slugify(sparteName)}--${slugify(gruppeName)}`

  if (!proposalsByKey.has(teamKey)) {
    proposalsByKey.set(teamKey, {
      key: teamKey,
      mannschaftId,
      name: gruppeName,
      bereich,
      sparteName,
      sparteId: sparteDoc?._id || null,
      legacySparteName,
      sourceCount: 0,
    })
  }

  const team = proposalsByKey.get(teamKey)
  team.sourceCount += 1

  links.push({
    trainingszeitId: tz._id,
    currentMannschaftRef: tz.mannschaft?._ref || null,
    proposedMannschaftId: mannschaftId,
    sparte: sparteName,
    gruppe: gruppeName,
  })

  if (!sparteDoc) {
    warnings.push({
      type: 'SPARTE_NOT_FOUND',
      trainingszeitId: tz._id,
      sparte: sparteName,
      legacySparte: legacySparteName,
      gruppe: gruppeName,
    })
  }
  if (!bereich) {
    const suggestion = suggestBereichForUnclear({ sparte: sparteName, gruppe: gruppeName })
    warnings.push({
      type: 'BEREICH_UNKLAR',
      trainingszeitId: tz._id,
      sparte: sparteName,
      legacySparte: legacySparteName,
      gruppe: gruppeName,
      proposedBereich: suggestion.vorgeschlagen,
      reason: suggestion.reason,
    })
    if (suggestion.vorgeschlagen === 'NEEDS_MANUAL_DECISION') {
      warnings.push({
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
    warnings.push({
      type: 'APPLY_WARNING_JUNIOREN_OHNE_JAHRGANG',
      trainingszeitId: tz._id,
      sparte: sparteName,
      legacySparte: legacySparteName,
      gruppe: gruppeName,
      reason: 'bereich=Junioren ohne jahrgang ist migrierbar (Schema-Warning), aber redaktionell nachpflegebedürftig',
    })
  }
}

const warningCount = (type) => warnings.filter((w) => w.type === type).length
const teams = [...proposalsByKey.values()]
const proposedTeamsFinal = teams.filter((t) => t.sparteId && t.bereich)

const existingTeamIds = await client.fetch(`*[_type == "mannschaft"]._id`)
const existingTeamIdSet = new Set(existingTeamIds)

const toCreate = proposedTeamsFinal.filter((t) => !existingTeamIdSet.has(t.mannschaftId))
const existing = proposedTeamsFinal.filter((t) => existingTeamIdSet.has(t.mannschaftId))

const linkPlan = links.filter((l) => {
  const teamKey = `${normKey(l.sparte)}::${normKey(l.gruppe)}`
  const team = proposalsByKey.get(teamKey)
  return Boolean(team?.sparteId && team?.bereich)
})

const toPatch = linkPlan.filter((l) => l.currentMannschaftRef !== l.proposedMannschaftId)
const skipped = linkPlan.filter((l) => l.currentMannschaftRef === l.proposedMannschaftId)

const summary = {
  mode: isApply ? 'APPLY' : 'DRY_RUN',
  counts: {
    proposedMannschaften: proposedTeamsFinal.length,
    existingMannschaften: existing.length,
    createdMannschaften: isApply ? toCreate.length : 0,
    proposedTrainingszeitVerlinkungen: linkPlan.length,
    patchedTrainingszeiten: isApply ? toPatch.length : 0,
    skippedTrainingszeiten: isApply ? skipped.length : linkPlan.length,
  },
  warnings: {
    SPARTE_NOT_FOUND: warningCount('SPARTE_NOT_FOUND'),
    BEREICH_UNKLAR: warningCount('BEREICH_UNKLAR'),
    NEEDS_MANUAL_DECISION: warningCount('NEEDS_MANUAL_DECISION'),
    APPLY_WARNING_JUNIOREN_OHNE_JAHRGANG: warningCount('APPLY_WARNING_JUNIOREN_OHNE_JAHRGANG'),
  },
}

if (!isApply) {
  console.log(
    JSON.stringify(
      {
        ...summary,
        note: 'Dry-Run: keine create/patch/commit-Aufrufe. Mit --apply wird geschrieben.',
        sample: {
          createMannschaften: toCreate.slice(0, 20),
          patchTrainingszeiten: toPatch.slice(0, 20),
          skippedTrainingszeiten: skipped.slice(0, 20),
          warnings: warnings.slice(0, 20),
        },
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (summary.warnings.SPARTE_NOT_FOUND > 0 || summary.warnings.BEREICH_UNKLAR > 0 || summary.warnings.NEEDS_MANUAL_DECISION > 0) {
  console.error(
    JSON.stringify(
      {
        error: 'APPLY_ABORTED_PRECHECK_FAILED',
        message: 'Vor Apply müssen SPARTE_NOT_FOUND, BEREICH_UNKLAR und NEEDS_MANUAL_DECISION jeweils 0 sein.',
        warnings: summary.warnings,
      },
      null,
      2,
    ),
  )
  process.exit(2)
}

for (const t of toCreate) {
  await client.createIfNotExists({
    _id: t.mannschaftId,
    _type: 'mannschaft',
    name: t.name,
    bereich: t.bereich,
    sparte: { _type: 'reference', _ref: t.sparteId },
  })
}

for (const l of toPatch) {
  await client.patch(l.trainingszeitId).set({ mannschaft: { _type: 'reference', _ref: l.proposedMannschaftId } }).commit()
}

console.log(
  JSON.stringify(
    {
      ...summary,
      counts: {
        ...summary.counts,
        createdMannschaften: toCreate.length,
        patchedTrainingszeiten: toPatch.length,
        skippedTrainingszeiten: skipped.length,
      },
      note: 'Apply erfolgreich. Es wurden ausschließlich mannschaft erzeugt und trainingszeit.mannschaft gesetzt.',
    },
    null,
    2,
  ),
)
