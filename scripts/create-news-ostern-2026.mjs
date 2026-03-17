/**
 * scripts/create-news-ostern-2026.mjs
 *
 * Legt den News-Beitrag "Ostereier-Suche beim SV Holm-Seppensen" in Sanity an
 * und verknüpft das lokale Beitragsbild public/images/Ostern_2026_quadratisch.webp.
 *
 * Ausführen:
 *   node scripts/create-news-ostern-2026.mjs
 */

import { createClient } from '@sanity/client'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

config({ path: path.join(ROOT, '.env.local') })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId) {
  console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID fehlt in .env.local')
  process.exit(1)
}
if (!token) {
  console.error('❌ SANITY_API_WRITE_TOKEN fehlt in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const slug = 'ostereier-suche-2026'
const documentId = `news-${slug}`
const imagePath = path.join(ROOT, 'public', 'images', 'Ostern_2026_quadratisch.webp')

function textBlock(text, index) {
  return {
    _type: 'block',
    _key: `block-${index}`,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `span-${index}`,
        text,
        marks: [],
      },
    ],
  }
}

async function main() {
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Bilddatei nicht gefunden: ${imagePath}`)
    process.exit(1)
  }

  console.log(`🚀 Erstelle News-Beitrag in Sanity [${projectId}/${dataset}] ...`)

  const imageStream = fs.createReadStream(imagePath)
  const imageAsset = await client.assets.upload('image', imageStream, {
    filename: 'Ostern_2026_quadratisch.webp',
    contentType: 'image/webp',
  })

  const bodyTexts = [
    'Wir laden alle Vereinsmitglieder bis 12 Jahre zur fröhlichen Ostereier-Suche bei uns auf das Vereinsgelände ein.',
    'Am Ostersamstag (4. April) könnt Ihr bei uns am Vereinsheim, Tostedter Weg von 11-13 Uhr nach bunten Ostereiern und -hasen suchen.',
    'Bitte meldet Euch dafür bis zum 21. März per E-Mail bei uns an: ostern@sv-holm-seppensen.de',
    'Wir freuen uns auf einen tollen Vormittag mit Euch!',
  ]

  const doc = {
    _id: documentId,
    _type: 'newsPost',
    title: 'Ostereier-Suche beim SV Holm-Seppensen',
    slug: { _type: 'slug', current: slug },
    datum: '2026-03-17',
    category: 'Verein',
    sparte: 'Allgemein',
    excerpt:
      'Einladung zur Ostereier-Suche für Vereinsmitglieder bis 12 Jahre am Ostersamstag (4. April), 11-13 Uhr am Vereinsheim.',
    image: {
      _type: 'image',
      asset: { _type: 'reference', _ref: imageAsset._id },
    },
    body: bodyTexts.map((text, i) => textBlock(text, i)),
  }

  await client.createOrReplace(doc)

  const created = await client.fetch(
    `*[_type == "newsPost" && _id == $id][0]{_id, title, "slug": slug.current, datum, category, sparte, "image": image.asset->_id}`,
    { id: documentId },
  )

  if (!created) {
    console.error('❌ Beitrag konnte nicht verifiziert werden.')
    process.exit(1)
  }

  console.log('✅ News-Beitrag erfolgreich erstellt/aktualisiert:')
  console.log(created)
  console.log(`🔗 Studio: https://${projectId}.sanity.studio/structure/newsPost;${documentId}`)
}

main().catch(err => {
  console.error('❌ Fehler:', err.message)
  process.exit(1)
})
