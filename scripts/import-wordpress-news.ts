/**
 * scripts/import-wordpress-news.ts
 *
 * Übernimmt News von der alten WordPress-Seite (www.sv-holm-seppensen.de) in die Datenbank –
 * mit Titelbild und den Bildern aus dem Text. Gelesen wird über die öffentliche WordPress-
 * Schnittstelle (/wp-json/wp/v2/posts), nicht über das HTML der Seite.
 *
 * Pro Beitrag:
 *   - Text: HTML wird zu Markdown (Überschriften, Absätze, Listen, Fett/Kursiv, Links, Bilder).
 *     Reste des WPBakery-Baukastens ([vc_row] …) und leere Absätze fallen weg.
 *   - Bilder: Titelbild und Bilder im Text werden in voller Größe geladen und wie ein Upload in der
 *     Verwaltung gespeichert (WebP, höchstens 1600 px, ohne Metadaten) unter data/medien/news/.
 *     Taucht das Titelbild auch im Text auf, steht es dort nicht noch einmal.
 *   - Zuordnung: Sport-Kategorien von WordPress werden zur passenden Sparte, alles andere ist eine
 *     Vereins-News. Die Kategorie (Freitext) wird „Interviews“, „Aktionen“, der Spartenname oder „Verein“.
 *   - Teaser: Anfang des ersten Absatzes, gekürzt auf etwa 220 Zeichen.
 *   - Die News ist sofort veröffentlicht – auf der alten Seite war sie es auch – und steht im Verlauf
 *     als „angelegt“ mit der Quelle System.
 *
 * Schon vorhandene News werden übersprungen: gleiche Überschrift oder ein gemeinsamer längerer Satz
 * (so werden auch umformulierte Kopien erkannt). Das Skript kann deshalb gefahrlos erneut laufen
 * und holt dann nur Neues.
 *
 * Aufruf (im Projektordner):
 *   npm run import:wordpress                            alle Beiträge seit dem 1. Januar dieses Jahres
 *   npm run import:wordpress -- --seit 2025-06-01       alle Beiträge ab diesem Datum
 *   npm run import:wordpress -- --anzahl 10             nur die 10 neuesten
 *   npm run import:wordpress -- --probelauf             nur anzeigen, nichts speichern
 *
 * Mit --probelauf werden keine Bilder geladen und nichts geschrieben; die umgewandelten Texte landen
 * zur Kontrolle in data/import/wordpress-probelauf/ (personenbezogen, deshalb unter data/).
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import TurndownService from 'turndown'
import { datenbank, schema } from '@/lib/db'
import { freierNewsSlug } from '@/lib/verwaltung/inhalte/news'
import { bildSpeichern } from '@/lib/verwaltung/medien-upload'
import { slugify } from '@/lib/verwaltung/text'
import { protokollieren } from '@/lib/verwaltung/verlauf'

const QUELLE = 'https://www.sv-holm-seppensen.de'
const SEITENGROESSE = 20
const KOPF = { 'User-Agent': 'SV-Holm-Seppensen-Import/1.0 (+https://www.sv-holm-seppensen.de)' }
const PROBELAUF_ORDNER = path.resolve('data', 'import', 'wordpress-probelauf')

/** WordPress-Kategorie → Slug der Sparte in der neuen Datenbank. */
const SPARTE_ZU_KATEGORIE: Record<string, string> = {
  Akrobatik: 'akrobatik',
  Badminton: 'badminton',
  Bogenschießen: 'bogenschiessen',
  Boule: 'boule',
  Darts: 'dart',
  'Eltern-Kind-Turnen': 'mutter-kind-turnen',
  Fussball: 'fussball',
  Fußball: 'fussball',
  Fußballcamp: 'fussball',
  Judo: 'judo',
  Kinderturnen: 'kinderturnen',
  'Nordic Walking': 'nordic-walking',
  Sportabzeichen: 'sportabzeichen',
  Tischtennis: 'tischtennis',
  Volleyball: 'volleyball',
  Yoga: 'yoga',
}

