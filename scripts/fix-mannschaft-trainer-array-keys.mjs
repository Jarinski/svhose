import { createClient } from '@sanity/client'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const isApply = process.argv.includes('--apply')
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

if (!projectId) {
  console.error('Fehlt: NEXT_PUBLIC_SANITY_PROJECT_ID')
  process.exit(1)
}

if (isApply && !process.env.SANITY_API_WRITE_TOKEN) {
  console.error('Fehlt für --apply: SANITY_API_WRITE_TOKEN')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
})

const slugify = (v = '') =>
  String(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const stableKeyForRef = (ref = '') => `trainer-${slugify(String(ref).replace(/^person\./, ''))}`

const data = await client.fetch(`{
  "teams": *[_type=="mannschaft"]{_id,name,trainer},
  "personJari": *[_type=="person" && _id=="person.jari-gonzales-reyes"][0]{_id,name,"fotoRef":foto.asset._ref},
  "fussball": *[_type=="sparte" && slug.current=="fussball"][0]{
    _id,
    "slug": slug.current,
    "echteMannschaften": *[_type=="mannschaft" && sparte._ref==^._id] | order(reihenfolge asc, name asc) {
      _id,
      name,
      trainer[]->{"id": _id, name, "foto": foto.asset->url}
    },
    mannschaften,
    ansprechpartner
  }
}`)

const teams = data.teams || []
const affectedTeams = []
const patchOps = []

for (const team of teams) {
  const trainer = Array.isArray(team.trainer) ? team.trainer : []
  if (trainer.length === 0) continue

  const missing = trainer
    .map((t, idx) => ({ idx, item: t }))
    .filter(({ item }) => !item?._key)

  if (missing.length === 0) continue

  const usedKeys = new Set(trainer.map((t) => t?._key).filter(Boolean))
  const newTrainer = trainer.map((item, idx) => {
    if (item?._key) return item
    const ref = item?._ref || `idx-${idx}`
    let key = stableKeyForRef(ref)
    let i = 1
    while (usedKeys.has(key)) {
      key = `${stableKeyForRef(ref)}-${i++}`
    }
    usedKeys.add(key)
    return { ...item, _key: key }
  })

  affectedTeams.push({
    mannschaftId: team._id,
    mannschaftName: team.name,
    missingTrainerItems: missing.map(({ item }) => ({ _ref: item?._ref ?? null, _type: item?._type ?? null, _key: item?._key ?? null })),
  })

  patchOps.push({ mannschaftId: team._id, trainer: newTrainer })
}

if (isApply) {
  for (const op of patchOps) {
    await client.patch(op.mannschaftId).set({ trainer: op.trainer }).commit()
  }
}

const fussballEJuniorinnen = (data.fussball?.echteMannschaften || []).find(
  (m) => m.name === 'E-Juniorinnen / E-Mädchen (Jg. 2013–2016)',
)

const report = {
  mode: isApply ? 'APPLY' : 'DRY_RUN',
  counts: {
    totalTeamsAffected: affectedTeams.length,
    totalMissingTrainerItems: affectedTeams.reduce((acc, t) => acc + t.missingTrainerItems.length, 0),
    patchesPlanned: patchOps.length,
  },
  affectedTeams,
  checks: {
    personJariExists: !!data.personJari?._id,
    personJariFotoRef: data.personJari?.fotoRef || null,
    eJuniorinnenExistsAsRealTeam: !!fussballEJuniorinnen?._id,
    eJuniorinnenTrainerIncludesJari: (fussballEJuniorinnen?.trainer || []).some((t) => t?.id === 'person.jari-gonzales-reyes'),
    fussballEchteMannschaftenLength: (data.fussball?.echteMannschaften || []).length,
    legacyEmbeddedMannschaftenLength: (data.fussball?.mannschaften || []).length,
    legacyEmbeddedAnsprechpartnerLength: (data.fussball?.ansprechpartner || []).length,
    eJuniorinnenTrainerFirstFotoUrl: fussballEJuniorinnen?.trainer?.[0]?.foto || null,
  },
}

console.log(JSON.stringify(report, null, 2))
