/**
 * components/vorschau/b/hilfen.ts
 *
 * Kleine Hilfen für Design B (Bento): Datumsangaben, Termin-Zeilen und Sparten-Auswahl.
 * Alles wird auf dem Server berechnet und als fertiger Text an Client-Komponenten gegeben –
 * so hängen Datumsangaben nicht von der Zeitzone im Browser ab.
 */

import type { SparteUebersicht, Termin } from '@/lib/content'
import { spielInfo, tageLabel, uhrzeitLabel } from '@/lib/vorschau'

const MONATE_KURZ = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONATE_LANG = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]
const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

const VEREIN = 'SV Holm-Seppensen'

export interface DatumTeile {
  tag: string
  monat: string
  monatLang: string
  jahr: string
  wochentag: string
}

/** "2026-10-23" (auch mit Uhrzeit dahinter) in Einzelteile zerlegen; null bei ungültigem Datum. */
export function datumTeile(datum: string): DatumTeile | null {
  const treffer = datum.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!treffer) return null
  const d = new Date(Date.UTC(Number(treffer[1]), Number(treffer[2]) - 1, Number(treffer[3])))
  if (Number.isNaN(d.getTime())) return null
  return {
    tag: String(d.getUTCDate()),
    monat: MONATE_KURZ[d.getUTCMonth()],
    monatLang: MONATE_LANG[d.getUTCMonth()],
    jahr: String(d.getUTCFullYear()),
    wochentag: WOCHENTAGE_KURZ[d.getUTCDay()],
  }
}

/** "4. Juni 2026" */
export function datumLang(datum: string): string {
  const d = datumTeile(datum)
  return d ? `${d.tag}. ${d.monatLang} ${d.jahr}` : datum
}

/** "Heute", "Morgen" oder "Sa, 25. Okt" */
export function wannLabel(datum: string, heute: string): string {
  const label = tageLabel(datum, heute)
  if (label === 'Heute' || label === 'Morgen') return label
  const d = datumTeile(datum)
  return d ? `${d.wochentag}, ${d.tag}. ${d.monat}` : label
}

/** Ort ist bei synchronisierten Auswärtsspielen nur der Platzhalter "Auswärtsspiel". */
function echterOrt(ort: string): string {
  return /^auswärts(spiel)?$/i.test(ort.trim()) ? '' : ort.trim()
}

/** Bereich ("Herren", "Jugend 15") – "Allgemein" sagt nichts und fällt weg. */
function bereichText(termin: Termin, sportart: string | null): string {
  const bereich = termin.sparte === 'Allgemein' ? '' : termin.sparte
  if (sportart === 'Tischtennis' && bereich && !/tischtennis/i.test(bereich)) return `Tischtennis ${bereich}`
  return bereich
}

/** Emoji für die Sportart eines Termins (wird entsättigt angezeigt). */
export function sportEmoji(sportart: string | null): string {
  if (sportart === 'Fußball') return '⚽'
  if (sportart === 'Tischtennis') return '🏓'
  return '📅'
}

// ─── Laufende und vorbei gegangene Termine ──────────────────────────────────

/** So lange gilt ein Termin ohne Endzeit (z. B. ein Spiel) nach Beginn noch als laufend. */
const DAUER_MINUTEN = 120

/** Aktuelle Uhrzeit in Europe/Berlin als Minuten seit Mitternacht. */
export function minutenInBerlin(jetzt = new Date()): number {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(jetzt)
  const zahl = (typ: string) => Number(teile.find(t => t.type === typ)?.value ?? 0)
  return zahl('hour') * 60 + zahl('minute')
}

/** "18:30" → Beginn + 2 Std., "19:30 - 21:00" → Endzeit; Freitext wie "ganztägig" → null. */
function endeInMinuten(uhrzeit: string): number | null {
  const zeiten = [...uhrzeit.matchAll(/(\d{1,2})[:.](\d{2})/g)].map(z => Number(z[1]) * 60 + Number(z[2]))
  if (zeiten.length === 0) return null
  return zeiten.length > 1 ? zeiten[zeiten.length - 1] : zeiten[0] + DAUER_MINUTEN
}