// ─── Typen der WordPress-Schnittstelle (nur die genutzten Felder) ────────────

interface WpBeitrag {
  id: number
  date: string
  slug: string
  link: string
  title: { rendered: string }
  content: { rendered: string }
  categories: number[]
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string; alt_text?: string; mime_type?: string }>
  }
}

interface WpKategorie {
  id: number
  name: string
}

// ─── Aufrufparameter ─────────────────────────────────────────────────────────

function parameter() {
  const args = process.argv.slice(2)
  const wert = (name: string) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }
  const seit = wert('--seit') ?? `${new Date().getFullYear()}-01-01`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seit)) throw new Error(`--seit erwartet ein Datum wie 2026-01-01, nicht "${seit}".`)
  const anzahlText = wert('--anzahl')
  const anzahl = anzahlText ? Number(anzahlText) : Infinity
  if (!(anzahl > 0)) throw new Error(`--anzahl erwartet eine positive Zahl, nicht "${anzahlText}".`)
  return { seit, anzahl, probelauf: args.includes('--probelauf') }
}

// ─── Laden ───────────────────────────────────────────────────────────────────

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: KOPF })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return (await res.json()) as T
}

/** Beiträge ab `seit`, neueste zuerst, höchstens `anzahl`. */
async function beitraegeLaden(seit: string, anzahl: number): Promise<WpBeitrag[]> {
  const ergebnis: WpBeitrag[] = []
  for (let seite = 1; ergebnis.length < anzahl; seite++) {
    const url = `${QUELLE}/wp-json/wp/v2/posts?per_page=${SEITENGROESSE}&page=${seite}&orderby=date&order=desc&after=${seit}T00:00:00&_embed=wp:featuredmedia`
    const res = await fetch(url, { headers: KOPF })
    // WordPress antwortet hinter der letzten Seite mit 400 (rest_post_invalid_page_number).
    if (res.status === 400) break
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
    const teil = (await res.json()) as WpBeitrag[]
    ergebnis.push(...teil)
    if (teil.length < SEITENGROESSE) break
  }
  return ergebnis.slice(0, anzahl)
}

async function bildLaden(url: string): Promise<File> {
  // Steht nur eine verkleinerte Fassung im HTML ("foto-225x300.jpg"), zuerst das Original versuchen.
  const original = url.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '')
  for (const versuch of original !== url ? [original, url] : [url]) {
    const res = await fetch(versuch, { headers: KOPF })
    const typ = res.headers.get('content-type') ?? ''
    if (res.ok && typ.startsWith('image/')) {
      return new File([await res.arrayBuffer()], path.basename(new URL(versuch).pathname), { type: typ })
    }
    if (versuch === url) throw new Error(`Bild ${url} → HTTP ${res.status}${res.ok ? ` (${typ || 'ohne Typ'})` : ''}`)
  }
  throw new Error(`Bild ${url} nicht ladbar`)
}

/**
 * Titelbild: Ist es eine in WordPress bearbeitete Fassung ("plakat-e1769724954918.jpg"), ist das oft
 * nur eine verkleinerte Kopie. Dann das unbearbeitete Original nehmen – aber nur, wenn es größer ist
 * und dasselbe Seitenverhältnis hat (sonst wurde zugeschnitten, und die bearbeitete Fassung gilt).
 */
async function titelbildLaden(url: string): Promise<File> {
  const bearbeitet = await bildLaden(url)
  const original = url.replace(/-e\d{6,}(?=\.[a-z0-9]+$)/i, '')
  if (original === url) return bearbeitet
  try {
    const kandidat = await bildLaden(original)
    const [a, b] = await Promise.all(
      [bearbeitet, kandidat].map(async f => sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 50_000_000 }).metadata()),
    )
    if (!a.width || !a.height || !b.width || !b.height) return bearbeitet
    const gleichesFormat = Math.abs(a.width / a.height - b.width / b.height) < 0.01
    return gleichesFormat && b.width > a.width ? kandidat : bearbeitet
  } catch {
    return bearbeitet
  }
}

