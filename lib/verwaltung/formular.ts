/**
 * lib/verwaltung/formular.ts
 *
 * Gemeinsames Rückgabeformat aller Server-Aktionen der Verwaltung (für useFormState).
 */

export interface FormErgebnis {
  ok?: boolean
  /** Meldung für die Person am Bildschirm – bei Fehlern verständlich, ohne Technik. */
  meldung?: string
  /** Fehler je Feldname, z. B. { name: 'Bitte einen Namen eintragen.' } */
  felder?: Record<string, string>
}

export const LEER: FormErgebnis = {}

export function fehler(meldung: string, felder?: Record<string, string>): FormErgebnis {
  return { ok: false, meldung, felder }
}

export function erfolg(meldung: string): FormErgebnis {
  return { ok: true, meldung }
}

/** Liest ein JSON-Feld aus FormData; liefert null bei fehlendem oder kaputtem Inhalt. */
export function jsonFeld<T>(formData: FormData, name: string): T | null {
  const roh = formData.get(name)
  if (typeof roh !== 'string') return null
  try {
    return JSON.parse(roh) as T
  } catch {
    return null
  }
}

/** Ganzzahl aus einem Formularfeld oder null. */
export function zahlFeld(formData: FormData, name: string): number | null {
  const roh = formData.get(name)
  if (typeof roh !== 'string' || roh.trim() === '') return null
  const n = Number(roh)
  return Number.isInteger(n) ? n : null
}
