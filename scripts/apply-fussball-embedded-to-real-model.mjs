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

function inferBereich(name = '') {
  const n = norm(name)
  if (/hobby|just ?4 ?fun|hoseunited|freizeit/.test(n)) return 'Freizeit'
  if (/damen|frauen/.test(n)) return 'Damen'
  if (/herren/.test(n)) return 'Herren'
  if (/\bu\d+\b|junioren|juniorinnen|madchen|maedchen|jg/.test(n)) return 'Junioren'
  return 'Freizeit'
}

function normalizePhone(v = '') {
  return String(v || '').trim()
}

function makePersonDocId(name) {
  return `person.${slugify(name)}`
}

function makeMannschaftDocId(name) {
  return `mannschaft.fussball--${slugify(name)}`
}

function makeTrainerKey(ref = '') {
  return `trainer-${slugify(ref.replace(/^person\./, ''))}`
}

const payload = await client.fetch(`{
  "fussball": *[_type == "sparte" && slug.current == "fussball"][0]{
    _id,
    name,
    "slug": slug.current,
    mannschaften[]{
      _key,
      name,
      beschreibung,
      "fotoRef": foto.asset._ref
    },
    ansprechpartner[]{
      _key,
      name,
      rolle,
      email,
      telefon,
      whatsapp,
      "fotoRef": foto.asset._ref
    }
  },
  "realMannschaften": *[_type == "mannschaft" && sparte->slug.current == "fussball"]{
    _id,
    name,
    bereich,
    "sparteId": sparte._ref,
    trainer[]->{
      _id,
      name,
      email,
      telefon,
      whatsapp,
      "fotoRef": foto.asset._ref
    }
  },
  "persons": *[_type == "person"]{
    _id,
    name,
    rollen,
    email,
    telefon,
    whatsapp,
    "fotoRef": foto.asset._ref
  },
  "aps": *[_type == "ansprechpartner"]{
    _id,
    name,
    funktion,
    gruppe,
    sparte,
    email,
    telefon,
    "fotoUrl": foto.asset->url,
    "fotoRef": foto.asset._ref
  }
}`)

if (!payload?.fussball?._id) {
  console.error('Fußball-Sparte nicht gefunden')
  process.exit(1)
}

const fussball = payload.fussball
const embeddedMannschaften = fussball.mannschaften || []
const embeddedAnsprechpartner = fussball.ansprechpartner || []
const realMannschaften = payload.realMannschaften || []
const persons = payload.persons || []
const aps = payload.aps || []

const personByNormName = new Map(persons.map((p) => [norm(p.name), p]))
const apByNormName = new Map()
for (const ap of aps) {
  const key = norm(ap.name)
  const existing = apByNormName.get(key)
  if (!existing) {
    apByNormName.set(key, ap)
    continue
  }
  const existingScore = (existing.fotoRef ? 2 : 0) + (existing.email ? 1 : 0)
  const candidateScore = (ap.fotoRef ? 2 : 0) + (ap.email ? 1 : 0)
  if (candidateScore > existingScore) apByNormName.set(key, ap)
}
const mannschaftByNormName = new Map(realMannschaften.map((m) => [norm(m.name), m]))
const originalPersonNameSet = new Set(persons.map((p) => norm(p.name)))

const createMannschaften = []
const createPersons = []
const patchPersons = []
const patchMannschaften = []
const warnings = []
const jariResolution = {
  detected: {
    embedded: null,
    ansprechpartner: null,
    person: null,
  },
  suggestion: null,
}

for (const em of embeddedMannschaften) {
  if (!em?.name) continue
  const existing = mannschaftByNormName.get(norm(em.name))
  if (!existing) {
    createMannschaften.push({
      _id: makeMannschaftDocId(em.name),
      _type: 'mannschaft',
      name: em.name,
      beschreibung: em.beschreibung || '',
      bereich: inferBereich(em.name),
      sparte: { _type: 'reference', _ref: fussball._id },
      ...(em.fotoRef
        ? { foto: { _type: 'image', asset: { _type: 'reference', _ref: em.fotoRef } } }
        : {}),
    })
  }
}

