/**
 * scripts/import-aus-sanity.ts
 *
 * Baut die SQLite-Datenbank (data/svhs.db) und den Medienordner komplett neu aus dem
 * Sanity-Export auf. Liest ausschließlich data/import/sanity-export.json und die dort
 * referenzierten Asset-Dateien (erzeugt von scripts/sanity-export.mjs) – kein Netzwerk,
 * kein Sanity-Paket.
 *
 * Ablauf:
 *   1. Export lesen und den kompletten Import im Speicher planen. Alle Prüfungen
 *      (Namenskollisionen, unlesbare Uhrzeiten, fehlende Dateien …) laufen hier,
 *      bevor irgendetwas gelöscht wird.
 *   2. data/svhs.db (+ -wal/-shm) und den Medienordner löschen, Datenbank neu anlegen.
 *   3. Alle Zeilen in EINER Transaktion einfügen.
 *   4. Bilder und Dateien in den Medienordner kopieren.
 *   5. Bericht nach data/import/import-bericht.md schreiben und auf der Konsole ausgeben.
 *
 * Schlägt Schritt 3 oder 4 fehl, werden Datenbank und Medienordner wieder entfernt –
 * es bleibt nichts halb geschrieben zurück. Das Skript ist beliebig oft wiederholbar und
 * liefert bei gleichen Eingaben dasselbe Ergebnis (IDs, Zeitstempel und Dateinamen werden
 * aus dem Export abgeleitet, nicht aus der aktuellen Uhrzeit).
 *
 * Aufruf (im Projektordner):  npx tsx scripts/import-aus-sanity.ts
 *
 * Achtung: Export, Datenbank, Medien und Bericht enthalten personenbezogene Daten und
 * liegen deshalb unter data/ (steht in .gitignore). Nichts davon committen.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import type BetterSqlite3 from 'better-sqlite3'
import { DATENBANK_PFAD, datenbank, schema, type Datenbank } from '@/lib/db'
import { MANNSCHAFT_BEREICHE, RHYTHMEN, SAISONS } from '@/lib/db/schema'
import { MEDIEN_PFAD, medienUrl } from '@/lib/medien'

// ─── Pfade ───────────────────────────────────────────────────────────────────

const IMPORT_ORDNER = path.resolve('data', 'import')
const EXPORT_DATEI = path.join(IMPORT_ORDNER, 'sanity-export.json')
const BERICHT_DATEI = path.join(IMPORT_ORDNER, 'import-bericht.md')

class ImportFehler extends Error {}

function abbruch(meldung: string): never {
  throw new ImportFehler(meldung)
}

// ─── Typen des Sanity-Exports ────────────────────────────────────────────────

interface Asset {
  _id: string
  extension?: string
  originalFilename?: string
  size?: number
  sha1hash?: string
  breite: number | null
  hoehe: number | null
  lokaleDatei: string
}

interface Verweis {
  _ref?: string
  _key?: string
  _type?: string
}

interface Bild {
  asset?: Verweis
  alt?: string
}

interface Basis {
  _id: string
  _type: string
  _createdAt?: string
  _updatedAt?: string
}

interface EingebetteterKontakt {
  _key?: string
  _ref?: string
  name?: string
  rolle?: string
  email?: string
  telefon?: string
  whatsapp?: string
  foto?: Bild
}

interface SparteDok extends Basis {
  name?: string
  slug?: { current?: string }
  icon?: string
  farbe?: string
  beschreibung?: string
  langbeschreibung?: string
  foto?: Bild
  ansprechpartner?: EingebetteterKontakt[]
  mannschaften?: { name?: string; trainer?: Verweis[]; foto?: Bild }[]
}

interface MannschaftDok extends Basis {
  name?: string
  sparte?: Verweis
  bereich?: string
  beschreibung?: string
  foto?: Bild
  reihenfolge?: number
  trainer?: Verweis[]
  anzeigenAufWebsite?: boolean
}

interface PersonDok extends Basis {
  name?: string
  email?: string
  telefon?: string
  whatsapp?: string
  foto?: Bild
}

interface AnsprechpartnerDok extends Basis {
  name?: string
  funktion?: string
  gruppe?: string
  email?: string
  telefon?: string
  foto?: Bild
  person?: Verweis
  reihenfolge?: number
}

interface TrainingszeitDok extends Basis {
  mannschaft?: Verweis
  tag?: string
  uhrzeit?: string
  ort?: string
  jahreszeit?: string
  frequenz?: string
  trainer?: string
  email?: string
  telefon?: string
}

interface PtSpan {
  _type?: string
  text?: string
  marks?: string[]
}

interface PtBlock {
  _type?: string
  style?: string
  listItem?: string
  level?: number
  children?: PtSpan[]
  markDefs?: { _key: string; _type?: string; href?: string }[]
  asset?: Verweis
  alt?: string
}

interface NewsDok extends Basis {
  title?: string
  slug?: { current?: string }
  excerpt?: string
  datum?: string
  category?: string
  sparte?: string
  image?: Bild
  body?: PtBlock[]
}

interface TerminDok extends Basis {
  titel?: string
  datum?: string
  uhrzeit?: string
  ort?: string
  beschreibung?: string
  tags?: string[]
  sparte?: string
  fussballDeId?: string
  clickTtId?: string
  bild?: Bild
}

interface DownloadDok extends Basis {
  titel?: string
  beschreibung?: string
  kategorie?: string
  datum?: string
  reihenfolge?: number
  datei?: { asset?: Verweis }
}

interface ExportDaten {
  exportiertAm: string
  projektId?: string
  dataset?: string
  zaehlung?: Record<string, number>
  dokumente: Basis[]
  entwuerfe: Basis[]
  assets: Asset[]
}

// ─── Bericht ─────────────────────────────────────────────────────────────────

const ABSCHNITTE = [
  'Sparten',
  'Mannschaften und Gruppen',
  'Personen',
  'Trainerteams',
  'Sparten-Ansprechpartner',
  'Vereinsfunktionen',
  'Trainingszeiten',
  'News',
  'Termine',
  'Downloads',
  'Medien',
  'Nicht übernommen',
  'Auffälligkeiten',
] as const
type Abschnitt = (typeof ABSCHNITTE)[number]

const berichtZeilen = new Map<Abschnitt, string[]>(ABSCHNITTE.map(a => [a, []]))

/** Hält eine Entscheidung oder Auffälligkeit für den Bericht fest (doppelte Zeilen werden ignoriert). */
function notiz(abschnitt: Abschnitt, zeile: string): void {
  const zeilen = berichtZeilen.get(abschnitt)!
  if (!zeilen.includes(zeile)) zeilen.push(zeile)
}

// ─── Hilfen: Texte, Slugs, Namen ─────────────────────────────────────────────

/** Trimmt Text; leere oder fehlende Werte werden zu null. */
function leer(wert: unknown): string | null {
  if (typeof wert !== 'string') return null
  const text = wert.trim()
  return text === '' ? null : text
}

