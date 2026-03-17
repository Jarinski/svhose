/**
 * scripts/patch-tischtennis-mannschaften.mjs
 *
 * Ergänzt fehlende Jugend-Mannschaften in der Sparte "Tischtennis".
 *
 * Ausführen: node scripts/patch-tischtennis-mannschaften.mjs
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const client = createClient({
  projectId: 'mhnx7pgn',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token:
    process.env.SANITY_API_WRITE_TOKEN ||
    'skDvTJJ15KvVyjs5b5qopi8CcA2PL52hFEjXnHBDe2JAxzWF22LPbpnyhmHnMRngIsO0tvAhG53nyBXHezzUOXVOwgfNev9gnI33ChHNY7GQGoSZK1UGcMAGhRvmjkWjOZtJ53BkVKyEby5nBSlVcsVM2YgsuhGlCgLmXB9trrDAmnjrKVQc',
  useCdn: false,
})

const neueMannschaften = [
  { name: 'Jugend J13-1', beschreibung: 'Kreisliga' },
  { name: 'Jugend J13-II', beschreibung: 'Kreisliga' },
  { name: 'Jugend J15', beschreibung: 'Kreisliga' },
  { name: 'Jugend J19', beschreibung: 'Kreisliga' },
]

const mannschaftsBilder = {
  'Jugend J13-1': 'TT_J13_1_2025.webp',
  'Jugend J13-II': 'TT_J13_2_2025.webp',
  'Jugend J15': 'TT_J15_2025-768x576.webp',
  'Jugend J19': 'TT_J19_2025-768x576.webp',
}

async function uploadImage(filename) {
  const filePath = path.join(ROOT, 'public', 'images', filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Bilddatei nicht gefunden: ${filePath}`)
  }
  const stream = fs.createReadStream(filePath)
  const asset = await client.assets.upload('image', stream, { filename })
  return asset._id
}

async function main() {
  console.log('Hole Tischtennis-Sparte ...')

  let doc = await client.fetch(`*[_type == "sparte" && slug.current == "tischtennis"][0]`)

  if (!doc) {
    console.error('❌ Sparte "tischtennis" nicht gefunden.')
    process.exit(1)
  }

  const vorhandeneNamen = new Set((doc.mannschaften ?? []).map(m => (m.name ?? '').trim().toLowerCase()))
  const hinzuzufuegen = neueMannschaften.filter(
    m => !vorhandeneNamen.has(m.name.trim().toLowerCase())
  )

  if (hinzuzufuegen.length > 0) {
    await client
      .patch(doc._id)
      .append(
        'mannschaften',
        hinzuzufuegen.map(m => ({ _type: 'object', name: m.name, beschreibung: m.beschreibung }))
      )
      .commit({ autoGenerateArrayKeys: true })

    console.log('✅ Mannschaften ergänzt:')
    for (const m of hinzuzufuegen) {
      console.log(`  - ${m.name}, ${m.beschreibung}`)
    }
  } else {
    console.log('✅ Alle gewünschten Mannschaften sind bereits vorhanden.')
  }

  // Nach möglichem Append neu laden, damit _key sicher vorhanden ist
  doc = await client.fetch(`*[_type == "sparte" && slug.current == "tischtennis"][0]`)

  const patch = client.patch(doc._id)
  let bilderGesetzt = 0

  for (const [mannschaftName, filename] of Object.entries(mannschaftsBilder)) {
    const eintrag = (doc.mannschaften ?? []).find(m => m?.name === mannschaftName)
    if (!eintrag?._key) {
      console.log(`⚠ Mannschaft nicht gefunden (kein Bild gesetzt): ${mannschaftName}`)
      continue
    }

    const assetId = await uploadImage(filename)
    patch.set({
      [`mannschaften[_key == "${eintrag._key}"].foto`]: {
        _type: 'image',
        asset: { _type: 'reference', _ref: assetId },
      },
    })
    bilderGesetzt++
    console.log(`🖼️  Bild gesetzt: ${mannschaftName} ← ${filename}`)
  }

  if (bilderGesetzt > 0) {
    await patch.commit({ autoGenerateArrayKeys: true })
    console.log(`✅ ${bilderGesetzt} Mannschaftsbild(er) in Sanity gesetzt.`)
  } else {
    console.log('ℹ️ Keine Mannschaftsbilder gesetzt.')
  }
}

main().catch(err => {
  console.error('❌ Fehler:', err.message)
  process.exit(1)
})