for (const ap of embeddedAnsprechpartner) {
  if (!ap?.name) continue

  const apNorm = norm(ap.name)
  const isTrainer = /trainer/i.test(ap.rolle || '')

  if (apNorm === norm('Jari Gonzales')) {
    jariResolution.detected.embedded = {
      name: ap.name,
      rolle: ap.rolle || null,
      email: ap.email || null,
      telefon: ap.telefon || null,
      fotoRef: ap.fotoRef || null,
    }
    const apJariReyes = apByNormName.get(norm('Jari Gonzales Reyes'))
    if (apJariReyes) {
      jariResolution.detected.ansprechpartner = {
        id: apJariReyes._id,
        name: apJariReyes.name,
        email: apJariReyes.email || null,
        telefon: apJariReyes.telefon || null,
        fotoRef: apJariReyes.fotoRef || null,
      }
    }
  }

  let targetPerson = personByNormName.get(apNorm)

  if (apNorm === norm('Jari Gonzales')) {
    const personJariReyes = personByNormName.get(norm('Jari Gonzales Reyes'))
    const apJariReyes = apByNormName.get(norm('Jari Gonzales Reyes'))
    if (personJariReyes) {
      targetPerson = personJariReyes
      jariResolution.detected.person = {
        id: personJariReyes._id,
        name: personJariReyes.name,
        fotoRef: personJariReyes.fotoRef || null,
      }
      jariResolution.suggestion = {
        mode: 'reuse_existing_person',
        canonicalName: personJariReyes.name,
        personId: personJariReyes._id,
        photo: personJariReyes.fotoRef
          ? 'use_person_photo'
          : apJariReyes?.fotoRef
            ? 'patch_person_photo_from_ansprechpartner'
            : apJariReyes?.fotoUrl
              ? 'ansprechpartner_has_url_but_no_asset_ref_manual_check'
              : 'no_photo_source',
        reason: 'Embedded Jari Gonzales wird als dieselbe Person wie Jari Gonzales Reyes behandelt',
      }
    } else {
      const newId = makePersonDocId('Jari Gonzales Reyes')
      const doc = {
        _id: newId,
        _type: 'person',
        name: 'Jari Gonzales Reyes',
        rollen: [isTrainer ? 'Trainer' : 'Ansprechpartner'],
        email: apJariReyes?.email || ap.email || '',
        telefon: normalizePhone(apJariReyes?.telefon || ap.telefon || ''),
        whatsapp: '',
        ...(apJariReyes?.fotoRef
          ? { foto: { _type: 'image', asset: { _type: 'reference', _ref: apJariReyes.fotoRef } } }
          : ap.fotoRef
            ? { foto: { _type: 'image', asset: { _type: 'reference', _ref: ap.fotoRef } } }
            : {}),
      }
      createPersons.push(doc)
      targetPerson = { ...doc }
      personByNormName.set(norm(doc.name), targetPerson)
      jariResolution.suggestion = {
        mode: 'create_person_from_ansprechpartner',
        canonicalName: doc.name,
        personId: doc._id,
        takePhotoFrom: apJariReyes?.fotoRef
          ? 'ansprechpartner:Jari Gonzales Reyes'
          : apJariReyes?.fotoUrl
            ? 'ansprechpartner-url-without-asset-ref-manual-check'
            : ap.fotoRef
              ? 'embedded'
              : 'none',
      }
    }
  }

  if (!targetPerson) {
    const newId = makePersonDocId(ap.name)
    const existingPlanned = createPersons.find((p) => p._id === newId)
    if (!existingPlanned) {
      const doc = {
        _id: newId,
        _type: 'person',
        name: ap.name,
        rollen: [isTrainer ? 'Trainer' : 'Ansprechpartner'],
        ...(ap.email ? { email: ap.email } : {}),
        ...(ap.telefon ? { telefon: normalizePhone(ap.telefon) } : {}),
        ...(ap.whatsapp ? { whatsapp: ap.whatsapp } : {}),
        ...(ap.fotoRef ? { foto: { _type: 'image', asset: { _type: 'reference', _ref: ap.fotoRef } } } : {}),
      }
      createPersons.push(doc)
      targetPerson = { ...doc }
      personByNormName.set(norm(doc.name), targetPerson)
    } else {
      targetPerson = existingPlanned
    }
  }

  const personPatch = {}
  if (!targetPerson.email && ap.email) personPatch.email = ap.email
  if (!targetPerson.telefon && ap.telefon) personPatch.telefon = normalizePhone(ap.telefon)
  if (!targetPerson.whatsapp && ap.whatsapp) personPatch.whatsapp = ap.whatsapp
  if (!targetPerson.fotoRef && ap.fotoRef) {
    personPatch.foto = { _type: 'image', asset: { _type: 'reference', _ref: ap.fotoRef } }
  }

  if (Object.keys(personPatch).length > 0 && targetPerson._id && !String(targetPerson._id).startsWith('person.')) {
    patchPersons.push({ personId: targetPerson._id, set: personPatch })
  }
}