function umlauteErsetzen(text: string): string {
  return text
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function ohneAkzente(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** "Einwilligungserklärung Film & Foto" → "einwilligungserklaerung-film-foto" */
function slugify(text: string): string {
  const slug = ohneAkzente(umlauteErsetzen(text))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'ohne-namen'
}

/** Normalisierte Form für den Namensabgleich (Leerzeichen, Groß/klein, Umlaute egal). */
function nameNormal(name: string): string {
  return ohneAkzente(umlauteErsetzen(name.trim().replace(/\s+/g, ' '))).toLowerCase()
}

function nameTeile(name: string): string[] {
  return nameNormal(name).split(/[\s-]+/).filter(Boolean)
}

/** true, wenn alle Namensteile des kürzeren Namens im längeren vorkommen. */
function namensteilePassen(a: string, b: string): boolean {
  const ta = nameTeile(a)
  const tb = nameTeile(b)
  const [kurz, lang] = ta.length <= tb.length ? [ta, new Set(tb)] : [tb, new Set(ta)]
  return kurz.length > 0 && kurz.every(teil => lang.has(teil))
}

function vergleich(a: string, b: string): number {
  return a.localeCompare(b, 'de', { numeric: true })
}

function istEines<T extends string>(liste: readonly T[], wert: string): wert is T {
  return (liste as readonly string[]).includes(wert)
}

/** Sanity-Zeitstempel → ISO-8601 wie die Spaltenvorgabe ("2026-03-17T08:20:10.000Z"). */
function zeitstempel(wert: string | undefined, ersatz: string): string {
  const datum = new Date(wert ?? ersatz)
  return Number.isNaN(datum.getTime()) ? new Date(ersatz).toISOString() : datum.toISOString()
}

function nurZiffern(text: string): string {
  return text.replace(/\D/g, '')
}

function regexMaskieren(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Planung: Datenstrukturen ────────────────────────────────────────────────

interface SpartePlan {
  id: number
  dok: SparteDok
  slug: string
  name: string
  reihenfolge: number
}

type PersonFeld = 'email' | 'telefon' | 'whatsapp' | 'fotoRef'

interface PersonPlan {
  id: number
  name: string
  email: string | null
  telefon: string | null
  whatsapp: string | null
  fotoRef: string | null
  sanityIds: string[]
  erstelltAm: string
  geaendertAm: string
  /** Aus einem eingebetteten Kontakt neu angelegt (kein Sanity-Personendokument). */
  neu: boolean
}

interface MitgliedPlan {
  person: PersonPlan
  rolle: string
  reihenfolge: number
}

type Bereich = (typeof MANNSCHAFT_BEREICHE)[number]

interface TeamPlan {
  art: 'mannschaft' | 'gruppe'
  id: number
  dok: MannschaftDok
  sparte: SpartePlan
  name: string
  altersklasse: string | null
  bereich: Bereich | null
  torwart: boolean
  reihenfolge: number
  mitglieder: MitgliedPlan[]
  trainingszeiten: number
}

interface KontaktPlan {
  sparte: SpartePlan
  kontakt: EingebetteterKontakt
  person: PersonPlan
  rolle: string | null
  entwurf: boolean
}

interface SparteAnsprechpartnerPlan {
  person: PersonPlan
  rolle: string
  reihenfolge: number
  quelle: string
}

interface MedienEintrag {
  quelle: string
  asset: Asset
}

type Zeile<T extends { $inferInsert: unknown }> = T['$inferInsert']

interface Plan {
  sparten: Zeile<typeof schema.sparten>[]
  personen: Zeile<typeof schema.personen>[]
  mannschaften: Zeile<typeof schema.mannschaften>[]
  gruppen: Zeile<typeof schema.gruppen>[]
  mannschaftPersonen: Zeile<typeof schema.mannschaftPersonen>[]
  gruppePersonen: Zeile<typeof schema.gruppePersonen>[]
  sparteAnsprechpartner: Zeile<typeof schema.sparteAnsprechpartner>[]
  funktionen: Zeile<typeof schema.funktionen>[]
  trainingszeiten: Zeile<typeof schema.trainingszeiten>[]
  news: Zeile<typeof schema.news>[]
  termine: Zeile<typeof schema.termine>[]
  downloads: Zeile<typeof schema.downloads>[]
  medien: Map<string, MedienEintrag>
}

// ─── Personenverzeichnis (Namensabgleich) ───────────────────────────────────

type Suchergebnis =
  | { art: 'exakt' | 'namensteile'; person: PersonPlan }
  | { art: 'mehrdeutig'; kandidaten: PersonPlan[] }
  | null

class PersonenVerzeichnis {
  private eintraege: { name: string; person: PersonPlan }[] = []

  hinzufuegen(name: string, person: PersonPlan): void {
    if (!this.eintraege.some(e => e.person === person && nameNormal(e.name) === nameNormal(name))) {
      this.eintraege.push({ name, person })
    }
  }

  suchen(name: string): Suchergebnis {
    const exakt = eindeutig(this.eintraege.filter(e => nameNormal(e.name) === nameNormal(name)).map(e => e.person))
    if (exakt.length === 1) return { art: 'exakt', person: exakt[0] }
    if (exakt.length > 1) return { art: 'mehrdeutig', kandidaten: exakt }
    const teile = eindeutig(this.eintraege.filter(e => namensteilePassen(e.name, name)).map(e => e.person))
    if (teile.length === 1) return { art: 'namensteile', person: teile[0] }
    if (teile.length > 1) return { art: 'mehrdeutig', kandidaten: teile }
    return null
  }

  /** Personen mit sehr ähnlichem Namen (höchstens 2 Zeichen Unterschied) – nur für Hinweise, nie zum Zuordnen. */
  aehnlich(name: string): PersonPlan[] {
    return eindeutig(this.eintraege.filter(e => editierAbstand(nameNormal(e.name), nameNormal(name)) <= 2).map(e => e.person))
  }
}

function editierAbstand(a: string, b: string): number {
  let vorher = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const aktuell = [i]
    for (let j = 1; j <= b.length; j++) {
      aktuell[j] = Math.min(vorher[j] + 1, aktuell[j - 1] + 1, vorher[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    vorher = aktuell
  }
  return vorher[b.length]
}

function eindeutig<T>(liste: T[]): T[] {
  return Array.from(new Set(liste))
}

// ─── Planungskontext ─────────────────────────────────────────────────────────

interface Kontext {
  daten: ExportDaten
  assets: Map<string, Asset>
  medien: Map<string, MedienEintrag>
  sparten: SpartePlan[]
  sparteNachSanityId: Map<string, SpartePlan>
  sparteNachName: Map<string, SpartePlan>
  personen: PersonPlan[]
  personNachSanityId: Map<string, PersonPlan>
  verzeichnis: PersonenVerzeichnis
  teams: TeamPlan[]
  teamNachSanityId: Map<string, TeamPlan>
  kontakte: KontaktPlan[]
  ansprechpartner: Map<SpartePlan, SparteAnsprechpartnerPlan[]>
}

function nachTyp<T extends Basis>(dokumente: Basis[], typ: string): T[] {
  return dokumente.filter(d => d._type === typ).sort((a, b) => a._id.localeCompare(b._id)) as T[]
}

/**
 * Registriert ein Asset für den Medienordner und liefert den relativen Zielpfad
 * "<kategorie>/<slug>-<hash8>.<ext>" (bzw. ohne Hash für Downloads).
 */
function medienPfad(ctx: Kontext, ref: string | null | undefined, kategorie: string, name: string, mitHash = true): string | null {
  if (!ref) return null
  const asset = ctx.assets.get(ref) ?? abbruch(`Asset ${ref} fehlt im Export (gebraucht für ${kategorie}: "${name}").`)
  const hash = /^(?:image|file)-([0-9a-f]{40})/.exec(ref)?.[1] ?? abbruch(`Asset-ID ${ref} enthält keinen SHA1-Hash.`)
  const endung = (asset.extension ?? path.extname(asset.lokaleDatei).slice(1)).toLowerCase()
  const pfad = mitHash
    ? `${kategorie}/${slugify(name)}-${hash.slice(0, 8)}.${endung}`
    : `${kategorie}/${slugify(name)}.${endung}`
  const quelle = path.join(IMPORT_ORDNER, asset.lokaleDatei)
  if (!fs.existsSync(quelle)) abbruch(`Asset-Datei fehlt: ${path.relative(process.cwd(), quelle)} (${ref}).`)
  const vorhanden = ctx.medien.get(pfad)
  if (vorhanden && vorhanden.asset._id !== asset._id) {
    abbruch(`Medienpfad ${pfad} würde von zwei verschiedenen Dateien belegt (${vorhanden.asset._id} und ${asset._id}).`)
  }
  ctx.medien.set(pfad, { quelle, asset })
  return pfad
}

// ─── Export lesen ────────────────────────────────────────────────────────────

function exportLesen(): ExportDaten {
  if (!fs.existsSync(EXPORT_DATEI)) {
    abbruch(`${path.relative(process.cwd(), EXPORT_DATEI)} fehlt – zuerst "node scripts/sanity-export.mjs" ausführen.`)
  }
  const daten = JSON.parse(fs.readFileSync(EXPORT_DATEI, 'utf8')) as ExportDaten
  if (!Array.isArray(daten.dokumente) || !Array.isArray(daten.assets) || !Array.isArray(daten.entwuerfe)) {
    abbruch('sanity-export.json hat nicht das erwartete Format ({ dokumente, entwuerfe, assets }).')
  }
  return daten
}

/** Liest Breite und Höhe aus dem Dateikopf (JPEG, PNG, WebP); null, wenn unbekannt. */
function bildAbmessungen(b: Buffer): { breite: number; hoehe: number } | null {
  if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') return { breite: b.readUInt32BE(16), hoehe: b.readUInt32BE(20) }
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const art = b.toString('ascii', 12, 16)
    if (art === 'VP8X') return { breite: 1 + b.readUIntLE(24, 3), hoehe: 1 + b.readUIntLE(27, 3) }
    if (art === 'VP8 ') return { breite: b.readUInt16LE(26) & 0x3fff, hoehe: b.readUInt16LE(28) & 0x3fff }
    if (art === 'VP8L') {
      const wert = b.readUInt32LE(21)
      return { breite: (wert & 0x3fff) + 1, hoehe: ((wert >> 14) & 0x3fff) + 1 }
    }
    return null
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++
        continue
      }
      const marker = b[i + 1]
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { breite: b.readUInt16BE(i + 7), hoehe: b.readUInt16BE(i + 5) }
      }
      i += 2 + b.readUInt16BE(i + 2)
    }
  }
  return null
}

/**
 * Prüft die heruntergeladenen Asset-Dateien gegen die Sanity-Metadaten. Bilder liefert das
 * Sanity-CDN neu kodiert aus – abweichende Bytes sind dort normal, die Abmessungen müssen stimmen.
 */
function assetsPruefen(daten: ExportDaten): void {
  let neuKodiert = 0
  let bilder = 0
  let dateiAbweichungen = 0
  for (const asset of [...daten.assets].sort((a, b) => a._id.localeCompare(b._id))) {
    const datei = path.join(IMPORT_ORDNER, asset.lokaleDatei)
    if (!fs.existsSync(datei)) {
      notiz('Auffälligkeiten', `Asset-Datei fehlt: \`${asset.lokaleDatei}\` (${asset._id}).`)
      continue
    }
    const inhalt = fs.readFileSync(datei)
    const identisch =
      (asset.size == null || inhalt.length === asset.size) &&
      (!asset.sha1hash || crypto.createHash('sha1').update(inhalt).digest('hex') === asset.sha1hash)
    if (asset._id.startsWith('image-')) {
      bilder++
      const masse = bildAbmessungen(inhalt)
      if (!masse || masse.breite !== asset.breite || masse.hoehe !== asset.hoehe) {
        notiz(
          'Auffälligkeiten',
          `Bild \`${asset._id}\`: Abmessungen der Datei (${masse ? `${masse.breite}×${masse.hoehe}` : 'unlesbar'}) passen nicht zu Sanity (${asset.breite}×${asset.hoehe}).`,
        )
      }
      if (!identisch) neuKodiert++
    } else if (!identisch) {
      dateiAbweichungen++
      notiz('Auffälligkeiten', `Datei \`${asset._id}\`: Größe oder SHA1 weicht vom Sanity-Original ab – Download prüfen.`)
    }
  }
  notiz(
    'Medien',
    `Prüfung der Asset-Dateien: ${neuKodiert} von ${bilder} Bildern weichen in Größe/SHA1 vom Sanity-Original ab ` +
      '(das Sanity-CDN liefert neu kodierte Fassungen aus), ihre Abmessungen wurden aus dem Dateikopf gelesen und mit Sanity abgeglichen; ' +
      `${dateiAbweichungen ? `${dateiAbweichungen} sonstige Dateien weichen ab (siehe Auffälligkeiten).` : 'alle sonstigen Dateien (PDFs) sind byte-identisch.'}`,
  )
}

// ─── Sparten ─────────────────────────────────────────────────────────────────

function spartenPlanen(ctx: Kontext): void {
  const doks = nachTyp<SparteDok>(ctx.daten.dokumente, 'sparte').sort(
    (a, b) => vergleich(a.name ?? '', b.name ?? '') || a._id.localeCompare(b._id),
  )
  const slugs = new Set<string>()
  doks.forEach((dok, index) => {
    const name = leer(dok.name) ?? abbruch(`Sparte ${dok._id} hat keinen Namen.`)
    const slug = leer(dok.slug?.current) ?? abbruch(`Sparte "${name}" hat keinen Slug.`)
    if (slugs.has(slug)) abbruch(`Sparten-Slug "${slug}" kommt doppelt vor.`)
    slugs.add(slug)
    const sparte: SpartePlan = { id: index + 1, dok, slug, name, reihenfolge: index }
    ctx.sparten.push(sparte)
    ctx.sparteNachSanityId.set(dok._id, sparte)
    ctx.sparteNachName.set(name, sparte)
  })
  notiz(
    'Sparten',
    `Reihenfolge = Position bei alphabetischer Sortierung nach Name: ${ctx.sparten.map(s => `${s.reihenfolge} ${s.name}`).join(', ')}.`,
  )
  notiz('Sparten', 'kurzbeschreibung = Sanity-`beschreibung`, beschreibung = Sanity-`langbeschreibung`; alle Sparten sichtbar.')
  const ohneIcon = ctx.sparten.filter(s => !leer(s.dok.icon)).map(s => s.name)
  if (ohneIcon.length) notiz('Sparten', `Ohne Icon (Feld bleibt leer, Website nutzt Fallback): ${ohneIcon.join(', ')}.`)
}

// ─── Personen ────────────────────────────────────────────────────────────────

const FELD_NAMEN: Record<PersonFeld, string> = { email: 'E-Mail', telefon: 'Telefon', whatsapp: 'WhatsApp', fotoRef: 'Foto' }

/**
 * Abweichende E-Mail-Adressen (klein geschrieben) und Telefonnummern (nur Ziffern), die `anreichern` als
 * Konflikt gemeldet und nicht übernommen hat. Sie gehören zu einer bekannten Person und stehen schon
 * unter „Auffälligkeiten“ – der Abgleich der Legacy-Kontakte (legacyKontakteMelden) meldet sie nicht erneut.
 */
const abweichendeKontaktwerte = new Set<string>()

function feldGleich(feld: PersonFeld, a: string, b: string): boolean {
  if (feld === 'email') return a.toLowerCase() === b.toLowerCase()
  if (feld === 'telefon' || feld === 'whatsapp') return nurZiffern(a) === nurZiffern(b)
  return a === b
}

/**
 * Füllt fehlende Felder einer Person; vorhandene Werte werden nie überschrieben, Abweichungen nur gemeldet.
 * Mit `andere` werden keine Werte übernommen, die schon zu einer anderen Person gehören – in Sanity waren
 * eingebettete Kontakte teils mit den Daten einer anderen Person gefüllt (z. B. Telefonnummer der Abteilungsleitung
 * beim zweiten Trainer), das darf nicht als eigene Kontaktangabe auf der Website landen.
 */
function anreichern(
  person: PersonPlan,
  werte: Partial<Record<PersonFeld, string | null | undefined>>,
  quelle: string,
  andere?: PersonPlan[],
): void {
  const ergaenzt: string[] = []
  for (const feld of Object.keys(FELD_NAMEN) as PersonFeld[]) {
    const wert = leer(werte[feld])
    if (!wert) continue
    const vorhanden = person[feld]
    const besitzer =
      andere?.find(p => p !== person && p[feld] != null && feldGleich(feld, p[feld] as string, wert)) ??
      (andere && feld === 'email' ? namentlichAndererPerson(wert, person, andere) : undefined)
    if (vorhanden == null && besitzer) {
      notiz(
        'Auffälligkeiten',
        `${person.name}: ${FELD_NAMEN[feld]} aus ${quelle} nicht übernommen – gehört bereits zu ${besitzer.name}.`,
      )
      continue
    }
    if (vorhanden == null) {
      person[feld] = wert
      ergaenzt.push(FELD_NAMEN[feld])
    } else if (!feldGleich(feld, vorhanden, wert)) {
      if (feld === 'email') abweichendeKontaktwerte.add(wert.toLowerCase())
      else if (feld !== 'fotoRef') abweichendeKontaktwerte.add(nurZiffern(wert))
      const anzeige = (w: string) => (feld === 'fotoRef' ? `\`${w}\`` : `"${w}"`)
      notiz(
        'Auffälligkeiten',
        `Konflikt bei ${person.name}, ${FELD_NAMEN[feld]}: behalten ${anzeige(vorhanden)}, abweichend ${anzeige(wert)} aus ${quelle}.`,
      )
    }
  }
  if (ergaenzt.length) notiz('Personen', `${person.name}: ${ergaenzt.join(', ')} ergänzt aus ${quelle}.`)
}

/** Person, zu der eine E-Mail-Adresse dem Namen vor dem @ nach eindeutig gehört – sofern das nicht `person` selbst ist. */
function namentlichAndererPerson(email: string, person: PersonPlan, alle: PersonPlan[]): PersonPlan | undefined {
  const lokal = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim()
  if (nameTeile(lokal).length < 2 || namensteilePassen(lokal, person.name)) return undefined
  const treffer = alle.filter(p => p !== person && namensteilePassen(lokal, p.name))
  return treffer.length === 1 ? treffer[0] : undefined
}

function personenPlanen(ctx: Kontext): void {
  const doks = nachTyp<PersonDok>(ctx.daten.dokumente, 'person')
  for (const dok of doks) {
    const name = leer(dok.name) ?? abbruch(`Person ${dok._id} hat keinen Namen.`)
    for (const feld of ['email', 'telefon', 'whatsapp'] as const) {
      const roh = dok[feld]
      if (typeof roh === 'string' && roh !== '' && roh.trim() === '') {
        notiz('Personen', `${name}: ${FELD_NAMEN[feld]} enthielt nur Leerzeichen → leer.`)
      }
    }
    const person: PersonPlan = {
      id: 0,
      name,
      email: leer(dok.email),
      telefon: leer(dok.telefon),
      whatsapp: leer(dok.whatsapp),
      fotoRef: leer(dok.foto?.asset?._ref),
      sanityIds: [dok._id],
      erstelltAm: zeitstempel(dok._createdAt, ctx.daten.exportiertAm),
      geaendertAm: zeitstempel(dok._updatedAt ?? dok._createdAt, ctx.daten.exportiertAm),
      neu: false,
    }
    ctx.personen.push(person)
    ctx.personNachSanityId.set(dok._id, person)
  }

  dublettenZusammenfuehren(ctx)
  for (const person of ctx.personen) for (const id of person.sanityIds) ctx.verzeichnis.hinzufuegen(nameAusSanity(ctx, id) ?? person.name, person)

  // Anreicherung 1: Fallback-Felder der Ansprechpartner-Dokumente
  for (const ap of ansprechpartnerDoks(ctx)) {
    const person = ansprechpartnerPerson(ctx, ap)
    anreichern(
      person,
      { email: ap.email, telefon: ap.telefon, fotoRef: ap.foto?.asset?._ref },
      `Ansprechpartner-Dokument \`${ap._id}\``,
      ctx.personen,
    )
  }

  // Anreicherung 2: eingebettete Kontakte der Sparten – offene Entwürfe zuerst (neuere Fassung)
  const quellen: { sparte: SpartePlan; dok: SparteDok; entwurf: boolean }[] = []
  for (const entwurf of nachTyp<SparteDok>(ctx.daten.entwuerfe, 'sparte')) {
    const sparte = ctx.sparteNachSanityId.get(entwurf._id.replace(/^drafts\./, ''))
    if (!sparte) {
      notiz('Nicht übernommen', `Entwurf \`${entwurf._id}\` gehört zu keiner veröffentlichten Sparte – ignoriert.`)
      continue
    }
    quellen.push({ sparte, dok: entwurf, entwurf: true })
    entwurfVergleichen(ctx, sparte, entwurf)
  }
  for (const sparte of ctx.sparten) quellen.push({ sparte, dok: sparte.dok, entwurf: false })

  for (const { sparte, dok, entwurf } of quellen) {
    const herkunft = `eingebettetem Kontakt der Sparte ${sparte.name}${entwurf ? ' (Entwurf)' : ''}`
    for (const kontakt of dok.ansprechpartner ?? []) {
      if (kontakt._ref) {
        const person = ctx.personNachSanityId.get(kontakt._ref)
        notiz(
          'Personen',
          `Sparte ${sparte.name}${entwurf ? ' (Entwurf)' : ''}: Kontaktliste enthält einen direkten Verweis auf ${person ? `Person ${person.name}` : `unbekannte Person \`${kontakt._ref}\``} (ohne Rolle) – keine Daten zu übernehmen.`,
        )
        continue
      }
      const name = leer(kontakt.name)
      if (!name) {
        notiz('Auffälligkeiten', `Sparte ${sparte.name}: eingebetteter Kontakt ohne Namen (\`${kontakt._key ?? '?'}\`) ignoriert.`)
        continue
      }
      const person = personZuName(ctx, name, `Sparte ${sparte.name}${entwurf ? ' (Entwurf)' : ''}`)
      if (!person) continue
      anreichern(
        person,
        { email: kontakt.email, telefon: kontakt.telefon, whatsapp: kontakt.whatsapp, fotoRef: kontakt.foto?.asset?._ref },
        herkunft,
        ctx.personen,
      )
      ctx.kontakte.push({ sparte, kontakt, person, rolle: leer(kontakt.rolle), entwurf })
    }
  }
}

function nameAusSanity(ctx: Kontext, sanityId: string): string | null {
  const dok = ctx.daten.dokumente.find(d => d._id === sanityId) as PersonDok | undefined
  return leer(dok?.name)
}

/** Sucht die Person zu einem Namen; legt sie an, wenn es keinen Treffer gibt. Bei Mehrdeutigkeit: null. */
function personZuName(ctx: Kontext, name: string, wo: string): PersonPlan | null {
  const treffer = ctx.verzeichnis.suchen(name)
  if (treffer?.art === 'mehrdeutig') {
    notiz(
      'Auffälligkeiten',
      `${wo}: Name "${name}" passt auf mehrere Personen (${treffer.kandidaten.map(p => p.name).join(', ')}) – nicht zugeordnet.`,
    )
    return null
  }
  if (treffer?.art === 'namensteile') {
    notiz('Personen', `${wo}: Name "${name}" über Namensteile der Person ${treffer.person.name} zugeordnet.`)
    return treffer.person
  }
  if (treffer) return treffer.person

  const person: PersonPlan = {
    id: 0,
    name: name.replace(/\s+/g, ' '),
    email: null,
    telefon: null,
    whatsapp: null,
    fotoRef: null,
    sanityIds: [],
    erstelltAm: zeitstempel(undefined, ctx.daten.exportiertAm),
    geaendertAm: zeitstempel(undefined, ctx.daten.exportiertAm),
    neu: true,
  }
  ctx.personen.push(person)
  ctx.verzeichnis.hinzufuegen(person.name, person)
  notiz('Personen', `${wo}: keine passende Person für "${name}" – neu angelegt.`)
  return person
}

/**
 * Führt Personendokumente zusammen, die offensichtlich dieselbe Person sind:
 * gleiches Foto-Asset UND alle Namensteile des kürzeren Namens im längeren.
 * Ziel ist das häufiger referenzierte Dokument (bei Gleichstand der längere Name).
 */
function dublettenZusammenfuehren(ctx: Kontext): void {
  const referenzen = new Map<string, number>()
  for (const dok of [...ctx.daten.dokumente, ...ctx.daten.entwuerfe]) {
    for (const treffer of Array.from(JSON.stringify(dok).matchAll(/"_ref":"([^"]+)"/g))) {
      referenzen.set(treffer[1], (referenzen.get(treffer[1]) ?? 0) + 1)
    }
  }
  const nachFoto = new Map<string, PersonPlan[]>()
  for (const person of ctx.personen) {
    if (person.fotoRef) nachFoto.set(person.fotoRef, [...(nachFoto.get(person.fotoRef) ?? []), person])
  }
  for (const gruppe of Array.from(nachFoto.values())) {
    if (gruppe.length < 2) continue
    for (let i = 0; i < gruppe.length; i++) {
      for (let j = i + 1; j < gruppe.length; j++) {
        const a = gruppe[i]
        const b = gruppe[j]
        if (!ctx.personen.includes(a) || !ctx.personen.includes(b) || !namensteilePassen(a.name, b.name)) continue
        const refs = (p: PersonPlan) => p.sanityIds.reduce((summe, id) => summe + (referenzen.get(id) ?? 0), 0)
        const [ziel, quelle] =
          refs(a) !== refs(b) ? (refs(a) > refs(b) ? [a, b] : [b, a]) : a.name.length >= b.name.length ? [a, b] : [b, a]
        notiz(
          'Personen',
          `Dublette zusammengeführt: Personendokument \`${quelle.sanityIds.join(', ')}\` ("${quelle.name}", ${refs(quelle)} Verweise) ` +
            `in \`${ziel.sanityIds[0]}\` ("${ziel.name}", ${refs(ziel)} Verweise) – gleiches Foto-Asset und passende Namensteile. ` +
            `Verweise und der Name "${quelle.name}" zeigen jetzt auf ${ziel.name}.`,
        )
        anreichern(ziel, quelle, `zusammengeführtem Personendokument \`${quelle.sanityIds[0]}\``)
        ziel.sanityIds.push(...quelle.sanityIds)
        for (const id of quelle.sanityIds) ctx.personNachSanityId.set(id, ziel)
        ctx.personen.splice(ctx.personen.indexOf(quelle), 1)
      }
    }
  }
  // Gleicher Name ohne gemeinsames Foto wird nur gemeldet, nicht zusammengeführt.
  const nachName = new Map<string, PersonPlan[]>()
  for (const person of ctx.personen) nachName.set(nameNormal(person.name), [...(nachName.get(nameNormal(person.name)) ?? []), person])
  for (const gleiche of Array.from(nachName.values())) {
    if (gleiche.length > 1) {
      notiz('Auffälligkeiten', `Mögliche Dublette (gleicher Name, nicht zusammengeführt): ${gleiche.map(p => `\`${p.sanityIds[0]}\``).join(', ')}.`)
    }
  }
}

function entwurfVergleichen(ctx: Kontext, sparte: SpartePlan, entwurf: SparteDok): void {
  const veroeffentlicht = new Map((sparte.dok.ansprechpartner ?? []).map(k => [k._key ?? '', k]))
  const imEntwurf = new Map((entwurf.ansprechpartner ?? []).map(k => [k._key ?? '', k]))
  const beschreiben = (k: EingebetteterKontakt) =>
    k._ref ? `Verweis auf ${ctx.personNachSanityId.get(k._ref)?.name ?? k._ref}` : `"${k.name ?? '?'}" (${k.rolle ?? 'ohne Rolle'})`
  let unterschiede = 0
  for (const [schluessel, kontakt] of Array.from(imEntwurf)) {
    const alt = veroeffentlicht.get(schluessel)
    if (!alt) {
      unterschiede++
      notiz('Personen', `Entwurf \`${entwurf._id}\`: zusätzlicher Kontakteintrag ${beschreiben(kontakt)}.`)
    } else if (JSON.stringify(alt) !== JSON.stringify(kontakt)) {
      unterschiede++
      notiz('Personen', `Entwurf \`${entwurf._id}\`: geänderter Kontakteintrag ${beschreiben(alt)} → ${beschreiben(kontakt)}.`)
    }
  }
  for (const [schluessel, kontakt] of Array.from(veroeffentlicht)) {
    if (!imEntwurf.has(schluessel)) {
      unterschiede++
      notiz('Personen', `Entwurf \`${entwurf._id}\`: Kontakteintrag ${beschreiben(kontakt)} fehlt im Entwurf (bleibt aus der veröffentlichten Fassung erhalten).`)
    }
  }
  notiz(
    'Personen',
    `Entwurf \`${entwurf._id}\` wurde zusätzlich zur veröffentlichten Sparte ${sparte.name} ausgewertet (zuerst, da neuer); ` +
      `${unterschiede} Kontakteinträge unterscheiden sich, E-Mails/Telefonnummern der übrigen Einträge sind identisch.`,
  )
}

