/**
 * lib/buchungen/zeit.ts
 *
 * Namen, Zeiten und Texte rund um die Buchungen von Vereinsheim und Gelände – ohne Datenbank,
 * also auch im Browser nutzbar (Buchungsformular, Kalender).
 *
 * Alle Zeiten sind Ortszeit (Europe/Berlin) als Text: Datum "YYYY-MM-DD", Uhrzeit "HH:MM",
 * Zeitpunkt "YYYY-MM-DDTHH:MM". Gerechnet wird nur mit dem Kalender (Tage, Wochentage), nie mit
 * Zeitzonen – deshalb lassen sich Zeitpunkte direkt als Text vergleichen.
 */

import { BUCHUNG_ARTEN, BUCHUNG_ORTE, BUCHUNG_STATUS } from './werte'

export type BuchungOrt = (typeof BUCHUNG_ORTE)[number]
export type BuchungArt = (typeof BUCHUNG_ARTEN)[number]
export type BuchungStatus = (typeof BUCHUNG_STATUS)[number]

export const ORTE: readonly BuchungOrt[] = BUCHUNG_ORTE
export const ARTEN: readonly BuchungArt[] = BUCHUNG_ARTEN
export const STATUS: readonly BuchungStatus[] = BUCHUNG_STATUS

export const ORT_NAMEN: Record<BuchungOrt, string> = {
  vereinsheim: 'Vereinsheim',
  gelaende: 'Gelände',
  beides: 'Vereinsheim und Gelände',
}

export const ART_NAMEN: Record<BuchungArt, string> = {
  verein: 'Verein (intern)',
  mitglied: 'Vereinsmitglied',
  extern: 'Extern',
}

export const STATUS_NAMEN: Record<BuchungStatus, string> = {
  angefragt: 'Angefragt',
  rueckfrage: 'Rückfrage',
  bestaetigt: 'Bestätigt',
  abgelehnt: 'Abgelehnt',
  storniert: 'Storniert',
}

/** Erklärung für die öffentliche Statusseite. */
export const STATUS_ERKLAERUNG: Record<BuchungStatus, string> = {
  angefragt: 'Deine Anfrage ist eingegangen und wird bearbeitet. Bitte schau in ein paar Tagen wieder vorbei.',
  rueckfrage: 'Wir haben noch eine Frage zu deiner Anfrage und melden uns bei dir – oder lies die Rückmeldung unten.',
  bestaetigt: 'Die Buchung ist bestätigt. Wir freuen uns auf dich!',
  abgelehnt: 'Leider können wir die Anfrage nicht annehmen.',
  storniert: 'Die Buchung wurde storniert.',
}

/** Status, die den Ort belegen (abgelehnte und stornierte Buchungen zählen nicht). */
export const BELEGENDE_STATUS: readonly BuchungStatus[] = ['angefragt', 'rueckfrage', 'bestaetigt']
/** Status, die noch bearbeitet werden müssen. */
export const OFFENE_STATUS: readonly BuchungStatus[] = ['angefragt', 'rueckfrage']

export function istOrt(wert: unknown): wert is BuchungOrt {
  return typeof wert === 'string' && (ORTE as readonly string[]).indexOf(wert) >= 0
}
export function istArt(wert: unknown): wert is BuchungArt {
  return typeof wert === 'string' && (ARTEN as readonly string[]).indexOf(wert) >= 0
}
export function istStatus(wert: unknown): wert is BuchungStatus {
  return typeof wert === 'string' && (STATUS as readonly string[]).indexOf(wert) >= 0
}

/** Belegen zwei Orte etwas Gemeinsames? ("beides" überschneidet sich mit allem.) */
export function orteUeberschneiden(a: BuchungOrt, b: BuchungOrt): boolean {
  return a === b || a === 'beides' || b === 'beides'
}

/** Überschneiden sich zwei Zeiträume? Grenzen zählen nicht (bis 18:00 und ab 18:00 passt). */
export function zeitenUeberschneiden(a: { von: string; bis: string }, b: { von: string; bis: string }): boolean {
  return a.von < b.bis && b.von < a.bis
}

// ─── Kalender ────────────────────────────────────────────────────────────────

