/**
 * lib/verwaltung/pruefhilfen.ts
 *
 * Kleine Helfer zum Prüfen von Formulareingaben und zum Übersetzen von Datenbankfehlern in
 * verständliche Meldungen. Ohne Datenbankzugriff – auch in Skripten und Tests nutzbar.
 */

import { sqliteCode, verstaendlicheMeldung } from './fehlermeldung'
import { fehler, type FormErgebnis } from './formular'

/** Getrimmter Text oder null (auch für Zahlen und unbekannte Werte aus JSON). */
export function textWert(wert: unknown): string | null {
  if (typeof wert === 'number' && Number.isFinite(wert)) return String(wert)
  if (typeof wert !== 'string') return null
  const t = wert.trim()
  return t === '' ? null : t
}

/** Liest ein Objekt aus unbekanntem JSON – alles andere wird zu einem leeren Objekt. */
export function objektWert(wert: unknown): Record<string, unknown> {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert) ? (wert as Record<string, unknown>) : {}
}

/** Liest eine Liste aus unbekanntem JSON – alles andere wird zu einer leeren Liste. */
export function listenWert(wert: unknown): unknown[] {
  return Array.isArray(wert) ? wert : []
}

/** Ganzzahl aus Zahl oder Text; null bei leer, false bei ungültig. */
export function ganzzahlWert(wert: unknown): number | null | false {
  if (wert === null || wert === undefined || wert === '') return null
  const n = typeof wert === 'number' ? wert : typeof wert === 'string' ? Number(wert.trim()) : NaN
  return Number.isInteger(n) ? n : false
}

/**
 * Uhrzeit "H:MM", "HH:MM", "HH.MM" oder "HH:MM:SS" → "HH:MM".
 * null = leer, false = keine gültige Uhrzeit.
 */
export function uhrzeitWert(wert: unknown): string | null | false {
  const t = textWert(wert)
  if (!t) return null
  const m = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(t)
  if (!m) return false
  const stunde = Number(m[1])
  const minute = Number(m[2])
  if (stunde > 23 || minute > 59) return false
  return `${String(stunde).padStart(2, '0')}:${m[2]}`
}

/** Sehr einfache Plausibilitätsprüfung für E-Mail-Adressen. */
export function emailGueltig(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Nur die Ziffern einer Telefonnummer (zum Vergleichen, z. B. Telefon und WhatsApp). */
export function nurZiffern(nummer: string | null | undefined): string {
  return (nummer ?? '').replace(/\D/g, '')
}

/**
 * Baut aus gesammelten Feldfehlern eine Meldung: die erste Stelle im Wortlaut, dazu die Anzahl
 * weiterer Stellen. Die Feldfehler selbst werden im Formular an den Feldern angezeigt.
 */
export function feldFehlerMeldung(felder: Record<string, string>): FormErgebnis {
  const meldungen = Object.keys(felder).map(k => felder[k])
  const weitere = meldungen.length - 1
  const zusatz = weitere > 0 ? ` (dazu ${weitere} weitere Stelle${weitere === 1 ? '' : 'n'}, rot markiert)` : ''
  return fehler(`Noch nicht gespeichert. ${meldungen[0]}${zusatz}`, felder)
}

/**
 * Übersetzt einen unerwarteten Fehler beim Speichern in eine verständliche Meldung (nie mit
 * Stacktrace). Nutzt den gemeinsamen Übersetzer aus fehlermeldung.ts (erkennt auch
 * Fremdschlüssel-Verstöße, die SQLite als SQLITE_CONSTRAINT_TRIGGER meldet); technische
 * Details landen nur im Server-Log.
 */
export function datenbankFehlerMeldung(e: unknown, zusammenhang: string): FormErgebnis {
  if (sqliteCode(e)) console.error(`[verwaltung] Datenbankfehler beim ${zusammenhang}:`, e)
  return fehler(
    verstaendlicheMeldung(e, {
      eindeutig: 'Das gibt es schon: Ein Name ist bereits vergeben oder eine Person steht doppelt in der Liste. Bitte prüfen und erneut speichern.',
      verknuepft: 'Ein Eintrag, auf den sich die Änderung bezieht, wurde inzwischen gelöscht – oder es hängen noch andere Einträge daran. Bitte die Seite neu laden.',
    }),
  )
}

/** Meldung, wenn zwischen Laden und Speichern jemand anderes gespeichert hat. */
export const KONFLIKT_MELDUNG = 'Inzwischen hat jemand anderes gespeichert. Bitte Seite neu laden.'

/** Wird in Transaktionen geworfen, damit alles zurückgerollt wird. */
export class KonfliktFehler extends Error {}