function ansprechpartnerDoks(ctx: Kontext): AnsprechpartnerDok[] {
  return nachTyp<AnsprechpartnerDok>(ctx.daten.dokumente, 'ansprechpartner').sort(
    (a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0) || a._id.localeCompare(b._id),
  )
}

function ansprechpartnerPerson(ctx: Kontext, ap: AnsprechpartnerDok): PersonPlan {
  const ref = ap.person?._ref
  const person = ref ? ctx.personNachSanityId.get(ref) : undefined
  if (person) {
    if (ap.name && nameNormal(ap.name) !== nameNormal(person.name) && !namensteilePassen(ap.name, person.name)) {
      notiz('Auffälligkeiten', `Ansprechpartner-Dokument \`${ap._id}\` heißt "${ap.name}", verweist aber auf Person ${person.name}.`)
    }
    return person
  }
  const name = leer(ap.name) ?? abbruch(`Ansprechpartner-Dokument ${ap._id} hat weder Personenverweis noch Namen.`)
  notiz('Auffälligkeiten', `Ansprechpartner-Dokument \`${ap._id}\` ohne gültigen Personenverweis – über den Namen zugeordnet.`)
  return personZuName(ctx, name, `Ansprechpartner-Dokument ${ap._id}`) ?? abbruch(`Person für ${ap._id} nicht eindeutig.`)
}

// ─── Mannschaften und Gruppen ────────────────────────────────────────────────

/** "U13 (Jg. 2013)" → { name: "U13", altersklasse: "Jg. 2013" }; andere Klammern bleiben im Namen. */
function nameZerlegen(roh: string): { name: string; altersklasse: string | null } {
  const treffer = /^(.*\S)\s*\((Jg\.[^()]*)\)\s*$/.exec(roh.trim())
  return treffer ? { name: treffer[1].trim(), altersklasse: treffer[2].trim() } : { name: roh.trim(), altersklasse: null }
}

/**
 * Mit dem Verein abgestimmt: Fußball und Tischtennis sind Mannschaften, alles andere Gruppen.
 * Ausnahmen: Torwarttraining (Fußball) und die Trainingsgruppe im Tischtennis sind Gruppen.
 */
function klassifizieren(sparte: SpartePlan, name: string): { art: TeamPlan['art']; grund: string } {
  if (sparte.slug === 'fussball') {
    return /torwart/i.test(name)
      ? { art: 'gruppe', grund: 'Fußball, Torwarttraining' }
      : { art: 'mannschaft', grund: 'Fußball' }
  }
  if (sparte.slug === 'tischtennis') {
    return /^jugend\b/i.test(name)
      ? { art: 'mannschaft', grund: 'Tischtennis, Ligateam ("Jugend …")' }
      : { art: 'gruppe', grund: 'Tischtennis, Trainingsgruppe' }
  }
  return { art: 'gruppe', grund: 'keine Ligasparte' }
}

