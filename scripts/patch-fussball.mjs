/**
 * scripts/patch-fussball.mjs
 *
 * Pflegt fehlende Daten direkt in Sanity ein:
 *  1. Christian Junge als Trainer U15 in den Ansprechpartnern
 *  2. Foto für U15-Mannschaft (U15.jpeg)
 *  3. Foto für E-Juniorinnen-Mannschaft (ejuniorinnen.png)
 *
 * Ausführen: node scripts/patch-fussball.mjs
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Sanity Client ──────────────────────────────────────────────────────────
const client = createClient({
  projectId: 'mhnx7pgn',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'skDvTJJ15KvVyjs5b5qopi8CcA2PL52hFEjXnHBDe2JAxzWF22LPbpnyhmHnMRngIsO0tvAhG53nyBXHezzUOXVOwgfNev9gnI33ChHNY7GQGoSZK1UGcMAGhRvmjkWjOZtJ53BkVKyEby5nBSlVcsVM2YgsuhGlCgLmXB9trrDAmnjrKVQc',
  useCdn: false,
})

// ─── Hilfsfunktion: Bild hochladen ──────────────────────────────────────────
async function uploadImage(filePath, filename) {
  console.log(`  Lade Bild hoch: ${filename} ...`)
  const stream = fs.createReadStream(filePath)
  const asset = await client.assets.upload('image', stream, { filename })
  console.log(`  ✓ Hochgeladen: ${asset._id}`)
  return asset._id
}

// ─── Hauptprogramm ──────────────────────────────────────────────────────────
async function main() {
  console.log('Hole Fußball-Sparte aus Sanity ...')

  // Vollständiges Dokument holen (inkl. _key in Arrays)
  const doc = await client.fetch(
    `*[_type == "sparte" && slug.current == "fussball"][0]`
  )

  if (!doc) {
    console.error('❌ Fußball-Sparte nicht in Sanity gefunden!')
    process.exit(1)
  }

  console.log(`✓ Dokument gefunden: ${doc._id}`)

  const patch = client.patch(doc._id)
  let changed = false

  // ── 1. Christian Junge als Ansprechpartner hinzufügen ─────────────────────
  const apNames = (doc.ansprechpartner ?? []).map(a => a.name.toLowerCase())
  if (!apNames.includes('christian junge')) {
    console.log('\n[1] Füge Christian Junge als Trainer U15 hinzu ...')
    patch.append('ansprechpartner', [{
      _type: 'object',
      name: 'Christian Junge',
      rolle: 'Trainer U15',
      email: 'christian.junge@sv-holm-seppensen.de',
      telefon: '0173-8415438',
      whatsapp: '',
    }])
    changed = true
    console.log('  ✓ Christian Junge wird eingefügt')
  } else {
    console.log('\n[1] Christian Junge ist bereits vorhanden – überspringe')
  }

  // ── 2. Foto für U15-Mannschaft ─────────────────────────────────────────────
  const u15Mann = (doc.mannschaften ?? []).find(m => m.name && m.name.startsWith('U15'))
  if (u15Mann) {
    if (!u15Mann.foto) {
      console.log('\n[2] Setze Foto für U15 ...')
      const imgPath = path.join(ROOT, 'public', 'images', 'U15.jpeg')
      const assetId = await uploadImage(imgPath, 'U15.jpeg')
      patch.set({
        [`mannschaften[_key == "${u15Mann._key}"].foto`]: {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId },
        },
      })
      changed = true
    } else {
      console.log('\n[2] U15 hat bereits ein Foto – überspringe')
    }
  } else {
    console.log('\n[2] ⚠ U15-Mannschaft nicht gefunden')
  }

  // ── 3. Foto für E-Juniorinnen-Mannschaft ──────────────────────────────────
  const ejMann = (doc.mannschaften ?? []).find(
    m => m.name && m.name.toLowerCase().includes('juniorinnen')
  )
  if (ejMann) {
    if (!ejMann.foto) {
      console.log('\n[3] Setze Foto für E-Juniorinnen ...')
      const imgPath = path.join(ROOT, 'public', 'images', 'ejuniorinnen.png')
      const assetId = await uploadImage(imgPath, 'ejuniorinnen.png')
      patch.set({
        [`mannschaften[_key == "${ejMann._key}"].foto`]: {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId },
        },
      })
      changed = true
    } else {
      console.log('\n[3] E-Juniorinnen haben bereits ein Foto – überspringe')
    }
  } else {
    console.log('\n[3] ⚠ E-Juniorinnen-Mannschaft nicht gefunden')
  }

  // ── Patch absenden ─────────────────────────────────────────────────────────
  if (changed) {
    console.log('\nSende Patch an Sanity ...')
    const result = await patch.commit({ autoGenerateArrayKeys: true })
    console.log(`\n✅ Erfolgreich aktualisiert: ${result._id}`)
  } else {
    console.log('\n✅ Nichts zu tun – alle Daten sind bereits aktuell.')
  }
}

main().catch(err => {
  console.error('❌ Fehler:', err.message)
  process.exit(1)
})
