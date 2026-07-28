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

const norm = (v = '') =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
const slugify = (v = '') => norm(v).replace(/\s+/g, '-')

const inferBereich = (name = '') => {
  const n = norm(name)
  if (/\bdamen\b/.test(n)) return 'Damen'
  if (/\bherren\b/.test(n)) return 'Herren'
  if (/\bu\d+\b|junior|minikicker|madchen|maedchen/.test(n)) return 'Junioren'
  if (/senior/.test(n)) return 'Senioren'
  return 'Freizeit'
}

const data = await client.fetch(`{
  "sparten": *[_type == "sparte"]{
    _id, name, "slug": slug.current,
    mannschaften[]{_key,name,beschreibung,"foto": foto.asset->url, "fotoRef": foto.asset->_ref},
    ansprechpartner[]{_key,name,rolle,email,telefon,whatsapp,"foto": foto.asset->url, "fotoRef": foto.asset->_ref}
  },
  "mannschaften": *[_type == "mannschaft"]{
    _id,name,"sparteId":sparte._ref,beschreibung,
    "foto": foto.asset->url, "fotoRef": foto.asset->_ref,
    trainer[]->{_id,name}
  },
  "personen": *[_type == "person"]{
    _id,name,rollen,email,telefon,whatsapp,
    "foto": foto.asset->url, "fotoRef": foto.asset->_ref
  }
}`)

const mannschaftByKey = new Map((data.mannschaften || []).map((m) => [`${m.sparteId}::${norm(m.name)}`, m]))
const personByKey = new Map((data.personen || []).map((p) => [norm(p.name), p]))

const createMannschaften = []
const createPersonen = []
const patchPersonen = []
const patchMannschaften = []
const warnings = []

for (const sparte of data.sparten || []) {
  const embeddedM = sparte.mannschaften || []
  const embeddedA = sparte.ansprechpartner || []

  for (const m of embeddedM) {
    if (!m?.name) continue
    const key = `${sparte._id}::${norm(m.name)}`
    if (!mannschaftByKey.has(key)) {
      const id = `mannschaft.${slugify(sparte.slug || sparte.name)}--${slugify(m.name)}`
      const doc = {
        _id: id,
        _type: 'mannschaft',
        name: m.name,
        bereich: inferBereich(m.name),
        sparte: { _type: 'reference', _ref: sparte._id },
        ...(m.beschreibung ? { beschreibung: m.beschreibung } : {}),
        ...(m.fotoRef ? { foto: { _type: 'image', asset: { _type: 'reference', _ref: m.fotoRef } } } : {}),
      }
      createMannschaften.push(doc)
      mannschaftByKey.set(key, { _id: id, name: m.name, sparteId: sparte._id, trainer: [] })
    }
  }

  for (const a of embeddedA) {
    if (!a?.name) continue
    const key = norm(a.name)
    const existing = personByKey.get(key)

    if (!existing) {
      const id = `person.${slugify(a.name)}`
      createPersonen.push({
        _id: id,
        _type: 'person',
        name: a.name,
        rollen: [/trainer/i.test(a.rolle || '') ? 'Trainer' : 'Ansprechpartner'],
        ...(a.email ? { email: a.email } : {}),
        ...(a.telefon ? { telefon: a.telefon } : {}),
        ...(a.whatsapp ? { whatsapp: a.whatsapp } : {}),
        ...(a.fotoRef ? { foto: { _type: 'image', asset: { _type: 'reference', _ref: a.fotoRef } } } : {}),
      })
      personByKey.set(key, { _id: id, name: a.name })
      continue
    }

    const set = {}
    if (!existing.email && a.email) set.email = a.email
    if (!existing.telefon && a.telefon) set.telefon = a.telefon
    if (!existing.whatsapp && a.whatsapp) set.whatsapp = a.whatsapp
    if (!existing.fotoRef && a.fotoRef) set.foto = { _type: 'image', asset: { _type: 'reference', _ref: a.fotoRef } }
    if (Object.keys(set).length > 0) patchPersonen.push({ personId: existing._id, set })
  }

  for (const a of embeddedA) {
    if (!a?.name || !/trainer/i.test(a.rolle || '')) continue
    const person = personByKey.get(norm(a.name))
    if (!person) continue

    const roleNorm = norm(a.rolle || '')
    const candidates = embeddedM.filter((m) => {
      const mn = norm(m.name || '')
      return mn && (roleNorm.includes(mn) || roleNorm.includes(mn.replace(/\(.*\)/, '').trim()))
    })

    if (candidates.length !== 1) {
      warnings.push({ type: 'UNSURE_TRAINER_MAPPING', sparte: sparte.name, person: a.name, rolle: a.rolle, candidateCount: candidates.length })
      continue
    }

    const target = mannschaftByKey.get(`${sparte._id}::${norm(candidates[0].name)}`)
    if (!target) continue
    const existingRefs = (target.trainer || []).map((t) => t._id || t._ref)
    if (!existingRefs.includes(person._id)) {
      patchMannschaften.push({ mannschaftId: target._id, personId: person._id })
      target.trainer = [...(target.trainer || []), { _id: person._id }]
    }
  }
}

const report = {
  mode: isApply ? 'APPLY' : 'DRY_RUN',
  counts: {
    createMannschaften: createMannschaften.length,
    createPersonen: createPersonen.length,
    patchPersonen: patchPersonen.length,
    patchMannschaftenAddTrainer: patchMannschaften.length,
    warnings: warnings.length,
  },
  note: isApply
    ? 'Apply ausgeführt. Legacy-Felder wurden nicht gelöscht.'
    : 'Dry-Run: keine Schreiboperationen. Nur mit --apply wird geschrieben.',
  sample: {
    createMannschaften: createMannschaften.slice(0, 20),
    createPersonen: createPersonen.slice(0, 20),
    patchPersonen: patchPersonen.slice(0, 20),
    patchMannschaftenAddTrainer: patchMannschaften.slice(0, 20),
    warnings: warnings.slice(0, 50),
  },
}

if (!isApply) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

for (const doc of createMannschaften) await client.createIfNotExists(doc)
for (const doc of createPersonen) await client.createIfNotExists(doc)
for (const p of patchPersonen) await client.patch(p.personId).set(p.set).commit()
for (const p of patchMannschaften) {
  await client
    .patch(p.mannschaftId)
    .setIfMissing({ trainer: [] })
    .append('trainer', [{ _type: 'reference', _ref: p.personId }])
    .commit()
}

console.log(JSON.stringify(report, null, 2))
