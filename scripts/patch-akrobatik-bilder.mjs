/**
 * scripts/patch-akrobatik-bilder.mjs
 *
 * Verknüpft hochgeladene Bilder für die Sparte "Akrobatik":
 * - Mannschaftsbilder (Anfänger, Girls, Friends, Sportakrobatik)
 * - Teamfoto der Sparte (Trainerteam)
 *
 * Ausführen: node scripts/patch-akrobatik-bilder.mjs
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

const mannschaftsBilder = {
  'Anfänger': 'kids.webp',
  'Girls': 'girls.webp',
  'Friends': 'friends.webp',
  'Sportakrobatik': 'sportakrobatik.webp',
}

const mannschaftsTexte = {
  'Anfänger': `In dieser Gruppe werden turnerische und akrobatische Grundlagen vermittelt. Die Gruppe präsentiert sich mit kleinen Auftritten auf vereinseigenen Veranstaltungen oder Dorffesten.
Kinder ab 1. Klasse und Mindestalter 6 Jahre!
Derzeit leider lange Warteliste!
Aufnahme auf die Warteliste frühestens 3 Monate vor Einschulung/6.Geburtstag.`,
  'Girls': `Showakrobatikgruppe Girls!

Die "Girls" sind schon lange nicht mehr nur die Nachwuchsgruppe der "Friends". Sie präsentieren sich auf kleinen und großen Bühnen in der Umgebung,
bei Wettbewerben, oder gemeinsam mit den Friends bei den eigenen Shows in der Buchholzer Empore.`,
  'Friends': `Auftrittsgruppe Friends!

Seit 34 Jahren präsentieren sich die "Friends" auf kleinen und großen Bühnen,
bei Wettbewerben, oder ihren eigenen Shows in der Buchholzer Empore.
Bereits 4x nahmen sie an einer Weltgymnaestrada (Lausanne, Helsinki, Dornbirn, Amsterdam) als Teil der offiziellen deutschen Delegation teil.`,
  'Sportakrobatik': `Die Athletinnen trainieren in festen Paaren /3-er Gruppen zusammen und arbeiten an anspruchsvollen Elementen aus der Sportakrobatik, u.a. Partnerakrobatik, 3-er Pyramiden und Würfe.`,
}

const trainerteamBild = 'Trainerteam_Akrobatik-400x238.jpg'

function imagePath(filename) {
  return path.join(ROOT, 'public', 'images', filename)
}

async function uploadImage(filename) {
  const filePath = imagePath(filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Bilddatei nicht gefunden: ${filePath}`)
  }
  const stream = fs.createReadStream(filePath)
  const asset = await client.assets.upload('image', stream, { filename })
  return asset._id
}

async function main() {
  const doc = await client.fetch(`*[_type == "sparte" && slug.current == "akrobatik"][0]`)

  if (!doc) {
    console.error('❌ Sparte "akrobatik" nicht gefunden.')
    process.exit(1)
  }

  const patch = client.patch(doc._id)

  let mannschaftCount = 0
  for (const [name, filename] of Object.entries(mannschaftsBilder)) {
    const eintrag = (doc.mannschaften ?? []).find(m => m?.name === name)
    if (!eintrag?._key) {
      console.log(`⚠ Mannschaft nicht gefunden: ${name}`)
      continue
    }

    const assetId = await uploadImage(filename)
    patch.set({
      [`mannschaften[_key == "${eintrag._key}"].foto`]: {
        _type: 'image',
        asset: { _type: 'reference', _ref: assetId },
      },
    })

    if (mannschaftsTexte[name]) {
      patch.set({
        [`mannschaften[_key == "${eintrag._key}"].beschreibung`]: mannschaftsTexte[name],
      })
      console.log(`📝 Text gesetzt: ${name}`)
    }

    mannschaftCount++
    console.log(`🖼️  Mannschaftsbild gesetzt: ${name} ← ${filename}`)
  }

  const trainerteamAssetId = await uploadImage(trainerteamBild)
  patch.set({
    foto: {
      _type: 'image',
      asset: { _type: 'reference', _ref: trainerteamAssetId },
    },
  })
  console.log(`🖼️  Teamfoto gesetzt: ${trainerteamBild}`)

  await patch.commit({ autoGenerateArrayKeys: true })
  console.log(`✅ Fertig. ${mannschaftCount} Mannschaftsbilder + Teamfoto aktualisiert.`)
}

main().catch(err => {
  console.error('❌ Fehler:', err.message)
  process.exit(1)
})