// ─── Text aufbereiten ────────────────────────────────────────────────────────

const BENANNTE_ENTITAETEN: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„', laquo: '«', raquo: '»',
}

/** Für Überschriften: HTML-Entitäten wie &#8230; oder &amp; in Zeichen umwandeln. */
function entitaetenDekodieren(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, code: string) => {
    if (code[0] === '#') {
      const zahl = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(zahl) ? String.fromCodePoint(zahl) : ganz
    }
    return BENANNTE_ENTITAETEN[code.toLowerCase()] ?? ganz
  })
}

function ohneTags(html: string): string {
  return entitaetenDekodieren(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
}

/** Reiner Text mit einem Zeilenumbruch pro Absatz – für den Dublettenvergleich. */
function textAbsaetze(html: string): string {
  return entitaetenDekodieren(html.replace(/<\/(p|li|h\d|div|figure|figcaption)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''))
    .replace(/[ \t ]+/g, ' ')
    .trim()
}

/** Bild-URL in voller Größe: größter Eintrag aus srcset, sonst src ohne "-300x200"-Zusatz. */
function vollesBild(img: string): string | null {
  const attribut = (name: string) => img.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1]
  const kandidaten = (attribut('srcset') ?? '')
    .split(',')
    .map(t => t.trim().split(/\s+/))
    .filter(t => t[0] && /^\d+w$/.test(t[1] ?? ''))
    .map(t => ({ url: t[0], breite: parseInt(t[1], 10) }))
    .sort((a, b) => b.breite - a.breite)
  const url = kandidaten[0]?.url ?? attribut('src')
  if (!url) return null
  return entitaetenDekodieren(url).replace(/^http:\/\//, 'https://')
}

/**
 * Dateiname ohne WordPress-Zusätze – zum Erkennen desselben Bildes in verschiedenen Fassungen:
 * "-300x200" (Größe), "-scaled" (verkleinertes Original), "-e1769724954918" (in WordPress bearbeitet).
 */
function bildKennung(url: string): string {
  let name = path.basename(new URL(url).pathname).toLowerCase()
  for (let vorher = ''; vorher !== name; ) {
    vorher = name
    name = name.replace(/-(\d+x\d+|scaled|e\d{6,})(?=\.[a-z0-9]+$)/, '')
  }
  return name
}

function istEigenesBild(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, '') === new URL(QUELLE).hostname.replace(/^www\./, '')
  } catch {
    return false
  }
}

/**
 * Bilder aus WPBakery-Shortcodes: [vc_gallery images="1,2,3"] und [vc_single_image image="4"] nennen
 * nur die IDs der Mediendateien. Die Adressen kommen aus der Schnittstelle; der Shortcode wird durch
 * normale <img>-Tags ersetzt, damit die Bilder wie alle anderen übernommen werden.
 */
async function shortcodeBilderAufloesen(html: string): Promise<string> {
  const muster = /\[vc_(?:gallery|single_image|images_carousel)\b[^\]]*?\bimages?="([\d,\s]+)"[^\]]*\]/g
  const ids = Array.from(new Set(Array.from(html.matchAll(muster)).flatMap(m => m[1].split(',').map(t => t.trim()).filter(Boolean))))
  if (!ids.length) return html
  const medien = await json<Array<{ id: number; source_url: string; alt_text?: string }>>(
    `${QUELLE}/wp-json/wp/v2/media?include=${ids.join(',')}&per_page=100`,
  )
  const nachId = new Map(medien.map(m => [String(m.id), m]))
  return html.replace(muster, (_ganz, liste: string) =>
    liste
      .split(',')
      .map(id => nachId.get(id.trim()))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map(m => `<p><img src="${m.source_url}" alt="${(m.alt_text ?? '').replace(/"/g, '&quot;')}"></p>`)
      .join('\n'),
  )
}

/** Entfernt WPBakery-Shortcodes ([vc_row], [/vc_column_text] …); der Inhalt dazwischen bleibt. */
function ohneShortcodes(html: string): string {
  return html.replace(/\[\/?vc_[^\]]*\]/g, '')
}

