/**
 * lib/verwaltung/medien-upload.ts
 *
 * Speichert hochgeladene Bilder und PDFs im Medienordner (lib/medien.ts).
 * Bilder werden gedreht (EXIF), auf höchstens 1600 px verkleinert und als WebP gespeichert –
 * dabei fallen auch Metadaten wie GPS-Koordinaten weg. Dateinamen enthalten einen Inhalts-Hash,
 * dadurch dürfen Browser sie dauerhaft zwischenspeichern; eine neue Fassung bekommt einen neuen Namen.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { datenbank } from '@/lib/db'
import { medienDatei } from '@/lib/medien'
import { slugify } from './text'
import { MAX_UPLOAD_BYTES } from './upload-grenze'

const MAX_KANTE = 1600

export class UploadFehler extends Error {}

function hash8(inhalt: Buffer): string {
  return createHash('sha1').update(inhalt).digest('hex').slice(0, 8)
}

function schreiben(relativ: string, inhalt: Buffer): string {
  const ziel = medienDatei(relativ)
  if (!ziel) throw new UploadFehler('Ungültiger Dateipfad.')
  fs.mkdirSync(path.dirname(ziel), { recursive: true })
  fs.writeFileSync(ziel, inhalt)
  return relativ
}

/** true, wenn ein Formularfeld eine echte, nicht leere Datei enthält. */
export function hatDatei(wert: FormDataEntryValue | null): wert is File {
  return typeof wert === 'object' && wert !== null && 'arrayBuffer' in wert && wert.size > 0
}

/** Speichert ein Bild als WebP unter <kategorie>/<name>-<hash>.webp und liefert den relativen Pfad. */
export async function bildSpeichern(datei: File, kategorie: string, name: string): Promise<{ pfad: string; breite: number; hoehe: number }> {
  if (datei.size > MAX_UPLOAD_BYTES) throw new UploadFehler('Das Bild ist größer als 15 MB.')
  if (!datei.type.startsWith('image/')) throw new UploadFehler('Bitte eine Bilddatei (JPG, PNG oder WebP) hochladen.')
  let ausgabe: { data: Buffer; info: { width: number; height: number } }
  try {
    // limitInputPixels: Schutz vor "Dekompressionsbomben" (winzige Datei, riesiges Bild) – 50 Megapixel reichen für jedes Handyfoto.
    ausgabe = await sharp(Buffer.from(await datei.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: MAX_KANTE, height: MAX_KANTE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
  } catch {
    throw new UploadFehler('Das Bild konnte nicht gelesen werden. Bitte ein anderes Format versuchen.')
  }
  const pfad = schreiben(`${kategorie}/${slugify(name) || 'bild'}-${hash8(ausgabe.data)}.webp`, ausgabe.data)
  return { pfad, breite: ausgabe.info.width, hoehe: ausgabe.info.height }
}

/** Speichert ein PDF unter downloads/<name>-<hash>.pdf und liefert den relativen Pfad. */
export async function pdfSpeichern(datei: File, name: string): Promise<string> {
  if (datei.size > MAX_UPLOAD_BYTES) throw new UploadFehler('Die Datei ist größer als 15 MB.')
  const inhalt = Buffer.from(await datei.arrayBuffer())
  if (inhalt.subarray(0, 5).toString('latin1') !== '%PDF-') throw new UploadFehler('Bitte eine PDF-Datei hochladen.')
  return schreiben(`downloads/${slugify(name) || 'dokument'}-${hash8(inhalt)}.pdf`, inhalt)
}

/** Alle Spalten, die auf Mediendateien verweisen. */
const MEDIEN_SPALTEN: [string, string][] = [
  ['personen', 'foto'],
  ['sparten', 'foto'],
  ['mannschaften', 'foto'],
  ['gruppen', 'foto'],
  ['news', 'bild'],
  ['termine', 'bild'],
  ['downloads', 'datei'],
]

/**
 * Löscht eine Mediendatei, wenn kein Datensatz mehr darauf verweist (z. B. nach Austausch oder
 * Entfernen eines Fotos – wichtig, damit entfernte Personenfotos wirklich verschwinden).
 */
export function medienFreigeben(pfad: string | null | undefined): void {
  if (!pfad) return
  const sqlite = datenbank().$client
  for (const [tabelle, spalte] of MEDIEN_SPALTEN) {
    const treffer = sqlite.prepare(`SELECT 1 FROM ${tabelle} WHERE ${spalte} = ? LIMIT 1`).get(pfad)
    if (treffer) return
  }
  // Auch Bilder, die im Markdown-Text einer News eingebunden sind, zählen als verwendet.
  if (sqlite.prepare("SELECT 1 FROM news WHERE instr(inhalt, ?) > 0 LIMIT 1").get('/medien/' + pfad)) return
  const datei = medienDatei(pfad)
  if (datei && fs.existsSync(datei)) fs.unlinkSync(datei)
}