/** true für ein gültiges Datum "YYYY-MM-DD". */
export function istDatum(wert: unknown): wert is string {
  if (typeof wert !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false
  const d = new Date(wert + 'T12:00:00Z')
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert
}

/** true für eine Uhrzeit "HH:MM" (00:00–23:59). */
export function istUhrzeit(wert: unknown): wert is string {
  return typeof wert === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(wert)
}

/** Datum um n Tage verschieben. */
export function tagPlus(datum: string, n: number): string {
  const d = new Date(datum + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Tage von a bis b (b − a). */
export function tageZwischen(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86_400_000)
}

/** Wochentag 1 = Montag … 7 = Sonntag. */
export function wochentag(datum: string): number {
  const t = new Date(datum + 'T12:00:00Z').getUTCDay()
  return t === 0 ? 7 : t
}

export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
export const WOCHENTAGE_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const
export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'] as const

/** Heutiges Datum in deutscher Zeit. */
export function heute(jetzt: Date = new Date()): string {
  return jetztOrtszeit(jetzt).slice(0, 10)
}

/** Aktueller Zeitpunkt in deutscher Zeit als "YYYY-MM-DDTHH:MM". */
export function jetztOrtszeit(jetzt: Date = new Date()): string {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(jetzt)
  const teil = (typ: string) => teile.find(t => t.type === typ)?.value ?? '00'
  return `${teil('year')}-${teil('month')}-${teil('day')}T${teil('hour')}:${teil('minute')}`
}

/** "2026-11-12" → "12.11.2026" */
export function datumText(datum: string): string {
  const [j, m, t] = datum.slice(0, 10).split('-')
  return `${t}.${m}.${j}`
}

/** "2026-11-12" → "Do, 12.11.2026" */
export function datumMitTag(datum: string): string {
  return `${WOCHENTAGE_KURZ[wochentag(datum) - 1]}, ${datumText(datum)}`
}

/** true für einen Monat "YYYY-MM". */
export function istMonat(wert: unknown): wert is string {
  return typeof wert === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(wert)
}

/** Monat "YYYY-MM" um n Monate verschieben. */
export function monatPlus(monat: string, n: number): string {
  const [j, m] = monat.split('-').map(Number)
  return new Date(Date.UTC(j, m - 1 + n, 1)).toISOString().slice(0, 7)
}

/** Alle Tage des Kalenderblatts eines Monats: vom Montag der ersten bis zum Sonntag der letzten Woche. */
export function monatsRaster(monat: string): string[] {
  const erster = `${monat}-01`
  const letzter = tagPlus(`${monatPlus(monat, 1)}-01`, -1)
  const ende = tagPlus(letzter, 7 - wochentag(letzter))
  const tage: string[] = []
  for (let d = tagPlus(erster, 1 - wochentag(erster)); d <= ende; d = tagPlus(d, 1)) tage.push(d)
  return tage
}

// ─── Zeiträume ───────────────────────────────────────────────────────────────

export interface Zeitraum {
  von: string
  bis: string
}

/**
 * Baut aus den Formularfeldern einen Zeitraum. Ohne Enddatum endet er am selben Tag – oder am
 * Folgetag, wenn das Ende nicht nach dem Beginn liegt (20:00–00:00, 22:00–02:00).
 * Ganztägig = 00:00 bis 00:00 des Tages nach dem (End-)Datum.
 */
export function zeitraumAus(e: {
  datum: string | null
  beginn: string | null
  ende: string | null
  bisDatum?: string | null
  ganztaegig?: boolean
}): { zeitraum: Zeitraum } | { felder: Record<string, string> } {
  const felder: Record<string, string> = {}
  if (!istDatum(e.datum)) felder.datum = 'Bitte ein gültiges Datum wählen.'
  if (e.bisDatum && !istDatum(e.bisDatum)) felder.bisDatum = 'Bitte ein gültiges Enddatum wählen.'
  if (!e.ganztaegig) {
    if (!istUhrzeit(e.beginn)) felder.beginn = 'Bitte eine Uhrzeit für den Beginn eintragen.'
    if (!istUhrzeit(e.ende)) felder.ende = 'Bitte eine Uhrzeit für das Ende eintragen.'
  }
  if (Object.keys(felder).length > 0) return { felder }

  const datum = e.datum as string
  if (e.ganztaegig) {
    const letzterTag = e.bisDatum || datum
    if (letzterTag < datum) return { felder: { bisDatum: 'Das Enddatum liegt vor dem Beginn.' } }
    return { zeitraum: { von: `${datum}T00:00`, bis: `${tagPlus(letzterTag, 1)}T00:00` } }
  }
  const beginn = e.beginn as string
  const ende = e.ende as string
  const von = `${datum}T${beginn}`
  // Ein ausdrücklich angegebenes Enddatum gilt wörtlich; nur ohne Enddatum geht es über Mitternacht.
  let bis: string
  if (e.bisDatum) bis = `${e.bisDatum}T${ende}`
  else bis = ende > beginn ? `${datum}T${ende}` : `${tagPlus(datum, 1)}T${ende}`
  if (bis <= von) return { felder: { ende: 'Das Ende liegt vor dem Beginn.' } }
  return { zeitraum: { von, bis } }
}

/** Formularwerte aus einem gespeicherten Zeitraum (Umkehrung von zeitraumAus). */
export function zeitraumFelder(z: Zeitraum): { datum: string; beginn: string; ende: string; bisDatum: string; ganztaegig: boolean } {
  const datum = z.von.slice(0, 10)
  const beginn = z.von.slice(11)
  const ende = z.bis.slice(11)
  const bisTag = z.bis.slice(0, 10)
  if (beginn === '00:00' && ende === '00:00') {
    const letzterTag = tagPlus(bisTag, -1)
    return { datum, beginn: '', ende: '', bisDatum: letzterTag === datum ? '' : letzterTag, ganztaegig: true }
  }
  // Über Mitternacht in den Folgetag ergibt sich ohne Enddatum von selbst.
  const folgetagAutomatisch = bisTag === tagPlus(datum, 1) && ende <= beginn
  return { datum, beginn, ende, bisDatum: bisTag === datum || folgetagAutomatisch ? '' : bisTag, ganztaegig: false }
}

/** "00:00" am Folgetag als "24:00" lesen, sonst die Uhrzeit. */
function endeText(z: Zeitraum): string {
  return z.bis.slice(11) === '00:00' ? '24:00' : z.bis.slice(11)
}

/**
 * Lesbarer Zeitraum, z. B. "Do, 12.11.2026 · 19:00–22:00", "Fr, 05.06.2026 · 20:00–24:00",
 * "Mo, 27.07.2026 – Fr, 31.07.2026 · ganztägig" oder "Fr, 05.06.2026, 22:00 – Sa, 06.06.2026, 02:00".
 */
export function zeitraumText(z: Zeitraum): string {
  const vonTag = z.von.slice(0, 10)
  const bisTag = z.bis.slice(0, 10)
  const beginn = z.von.slice(11)
  const ende = z.bis.slice(11)
  if (beginn === '00:00' && ende === '00:00') {
    const letzterTag = tagPlus(bisTag, -1)
    return letzterTag === vonTag ? `${datumMitTag(vonTag)} · ganztägig` : `${datumMitTag(vonTag)} – ${datumMitTag(letzterTag)} · ganztägig`
  }
  if (bisTag === vonTag || (bisTag === tagPlus(vonTag, 1) && ende === '00:00')) return `${datumMitTag(vonTag)} · ${beginn}–${endeText(z)}`
  return `${datumMitTag(vonTag)}, ${beginn} – ${datumMitTag(bisTag)}, ${ende}`
}

/** Nur die Uhrzeiten, beschnitten auf einen Tag – für Kalenderzellen: "19:00–22:00", "ab 22:00", "bis 02:00", "ganztägig". */
export function uhrzeitAmTag(z: Zeitraum, datum: string): string {
  const tagBeginn = `${datum}T00:00`
  const tagEnde = `${tagPlus(datum, 1)}T00:00`
  const startetHeute = z.von >= tagBeginn
  const endetHeute = z.bis <= tagEnde
  if (!startetHeute && !endetHeute) return 'ganztägig'
  if (startetHeute && endetHeute) {
    if (z.von === tagBeginn && z.bis === tagEnde) return 'ganztägig'
    return `${z.von.slice(11)}–${z.bis === tagEnde ? '24:00' : z.bis.slice(11)}`
  }
  if (startetHeute) return z.von === tagBeginn ? 'ganztägig' : `ab ${z.von.slice(11)}`
  return z.bis === tagEnde ? 'ganztägig' : `bis ${z.bis.slice(11)}`
}

/** Liegt der Zeitraum (auch teilweise) auf diesem Tag? */
export function amTag(z: Zeitraum, datum: string): boolean {
  return zeitenUeberschneiden(z, { von: `${datum}T00:00`, bis: `${tagPlus(datum, 1)}T00:00` })
}

// ─── Buchungsnummer ──────────────────────────────────────────────────────────

/** Ziffern und Großbuchstaben ohne Verwechsler (0/O, 1/I/L fehlen). */
export const NUMMER_ZEICHEN = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** Eingabe vereinheitlichen: Großbuchstaben, ohne Leer- und Trennzeichen, als "XXXX-XXXX". null = ungültig. */
export function nummerNormalisieren(eingabe: unknown): string | null {
  if (typeof eingabe !== 'string') return null
  const roh = eingabe.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (roh.length !== 8) return null
  for (const zeichen of roh) if (NUMMER_ZEICHEN.indexOf(zeichen) < 0) return null
  return `${roh.slice(0, 4)}-${roh.slice(4)}`
}
