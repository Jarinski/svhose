/**
 * scripts/sanity-export.mjs
 *
 * Einmaliger, verlustfreier Export aller Inhalte aus Sanity – Grundlage für den
 * Umzug in die SQLite-Datenbank (scripts/import-aus-sanity.ts).
 *
 * Schreibt nach data/import/ (nicht im Git, enthält personenbezogene Daten):
 *   sanity-export.json   – alle veröffentlichten Dokumente, offene Entwürfe und Asset-Metadaten
 *   assets/<asset-id>.<ext> – alle referenzierten Bilder und Dateien
 *
 * Aufruf: node scripts/sanity-export.mjs
 * Benötigt NEXT_PUBLIC_SANITY_PROJECT_ID und SANITY_API_READ_TOKEN (oder ..._WRITE_TOKEN) in .env.local.
 * Nutzt kein Sanity-Paket, nur fetch – funktioniert also auch nach dem Entfernen der Sanity-Abhängigkeiten.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const sha1 = inhalt => createHash('sha1').update(inhalt).digest('hex')

const ZIEL = path.resolve('data', 'import')
const ASSET_ZIEL = path.join(ZIEL, 'assets')
const TYPEN = [
  'sparte', 'mannschaft', 'person', 'jahrgang', 'trainingsplatz', 'trainingszeit',
  'ansprechpartner', 'newsPost', 'termin', 'download', 'partner',
]

function leseEnv() {
  const env = { ...process.env }
  if (fs.existsSync('.env.local')) {
    for (const zeile of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim()
    }
  }
  return env
}

const env = leseEnv()
const projektId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = env.SANITY_API_READ_TOKEN || env.SANITY_API_WRITE_TOKEN
if (!projektId || !token) {
  console.error('NEXT_PUBLIC_SANITY_PROJECT_ID und ein Sanity-Token werden benötigt (.env.local).')
  process.exit(1)
}

async function groq(query) {
  const url = `https://${projektId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${encodeURIComponent(query)}&perspective=raw`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const json = await res.json()
  if (!res.ok) throw new Error(`Sanity-Abfrage fehlgeschlagen (${res.status}): ${JSON.stringify(json).slice(0, 300)}`)
  return json.result
}

/** Sammelt alle Asset-Referenzen (image-…/file-…) aus beliebig verschachtelten Dokumenten. */
function sammleAssetRefs(wert, refs = new Set()) {
  if (Array.isArray(wert)) wert.forEach(w => sammleAssetRefs(w, refs))
  else if (wert && typeof wert === 'object') {
    if (typeof wert._ref === 'string' && /^(image|file)-/.test(wert._ref)) refs.add(wert._ref)
    Object.values(wert).forEach(w => sammleAssetRefs(w, refs))
  }
  return refs
}

const typListe = TYPEN.map(t => `"${t}"`).join(', ')
const [dokumente, entwuerfe, assets] = await Promise.all([
  groq(`*[_type in [${typListe}] && !(_id in path("drafts.**"))] | order(_type asc, _id asc)`),
  groq(`*[_type in [${typListe}] && _id in path("drafts.**")] | order(_type asc, _id asc)`),
  groq(`*[_type in ["sanity.imageAsset", "sanity.fileAsset"]] {
    _id, _type, url, extension, mimeType, originalFilename, size, sha1hash,
    "breite": metadata.dimensions.width, "hoehe": metadata.dimensions.height
  }`),
])

const refs = sammleAssetRefs([dokumente, entwuerfe])
const assetsNachId = new Map(assets.map(a => [a._id, a]))
const fehlend = [...refs].filter(r => !assetsNachId.has(r))

fs.mkdirSync(ASSET_ZIEL, { recursive: true })
let geladen = 0
const neuKodiert = []
for (const ref of refs) {
  const asset = assetsNachId.get(ref)
  if (!asset) continue
  const datei = path.join(ASSET_ZIEL, `${asset._id}.${asset.extension}`)
  asset.lokaleDatei = path.relative(ZIEL, datei).replace(/\\/g, '/')
  // Ohne passenden Accept-Header wandelt das Sanity-CDN z. B. WebP-Originale in JPEG um –
  // deshalb den Original-Typ anfordern und das Format prüfen. Manche Bilder liefert das CDN
  // auch dann nicht byte-identisch aus (neu kodiert, Metadaten wie EXIF entfernt); das ist fürs Web
  // in Ordnung und wird nur gezählt.
  const res = await fetch(asset.url, { headers: { Accept: asset.mimeType || '*/*' } })
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${asset.url} (${res.status})`)
  const typ = (res.headers.get('content-type') ?? '').split(';')[0].trim()
  if (asset.mimeType && typ !== asset.mimeType) {
    throw new Error(`Download von ${asset._id} hat das falsche Format (${typ} statt ${asset.mimeType}).`)
  }
  const inhalt = Buffer.from(await res.arrayBuffer())
  if (sha1(inhalt) !== asset.sha1hash) neuKodiert.push(asset._id)
  fs.writeFileSync(datei, inhalt)
  geladen++
}

const zaehlung = {}
for (const d of dokumente) zaehlung[d._type] = (zaehlung[d._type] ?? 0) + 1

const exportDaten = {
  exportiertAm: new Date().toISOString(),
  projektId,
  dataset,
  zaehlung,
  dokumente,
  entwuerfe,
  assets: assets.filter(a => refs.has(a._id)),
  fehlendeAssets: fehlend,
}
fs.writeFileSync(path.join(ZIEL, 'sanity-export.json'), JSON.stringify(exportDaten, null, 2))

console.log('Export nach', ZIEL)
console.log('Dokumente:', zaehlung)
console.log('Offene Entwürfe:', entwuerfe.map(e => e._id))
console.log(`Assets: ${exportDaten.assets.length} referenziert, ${geladen} geladen (${neuKodiert.length} davon vom CDN neu kodiert), ${fehlend.length} fehlend`)