/**
 * Holt Bilder aus Fett/Kursiv heraus (<strong><img …>Frage?</strong> → <img …><strong>Frage?</strong>).
 * Sonst stünden die Hervorhebungszeichen allein um den Bild-Absatz – Markdown macht daraus leere
 * Aufzählungspunkte, und der Text dahinter verliert den Fettdruck.
 */
function bilderAusHervorhebung(html: string): string {
  const bild = String.raw`(?:<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>|<img\b[^>]*>)`
  const amAnfang = new RegExp(String.raw`<(strong|b|em|i)\b([^>]*)>(\s*)(${bild})`, 'gi')
  const amEnde = new RegExp(String.raw`(${bild})(\s*)<\/(strong|b|em|i)>`, 'gi')
  for (let vorher = ''; vorher !== html; ) {
    vorher = html
    html = html.replace(amAnfang, '$4<$1$2>$3').replace(amEnde, '</$3>$2$1')
  }
  return html
}

function markdownWandler(bilder: Map<string, string | null>): TurndownService {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**' })
  td.remove(['script', 'style', 'noscript', 'iframe'])
  // Fett oder kursiv gesetzter Link: Hervorhebung um den Link statt im Linktext ("**[…](…)**").
  // Ein Linktext wie "**https://…**" würde sonst beim Anzeigen ein zweites Mal verlinkt.
  td.addRule('link', {
    filter: node => node.nodeName === 'A' && !!(node as HTMLElement).getAttribute('href'),
    replacement: (inhalt, knoten) => {
      const el = knoten as HTMLElement
      const href = (el.getAttribute('href') ?? '').replace(/[()]/g, c => encodeURIComponent(c))
      const titel = el.getAttribute('title')
      const text = inhalt.trim()
      if (!text) return ''
      const m = text.match(/^(\*{1,3})([^*][\s\S]*?)\1$/)
      const [zeichen, linktext] = m ? [m[1], m[2]] : ['', text]
      return `${zeichen}[${linktext}](${href}${titel ? ` "${titel.replace(/"/g, '\\"')}"` : ''})${zeichen}`
    },
  })
  // Bilder: auf die neue Kopie im Medienordner zeigen; Bilder ohne Kopie (fremde Seiten, Titelbild-Dublette) entfallen.
  td.addRule('bild', {
    filter: 'img',
    replacement: (_inhalt, knoten) => {
      const el = knoten as HTMLElement
      const url = vollesBild(el.outerHTML)
      const ziel = url ? bilder.get(url) : null
      if (!ziel) return ''
      const alt = (el.getAttribute('alt') ?? '').replace(/[[\]]/g, '')
      return `\n\n![${alt}](${ziel})\n\n`
    },
  })
  // Links, die nur ein Bild umschließen (Lightbox auf der alten Seite), werden zum bloßen Bild.
  td.addRule('bildlink', {
    filter: node => node.nodeName === 'A' && !!node.querySelector('img') && !(node.textContent ?? '').trim(),
    replacement: inhalt => inhalt,
  })
  // Bildunterschriften als eigene, kursive Zeile unter dem Bild – nicht, wenn das Bild selbst
  // weggefallen ist, und in Galerien nicht bei jedem Bild dieselbe Unterschrift noch einmal.
  let letzteUnterschrift = ''
  td.addRule('bildunterschrift', {
    filter: 'figcaption',
    replacement: (inhalt, knoten) => {
      const text = inhalt.trim()
      const geschwister = Array.from(knoten.parentNode?.childNodes ?? []) as HTMLElement[]
      const bildKnoten = geschwister.find(n => n.nodeName === 'IMG' || (n.nodeName === 'A' && !!n.querySelector('img')))
      const img = bildKnoten?.nodeName === 'IMG' ? bildKnoten : bildKnoten?.querySelector('img')
      const url = img ? vollesBild(img.outerHTML) : null
      if (!text || (img && !(url && bilder.get(url))) || text === letzteUnterschrift) return ''
      letzteUnterschrift = text
      return `\n\n*${text}*\n\n`
    },
  })
  // Überschriften ohne Fettdruck darin; leere fallen weg. Ganze Sätze als große Überschrift
  // (auf der alten Seite als Hervorhebung benutzt) werden zu einem fetten Absatz.
  td.addRule('ueberschrift', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (inhalt, knoten) => {
      // Ein Bild in einer Überschrift (kommt im Original vor) wird ein normaler Bild-Absatz.
      if (inhalt.includes('![')) return `\n\n${inhalt.trim()}\n\n`
      const text = inhalt.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
      if (!text) return ''
      const ebene = Number(knoten.nodeName.charAt(1))
      if (ebene <= 3 && text.length > 70) return `\n\n**${text}**\n\n`
      return `\n\n${'#'.repeat(ebene)} ${text}\n\n`
    },
  })
  return td
}

