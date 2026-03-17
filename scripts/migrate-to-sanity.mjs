/**
 * scripts/migrate-to-sanity.mjs
 *
 * Migriert alle lokalen JSON-Daten und MDX-News ins Sanity-Projekt.
 *
 * Voraussetzungen:
 *   1. Sanity-Projekt anlegen: npx sanity@latest init (oder sanity.io/manage)
 *   2. .env.local befüllen (NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_WRITE_TOKEN)
 *   3. Ausführen: node scripts/migrate-to-sanity.mjs
 *
 * Einmalige Ausführung – schon vorhandene Daten werden nicht doppelt angelegt
 * (der _id wird aus dem Inhalt abgeleitet).
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { config } from 'dotenv'

// ─── Setup ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// .env.local laden
config({ path: path.join(root, '.env.local') })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset   = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token     = process.env.SANITY_API_WRITE_TOKEN

if (!projectId) {
  console.error('❌  NEXT_PUBLIC_SANITY_PROJECT_ID fehlt in .env.local')
  process.exit(1)
}
if (!token) {
  console.error('❌  SANITY_API_WRITE_TOKEN fehlt in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sanity-freundliche _id aus einem String ableiten */
function makeId(prefix, value) {
  return `${prefix}-${value.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase().slice(0, 80)}`
}

async function upsert(doc) {
  try {
    await client.createOrReplace(doc)
    console.log(`  ✓ ${doc._type}: ${doc._id}`)
  } catch (err) {
    console.error(`  ✗ ${doc._type} ${doc._id}:`, err.message)
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, 'content', file), 'utf8'))
}

// ─── Sparten ─────────────────────────────────────────────────────────────────

async function migrateSparten() {
  console.log('\n📂  Sparten …')
  const sparten = readJson('sparten.json')
  for (const s of sparten) {
    await upsert({
      _id:   makeId('sparte', s.slug),
      _type: 'sparte',
      slug:  { _type: 'slug', current: s.slug },
      name:  s.name,
      icon:  s.icon,
      farbe: s.farbe,
      beschreibung:     s.beschreibung,
      langbeschreibung: s.langbeschreibung,
      trainingszeiten_spartes: s.trainingszeiten_spartes ?? [],
      mannschaften: (s.mannschaften ?? []).map(m => ({
        _key: makeId('mann', m.name),
        name: m.name,
        beschreibung: m.beschreibung,
        // foto: Bild muss manuell hochgeladen werden
      })),
      ansprechpartner: (s.ansprechpartner ?? []).map((a, i) => ({
        _key: `ap-${i}`,
        name:     a.name,
        rolle:    a.rolle,
        email:    a.email,
        telefon:  a.telefon,
        whatsapp: a.whatsapp,
      })),
    })
  }
}

// ─── Termine ─────────────────────────────────────────────────────────────────

async function migrateTermine() {
  console.log('\n📅  Termine …')
  const termine = readJson('termine.json')
  for (const t of termine) {
    await upsert({
      _id:    makeId('termin', t.id),
      _type:  'termin',
      titel:  t.titel,
      datum:  t.datum,
      uhrzeit: t.uhrzeit,
      ort:    t.ort,
      sparte: t.sparte,
      beschreibung: t.beschreibung,
      tags:   t.tags ?? [],
    })
  }
}

// ─── Trainingszeiten ─────────────────────────────────────────────────────────

async function migrateTrainingszeiten() {
  console.log('\n🏋️  Trainingszeiten …')
  const zeiten = readJson('trainingszeiten.json')
  for (let i = 0; i < zeiten.length; i++) {
    const z = zeiten[i]
    await upsert({
      _id:      makeId('tz', `${z.sparte}-${z.gruppe}-${z.tag}-${i}`),
      _type:    'trainingszeit',
      sparte:   z.sparte,
      gruppe:   z.gruppe,
      tag:      z.tag,
      uhrzeit:  z.uhrzeit,
      ort:      z.ort,
      jahreszeit: z.jahreszeit,
      frequenz:   z.frequenz,
      trainer:    z.trainer,
      email:      z.email,
      telefon:    z.telefon,
    })
  }
}