/**
 * true, solange ein Termin noch bevorsteht oder gerade läuft. Termine von heute ohne
 * Uhrzeit gelten den ganzen Tag. heute als "YYYY-MM-DD", minutenJetzt aus minutenInBerlin().
 */
export function stehtNochAn(termin: Termin, heute: string, minutenJetzt: number): boolean {
  const datum = termin.datum.slice(0, 10)
  if (datum !== heute) return datum > heute
  const ende = endeInMinuten(termin.uhrzeit)
  return ende === null || ende >= minutenJetzt
}

// ─── Termin-Zeilen für die Kachel "Nächste Termine" ─────────────────────────

export interface TerminZeile {
  id: string
  tag: string
  monat: string
  /** Paarung mit Heimmannschaft vorn, sonst der Titel */
  titel: string
  unterzeile: string
  /** "20:00", Freitext wie "ganztägig" oder '' */
  zeit: string
  art: 'heim' | 'auswaerts' | null
  sportart: string | null
}

export function terminZeile(termin: Termin): TerminZeile {
  const info = spielInfo(termin)
  const d = datumTeile(termin.datum)
  const titel =
    info.art === 'heim'
      ? `${VEREIN} – ${info.gegner}`
      : info.art === 'auswaerts'
        ? `${info.gegner} – ${VEREIN}`
        : termin.titel
  const bereich = bereichText(termin, info.sportart)
  const ort = echterOrt(termin.ort)
  const teile =
    info.art === 'heim'
      ? [bereich, ort || info.liga]
      : info.art === 'auswaerts'
        ? [bereich, info.liga]
        : [bereich, ort]
  return {
    id: termin.id,
    tag: d?.tag ?? '–',
    monat: d?.monat ?? '',
    titel,
    unterzeile: teile.filter(Boolean).join(' · '),
    zeit: termin.uhrzeit.replace(/\s*uhr$/i, ''),
    art: info.art,
    sportart: info.sportart,
  }
}

// ─── Nächster Termin für die schwarze Hero-Kachel ───────────────────────────

export interface NaechsterTermin {
  emoji: string
  wann: string
  titel: string
  unterzeile: string
  ort: string
}

export function naechsterTermin(termin: Termin, heute: string): NaechsterTermin {
  const info = spielInfo(termin)
  const titel =
    info.art === 'heim'
      ? `Heimspiel gegen ${info.gegner}`
      : info.art === 'auswaerts'
        ? `Auswärtsspiel bei ${info.gegner}`
        : termin.titel
  const zeit = termin.uhrzeit ? uhrzeitLabel(termin.uhrzeit) : ''
  return {
    emoji: sportEmoji(info.sportart),
    wann: [wannLabel(termin.datum, heute), zeit].filter(Boolean).join(' · '),
    titel,
    unterzeile: [bereichText(termin, info.sportart), info.liga].filter(Boolean).join(' · '),
    ort: echterOrt(termin.ort) || (info.art === 'auswaerts' ? 'Auswärts' : ''),
  }
}

// ─── Sparten ─────────────────────────────────────────────────────────────────

/** Diese Sparten zeigen die Bandbreite gut – fehlen sie, kommen andere mit Emoji nach. */
const BEVORZUGT = ['akrobatik', 'fussball', 'judo', 'volleyball', 'yoga']

/** Bis zu `anzahl` Sparten mit Emoji für die Emoji-Reihe im Hero. */
export function spartenAuswahl(sparten: SparteUebersicht[], anzahl = 5): SparteUebersicht[] {
  const mitIcon = sparten.filter(s => s.icon)
  const bevorzugt = BEVORZUGT.flatMap(slug => mitIcon.filter(s => s.slug === slug))
  const rest = mitIcon.filter(s => !bevorzugt.includes(s))
  return [...bevorzugt, ...rest].slice(0, anzahl)
}

/** "Akrobatik, Fußball und Judo" */
export function aufzaehlung(namen: string[]): string {
  if (namen.length <= 1) return namen.join('')
  return `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`
}