/** Entfernt ein einzelnes, unpaariges "**" am Anfang oder Ende eines Absatzes (kaputtes HTML im Original). */
function fettdruckReparieren(absatz: string): string {
  const anzahl = (absatz.match(/(?<!\\)\*\*/g) ?? []).length
  if (anzahl % 2 === 0) return absatz
  if (/\*\*\s*$/.test(absatz)) return absatz.replace(/\*\*\s*$/, '')
  if (/^\s*\*\*/.test(absatz)) return absatz.replace(/^(\s*)\*\*/, '$1')
  return absatz
}

/**
 * Räumt das Markdown auf: geschützte Leerzeichen, leere Zeilen, Leerzeichen am Zeilenende (zwei
 * Leerzeichen = Zeilenumbruch bleiben nur innerhalb eines Absatzes), Abstand nach Listenzeichen.
 */
function aufraeumen(md: string): string {
  const zeilen = md
    .replace(/ /g, ' ')
    .replace(/^(\*\*|\*)\s*\1$/gm, '') // leere Hervorhebungen wie "** **"
    .replace(/^(\s*)([-*+]|\d+\.)[ ]{2,}(?=\S)/gm, '$1$2 ')
    .split('\n')
    .map(zeile => (/^\s*$/.test(zeile) ? '' : zeile))
  return zeilen
    .map((zeile, i) => (zeilen[i + 1] ? zeile.replace(/[ \t]+$/, rest => (rest.length >= 2 ? '  ' : '')) : zeile.trimEnd()))
    .join('\n')
    .split(/\n{2,}/)
    .map(fettdruckReparieren)
    // Absätze nur aus Sternchen sind Reste einer Hervorhebung ohne Text.
    .filter(absatz => absatz.trim() && !/^\*{1,3}$/.test(absatz.trim()))
    .join('\n\n')
    .trim()
}

/** Markdown-Absatz als reiner Text: ohne Bilder, Linkziele, Hervorhebungen und Escape-Zeichen. */
function alsText(absatz: string): string {
  return absatz
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\\\*/g, '\u0000') // maskierte Sternchen sind echter Text ("*lacht*")
    .replace(/\*+/g, '')
    .replace(/\u0000/g, '*')
    .replace(/^\s*(?:[-+]|\d+\.)\s+/gm, '') // Listenzeichen
    .replace(/`/g, '')
    .replace(/\\([!-/:-@[-`{-~])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Teaser: der Textanfang ohne Überschriften und Bilder – Absätze, bis mindestens 80 Zeichen erreicht
 * sind und der Text nicht mitten im Satz (Komma, Doppelpunkt) endet; über 220 Zeichen gekürzt mit „ …“.
 */