function teamsPlanen(ctx: Kontext): void {
  const tabelle: string[] = [
    '| Sanity-Name | Sparte | Tabelle | Name | Altersklasse | Begründung |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  const schluessel = new Map<string, string>()
  for (const dok of nachTyp<MannschaftDok>(ctx.daten.dokumente, 'mannschaft')) {
    const rohName = leer(dok.name) ?? abbruch(`Mannschaft ${dok._id} hat keinen Namen.`)
    const sparte =
      ctx.sparteNachSanityId.get(dok.sparte?._ref ?? '') ?? abbruch(`Mannschaft "${rohName}" (${dok._id}) gehört zu keiner bekannten Sparte.`)
    const { name, altersklasse } = nameZerlegen(rohName)
    const { art, grund } = klassifizieren(sparte, rohName)

    const kollision = `${art}|${sparte.id}|${name.toLowerCase()}`
    if (schluessel.has(kollision)) {
      abbruch(
        `Namenskollision in Sparte ${sparte.name}: "${rohName}" (${dok._id}) und ${schluessel.get(kollision)} ergeben beide ` +
          `${art === 'mannschaft' ? 'die Mannschaft' : 'die Gruppe'} "${name}".`,
      )
    }
    schluessel.set(kollision, `"${dok.name}" (${dok._id})`)

    let bereich: Bereich | null = null
    const sanityBereich = leer(dok.bereich)
    if (art === 'mannschaft' && sanityBereich) {
      if (istEines(MANNSCHAFT_BEREICHE, sanityBereich)) bereich = sanityBereich
      else notiz('Auffälligkeiten', `Mannschaft ${sparte.name} / ${name}: unbekannter Bereich "${sanityBereich}" → leer.`)
    }

    const torwart = art === 'gruppe' && /torwart/i.test(rohName)
    const team: TeamPlan = {
      art,
      id: 0,
      dok,
      sparte,
      name,
      altersklasse,
      bereich,
      torwart,
      reihenfolge: typeof dok.reihenfolge === 'number' ? dok.reihenfolge : 0,
      mitglieder: [],
      trainingszeiten: 0,
    }

    for (const verweis of dok.trainer ?? []) {
      const person = ctx.personNachSanityId.get(verweis._ref ?? '')
      if (!person) {
        notiz('Auffälligkeiten', `${sparte.name} / ${name}: Trainerverweis auf unbekannte Person \`${verweis._ref ?? '?'}\` ignoriert.`)
        continue
      }
      if (team.mitglieder.some(m => m.person === person)) {
        notiz('Auffälligkeiten', `${sparte.name} / ${name}: ${person.name} steht doppelt im Trainerteam – einmal übernommen.`)
        continue
      }
      team.mitglieder.push({ person, rolle: torwart ? 'Torwarttrainer:in' : 'Trainer:in', reihenfolge: team.mitglieder.length })
    }

    ctx.teams.push(team)
    ctx.teamNachSanityId.set(dok._id, team)
    tabelle.push(
      `| ${rohName} | ${sparte.name} | ${art === 'mannschaft' ? 'mannschaften' : 'gruppen'} | ${name} | ${altersklasse ?? '–'} | ${grund} |`,
    )
  }

  // IDs: je Tabelle nach Sparte, Reihenfolge, Name
  for (const art of ['mannschaft', 'gruppe'] as const) {
    ctx.teams
      .filter(t => t.art === art)
      .sort((a, b) => a.sparte.reihenfolge - b.sparte.reihenfolge || a.reihenfolge - b.reihenfolge || vergleich(a.name, b.name))
      .forEach((team, index) => (team.id = index + 1))
  }

  notiz(
    'Mannschaften und Gruppen',
    'Regel: Sparte Fußball → Mannschaft, außer Namen mit "Torwart" (Gruppe); Sparte Tischtennis → Mannschaft, wenn der Name mit ' +
      '"Jugend" beginnt, sonst Gruppe; alle anderen Sparten → Gruppe. Ein abschließender Klammerzusatz "(Jg. …)" wird zur Altersklasse. ' +
      'Mannschaften behalten den Sanity-Bereich, Gruppen haben keinen. Sichtbar = anzeigenAufWebsite ≠ false, Reihenfolge = Sanity-Reihenfolge oder 0.',
  )
  for (const zeile of tabelle) notiz('Mannschaften und Gruppen', zeile)
  const ohneReihenfolge = ctx.teams.filter(t => typeof t.dok.reihenfolge !== 'number').map(t => `${t.sparte.name} / ${t.name}`)
  if (ohneReihenfolge.length) notiz('Mannschaften und Gruppen', `Ohne Sanity-Reihenfolge (→ 0): ${ohneReihenfolge.join('; ')}.`)
  const unsichtbar = ctx.teams.filter(t => t.dok.anzeigenAufWebsite === false).map(t => `${t.sparte.name} / ${t.name}`)
  if (unsichtbar.length) notiz('Mannschaften und Gruppen', `Ausgeblendet (anzeigenAufWebsite = false): ${unsichtbar.join('; ')}.`)
}

// ─── Trainerteams: Ergänzung aus eingebetteten Fußball-Kontakten ────────────

interface Kuerzel {
  muster: RegExp
  passt: (teamName: string, treffer: RegExpMatchArray) => boolean
}

/** Eindeutige Mannschaftskürzel in Rollentexten wie "Trainer Herren & U13" oder "Ansprechpartner Just4Fun". */
const MANNSCHAFTS_KUERZEL: Kuerzel[] = [
  { muster: /\bU\s?0?(\d{1,2})\b/g, passt: (name, t) => name === `U${t[1].padStart(2, '0')}` },
  { muster: /\bHerren\b/g, passt: name => name === 'Herren' },
  { muster: /\bDamen\b/g, passt: name => name === 'Damen' },
  { muster: /\bMinikicker\b/gi, passt: name => /^Minikicker$/i.test(name) },
  { muster: /\bJust4Fun\b/gi, passt: name => /^Just4Fun\b/i.test(name) },
  { muster: /\bHoSe\s?United\b/gi, passt: name => /^HoSe\s?United\b/i.test(name) },
  { muster: /\bE-(?:Juniorinnen|Mädchen)(?![A-Za-zÀ-ÿ])/gi, passt: name => /\bE-(?:Juniorinnen|Mädchen)(?![A-Za-zÀ-ÿ])/i.test(name) },
  { muster: /\bC-\s*(?:\/|und)\s*D-Juniorinnen\b/gi, passt: name => /\bC-\s*(?:\/|und)\s*D-Juniorinnen\b/i.test(name) },
]

const ROLLEN_WOERTER = /\b(?:Co-)?(?:Trainer(?:in)?|Ansprechpartner(?:in)?|Betreuer(?:in)?|Abteilungsleiter(?:in)?|Gruppenleiter(?:in)?|Prüfer(?:in)?)(?![A-Za-zÀ-ÿ])/gi

function kuerzelAnalysieren(rolle: string, teams: TeamPlan[]): { teams: TeamPlan[]; unklar: string[]; rest: string } {
  const gefunden: TeamPlan[] = []
  const unklar: string[] = []
  let rest = rolle
  for (const kuerzel of MANNSCHAFTS_KUERZEL) {
    for (const treffer of Array.from(rolle.matchAll(kuerzel.muster))) {
      const passende = teams.filter(t => kuerzel.passt(t.name, treffer))
      if (passende.length === 1) {
        if (!gefunden.includes(passende[0])) gefunden.push(passende[0])
      } else {
        unklar.push(`"${treffer[0]}" passt auf ${passende.length} Mannschaften`)
      }
      rest = rest.replace(treffer[0], ' ')
    }
  }
  rest = rest.replace(ROLLEN_WOERTER, ' ').replace(/[&/,+]|\bund\b/gi, ' ').replace(/\s+/g, ' ').trim()
  return { teams: gefunden, unklar, rest }
}

function trainerteamsErgaenzen(ctx: Kontext): void {
  for (const team of ctx.teams.filter(t => t.torwart)) {
    notiz('Trainerteams', `${team.sparte.name} / ${team.name}: Torwarttraining → Rolle "Torwarttrainer:in" für alle ${team.mitglieder.length} Personen.`)
  }
  notiz('Trainerteams', 'Sonst: Rolle "Trainer:in", Reihenfolge = Position im Sanity-Feld trainer[].')

  for (const sparte of ctx.sparten.filter(s => s.slug === 'fussball')) {
    const teams = ctx.teams.filter(t => t.sparte === sparte)
    for (const { person, rolle, entwurf } of ctx.kontakte.filter(k => k.sparte === sparte)) {
      if (!rolle) continue
      const wo = `Kontakt ${person.name} ("${rolle}"${entwurf ? ', Entwurf' : ''})`
      const analyse = kuerzelAnalysieren(rolle, teams)
      if (analyse.unklar.length || analyse.rest) {
        const gruende = [...analyse.unklar, ...(analyse.rest ? [`nicht erkannt: "${analyse.rest}"`] : [])]
        notiz('Trainerteams', `${wo}: nicht eindeutig (${gruende.join('; ')}) – keine Zuordnung, bitte manuell prüfen.`)
        continue
      }
      if (!analyse.teams.length) {
        notiz('Trainerteams', `${wo}: nennt keine Mannschaft – keine Zuordnung.`)
        continue
      }
      const ansprechpartner = /ansprechpartner/i.test(rolle)
      for (const team of analyse.teams) {
        const mitglied = team.mitglieder.find(m => m.person === person)
        if (!mitglied) {
          const neueRolle = ansprechpartner ? 'Ansprechpartner:in' : team.torwart ? 'Torwarttrainer:in' : 'Trainer:in'
          team.mitglieder.push({ person, rolle: neueRolle, reihenfolge: team.mitglieder.length })
          notiz('Trainerteams', `${wo}: zu ${team.sparte.name} / ${team.name} hinzugefügt als "${neueRolle}".`)
        } else if (ansprechpartner && mitglied.rolle !== 'Ansprechpartner:in') {
          notiz('Trainerteams', `${wo}: Rolle in ${team.sparte.name} / ${team.name} von "${mitglied.rolle}" auf "Ansprechpartner:in" gesetzt.`)
          mitglied.rolle = 'Ansprechpartner:in'
        }
      }
    }
  }
}

// ─── Sparten-Ansprechpartner und Vereinsfunktionen ───────────────────────────

const FUNKTIONS_GRUPPE: Record<string, 'vorstand' | 'abteilungsleitung' | 'weitere'> = {
  Vorstand: 'vorstand',
  Abteilungsleiter: 'abteilungsleitung',
  'Weitere Ansprechpartner': 'weitere',
}

/** Sparten zu "Abteilungsleitung <X>": alle, deren Name <X> enthält (Groß/klein egal). */
function spartenZurAbteilungsleitung(ctx: Kontext, ap: AnsprechpartnerDok): { bezeichnung: string; sparten: SpartePlan[] } | null {
  if (ap.gruppe !== 'Abteilungsleiter') return null
  const treffer = /^Abteilungsleitung\s+(.+)$/i.exec(ap.funktion?.trim() ?? '')
  if (!treffer) return null
  const x = treffer[1].trim().toLowerCase()
  return { bezeichnung: treffer[1].trim(), sparten: ctx.sparten.filter(s => s.name.toLowerCase().includes(x)) }
}

/** true, wenn der Rollentext eine konkrete Mannschaft/Gruppe nennt (Kürzel, Klammerzusatz oder Teamname). */
function nenntTeam(ctx: Kontext, rolle: string, sparte: SpartePlan): boolean {
  const teams = ctx.teams.filter(t => t.sparte === sparte)
  if (kuerzelAnalysieren(rolle, teams).teams.length) return true
  if (sparte.slug === 'fussball' && MANNSCHAFTS_KUERZEL.some(k => new RegExp(k.muster.source, k.muster.flags).test(rolle))) return true
  if (/\(.+\)/.test(rolle)) return true
  return teams.some(t => new RegExp(`(^|[^A-Za-zÀ-ÿ0-9])${regexMaskieren(t.name)}($|[^A-Za-zÀ-ÿ0-9])`, 'i').test(rolle))
}

function ansprechpartnerPlanen(ctx: Kontext): void {
  const eintragen = (sparte: SpartePlan, eintrag: Omit<SparteAnsprechpartnerPlan, 'reihenfolge'>, reihenfolge?: number): boolean => {
    const liste = ctx.ansprechpartner.get(sparte) ?? []
    ctx.ansprechpartner.set(sparte, liste)
    if (liste.some(e => e.person === eintrag.person)) return false
    liste.push({ ...eintrag, reihenfolge: reihenfolge ?? liste.length })
    return true
  }

  notiz(
    'Sparten-Ansprechpartner',
    'Regel a: Abteilungsleitungen aus den Ansprechpartner-Dokumenten (Rolle "Abteilungsleitung", Reihenfolge 0). Regel b: eingebettete ' +
      'Sparten-Kontakte mit Ansprechpartner-/Leitungs-/Prüferrolle ohne konkrete Mannschaft/Gruppe (Rolle = Originaltext). Regel c: reine ' +
      'Trainer-Einträge werden keine Sparten-Ansprechpartner. Pro Sparte und Person nur ein Eintrag, a hat Vorrang vor b.',
  )

  // a) Abteilungsleitungen aus den Ansprechpartner-Dokumenten
  for (const ap of ansprechpartnerDoks(ctx)) {
    const zuordnung = spartenZurAbteilungsleitung(ctx, ap)
    if (!zuordnung) continue
    const person = ansprechpartnerPerson(ctx, ap)
    if (!zuordnung.sparten.length) {
      notiz('Sparten-Ansprechpartner', `"${ap.funktion}" (${person.name}): keine Sparte enthält "${zuordnung.bezeichnung}" – keine Zuordnung.`)
    }
    for (const sparte of zuordnung.sparten) {
      eintragen(sparte, { person, rolle: 'Abteilungsleitung', quelle: `Regel a, Funktion "${ap.funktion}"` }, 0)
    }
    if (zuordnung.sparten.length > 1) {
      notiz(
        'Sparten-Ansprechpartner',
        `"${ap.funktion}" (${person.name}) passt auf mehrere Sparten (${zuordnung.sparten.map(s => s.name).join(', ')}) – in allen als Abteilungsleitung eingetragen.`,
      )
    }
  }

  // b) eingebettete Kontakte (veröffentlicht) mit Ansprechpartner-/Leitungsrolle ohne konkrete Mannschaft/Gruppe
  const nichtUebernommen = new Map<SpartePlan, string[]>()
  const auslassen = (sparte: SpartePlan, text: string) => nichtUebernommen.set(sparte, [...(nichtUebernommen.get(sparte) ?? []), text])
  for (const { sparte, person, rolle, entwurf } of ctx.kontakte) {
    if (entwurf || !rolle) continue
    if (!/ansprechpartner|abteilungsleit|gruppenleit|prüfer/i.test(rolle)) {
      auslassen(sparte, `${person.name} ("${rolle}", reiner Trainer-Eintrag – Regel c)`)
    } else if (nenntTeam(ctx, rolle, sparte)) {
      auslassen(sparte, `${person.name} ("${rolle}", nennt eine konkrete Mannschaft/Gruppe)`)
    } else if (!eintragen(sparte, { person, rolle, quelle: 'Regel b, eingebetteter Kontakt' })) {
      auslassen(sparte, `${person.name} ("${rolle}", schon Abteilungsleitung – Regel a hat Vorrang)`)
    }
  }

  for (const sparte of ctx.sparten) {
    const liste = ctx.ansprechpartner.get(sparte) ?? []
    const ergebnis = liste.length
      ? liste.map(e => `${e.person.name} als "${e.rolle}" (${e.quelle}, Reihenfolge ${e.reihenfolge})`).join('; ')
      : 'keine'
    const ausgelassen = nichtUebernommen.get(sparte)
    notiz('Sparten-Ansprechpartner', `**${sparte.name}**: ${ergebnis}.${ausgelassen ? ` Nicht übernommen: ${ausgelassen.join('; ')}.` : ''}`)
  }
}

function funktionenPlanen(ctx: Kontext): Plan['funktionen'] {
  return ansprechpartnerDoks(ctx).map((ap, index) => {
    const person = ansprechpartnerPerson(ctx, ap)
    const bezeichnung = leer(ap.funktion) ?? abbruch(`Ansprechpartner-Dokument ${ap._id} hat keine Funktion.`)
    const gruppe = FUNKTIONS_GRUPPE[ap.gruppe ?? ''] ?? abbruch(`Ansprechpartner-Dokument ${ap._id}: unbekannte Gruppe "${ap.gruppe}".`)
    const zuordnung = spartenZurAbteilungsleitung(ctx, ap)
    let sparteId: number | null = null
    if (zuordnung?.sparten.length === 1) {
      sparteId = zuordnung.sparten[0].id
      notiz('Vereinsfunktionen', `"${bezeichnung}" (${person.name}) → Sparte ${zuordnung.sparten[0].name}.`)
    } else if (zuordnung) {
      notiz(
        'Vereinsfunktionen',
        `"${bezeichnung}" (${person.name}) → keine Sparte, da ${zuordnung.sparten.length ? `mehrdeutig (${zuordnung.sparten.map(s => s.name).join(', ')})` : 'kein Treffer'}.`,
      )
    }
    return {
      id: index + 1,
      personId: person.id,
      bezeichnung,
      gruppe,
      sparteId,
      reihenfolge: ap.reihenfolge ?? 0,
      erstelltAm: zeitstempel(ap._createdAt, ctx.daten.exportiertAm),
      geaendertAm: zeitstempel(ap._updatedAt ?? ap._createdAt, ctx.daten.exportiertAm),
    }
  })
}

// ─── Trainingszeiten ─────────────────────────────────────────────────────────

const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

function uhrzeitZerlegen(text: string): { beginn: string; ende: string | null } | null {
  const treffer = /^(\d{1,2})[:.](\d{2})(?:\s*(?:-|–|—|bis)\s*(\d{1,2})[:.](\d{2}))?(?:\s*Uhr)?$/i.exec(text.trim())
  if (!treffer) return null
  const zeit = (h: string, m: string) => (Number(h) <= 23 && Number(m) <= 59 ? `${h.padStart(2, '0')}:${m}` : null)
  const beginn = zeit(treffer[1], treffer[2])
  const ende = treffer[3] ? zeit(treffer[3], treffer[4]) : null
  if (!beginn || (treffer[3] && !ende)) return null
  return { beginn, ende }
}

/** E-Mail oder Telefon aus den Legacy-Textfeldern einer Trainingszeit (nur für den Bericht). */
interface LegacyKontakt {
  team: TeamPlan
  sanityId: string
  art: 'E-Mail' | 'Telefon'
  wert: string
}

function trainingszeitenPlanen(
  ctx: Kontext,
  legacy: Map<TeamPlan, Set<string>>,
  legacyKontakte: LegacyKontakt[],
): Plan['trainingszeiten'] {
  const zeilen: (Plan['trainingszeiten'][number] & { team: TeamPlan; sanityId: string })[] = []
  notiz(
    'Trainingszeiten',
    'Zuordnung über trainingszeit.mannschaft → je nach Klassifizierung mannschaft_id oder gruppe_id; Wochentag Montag = 1 … Sonntag = 7; ' +
      'Uhrzeit "H:MM - H:MM" → Beginn/Ende (zweistellig); Klammerzusatz am Ortsende → Hinweis; Jahreszeit → Saison, Frequenz → Rhythmus.',
  )
  notiz(
    'Trainingszeiten',
    'Die Legacy-Textfelder trainer/email/telefon/sparte/gruppe wurden nicht übernommen ' +
      '(Trainernamen sowie E-Mail-Adressen und Telefonnummern, die bei keiner Person vorkommen, siehe Hinweise unten).',
  )
  let ortZusatz = 0
  let standardSaison = 0
  let standardRhythmus = 0
  for (const dok of nachTyp<TrainingszeitDok>(ctx.daten.dokumente, 'trainingszeit')) {
    const team =
      ctx.teamNachSanityId.get(dok.mannschaft?._ref ?? '') ??
      abbruch(`Trainingszeit ${dok._id} verweist auf keine bekannte Mannschaft (${dok.mannschaft?._ref ?? 'kein Verweis'}).`)
    const wo = `${team.sparte.name} / ${team.name}`

    const tagIndex = WOCHENTAGE.findIndex(t => t.toLowerCase() === (dok.tag ?? '').trim().toLowerCase())
    if (tagIndex < 0) abbruch(`Trainingszeit ${dok._id} (${wo}): unbekannter Wochentag "${dok.tag ?? ''}".`)

    const zeit = uhrzeitZerlegen(dok.uhrzeit ?? '') ?? abbruch(`Trainingszeit ${dok._id} (${wo}): Uhrzeit "${dok.uhrzeit ?? ''}" nicht lesbar.`)
    if (zeit.ende && zeit.ende <= zeit.beginn) abbruch(`Trainingszeit ${dok._id} (${wo}): Ende ${zeit.ende} liegt nicht nach Beginn ${zeit.beginn}.`)
    if (!zeit.ende) notiz('Trainingszeiten', `${wo}, ${dok.tag}: nur Beginn "${dok.uhrzeit}" angegeben – Ende bleibt leer.`)

    let ort = leer(dok.ort)
    let hinweis: string | null = null
    const klammer = ort ? /^(.*\S)\s*\(([^()]+)\)\s*$/.exec(ort) : null
    if (klammer) {
      ort = klammer[1].trim()
      hinweis = klammer[2].trim()
      ortZusatz++
      notiz('Trainingszeiten', `${wo}, ${dok.tag} ${zeit.beginn}: Ort "${dok.ort}" → Ort "${ort}", Hinweis "${hinweis}".`)
    }

    const jahreszeit = leer(dok.jahreszeit)
    const saison = jahreszeit ? SAISONS.find(s => s.toLowerCase() === jahreszeit.toLowerCase()) : 'ganzjährig'
    if (!saison) abbruch(`Trainingszeit ${dok._id} (${wo}): unbekannte Jahreszeit "${jahreszeit}".`)
    if (!jahreszeit) standardSaison++
    else if (saison !== jahreszeit) notiz('Trainingszeiten', `${wo}: Jahreszeit "${jahreszeit}" → "${saison}".`)

    const frequenz = leer(dok.frequenz)
    const rhythmus = frequenz ? RHYTHMEN.find(r => r.toLowerCase() === frequenz.toLowerCase()) : 'jede Woche'
    if (!rhythmus) abbruch(`Trainingszeit ${dok._id} (${wo}): unbekannte Frequenz "${frequenz}".`)
    if (!frequenz) standardRhythmus++

    const trainerText = leer(dok.trainer)
    if (trainerText) {
      const namen = legacy.get(team) ?? new Set<string>()
      for (const name of trainerText.split(/\s*(?:,|&|\/|\bund\b)\s*/)) if (leer(name)) namen.add(name.trim())
      legacy.set(team, namen)
    }
    const emailText = leer(dok.email)
    if (emailText) legacyKontakte.push({ team, sanityId: dok._id, art: 'E-Mail', wert: emailText })
    const telefonText = leer(dok.telefon)
    if (telefonText) legacyKontakte.push({ team, sanityId: dok._id, art: 'Telefon', wert: telefonText })

    team.trainingszeiten++
    zeilen.push({
      team,
      sanityId: dok._id,
      mannschaftId: team.art === 'mannschaft' ? team.id : null,
      gruppeId: team.art === 'gruppe' ? team.id : null,
      wochentag: tagIndex + 1,
      beginn: zeit.beginn,
      ende: zeit.ende,
      ort,
      saison,
      rhythmus,
      hinweis,
      reihenfolge: 0,
      erstelltAm: zeitstempel(dok._createdAt, ctx.daten.exportiertAm),
      geaendertAm: zeitstempel(dok._updatedAt ?? dok._createdAt, ctx.daten.exportiertAm),
    })
  }

  notiz(
    'Trainingszeiten',
    `${zeilen.length} Trainingszeiten übernommen (${zeilen.filter(z => z.mannschaftId).length} bei Mannschaften, ${zeilen.filter(z => z.gruppeId).length} bei Gruppen); ` +
      `${ortZusatz}× Hinweis aus Ortszusatz; Standardwerte gesetzt: Saison ${standardSaison}×, Rhythmus ${standardRhythmus}×.`,
  )

  // Doppelte Einträge melden
  const gesehen = new Map<string, string>()
  for (const z of zeilen) {
    const schluessel = [z.team.art, z.team.id, z.wochentag, z.beginn, z.ende, z.ort, z.saison].join('|')
    if (gesehen.has(schluessel)) {
      notiz('Auffälligkeiten', `Trainingszeit doppelt: \`${z.sanityId}\` entspricht \`${gesehen.get(schluessel)}\` (${z.team.sparte.name} / ${z.team.name}).`)
    } else gesehen.set(schluessel, z.sanityId)
  }

  return zeilen
    .sort(
      (a, b) =>
        (a.team.art === b.team.art ? 0 : a.team.art === 'mannschaft' ? -1 : 1) ||
        a.team.id - b.team.id ||
        a.wochentag - b.wochentag ||
        a.beginn.localeCompare(b.beginn) ||
        a.sanityId.localeCompare(b.sanityId),
    )
    .map(({ team: _team, sanityId: _sanityId, ...zeile }, index) => ({ ...zeile, id: index + 1 }))
}

/** Listet Trainernamen aus den Legacy-Textfeldern, die im Trainerteam fehlen (nur Hinweis, keine Zuordnung). */
function legacyTrainerMelden(ctx: Kontext, legacy: Map<TeamPlan, Set<string>>): void {
  const teams = Array.from(legacy.keys()).sort(
    (a, b) => a.sparte.reihenfolge - b.sparte.reihenfolge || (a.art === b.art ? 0 : a.art === 'mannschaft' ? -1 : 1) || a.id - b.id,
  )
  for (const team of teams) {
    const namen = Array.from(legacy.get(team) ?? new Set<string>())
    const wo = `${team.sparte.name} / ${team.name}`
    if (!team.mitglieder.length) {
      notiz('Trainingszeiten', `Ohne Trainerteam – im alten Textfeld genannt (bitte manuell nachpflegen): ${wo}: ${namen.join(', ')}.`)
      continue
    }
    const fehlend = namen.filter(name => {
      const treffer = ctx.verzeichnis.suchen(name)
      return !(treffer && treffer.art !== 'mehrdeutig' && team.mitglieder.some(m => m.person === treffer.person))
    })
    if (fehlend.length) {
      const beschreiben = (name: string) => {
        const treffer = ctx.verzeichnis.suchen(name)
        if (treffer && treffer.art !== 'mehrdeutig') return `${name} (Person vorhanden)`
        const aehnlich = ctx.verzeichnis.aehnlich(name)
        return aehnlich.length === 1 ? `${name} (keine Person – vermutlich Tippfehler für ${aehnlich[0].name})` : `${name} (keine Person)`
      }
      notiz(
        'Trainingszeiten',
        `Hinweis ${wo}: im alten Textfeld zusätzlich genannt, aber nicht im Trainerteam: ${fehlend.map(beschreiben).join(', ')} – nicht übernommen.`,
      )
    }
  }
}

/**
 * Meldet E-Mail-Adressen und Telefonnummern aus den Legacy-Textfeldern, die bei keiner Person
 * vorkommen (nur Hinweis im Bericht, keine Zuordnung). E-Mail ohne Groß-/Kleinschreibung,
 * Telefon nur über die Ziffern verglichen. Als bekannt gelten auch abweichende Werte einer Person,
 * die schon als Konflikt unter „Auffälligkeiten“ stehen (abweichendeKontaktwerte).
 */
function legacyKontakteMelden(ctx: Kontext, legacyKontakte: LegacyKontakt[]): void {
  const bekannt = new Set<string>()
  for (const person of ctx.personen) {
    if (person.email) bekannt.add(person.email.toLowerCase())
    if (person.telefon) bekannt.add(nurZiffern(person.telefon))
    if (person.whatsapp) bekannt.add(nurZiffern(person.whatsapp))
  }
  for (const kontakt of legacyKontakte) {
    const wert = kontakt.art === 'E-Mail' ? kontakt.wert.toLowerCase() : nurZiffern(kontakt.wert)
    if (bekannt.has(wert) || abweichendeKontaktwerte.has(wert)) continue
    notiz(
      'Trainingszeiten',
      `Hinweis ${kontakt.team.sparte.name} / ${kontakt.team.name}: ${kontakt.art} „${kontakt.wert}“ aus dem alten Textfeld der Trainingszeit ` +
        `\`${kontakt.sanityId}\` kommt bei keiner Person vor – nicht übernommen, bitte manuell zuordnen (z. B. als Kontakt einer Trainer:in oder Ansprechperson).`,
    )
  }
}

// ─── News (Portable Text → Markdown) ─────────────────────────────────────────

const MD_SONDERZEICHEN = /[\\`*_[\]<>]/g
const AUTOLINK = /\bhttps?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]]|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g

function maskieren(text: string): string {
  return text.replace(MD_SONDERZEICHEN, '\\$&')
}

interface MarkdownStatistik {
  leereBloecke: number
  autolinks: number
  bilder: number
}

function inlineText(text: string, autolinks: boolean, statistik: MarkdownStatistik): string {
  let ergebnis = ''
  if (autolinks) {
    let position = 0
    for (const treffer of Array.from(text.matchAll(AUTOLINK))) {
      const start = treffer.index ?? 0
      ergebnis += maskieren(text.slice(position, start)) + `<${treffer[0]}>`
      position = start + treffer[0].length
      statistik.autolinks++
    }
    ergebnis += maskieren(text.slice(position))
  } else {
    ergebnis = maskieren(text)
  }
  return ergebnis.replace(/\n/g, '\\\n')
}

function spansZuMarkdown(block: PtBlock, wo: string, statistik: MarkdownStatistik): string {
  const definitionen = new Map((block.markDefs ?? []).map(d => [d._key, d]))
  return (block.children ?? [])
    .map(span => {
      if (span._type !== 'span') {
        notiz('News', `${wo}: unbekanntes Inline-Element "${span._type}" ausgelassen.`)
        return ''
      }
      const roh = span.text ?? ''
      if (!roh) return ''
      const marks = span.marks ?? []
      const link = marks.map(m => definitionen.get(m)).find(d => d?._type === 'link' && d.href)
      if (marks.includes('code')) return '`' + roh.replace(/`/g, "'") + '`'
      const text = inlineText(roh, !link, statistik)
      const [, vor, kern0, nach] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text) ?? ['', '', text, '']
      let kern = kern0
      if (!kern) return text
      for (const mark of marks) {
        if (mark === 'strong') kern = `**${kern}**`
        else if (mark === 'em') kern = `*${kern}*`
        else if (!definitionen.has(mark)) notiz('News', `${wo}: Markierung "${mark}" hat keine Markdown-Entsprechung – als normaler Text übernommen.`)
      }
      if (link?.href) kern = `[${kern}](${link.href})`
      return vor + kern + nach
    })
    .join('')
}

