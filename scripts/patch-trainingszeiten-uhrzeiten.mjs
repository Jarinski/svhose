/**
 * scripts/patch-trainingszeiten-uhrzeiten.mjs
 *
 * Liest die aus der Excel-Datei extrahierten Uhrzeiten und aktualisiert
 * alle Trainingszeit-Dokumente in Sanity mit dem uhrzeit-Feld.
 *
 * Ausführen: node scripts/patch-trainingszeiten-uhrzeiten.mjs
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

config({ path: path.join(root, '.env.local') })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset   = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token     = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !token) {
  console.error('❌  NEXT_PUBLIC_SANITY_PROJECT_ID oder SANITY_API_WRITE_TOKEN fehlt in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

// Mapping: kurze Tagesnamen (Excel) → vollständige (Sanity)
const TAG_MAP = {
  'Mo': 'Montag',
  'Di': 'Dienstag',
  'Mi': 'Mittwoch',
  'Do': 'Donnerstag',
  'Fr': 'Freitag',
  'Sa': 'Samstag',
  'So': 'Sonntag',
}

// Normiert einen String für den Vergleich:
// entfernt Zeilenumbrüche, mehrfache Leerzeichen, trimmt
function norm(s) {
  if (!s) return ''
  return s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

async function main() {
  // ── 1. Excel-Daten laden ────────────────────────────────────────────────
  const jsonPath = path.join(__dirname, 'trainingszeiten-with-times.json')
  const excelData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  // Nur Einträge mit gültigem Tag und Uhrzeit
  const excelEntries = excelData.filter(e => e.tag && e.uhrzeit && e.sparte && e.gruppe)
  console.log(`📋  ${excelEntries.length} Excel-Einträge mit Uhrzeit geladen`)

  // Aufbereitung: Tag normieren
  const prepared = excelEntries.map(e => ({
    ...e,
    tagFull: TAG_MAP[e.tag] ?? e.tag,
    _normSparte: norm(e.sparte),
    _normGruppe: norm(e.gruppe),
    _normOrt:    norm(e.ort),
  }))

  // ── 2. Sanity-Dokumente laden ────────────────────────────────────────────
  console.log('\n🔍  Lade Trainingszeiten aus Sanity …')
  const sanityDocs = await client.fetch(`
    *[_type == "trainingszeit"] {
      _id, sparte, gruppe, tag, ort, uhrzeit
    }
  `)
  console.log(`    ${sanityDocs.length} Dokumente gefunden`)

  // ── 3. Matching & Patch ──────────────────────────────────────────────────
  let updated = 0
  let skipped = 0
  let noMatch = 0

  for (const doc of sanityDocs) {
    const normSparte = norm(doc.sparte)
    const normGruppe = norm(doc.gruppe)
    const normTag    = norm(doc.tag)        // Sanity hat Vollnamen
    const normOrt    = norm(doc.ort)

    // Finde passenden Excel-Eintrag:
    // Übereinstimmung auf Sparte + Gruppe + Tag (Vollname) + Ort
    const match = prepared.find(e =>
      norm(e.tagFull) === normTag &&
      e._normSparte   === normSparte &&
      e._normGruppe   === normGruppe &&
      e._normOrt      === normOrt
    )

    if (!match) {
      // Versuch ohne Ort (Fallback)
      const matchNoOrt = prepared.filter(e =>
        norm(e.tagFull) === normTag &&
        e._normSparte   === normSparte &&
        e._normGruppe   === normGruppe
      )

      if (matchNoOrt.length === 1) {
        // Eindeutiger Match ohne Ort
        const m = matchNoOrt[0]
        console.log(`  ⚠️  Ort abweichend – nutze Fallback: ${doc.sparte} | ${doc.gruppe} | ${doc.tag} | Sanity-Ort="${doc.ort}" → "${m.uhrzeit}"`)
        if (doc.uhrzeit !== m.uhrzeit) {
          await client.patch(doc._id).set({ uhrzeit: m.uhrzeit }).commit()
          updated++
        } else {
          skipped++
        }
        continue
      }

      console.log(`  ✗  Kein Match: ${doc.sparte} | ${doc.gruppe} | ${doc.tag} | ${doc.ort}`)
      noMatch++
      continue
    }

    if (doc.uhrzeit === match.uhrzeit) {
      skipped++
      continue
    }

    await client.patch(doc._id).set({ uhrzeit: match.uhrzeit }).commit()
    console.log(`  ✓  ${doc.sparte} | ${doc.gruppe} | ${doc.tag} → ${match.uhrzeit}`)
    updated++
  }

  console.log(`\n✅  Fertig!`)
  console.log(`   Aktualisiert:  ${updated}`)
  console.log(`   Unverändert:   ${skipped}`)
  console.log(`   Kein Match:    ${noMatch}`)
}

main().catch(err => {
  console.error('Fehler:', err)
  process.exit(1)
})