for (const em of embeddedMannschaften) {
  if (!em?.name) continue
  const real = mannschaftByNormName.get(norm(em.name)) || createMannschaften.find((m) => norm(m.name) === norm(em.name))
  if (!real) continue

  const roleMatches = embeddedAnsprechpartner.filter((ap) => {
    const r = norm(ap.rolle || '')
    const n = norm(em.name)
    const base = n.replace(/\bjg\b.*$/, '').trim()
    return r.includes(n) || (base && r.includes(base))
  })

  if (roleMatches.length === 0) {
    warnings.push({
      type: 'NO_TRAINER_MATCH_FOR_TEAM',
      team: em.name,
      message: 'Kein eindeutiger Trainer aus embedded Ansprechpartner abgeleitet',
    })
    continue
  }

  const trainerRefs = []
  for (const ap of roleMatches) {
    let person =
      norm(ap.name) === norm('Jari Gonzales')
        ? personByNormName.get(norm('Jari Gonzales Reyes')) || personByNormName.get(norm(ap.name))
        : personByNormName.get(norm(ap.name))

    if (!person?._id) {
      warnings.push({
        type: 'UNRESOLVED_PERSON_FOR_TRAINER',
        team: em.name,
        trainerName: ap.name,
      })
      continue
    }

    trainerRefs.push({ _type: 'reference', _ref: person._id, _key: makeTrainerKey(person._id) })
  }

  const uniqueRefs = Array.from(new Map(trainerRefs.map((r) => [r._ref, r])).values())
  if (uniqueRefs.length === 0) continue

  patchMannschaften.push({
    mannschaftId: real._id,
    trainer: uniqueRefs,
  })
}

for (const em of embeddedMannschaften) {
  if (!em?.name) continue
  if (!em.beschreibung) {
    warnings.push({
      type: 'EMPTY_DESCRIPTION',
      team: em.name,
    })
  }
  warnings.push({
    type: 'JAHRGANG_NOT_SET',
    team: em.name,
    message: 'jahrgang bleibt leer (wie gewünscht), bitte später manuell zuordnen',
  })
}

const dedupeBy = (arr, keyFn) => Array.from(new Map(arr.map((i) => [keyFn(i), i])).values())

const finalCreatePersons = dedupeBy(createPersons, (p) => p._id)
const finalCreateMannschaften = dedupeBy(createMannschaften, (m) => m._id)
const finalPatchPersons = dedupeBy(patchPersons, (p) => `${p.personId}::${JSON.stringify(p.set)}`)
const finalPatchMannschaften = dedupeBy(patchMannschaften, (p) => `${p.mannschaftId}::${p.trainer.map((t) => t._ref).sort().join('|')}`)

const report = {
  mode: isApply ? 'APPLY' : 'DRY_RUN',
  guard: {
    writeOnlyWithApplyFlag: true,
    applyFlagActive: isApply,
    noDeletes: true,
    noLegacyFieldRemoval: true,
  },
  scope: {
    sparte: fussball.name,
    sparteId: fussball._id,
    embeddedMannschaften: embeddedMannschaften.length,
    embeddedAnsprechpartner: embeddedAnsprechpartner.length,
    existingRealMannschaften: realMannschaften.length,
  },
  counts: {
    createMannschaften: finalCreateMannschaften.length,
    createPersons: finalCreatePersons.length,
    patchPersons: finalPatchPersons.length,
    patchMannschaftenTrainer: finalPatchMannschaften.length,
    warnings: warnings.length,
  },
  matching: {
    existingPersonsMatchedByName: embeddedAnsprechpartner.filter((a) => originalPersonNameSet.has(norm(a.name))).length,
    existingAnsprechpartnerDocsWithSameName: embeddedAnsprechpartner.filter((a) => apByNormName.has(norm(a.name))).length,
  },
  jariCase: jariResolution,
  sample: {
    createMannschaften: finalCreateMannschaften,
    createPersons: finalCreatePersons,
    patchPersons: finalPatchPersons,
    patchMannschaftenTrainer: finalPatchMannschaften,
    warnings,
  },
}

if (!isApply) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

for (const doc of finalCreateMannschaften) {
  await client.createIfNotExists(doc)
}

for (const doc of finalCreatePersons) {
  await client.createIfNotExists(doc)
}

for (const patch of finalPatchPersons) {
  await client.patch(patch.personId).set(patch.set).commit()
}

for (const patch of finalPatchMannschaften) {
  await client.patch(patch.mannschaftId).set({ trainer: patch.trainer }).commit()
}

console.log(JSON.stringify(report, null, 2))