/** Schützt Zeilenanfänge, die Markdown sonst als Überschrift, Liste oder Zitat lesen würde. */
function zeilenanfaengeSchuetzen(text: string): string {
  return text
    .split('\n')
    .map(zeile =>
      zeile
        .replace(/^(\s*)(#{1,6}(?=\s|$)|>|[-+](?=\s)|[-=]{3,}\s*$)/, '$1\\$2')
        .replace(/^(\s*\d+)([.)])(?=\s)/, '$1\\$2'),
    )
    .join('\n')
}

const UEBERSCHRIFTEN: Record<string, string> = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ' }

function portableTextZuMarkdown(ctx: Kontext, bloecke: PtBlock[] | undefined, slug: string, statistik: MarkdownStatistik): string {
  const teile: { text: string; liste: boolean }[] = []
  const wo = `News "${slug}"`
  for (const block of bloecke ?? []) {
    if (block._type === 'block') {
      const inline = spansZuMarkdown(block, wo, statistik)
      if (inline.trim() === '') {
        statistik.leereBloecke++
        continue
      }
      if (block.listItem) {
        const einzug = '  '.repeat(Math.max(0, (block.level ?? 1) - 1))
        const marker = block.listItem === 'number' ? '1. ' : '- '
        teile.push({ text: einzug + marker + inline.trim(), liste: true })
        continue
      }
      const stil = block.style ?? 'normal'
      if (UEBERSCHRIFTEN[stil]) teile.push({ text: UEBERSCHRIFTEN[stil] + inline.replace(/\\\n/g, ' ').trim(), liste: false })
      else if (stil === 'blockquote') teile.push({ text: '> ' + inline.trim().replace(/\n/g, '\n> '), liste: false })
      else {
        if (stil !== 'normal') notiz('News', `${wo}: Absatzstil "${stil}" unbekannt – als normaler Absatz übernommen.`)
        teile.push({ text: zeilenanfaengeSchuetzen(inline.trim()), liste: false })
      }
    } else if (block._type === 'image') {
      const pfad = medienPfad(ctx, block.asset?._ref, 'news', slug)
      if (!pfad) {
        notiz('Auffälligkeiten', `${wo}: Bild-Block ohne Asset ausgelassen.`)
        continue
      }
      statistik.bilder++
      teile.push({ text: `![${maskieren(block.alt ?? '')}](${medienUrl(pfad)})`, liste: false })
    } else {
      notiz('Auffälligkeiten', `${wo}: unbekannter Block-Typ "${block._type}" ausgelassen.`)
    }
  }
  return teile
    .map((teil, i) => (i === 0 ? '' : teil.liste && teile[i - 1].liste ? '\n' : '\n\n') + teil.text)
    .join('')
}

function newsPlanen(ctx: Kontext): Plan['news'] {
  const statistik: MarkdownStatistik = { leereBloecke: 0, autolinks: 0, bilder: 0 }
  const slugs = new Set<string>()
  const zeilen = nachTyp<NewsDok>(ctx.daten.dokumente, 'newsPost')
    .map(dok => {
      const slug = leer(dok.slug?.current) ?? abbruch(`News ${dok._id} hat keinen Slug.`)
      if (slugs.has(slug)) abbruch(`News-Slug "${slug}" kommt doppelt vor.`)
      slugs.add(slug)
      const titel = leer(dok.title) ?? abbruch(`News "${slug}" hat keinen Titel.`)
      let datum = leer(dok.datum)
      if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
        const ersatz = zeitstempel(dok._createdAt, ctx.daten.exportiertAm).slice(0, 10)
        notiz('News', `"${titel}": Datum "${datum ?? ''}" ungültig → Erstellungsdatum ${ersatz}.`)
        datum = ersatz
      }
      const sparteName = leer(dok.sparte)
      let sparteId: number | null = null
      if (sparteName && sparteName !== 'Allgemein') {
        const sparte = ctx.sparteNachName.get(sparteName)
        if (sparte) sparteId = sparte.id
        else notiz('Auffälligkeiten', `News "${titel}": Sparte "${sparteName}" unbekannt → Verein.`)
      }
      notiz('News', `"${titel}" (${datum}): ${sparteId ? `Sparte ${sparteName}` : `Verein (Sanity-Sparte "${sparteName ?? ''}")`}.`)
      const bildRef = leer(dok.image?.asset?._ref)
      const bild = medienPfad(ctx, bildRef, 'news', slug)
      const asset = bildRef ? ctx.assets.get(bildRef) : undefined
      const inhalt = portableTextZuMarkdown(ctx, dok.body, slug, statistik)
      if (/\btest(?:news|nachricht)?\b/i.test(`${titel}\n${inhalt}`)) {
        notiz('Auffälligkeiten', `News "${titel}" (${datum}) sieht nach einem Test aus ("Test…" im Text) – wird trotzdem veröffentlicht übernommen.`)
      }
      return {
        slug,
        titel,
        teaser: leer(dok.excerpt),
        inhalt,
        bild,
        bildBreite: bild ? (asset?.breite ?? null) : null,
        bildHoehe: bild ? (asset?.hoehe ?? null) : null,
        kategorie: leer(dok.category),
        datum,
        veroeffentlicht: true,
        sparteId,
        mannschaftId: null,
        gruppeId: null,
        erstelltAm: zeitstempel(dok._createdAt, ctx.daten.exportiertAm),
        geaendertAm: zeitstempel(dok._updatedAt ?? dok._createdAt, ctx.daten.exportiertAm),
      }
    })
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.slug.localeCompare(b.slug))
    .map((zeile, index) => ({ ...zeile, id: index + 1 }))

  notiz(
    'News',
    `Fließtext als Markdown: Absätze durch Leerzeile getrennt, h2/h3 → "##"/"###", strong/em → **…**/*…*, Bild-Blöcke → ![](/medien/news/…). ` +
      `${statistik.leereBloecke} leere Absätze ausgelassen, ${statistik.bilder} Inline-Bilder, ${statistik.autolinks} URLs/E-Mail-Adressen als ` +
      `klickbare Markdown-Autolinks <…> gesetzt; Markdown-Sonderzeichen im Text werden maskiert.`,
  )
  notiz('News', 'Alle News veröffentlicht; Zuordnung: Sanity-Sparte "Allgemein"/leer → Verein, sonst Sparte gleichen Namens.')
  return zeilen
}

