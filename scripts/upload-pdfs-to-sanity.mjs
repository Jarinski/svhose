/**
 * scripts/upload-pdfs-to-sanity.mjs
 *
 * Lädt alle lokalen PDFs als Sanity-File-Assets hoch und verknüpft sie
 * mit den vorhandenen Download-Dokumenten in Sanity.
 *
 * Ausführen:
 *   node scripts/upload-pdfs-to-sanity.mjs
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

if (!projectId) { console.error('❌  NEXT_PUBLIC_SANITY_PROJECT_ID fehlt'); process.exit(1) }
if (!token)     { console.error('❌  SANITY_API_WRITE_TOKEN fehlt');         process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

// ─── Explizites Mapping: Sanity-Dokument-ID → lokale Datei ──────────────────
// Passe diese Zuordnung an, falls sich Dateinamen ändern.
const MAPPING = [
  { docId: 'dl-1', localFile: 'public/pdfs/Aufnahmeantrag_2024_Q2.pdf' },
  { docId: 'dl-2', localFile: 'public/pdfs/Beitragsordnung-2025_Final.pdf' },
  { docId: 'dl-3', localFile: 'public/pdfs/Satzung_060525.pdf' },
  { docId: 'dl-4', localFile: 'public/pdfs/Einwilligungserklaerung_foto_film.pdf' },
  { docId: 'dl-5', localFile: 'public/pdfs/Positionierung_Selbstverpflichtungserklaerung_SVHOSE.pdf' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function uploadPdf(filePath) {
  const filename = path.basename(filePath)
  console.log(`  ⬆  Uploading: ${filename}`)
  const stream = fs.createReadStream(filePath)
  const asset = await client.assets.upload('file', stream, {
    filename,
    contentType: 'application/pdf',
  })
  console.log(`  ✓  Uploaded: ${filename} → ${asset._id}`)
  return asset
}

async function patchDocument(docId, assetId) {
  await client
    .patch(docId)
    .set({ datei: { _type: 'file', asset: { _type: 'reference', _ref: assetId } } })
    .commit()
  console.log(`  ✓  Gepatcht: Dokument ${docId}`)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀  PDF-Upload → Sanity [${projectId}/${dataset}]\n`)

  // Status der vorhandenen Dokumente anzeigen
  const docs = await client.fetch(`
    *[_type == "download"] | order(_id asc) {
      _id, titel, dateiUrl,
      "hatDatei": defined(datei.asset)
    }
  `)
  console.log(`📋  Download-Dokumente in Sanity (${docs.length}):`)
  for (const d of docs) {
    const status = d.hatDatei ? '✅ hat Datei' : '❌ kein Asset'
    console.log(`   [${d._id}] "${d.titel}" – ${status}`)
  }

  console.log('\n📤  Starte Upload & Verknüpfung …\n')

  for (const { docId, localFile } of MAPPING) {
    const doc = docs.find(d => d._id === docId)
    if (!doc) {
      console.log(`  ⚠  Dokument "${docId}" nicht in Sanity gefunden – überspringe`)
      continue
    }
    if (doc.hatDatei) {
      console.log(`  ⏭  Überspringe "${doc.titel}" (hat bereits ein Datei-Asset)`)
      continue
    }

    const absPath = path.join(root, localFile)
    if (!fs.existsSync(absPath)) {
      console.log(`  ⚠  Lokale Datei nicht gefunden: ${localFile}`)
      continue
    }

    try {
      const asset = await uploadPdf(absPath)
      await patchDocument(docId, asset._id)
    } catch (err) {
      console.error(`  ✗  Fehler bei "${doc.titel}":`, err.message)
    }
  }

  // Finalen Status anzeigen
  const docsAfter = await client.fetch(`
    *[_type == "download"] | order(_id asc) {
      _id, titel,
      "hatDatei": defined(datei.asset),
      "dateiUrl": coalesce(datei.asset->url, dateiUrl)
    }
  `)
  console.log('\n📊  Finaler Status:')
  for (const d of docsAfter) {
    const status = d.hatDatei ? '✅' : '⚠ '
    console.log(`   ${status} [${d._id}] "${d.titel}" → ${d.dateiUrl ?? '–'}`)
  }

  console.log('\n✅  Fertig!')
  console.log(`   Studio: https://${projectId}.sanity.studio/structure/download`)
  console.log('   Hinweis: Satzung und Selbstverpflichtungserklärung bitte manuell im Studio hochladen.')
}

main().catch(err => { console.error('Fehler:', err); process.exit(1) })
