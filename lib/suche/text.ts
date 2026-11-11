/**
 * lib/suche/text.ts
 *
 * Textwerkzeuge der Website-Suche – ohne Datenbank und ohne Node-Module.
 *
 * Verglichen wird in einer Normalform (suchNormal aus lib/verwaltung/suche.ts): Groß-/Kleinschreibung,
 * Akzente und Umlaut-Schreibweisen spielen keine Rolle ("Fussball" findet "Fußball", "Mueller" findet
 * "Müller"). Für die Hervorhebung im Ausschnitt rechnet normalMitPositionen jede Stelle der Normalform
 * auf die Stelle im Originaltext zurück.
 */

import { suchNormal } from '@/lib/verwaltung/suche'

export { suchNormal }

/** Text mit hervorgehobenen Stellen: Bereiche [von, bis) im Text, sortiert und ohne Überlappung. */
export interface MarkierterText {
  text: string
  marken: [number, number][]
}

const WORTZEICHEN = /[\p{L}\p{N}]/u

export function istWortzeichen(zeichen: string | undefined): boolean {
  return zeichen !== undefined && WORTZEICHEN.test(zeichen)
}

/**
 * Wörter, die allein nichts eingrenzen ("Wann ist das Training?" sucht nach "training"). Sie fallen
 * nur weg, wenn danach noch etwas übrig bleibt – "Die Ärzte" bleibt also eine Suche nach beidem.
 */
const FUELLWOERTER = new Set(
  (
    'der die das den dem des ein eine einen einem einer eines und oder aber auch als am an auf aus bei bis ' +
    'da dass du er es fuer gibt hat ich ihr im in ist kann man mit nach nicht noch nur ob sie sind so um ' +
    'uns von vom was wann warum welche welcher wer wie wo wir zu zum zur ueber unter'
  ).split(' '),
)

/** Suchwörter in Normalform: getrennt an allem, was kein Buchstabe und keine Ziffer ist, ohne Doppelte. */
export function suchWoerter(eingabe: string): string[] {
  const alle = [...new Set(suchNormal(eingabe).split(/[^\p{L}\p{N}]+/u).filter(Boolean))]
  const ohneFuellwoerter = alle.filter(w => !FUELLWOERTER.has(w))
  return ohneFuellwoerter.length > 0 ? ohneFuellwoerter : alle
}

/**
 * Wie gut passt ein Suchwort an Stelle i im (normalisierten) Text?
 * 1 = ganzes Wort, 0.75 = Wortanfang ("trainer" in "trainerteam"), 0.4 = mitten im Wort
 * ("zeugnis" in "fuehrungszeugnis"). Wörter mit ein, zwei Zeichen zählen nur am Wortanfang –
 * sonst passte "u1" auf alles Mögliche.
 */
function guete(text: string, i: number, wort: string): number {
  const anfang = !istWortzeichen(text[i - 1])
  const ende = !istWortzeichen(text[i + wort.length])
  if (anfang) return ende ? 1 : 0.75
  return wort.length >= 3 ? 0.4 : 0
}

export interface Fundstelle {
  /** Beste Güte aller Fundstellen, 0 = nicht gefunden */
  guete: number
  anzahl: number
}

/** Alle Fundstellen eines Suchworts im normalisierten Text (höchstens 20 werden gezählt). */
export function finde(text: string, wort: string): Fundstelle {
  let beste = 0
  let anzahl = 0
  for (let i = text.indexOf(wort); i !== -1 && anzahl < 20; i = text.indexOf(wort, i + 1)) {
    const g = guete(text, i, wort)
    if (g === 0) continue
    anzahl++
    if (g > beste) beste = g
  }
  return { guete: beste, anzahl }
}

/** Normalform samt Rückverweis: pos[i] ist die Stelle im Original, aus der Zeichen i der Normalform stammt. */
function normalMitPositionen(text: string): { norm: string; pos: number[] } {
  let norm = ''
  const pos: number[] = []
  for (let i = 0; i < text.length; i++) {
    const teil = suchNormal(text[i])
    for (let k = 0; k < teil.length; k++) {
      norm += teil[k]
      pos.push(i)
    }
  }
  return { norm, pos }
}