// ─── Ansprechpartner ─────────────────────────────────────────────────────────

async function migrateAnsprechpartner() {
  console.log('\n👤  Ansprechpartner …')
  const personen = readJson('ansprechpartner.json')
  for (let i = 0; i < personen.length; i++) {
    const p = personen[i]
    await upsert({
      _id:        makeId('ap', p.id),
      _type:      'ansprechpartner',
      name:       p.name,
      funktion:   p.funktion,
      gruppe:     p.gruppe,
      sparte:     p.sparte,
      email:      p.email,
      telefon:    p.telefon,
      reihenfolge: i,
    })
  }
}

// ─── Downloads ───────────────────────────────────────────────────────────────

async function migrateDownloads() {
  console.log('\n📄  Downloads …')
  const downloads = readJson('downloads.json')
  for (let i = 0; i < downloads.length; i++) {
    const d = downloads[i]
    await upsert({
      _id:        makeId('dl', d.id),
      _type:      'download',
      titel:      d.titel,
      beschreibung: d.beschreibung,
      dateiUrl:   d.datei,   // lokaler /pdfs/-Pfad als Fallback-URL
      kategorie:  d.kategorie,
      datum:      d.datum,
      reihenfolge: i,
    })
  }
}

// ─── Partner ─────────────────────────────────────────────────────────────────

async function migratePartner() {
  console.log('\n🤝  Partner …')
  const partner = readJson('partner.json')
  for (let i = 0; i < partner.length; i++) {
    const p = partner[i]
    await upsert({
      _id:        makeId('partner', p.id),
      _type:      'partner',
      name:       p.name,
      url:        p.url || undefined,
      reihenfolge: i,
    })
  }
}

// ─── News (MDX) ──────────────────────────────────────────────────────────────

async function migrateNews() {
  console.log('\n📰  News (MDX) …')
  const newsDir = path.join(root, 'content', 'news')
  if (!fs.existsSync(newsDir)) { console.log('  (kein news-Ordner gefunden)'); return }

  const files = fs.readdirSync(newsDir).filter(f => f.endsWith('.mdx'))
  for (const filename of files) {
    const slug = filename.replace(/\.mdx$/, '')
    const { data, content } = matter(fs.readFileSync(path.join(newsDir, filename), 'utf8'))

    // Markdown-Inhalt in einfache Portable-Text-Blöcke umwandeln
    const paragraphs = content
      .split(/\n{2,}/)
      .map(s => s.trim())
      .filter(Boolean)
      .map((text, i) => ({
        _type: 'block',
        _key:  `block-${i}`,
        style: 'normal',
        children: [{ _type: 'span', _key: `span-${i}`, text, marks: [] }],
        markDefs: [],
      }))

    await upsert({
      _id:      makeId('news', slug),
      _type:    'newsPost',
      slug:     { _type: 'slug', current: slug },
      title:    data.title || slug,
      datum:    data.date || new Date().toISOString().split('T')[0],
      category: data.category || 'Allgemein',
      sparte:   data.sparte || 'Allgemein',
      excerpt:  data.excerpt || '',
      body:     paragraphs,
    })
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀  Starte Migration → Sanity [${projectId}/${dataset}]`)

  await migrateSparten()
  await migrateTermine()
  await migrateTrainingszeiten()
  await migrateAnsprechpartner()
  await migrateDownloads()
  await migratePartner()
  await migrateNews()

  console.log('\n✅  Migration abgeschlossen!')
  console.log('   Hinweis: Bilder (Fotos, Logos, PDFs) müssen manuell im Sanity Studio hochgeladen werden.')
  console.log(`   Studio: https://${projectId}.sanity.studio  oder  http://localhost:3000/studio`)
}

main().catch(err => {
  console.error('Fehler:', err)
  process.exit(1)
})
