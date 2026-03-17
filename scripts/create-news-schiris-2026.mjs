/**
 * scripts/create-news-schiris-2026.mjs
 *
 * Legt den News-Beitrag "5 neue Schiedsrichter" in Sanity an
 * und verknüpft das lokale Beitragsbild public/images/Schiris-1.webp.
 *
 * Ausführen:
 *   node scripts/create-news-schiris-2026.mjs
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

const slug = '5-neue-schiedsrichter'
const documentId = `news-${slug}`
const imagePath = path.join(ROOT, 'public', 'images', 'Schiris-1.webp')

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
    filename: 'Schiris-1.webp',
    contentType: 'image/webp',
  })

  const bodyTexts = [
    'Beim aktuellen Schiedsrichter-Anwärterlehrgang des NFV Kreis Harburg haben insgesamt zwölf neue Unparteiische ihre Prüfung erfolgreich bestanden. Nach intensiver Vorbereitung dürfen sie nun offiziell Spiele leiten.',
    'Besonders stolz sind wir beim SV Holm-Seppensen auf gleich fünf neue Schiedsrichter:innen aus unseren Reihen: Hugo Broyer, Mathis Hehling, Felix Kipping, Joel Krause und Daniela Winkler.',
    'Eine besondere Leistung zeigte Felix Kipping, der als einziger Prüfling alle Fragen fehlerfrei beantwortete. Herzlichen Glückwunsch – wir sind sehr stolz auf euch und wünschen euch viel Erfolg an der Pfeife!',
    'Hier geht es zum ganzen Artikel:',
    'https://www.nfv-kreisharburg.de/nfv-kreis/news/news-detail/anwaerterlehrgang-1-2026',
  ]

  const doc = {
    _id: documentId,
    _type: 'newsPost',
    title: '5 neue Schiedsrichter für den SV Holm-Seppensen',
    slug: { _type: 'slug', current: slug },
    datum: '2026-03-17',
    category: 'Fußball',
    sparte: 'Fußball',
    excerpt:
      'Beim NFV Kreis Harburg haben zwölf neue Unparteiische bestanden – darunter gleich fünf vom SV Holm-Seppensen.',
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