function teaserAus(md: string, titel: string): string | null {
  const ohneBilder = md.split(/\n{2,}/).filter(a => !/^\s*!\[/.test(a))
  const textAbsaetze = ohneBilder.filter(a => !/^\s*#/.test(a))
  // Besteht der Beitrag nur aus Überschriften ("Frohe Ostern!"), dienen sie als Text.
  const absaetze = (textAbsaetze.length ? textAbsaetze : ohneBilder.map(a => a.replace(/^\s*#+\s*/, '')))
    .map(alsText)
    .filter(a => a && normiert(a) !== normiert(titel))
  let text = ''
  for (const a of absaetze) {
    text = text ? `${text} ${a}` : a
    if (text.length >= 80 && !/[,:;–-]$/.test(text)) break
  }
  if (!text) return null
  if (text.length <= 220 && !/[,:;–-]$/.test(text)) return text
  const gekuerzt = text.slice(0, 220)
  return gekuerzt.slice(0, Math.max(gekuerzt.lastIndexOf(' '), 160)).replace(/[\s,;:–-]+$/, '') + ' …'
}

// ─── Dubletten ───────────────────────────────────────────────────────────────

function normiert(text: string): string {
  return slugify(text).replace(/-/g, ' ')
}

/** Sätze ab 60 Zeichen, normalisiert – ein gemeinsamer Satz verrät eine Kopie. */
function langeSaetze(text: string): Set<string> {
  const saetze = text
    .replace(/[*_#>`[\]()!\\]/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(normiert)
    .filter(s => s.length >= 60)
  return new Set(saetze)
}

// ─── Hauptprogramm ───────────────────────────────────────────────────────────

async function main() {
  const { seit, anzahl, probelauf } = parameter()
  const db = datenbank()

  console.log(`Lade Beiträge von ${QUELLE} seit ${seit}${Number.isFinite(anzahl) ? ` (höchstens ${anzahl})` : ''} …`)
  const [beitraege, kategorien] = await Promise.all([
    beitraegeLaden(seit, anzahl),
    json<WpKategorie[]>(`${QUELLE}/wp-json/wp/v2/categories?per_page=100`),
  ])
  const kategorieName = new Map(kategorien.map(k => [k.id, entitaetenDekodieren(k.name)]))
  const sparten = new Map(db.select({ id: schema.sparten.id, slug: schema.sparten.slug, name: schema.sparten.name }).from(schema.sparten).all().map(s => [s.slug, s]))

  const vorhandene = db.select({ titel: schema.news.titel, inhalt: schema.news.inhalt }).from(schema.news).all()
  const bekannteTitel = new Set(vorhandene.map(n => normiert(n.titel)))
  const bekannteSaetze = new Set(vorhandene.flatMap(n => Array.from(langeSaetze(n.inhalt))))

  if (probelauf) fs.mkdirSync(PROBELAUF_ORDNER, { recursive: true })

  const bericht = { neu: [] as string[], uebersprungen: [] as string[], fehler: [] as string[], warnungen: [] as string[] }

  // Älteste zuerst anlegen, damit die IDs der zeitlichen Reihenfolge folgen.
  for (const b of [...beitraege].reverse()) {
    const titel = entitaetenDekodieren(ohneTags(b.title.rendered))
    const datum = b.date.slice(0, 10)
    const textHtml = ohneShortcodes(b.content.rendered)
    const kennung = `${datum} „${titel}“`

    const textSaetze = langeSaetze(textAbsaetze(textHtml))
    const kopieVon = bekannteTitel.has(normiert(titel)) || Array.from(textSaetze).some(s => bekannteSaetze.has(s))
    if (kopieVon) {
      bericht.uebersprungen.push(`${kennung} – schon vorhanden`)
      continue
    }

    try {
      const html = bilderAusHervorhebung(ohneShortcodes(await shortcodeBilderAufloesen(b.content.rendered)))

      // Zuordnung und Kategorie
      const wpKategorien = b.categories.map(id => kategorieName.get(id) ?? '')
      const sparte = wpKategorien.map(k => sparten.get(SPARTE_ZU_KATEGORIE[k] ?? '')).find(Boolean) ?? null
      const kategorie = wpKategorien.includes('Interviews')
        ? 'Interviews'
        : wpKategorien.includes('Aktionen')
          ? 'Aktionen'
          : (sparte?.name ?? 'Verein')

      // Bilder: Titelbild + alle eigenen Bilder im Text
      const titelbildUrl = b._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null
      const titelKennung = titelbildUrl ? bildKennung(titelbildUrl) : null
      const textBilder = Array.from(new Set((html.match(/<img\b[^>]*>/gi) ?? []).map(vollesBild).filter((u): u is string => !!u)))
      const slugBasis = slugify(titel)
      const ziele = new Map<string, string | null>()
      let bild: { pfad: string; breite: number; hoehe: number } | null = null

      if (!probelauf) {
        if (titelbildUrl) bild = await bildSpeichern(await titelbildLaden(titelbildUrl), 'news', slugBasis)
        for (const url of textBilder) {
          if (titelKennung && bildKennung(url) === titelKennung) ziele.set(url, null)
          else if (!istEigenesBild(url)) {
            ziele.set(url, null)
            bericht.warnungen.push(`${kennung}: fremdes Bild weggelassen (${url})`)
          } else {
            const gespeichert = await bildSpeichern(await bildLaden(url), 'news', `${slugBasis}-text`)
            ziele.set(url, `/medien/${gespeichert.pfad}`)
          }
        }
      } else {
        for (const url of textBilder) ziele.set(url, titelKennung && bildKennung(url) === titelKennung ? null : `[Bild: ${url}]`)
      }

      const inhalt = aufraeumen(markdownWandler(ziele).turndown(html))
      const teaser = teaserAus(inhalt, titel)

      if (probelauf) {
        const datei = path.join(PROBELAUF_ORDNER, `${datum}-${slugBasis}.md`)
        fs.writeFileSync(
          datei,
          `# ${titel}\n\nDatum: ${datum} · Kategorie: ${kategorie} · Sparte: ${sparte?.name ?? '— (Verein)'}\nTitelbild: ${titelbildUrl ?? '—'}\nTeaser: ${teaser ?? '—'}\nQuelle: ${b.link}\n\n---\n\n${inhalt}\n`,
        )
        bericht.neu.push(`${kennung} → ${path.relative(process.cwd(), datei)}`)
        continue
      }

      const neu = db.transaction(tx => {
        const slug = freierNewsSlug(db, slugBasis)
        const zeile = tx
          .insert(schema.news)
          .values({
            slug,
            titel,
            teaser,
            inhalt,
            bild: bild?.pfad ?? null,
            bildBreite: bild?.breite ?? null,
            bildHoehe: bild?.hoehe ?? null,
            kategorie,
            datum,
            veroeffentlicht: true,
            sparteId: sparte?.id ?? null,
          })
          .returning()
          .get()
        protokollieren(tx, null, {
          aktion: 'angelegt',
          objektTyp: 'news',
          objektId: zeile.id,
          bezeichnung: `News: ${zeile.titel} (von der alten Website übernommen)`,
          nachher: zeile,
          quelle: 'system',
        })
        return zeile
      })
      bekannteTitel.add(normiert(titel))
      textSaetze.forEach(s => bekannteSaetze.add(s))
      const anzahlBilder = Array.from(ziele.values()).filter(Boolean).length
      bericht.neu.push(`${kennung} → /news/${neu.slug} (${bild ? 'mit Titelbild' : 'ohne Titelbild'}${anzahlBilder ? `, ${anzahlBilder} Bild(er) im Text` : ''})`)
    } catch (fehler) {
      bericht.fehler.push(`${kennung}: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
    }
  }

  const abschnitt = (titel: string, zeilen: string[]) => zeilen.length && console.log(`\n${titel} (${zeilen.length}):\n${zeilen.map(z => `  - ${z}`).join('\n')}`)
  abschnitt(probelauf ? 'Würde übernommen' : 'Übernommen', bericht.neu)
  abschnitt('Übersprungen', bericht.uebersprungen)
  abschnitt('Hinweise', bericht.warnungen)
  abschnitt('Fehler', bericht.fehler)
  if (!bericht.neu.length && !bericht.fehler.length) console.log('\nNichts Neues gefunden.')
  process.exitCode = bericht.fehler.length ? 1 : 0
}

main().catch(fehler => {
  console.error(fehler instanceof Error ? fehler.message : fehler)
  process.exitCode = 1
})