/**
 * Fundstellen aller Suchwörter als Bereiche im Originaltext, zusammengelegt wo sie sich berühren.
 * Passt ein Suchwort auf einen Wortanfang ("fussbal", "jud"), gilt das ganze Wort als Fundstelle –
 * mitten im Wort ("zeugnis" in "Führungszeugnis") nur der passende Teil.
 */
function bereiche(text: string, woerter: string[]): [number, number][] {
  const { norm, pos } = normalMitPositionen(text)
  const roh: [number, number][] = []
  for (const wort of woerter) {
    for (let i = norm.indexOf(wort); i !== -1; i = norm.indexOf(wort, i + 1)) {
      const g = guete(norm, i, wort)
      if (g === 0) continue
      let bis = pos[i + wort.length - 1] + 1
      if (g === 0.75) while (istWortzeichen(text[bis])) bis++
      roh.push([pos[i], bis])
    }
  }
  roh.sort((a, b) => a[0] - b[0] || b[1] - a[1])
  const ergebnis: [number, number][] = []
  for (const [von, bis] of roh) {
    const letzter = ergebnis[ergebnis.length - 1]
    if (letzter && von <= letzter[1]) letzter[1] = Math.max(letzter[1], bis)
    else ergebnis.push([von, bis])
  }
  return ergebnis
}

export function markieren(text: string, woerter: string[]): MarkierterText {
  return { text, marken: bereiche(text, woerter) }
}

/**
 * Ausschnitt um die erste Fundstelle, höchstens etwa `laenge` Zeichen, an Wortgrenzen geschnitten
 * und mit "…" an abgeschnittenen Enden. Ohne Fundstelle der Anfang des Texts.
 */
export function ausschnitt(text: string, woerter: string[], laenge = 180): MarkierterText {
  const alle = bereiche(text, woerter)
  if (text.length <= laenge) return { text, marken: alle }

  const erste = alle[0]?.[0] ?? 0
  // Etwas Text vor der Fundstelle stehen lassen, damit man den Zusammenhang erkennt
  let von = Math.max(0, Math.min(erste - Math.round(laenge * 0.3), text.length - laenge))
  if (von > 0) {
    const leer = text.indexOf(' ', von)
    von = leer !== -1 && leer < erste ? leer + 1 : von
  }
  let bis = Math.min(text.length, von + laenge)
  if (bis < text.length) {
    const leer = text.lastIndexOf(' ', bis)
    if (leer > von + laenge / 2) bis = leer
  }

  const vorne = von > 0 ? '… ' : ''
  const hinten = bis < text.length ? ' …' : ''
  const versatz = vorne.length - von
  return {
    text: vorne + text.slice(von, bis).trim() + hinten,
    marken: alle
      .filter(([a, b]) => a >= von && b <= bis)
      .map(([a, b]): [number, number] => [a + versatz, b + versatz]),
  }
}

// ─── Sprung zur Fundstelle ──────────────────────────────────────────────────