// ─── Termine ─────────────────────────────────────────────────────────────────

function terminePlanen(ctx: Kontext): Plan['termine'] {
  const fussball = ctx.sparten.find(s => s.slug === 'fussball')
  const tischtennis = ctx.sparten.find(s => s.slug === 'tischtennis')
  const anzahl = { manuell: 0, 'fussball-de': 0, 'click-tt': 0 }
  const externe = new Set<string>()
  const zeilen = nachTyp<TerminDok>(ctx.daten.dokumente, 'termin').map(dok => {
    const titel = leer(dok.titel) ?? abbruch(`Termin ${dok._id} hat keinen Titel.`)
    const datum = leer(dok.datum)
    if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) abbruch(`Termin ${dok._id} ("${titel}"): Datum "${dok.datum ?? ''}" ungültig.`)
    let quelle: 'manuell' | 'fussball-de' | 'click-tt' = 'manuell'
    let externeId: string | null = null
    let sparteId: number | null = null
    if (dok._id.startsWith('fussball-de-')) {
      quelle = 'fussball-de'
      externeId = leer(dok.fussballDeId) ?? abbruch(`Termin ${dok._id}: fussballDeId fehlt.`)
      sparteId = fussball?.id ?? null
    } else if (dok._id.startsWith('click-tt-')) {
      quelle = 'click-tt'
      externeId = leer(dok.clickTtId) ?? abbruch(`Termin ${dok._id}: clickTtId fehlt.`)
      sparteId = tischtennis?.id ?? null
    }
    if (externeId) {
      if (externe.has(`${quelle}|${externeId}`)) abbruch(`Termin ${dok._id}: externe ID ${externeId} kommt doppelt vor.`)
      externe.add(`${quelle}|${externeId}`)
    }
    anzahl[quelle]++
    return {
      titel,
      datum,
      uhrzeit: leer(dok.uhrzeit),
      ort: leer(dok.ort),
      beschreibung: leer(dok.beschreibung),
      bild: medienPfad(ctx, dok.bild?.asset?._ref, 'termine', titel),
      bereich: leer(dok.sparte),
      tags: (dok.tags ?? []).map(t => t.trim()).filter(Boolean),
      sparteId,
      mannschaftId: null,
      quelle,
      externeId,
      erstelltAm: zeitstempel(dok._createdAt, ctx.daten.exportiertAm),
      geaendertAm: zeitstempel(dok._updatedAt ?? dok._createdAt, ctx.daten.exportiertAm),
      sanityId: dok._id,
    }
  })
  notiz(
    'Termine',
    `Quelle nach Sanity-ID: fussball-de ${anzahl['fussball-de']} (→ Sparte Fußball), click-tt ${anzahl['click-tt']} (→ Sparte Tischtennis), ` +
      `manuell ${anzahl.manuell} (keine Sparte). bereich = Sanity-Feld sparte; mannschaft_id bleibt leer.`,
  )
  return zeilen
    .sort((a, b) => a.datum.localeCompare(b.datum) || (a.uhrzeit ?? '').localeCompare(b.uhrzeit ?? '') || a.sanityId.localeCompare(b.sanityId))
    .map(({ sanityId: _sanityId, ...zeile }, index) => ({ ...zeile, id: index + 1 }))
}

// ─── Downloads ───────────────────────────────────────────────────────────────

function downloadsPlanen(ctx: Kontext): Plan['downloads'] {
  return nachTyp<DownloadDok>(ctx.daten.dokumente, 'download')
    .sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0) || a._id.localeCompare(b._id))
    .map((dok, index) => {
      const titel = leer(dok.titel) ?? abbruch(`Download ${dok._id} hat keinen Titel.`)
      const datei =
        medienPfad(ctx, dok.datei?.asset?._ref, 'downloads', titel, false) ?? abbruch(`Download "${titel}" hat keine Datei (datei.asset fehlt).`)
      notiz('Downloads', `"${titel}" → \`${datei}\`.`)
      return {
        id: index + 1,
        titel,
        beschreibung: leer(dok.beschreibung),
        kategorie: leer(dok.kategorie),
        datei,
        datum: leer(dok.datum),
        sparteId: null,
        reihenfolge: dok.reihenfolge ?? 0,
        erstelltAm: zeitstempel(dok._createdAt, ctx.daten.exportiertAm),
        geaendertAm: zeitstempel(dok._updatedAt ?? dok._createdAt, ctx.daten.exportiertAm),
      }
    })
}

// ─── Nicht Übernommenes und Auffälligkeiten ──────────────────────────────────

function restMelden(ctx: Kontext): void {
  const anzahl = (typ: string) => ctx.daten.dokumente.filter(d => d._type === typ).length
  notiz('Nicht übernommen', `Partner: ${anzahl('partner')} Dokumente – werden auf der Website nirgends angezeigt (entfallen).`)
  notiz('Nicht übernommen', 'Downloads: veraltetes Feld dateiUrl (zeigt auf nicht existierende Dateien) ignoriert, Datei kommt aus datei.asset.')
  notiz('Nicht übernommen', 'Sparten: Felder trainingszeiten_spartes und eingebetteter Altbestand mannschaften[].')

  // Altbestand nur melden, wenn er etwas enthält, das sonst nirgends übernommen wurde.
  const genutzteAssets = new Set(Array.from(ctx.medien.values()).map(m => m.asset._id))
  for (const sparte of ctx.sparten) {
    const spartenPersonen = new Set(ctx.teams.filter(t => t.sparte === sparte).flatMap(t => t.mitglieder.map(m => m.person)))
    for (const alt of sparte.dok.mannschaften ?? []) {
      const fotoRef = alt.foto?.asset?._ref
      const fehlendeTrainer = (alt.trainer ?? [])
        .map(t => ctx.personNachSanityId.get(t._ref ?? ''))
        .filter((p): p is PersonPlan => !!p && !spartenPersonen.has(p))
      const extras = [
        fotoRef && !genutzteAssets.has(fotoRef) ? `ein sonst nicht verwendetes Foto (\`${fotoRef}\`)` : null,
        fehlendeTrainer.length ? `Trainerverweise auf ${fehlendeTrainer.map(p => p.name).join(', ')} (in keinem Trainerteam der Sparte)` : null,
      ].filter(Boolean)
      if (extras.length) {
        notiz(
          'Auffälligkeiten',
          `Eingebetteter Altbestand der Sparte ${sparte.name}, Eintrag "${alt.name ?? '?'}": enthält ${extras.join(' und ')} – nicht übernommen, ggf. manuell prüfen.`,
        )
      }
    }
  }

  for (const entwurf of ctx.daten.entwuerfe.filter(e => e._type !== 'sparte')) {
    const basisId = entwurf._id.replace(/^drafts\./, '')
    const veroeffentlicht = ctx.daten.dokumente.find(d => d._id === basisId)
    const geaendert = veroeffentlicht
      ? Object.keys({ ...entwurf, ...veroeffentlicht }).filter(
          k => !k.startsWith('_') && JSON.stringify((entwurf as unknown as Record<string, unknown>)[k]) !== JSON.stringify((veroeffentlicht as unknown as Record<string, unknown>)[k]),
        )
      : []
    notiz(
      'Nicht übernommen',
      `Entwurf \`${entwurf._id}\` (${entwurf._type})${veroeffentlicht ? `: abweichende Felder ${geaendert.join(', ') || 'keine'}` : ' ohne veröffentlichte Fassung'} – nur veröffentlichte Fassung übernommen.`,
    )
  }
}

function auffaelligkeitenSammeln(ctx: Kontext): void {
  const zugeordnet = new Set<PersonPlan>()
  for (const team of ctx.teams) for (const m of team.mitglieder) zugeordnet.add(m.person)
  for (const liste of Array.from(ctx.ansprechpartner.values())) for (const e of liste) zugeordnet.add(e.person)
  for (const ap of ansprechpartnerDoks(ctx)) zugeordnet.add(ansprechpartnerPerson(ctx, ap))
  const ohne = ctx.personen.filter(p => !zugeordnet.has(p)).map(p => p.name)
  if (ohne.length) notiz('Auffälligkeiten', `Personen ohne Mannschaft, Gruppe, Sparte oder Funktion: ${ohne.join(', ')}.`)

  for (const feld of ['email', 'telefon'] as const) {
    const nachWert = new Map<string, PersonPlan[]>()
    for (const p of ctx.personen) {
      const wert = p[feld]
      if (!wert) continue
      const schluessel = feld === 'email' ? wert.toLowerCase() : nurZiffern(wert)
      nachWert.set(schluessel, [...(nachWert.get(schluessel) ?? []), p])
    }
    for (const [wert, personen] of Array.from(nachWert)) {
      if (personen.length > 1) {
        notiz(
          'Auffälligkeiten',
          `${feld === 'email' ? 'Gleiche E-Mail-Adresse' : 'Gleiche Telefonnummer'} bei mehreren Personen ` +
            `(${personen.map(p => p.name).join(', ')}): ${personen[0][feld] ?? wert}.`,
        )
      }
    }
  }

  // E-Mail-Adressen, deren Name vor dem @ zu einer anderen Person passt (z. B. übernommene Kontaktdaten)
  for (const person of ctx.personen) {
    if (!person.email) continue
    const lokal = person.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim()
    if (nameTeile(lokal).length < 2 || namensteilePassen(lokal, person.name)) continue
    const andere = ctx.personen.filter(p => p !== person && namensteilePassen(lokal, p.name))
    if (andere.length === 1) {
      notiz(
        'Auffälligkeiten',
        `E-Mail-Adresse von ${person.name} (${person.email}) passt namentlich zu ${andere[0].name} – vermutlich Kontaktdaten dieser Person übernommen, bitte prüfen.`,
      )
    }
  }

  const ohneTrainer = ctx.teams.filter(t => !t.mitglieder.length).map(t => `${t.sparte.name} / ${t.name}`)
  if (ohneTrainer.length) notiz('Auffälligkeiten', `Mannschaften/Gruppen ohne Trainerteam: ${ohneTrainer.join('; ')}.`)
  const ohneZeiten = ctx.teams.filter(t => !t.trainingszeiten).map(t => `${t.sparte.name} / ${t.name}`)
  if (ohneZeiten.length) notiz('Auffälligkeiten', `Mannschaften/Gruppen ohne Trainingszeiten: ${ohneZeiten.join('; ')}.`)
  const leereSparten = ctx.sparten.filter(s => !ctx.teams.some(t => t.sparte === s)).map(s => s.name)
  if (leereSparten.length) notiz('Auffälligkeiten', `Sparten ohne Mannschaften/Gruppen: ${leereSparten.join(', ')}.`)
  const ohneAnsprechpartner = ctx.sparten.filter(s => !(ctx.ansprechpartner.get(s) ?? []).length).map(s => s.name)
  if (ohneAnsprechpartner.length) notiz('Auffälligkeiten', `Sparten ohne Ansprechpartner:innen: ${ohneAnsprechpartner.join(', ')}.`)
  const neu = ctx.personen.filter(p => p.neu).map(p => p.name)
  if (neu.length) notiz('Auffälligkeiten', `Neu angelegte Personen (kein Sanity-Personendokument): ${neu.join(', ')}.`)
}

// ─── Gesamtplanung ───────────────────────────────────────────────────────────

function planen(daten: ExportDaten): Plan {
  const ctx: Kontext = {
    daten,
    assets: new Map(daten.assets.map(a => [a._id, a])),
    medien: new Map(),
    sparten: [],
    sparteNachSanityId: new Map(),
    sparteNachName: new Map(),
    personen: [],
    personNachSanityId: new Map(),
    verzeichnis: new PersonenVerzeichnis(),
    teams: [],
    teamNachSanityId: new Map(),
    kontakte: [],
    ansprechpartner: new Map(),
  }

  assetsPruefen(daten)
  spartenPlanen(ctx)
  personenPlanen(ctx)
  teamsPlanen(ctx)
  trainerteamsErgaenzen(ctx)
  ansprechpartnerPlanen(ctx)

  // Personen-IDs erst jetzt vergeben – alle Personen (auch neu angelegte) stehen fest.
  ctx.personen
    .sort((a, b) => vergleich(a.name, b.name) || (a.sanityIds[0] ?? '').localeCompare(b.sanityIds[0] ?? ''))
    .forEach((person, index) => (person.id = index + 1))

  const legacy = new Map<TeamPlan, Set<string>>()
  const legacyKontakte: LegacyKontakt[] = []
  const trainingszeiten = trainingszeitenPlanen(ctx, legacy, legacyKontakte)
  legacyTrainerMelden(ctx, legacy)
  legacyKontakteMelden(ctx, legacyKontakte)
  const funktionen = funktionenPlanen(ctx)
  const news = newsPlanen(ctx)
  const termine = terminePlanen(ctx)
  const downloads = downloadsPlanen(ctx)

  const exportZeit = daten.exportiertAm
  const sparten: Plan['sparten'] = ctx.sparten.map(s => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    icon: leer(s.dok.icon),
    farbe: leer(s.dok.farbe),
    kurzbeschreibung: leer(s.dok.beschreibung),
    beschreibung: leer(s.dok.langbeschreibung),
    foto: medienPfad(ctx, s.dok.foto?.asset?._ref, 'sparten', s.slug),
    sichtbar: true,
    reihenfolge: s.reihenfolge,
    erstelltAm: zeitstempel(s.dok._createdAt, exportZeit),
    geaendertAm: zeitstempel(s.dok._updatedAt ?? s.dok._createdAt, exportZeit),
  }))

  const personen: Plan['personen'] = ctx.personen.map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    telefon: p.telefon,
    whatsapp: p.whatsapp,
    foto: medienPfad(ctx, p.fotoRef, 'personen', p.name),
    notiz: null,
    erstelltAm: p.erstelltAm,
    geaendertAm: p.geaendertAm,
  }))

  const teamZeile = (t: TeamPlan) => ({
    id: t.id,
    sparteId: t.sparte.id,
    name: t.name,
    altersklasse: t.altersklasse,
    beschreibung: leer(t.dok.beschreibung),
    foto: medienPfad(ctx, t.dok.foto?.asset?._ref, t.art === 'mannschaft' ? 'mannschaften' : 'gruppen', `${t.sparte.slug}-${t.name}`),
    sichtbar: t.dok.anzeigenAufWebsite !== false,
    reihenfolge: t.reihenfolge,
    erstelltAm: zeitstempel(t.dok._createdAt, exportZeit),
    geaendertAm: zeitstempel(t.dok._updatedAt ?? t.dok._createdAt, exportZeit),
  })
  const nachId = (a: TeamPlan, b: TeamPlan) => a.id - b.id
  const mannschaftTeams = ctx.teams.filter(t => t.art === 'mannschaft').sort(nachId)
  const gruppenTeams = ctx.teams.filter(t => t.art === 'gruppe').sort(nachId)

  const sparteAnsprechpartner: Plan['sparteAnsprechpartner'] = []
  for (const sparte of ctx.sparten) {
    for (const e of ctx.ansprechpartner.get(sparte) ?? []) {
      sparteAnsprechpartner.push({ sparteId: sparte.id, personId: e.person.id, rolle: e.rolle, reihenfolge: e.reihenfolge })
    }
  }

  const mannschaften = mannschaftTeams.map(t => ({ ...teamZeile(t), bereich: t.bereich }))
  const gruppen = gruppenTeams.map(teamZeile)

  // Erst jetzt melden – alle Medien und Zuordnungen stehen fest.
  restMelden(ctx)
  auffaelligkeitenSammeln(ctx)

  return {
    sparten,
    personen,
    mannschaften,
    gruppen,
    mannschaftPersonen: mannschaftTeams.flatMap(t =>
      t.mitglieder.map(m => ({ mannschaftId: t.id, personId: m.person.id, rolle: m.rolle, reihenfolge: m.reihenfolge })),
    ),
    gruppePersonen: gruppenTeams.flatMap(t =>
      t.mitglieder.map(m => ({ gruppeId: t.id, personId: m.person.id, rolle: m.rolle, reihenfolge: m.reihenfolge })),
    ),
    sparteAnsprechpartner,
    funktionen,
    trainingszeiten,
    news,
    termine,
    downloads,
    medien: new Map(Array.from(ctx.medien).sort(([a], [b]) => a.localeCompare(b))),
  }
}