/** Satzzeichen, an denen die Wortgruppe für den Sprung endet – dort beginnt oft ein neues Element. */
const GRENZE = /[.,;:!?()[\]{}"„“”«»‚‘’·|/–—\n]/

/**
 * Text-Fragment (#:~:text=…) für einen Link: Der Browser springt zur Fundstelle und markiert sie
 * (Chrome, Edge, Safari ab 16.1, Firefox ab 131; andere öffnen die Seite einfach oben).
 * Genommen wird die beste Fundstelle (ganzes Wort vor Wortteil, längeres Suchwort vor kürzerem –
 * "Trainer Müller" springt zu "Müller") und bis zu drei Wörter davor und danach, aber nicht über
 * Satzzeichen hinweg – so steht die Gruppe sehr wahrscheinlich wörtlich in einem Element der Seite
 * und trifft nicht zuerst ein einzelnes Wort in der Navigation.
 * minWoerter: kürzere Gruppen ergeben kein Fragment (wenn die Adresse schon ein genaues Sprungziel hat).
 */
export function textFragment(text: string, woerter: string[], minWoerter = 1): string | null {
  const { norm, pos } = normalMitPositionen(text)
  let beste: { von: number; bis: number; guete: number; laenge: number } | null = null
  for (const wort of woerter) {
    for (let i = norm.indexOf(wort); i !== -1; i = norm.indexOf(wort, i + 1)) {
      const g = guete(norm, i, wort)
      if (g === 0) continue
      if (!beste || g > beste.guete || (g === beste.guete && wort.length > beste.laenge)) {
        beste = { von: pos[i], bis: pos[i + wort.length - 1] + 1, guete: g, laenge: wort.length }
      }
      break
    }
  }
  if (!beste) return null

  let von = beste.von
  let bis = beste.bis
  while (von > 0 && istWortzeichen(text[von - 1])) von--
  while (bis < text.length && istWortzeichen(text[bis])) bis++

  for (let n = 0; n < 3; n++) {
    const davor = text.slice(0, von).match(/(\S+)\s+$/)
    if (!davor || GRENZE.test(davor[1]) || GRENZE.test(text.slice(von - davor[0].length, von))) break
    von -= davor[0].length
  }
  for (let n = 0; n < 3; n++) {
    const danach = text.slice(bis).match(/^\s+(\S+)/)
    if (!danach || GRENZE.test(danach[0])) break
    bis += danach[0].length
  }

  const gruppe = text.slice(von, bis).replace(/\s+/g, ' ').trim()
  if (!gruppe || gruppe.split(' ').length < minWoerter) return null
  // "-", "," und "&" haben im Fragment eine eigene Bedeutung und müssen kodiert sein
  return `#:~:text=${encodeURIComponent(gruppe).replace(/-/g, '%2D')}`
}

// ─── Markdown als Text ──────────────────────────────────────────────────────

/**
 * Markdown (News, Seitentexte) als Absätze reinen Texts – so, wie er auf der Seite zu lesen ist.
 * Listenpunkte und Überschriften werden eigene Absätze, damit Ausschnitte und Sprünge nicht über
 * Elementgrenzen reichen.
 */
export function markdownAbsaetze(markdown: string | null | undefined): string[] {
  if (!markdown) return []
  const absaetze: string[] = []
  let laufend: string[] = []
  const abschliessen = () => {
    const text = laufend.join(' ').replace(/\s+/g, ' ').trim()
    if (text) absaetze.push(text)
    laufend = []
  }

  for (const roheZeile of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const zeile = roheZeile.trim()
    if (!zeile || /^(```|~~~|-{3,}|\*{3,}|_{3,})/.test(zeile) || /^\|?\s*:?-{3,}/.test(zeile)) {
      abschliessen()
      continue
    }
    // Überschrift, Listenpunkt, Zitat oder Tabellenzeile: eigener Absatz
    const eigener = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)/.test(zeile)
    if (eigener) abschliessen()
    laufend.push(
      zeile
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s?/, '')
        .replace(/^([-*+]|\d+[.)])\s+/, '')
        .replace(/\|/g, ' '),
    )
    if (eigener) abschliessen()
  }
  abschliessen()

  return absaetze
    .map(a =>
      a
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // Bilder: Alternativtext
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // Links: nur der Text
        .replace(/<[^>]+>/g, '') // eingebettetes HTML zeigt die Seite nicht
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(^|[^\p{L}\p{N}])[*_](\S(?:.*?\S)?)[*_](?![\p{L}\p{N}])/gu, '$1$2')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\\([\\`*_{}[\]()#+\-.!>|])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

/** Mehrzeiliger Freitext (whitespace-pre-line auf der Seite): jede nicht leere Zeile ein Absatz. */
export function zeilen(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map(z => z.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

// ─── Tippfehler ─────────────────────────────────────────────────────────────

/** Abstand nach Damerau-Levenshtein (Vertauschung zählt 1), Abbruch sobald er über `grenze` liegt. */
export function abstand(a: string, b: string, grenze: number): number {
  if (Math.abs(a.length - b.length) > grenze) return grenze + 1
  let vorvorher: number[] = []
  let vorher = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const zeile = [i]
    let kleinste = i
    for (let j = 1; j <= b.length; j++) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1
      let wert = Math.min(vorher[j] + 1, zeile[j - 1] + 1, vorher[j - 1] + kosten)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) wert = Math.min(wert, vorvorher[j - 2] + 1)
      zeile.push(wert)
      if (wert < kleinste) kleinste = wert
    }
    if (kleinste > grenze) return grenze + 1
    vorvorher = vorher
    vorher = zeile
  }
  return vorher[b.length]
}