// ─── Datenbank und Medienordner ──────────────────────────────────────────────

function pruefeArbeitsverzeichnis(): void {
  if (!fs.existsSync(path.resolve('package.json')) || !fs.existsSync(path.resolve('drizzle'))) {
    abbruch('Bitte im Projektordner ausführen (dort, wo package.json und drizzle/ liegen).')
  }
  const medien = path.resolve(MEDIEN_PFAD)
  const cwd = process.cwd()
  if (medien === path.parse(medien).root || medien === cwd || cwd.startsWith(medien + path.sep) || medien === IMPORT_ORDNER) {
    abbruch(`MEDIEN_PFAD "${medien}" ist als Medienordner ungeeignet (würde Projekt- oder Importdateien löschen).`)
  }
}

function datenbankDateienLoeschen(): void {
  for (const datei of [DATENBANK_PFAD, `${DATENBANK_PFAD}-wal`, `${DATENBANK_PFAD}-shm`]) {
    try {
      fs.rmSync(datei, { force: true })
    } catch (fehler) {
      abbruch(`${datei} lässt sich nicht löschen – läuft noch der Dev-Server? (${(fehler as Error).message})`)
    }
  }
  fs.rmSync(MEDIEN_PFAD, { recursive: true, force: true })
}

function verbindungSchliessen(): void {
  const halter = globalThis as unknown as { __svhsDatenbank?: ReturnType<typeof datenbank> }
  const db = halter.__svhsDatenbank
  if (!db) return
  const client = sqlite(db)
  if (client.open) {
    client.pragma('wal_checkpoint(TRUNCATE)')
    client.close()
  }
  halter.__svhsDatenbank = undefined
}

type SqliteVerbindung = BetterSqlite3.Database

/** Zugriff auf die darunterliegende better-sqlite3-Verbindung. */
function sqlite(db: Datenbank): SqliteVerbindung {
  return (db as Datenbank & { $client: SqliteVerbindung }).$client
}

function inBloecken<T>(zeilen: T[], einfuegen: (teil: T[]) => void): void {
  for (let i = 0; i < zeilen.length; i += 100) einfuegen(zeilen.slice(i, i + 100))
}

function einfuegen(plan: Plan): void {
  const db = datenbank()
  db.transaction(tx => {
    inBloecken(plan.sparten, teil => tx.insert(schema.sparten).values(teil).run())
    inBloecken(plan.personen, teil => tx.insert(schema.personen).values(teil).run())
    inBloecken(plan.mannschaften, teil => tx.insert(schema.mannschaften).values(teil).run())
    inBloecken(plan.gruppen, teil => tx.insert(schema.gruppen).values(teil).run())
    inBloecken(plan.mannschaftPersonen, teil => tx.insert(schema.mannschaftPersonen).values(teil).run())
    inBloecken(plan.gruppePersonen, teil => tx.insert(schema.gruppePersonen).values(teil).run())
    inBloecken(plan.sparteAnsprechpartner, teil => tx.insert(schema.sparteAnsprechpartner).values(teil).run())
    inBloecken(plan.funktionen, teil => tx.insert(schema.funktionen).values(teil).run())
    inBloecken(plan.trainingszeiten, teil => tx.insert(schema.trainingszeiten).values(teil).run())
    inBloecken(plan.news, teil => tx.insert(schema.news).values(teil).run())
    inBloecken(plan.termine, teil => tx.insert(schema.termine).values(teil).run())
    inBloecken(plan.downloads, teil => tx.insert(schema.downloads).values(teil).run())
  })
  const verstoesse = sqlite(db).pragma('foreign_key_check') as unknown[]
  if (verstoesse.length) abbruch(`Fremdschlüsselprüfung meldet ${verstoesse.length} Verstöße.`)
}

function medienKopieren(plan: Plan): { dateien: number; bytes: number } {
  let bytes = 0
  for (const [ziel, { quelle }] of Array.from(plan.medien)) {
    const absolut = path.join(MEDIEN_PFAD, ...ziel.split('/'))
    fs.mkdirSync(path.dirname(absolut), { recursive: true })
    fs.copyFileSync(quelle, absolut)
    bytes += fs.statSync(absolut).size
  }
  return { dateien: plan.medien.size, bytes }
}

const TABELLEN = [
  'sparten',
  'personen',
  'mannschaften',
  'gruppen',
  'mannschaft_personen',
  'gruppe_personen',
  'sparte_ansprechpartner',
  'funktionen',
  'trainingszeiten',
  'news',
  'termine',
  'downloads',
] as const

function zaehlen(): Record<string, number> {
  const client = sqlite(datenbank())
  return Object.fromEntries(
    TABELLEN.map(t => [t, (client.prepare(`SELECT count(*) AS anzahl FROM "${t}"`).get() as { anzahl: number }).anzahl]),
  )
}

// ─── Bericht schreiben ───────────────────────────────────────────────────────

const SANITY_QUELLE: Record<(typeof TABELLEN)[number], string> = {
  sparten: 'sparte',
  personen: 'person (+ neu angelegte, − zusammengeführte)',
  mannschaften: 'mannschaft (Ligateams)',
  gruppen: 'mannschaft (übrige)',
  mannschaft_personen: 'mannschaft.trainer[] + Kontakte',
  gruppe_personen: 'mannschaft.trainer[] + Kontakte',
  sparte_ansprechpartner: 'Abteilungsleitungen + Kontakte',
  funktionen: 'ansprechpartner',
  trainingszeiten: 'trainingszeit',
  news: 'newsPost',
  termine: 'termin',
  downloads: 'download',
}

function berichtErstellen(daten: ExportDaten, zaehlung: Record<string, number>, medien: { dateien: number; bytes: number }): string {
  const sanity = (typ: string) => daten.dokumente.filter(d => d._type === typ).length
  const vergleichswert: Partial<Record<(typeof TABELLEN)[number], number>> = {
    sparten: sanity('sparte'),
    personen: sanity('person'),
    funktionen: sanity('ansprechpartner'),
    trainingszeiten: sanity('trainingszeit'),
    news: sanity('newsPost'),
    termine: sanity('termin'),
    downloads: sanity('download'),
  }
  const zeilen: string[] = [
    '# Import-Bericht: Sanity → SQLite',
    '',
    `Erzeugt von \`scripts/import-aus-sanity.ts\` aus \`data/import/sanity-export.json\` ` +
      `(Export vom ${daten.exportiertAm}, Projekt ${daten.projektId ?? '?'}, Dataset ${daten.dataset ?? '?'}).`,
    '',
    '> Enthält personenbezogene Daten – liegt deshalb unter data/ und wird nie committet.',
    '',
    '## Zählung',
    '',
    '| Tabelle | Zeilen | Sanity-Quelle | Sanity-Dokumente |',
    '| --- | ---: | --- | ---: |',
    ...TABELLEN.map(t => `| ${t} | ${zaehlung[t]} | ${SANITY_QUELLE[t]} | ${vergleichswert[t] ?? '–'} |`),
    '',
    `Mannschaften + Gruppen: ${zaehlung.mannschaften + zaehlung.gruppen} (Sanity: ${sanity('mannschaft')} mannschaft-Dokumente). ` +
      `Medien: ${medien.dateien} Dateien, ${(medien.bytes / 1024 / 1024).toFixed(1)} MB in \`${path.relative(process.cwd(), MEDIEN_PFAD).replace(/\\/g, '/')}\`.`,
    '',
    '## Entscheidungen',
  ]
  for (const abschnitt of ABSCHNITTE) {
    if (abschnitt === 'Auffälligkeiten') continue
    const inhalt = berichtZeilen.get(abschnitt) ?? []
    if (!inhalt.length) continue
    zeilen.push('', `### ${abschnitt}`, '')
    inhalt.forEach((zeile, i) => {
      const tabelle = zeile.startsWith('|')
      // Tabellen brauchen eine Leerzeile davor und danach, sonst hängen sie am Listenpunkt.
      if (i > 0 && tabelle !== inhalt[i - 1].startsWith('|')) zeilen.push('')
      zeilen.push(tabelle ? zeile : `- ${zeile}`)
    })
  }
  zeilen.push('', '## Auffälligkeiten', '')
  const auffaellig = berichtZeilen.get('Auffälligkeiten') ?? []
  zeilen.push(...(auffaellig.length ? auffaellig.map(z => `- ${z}`) : ['- keine']))
  return zeilen.join('\n') + '\n'
}

// ─── Hauptprogramm ───────────────────────────────────────────────────────────

/**
 * Schutz vor versehentlichem Überschreiben: Sobald in der Datenbank Zugänge für die Verwaltung
 * angelegt sind, wird dort gearbeitet – ein Neuaufbau würde alle Änderungen, Zugänge und Uploads
 * seit dem Import verwerfen. Dann nur mit ausdrücklichem --alles-ueberschreiben.
 */
function pruefeUeberschreiben(): void {
  if (process.argv.indexOf('--alles-ueberschreiben') >= 0 || !fs.existsSync(DATENBANK_PFAD)) return
  const db = new Database(DATENBANK_PFAD, { readonly: true, fileMustExist: true })
  try {
    const tabelle = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'zugaenge'").get()
    const zugaenge = tabelle ? (db.prepare('SELECT count(*) AS n FROM zugaenge').get() as { n: number }).n : 0
    if (zugaenge > 0) {
      abbruch(
        `In ${path.relative(process.cwd(), DATENBANK_PFAD)} gibt es bereits ${zugaenge} Zugang/Zugänge für die Verwaltung – ` +
          'dort wird also schon gearbeitet. Der Import würde ALLES verwerfen (Inhalte, Zugänge, hochgeladene Medien). ' +
          'Wenn das wirklich gewollt ist: npm run import:sanity -- --alles-ueberschreiben',
      )
    }
  } finally {
    db.close()
  }
}

function main(): void {
  pruefeArbeitsverzeichnis()
  pruefeUeberschreiben()
  const daten = exportLesen()
  const plan = planen(daten)

  datenbankDateienLoeschen()
  let medien: { dateien: number; bytes: number }
  try {
    einfuegen(plan)
    medien = medienKopieren(plan)
    notiz('Medien', `${plan.medien.size} Dateien nach <kategorie>/<slug>-<hash8>.<ext> kopiert (Downloads: downloads/<slug-des-titels>.<ext>).`)
    const nachKategorie = new Map<string, number>()
    for (const ziel of Array.from(plan.medien.keys())) nachKategorie.set(ziel.split('/')[0], (nachKategorie.get(ziel.split('/')[0]) ?? 0) + 1)
    notiz('Medien', `Je Kategorie: ${Array.from(nachKategorie).map(([k, n]) => `${k} ${n}`).join(', ')}.`)
    const genutzt = new Set(Array.from(plan.medien.values()).map(m => m.asset._id))
    const ungenutzt = daten.assets.filter(a => !genutzt.has(a._id)).map(a => `\`${a._id}\``)
    if (ungenutzt.length) notiz('Medien', `Nicht kopiert (von keinem übernommenen Feld verwendet): ${ungenutzt.sort().join(', ')}.`)
  } catch (fehler) {
    verbindungSchliessen()
    datenbankDateienLoeschen()
    console.error('Datenbank und Medienordner wurden wieder entfernt – es bleibt nichts halb geschrieben zurück.')
    throw fehler
  }

  const zaehlung = zaehlen()
  verbindungSchliessen()
  const bericht = berichtErstellen(daten, zaehlung, medien)
  fs.writeFileSync(BERICHT_DATEI, bericht, 'utf8')
  console.log(bericht)
  console.log(`Bericht gespeichert unter ${path.relative(process.cwd(), BERICHT_DATEI)}`)
}

try {
  main()
} catch (fehler) {
  console.error(`\nImport abgebrochen: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
  if (!(fehler instanceof ImportFehler) && fehler instanceof Error && fehler.stack) console.error(fehler.stack)
  process.exitCode = 1
}
