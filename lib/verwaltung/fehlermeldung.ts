/**
 * lib/verwaltung/fehlermeldung.ts
 *
 * Verständliche Fehlermeldungen für Server-Aktionen der Verwaltung. Eigene Hinweise
 * (MeldungsFehler) und typische Datenbankfehler (SqliteError – von Drizzle ggf. in einen
 * DrizzleQueryError verpackt) werden in Sätze ohne Technik übersetzt.
 */

import { fehler, type FormErgebnis } from './formular'

/** Fehler, dessen Text direkt der Person am Bildschirm gezeigt werden darf. */
export class MeldungsFehler extends Error {
  felder?: Record<string, string>

  constructor(meldung: string, felder?: Record<string, string>) {
    super(meldung)
    this.name = 'MeldungsFehler'
    this.felder = felder
  }
}

export function istMeldungsFehler(e: unknown): e is MeldungsFehler {
  return e instanceof MeldungsFehler || (e instanceof Error && e.name === 'MeldungsFehler')
}

/** Sucht in der cause-Kette nach einem SQLite-Fehlercode wie "SQLITE_CONSTRAINT_UNIQUE". */
export function sqliteCode(e: unknown): string | null {
  let aktuell: unknown = e
  for (let i = 0; i < 5 && aktuell != null; i++) {
    const code = (aktuell as { code?: unknown }).code
    if (typeof code === 'string' && code.indexOf('SQLITE_') === 0) return code
    aktuell = (aktuell as { cause?: unknown }).cause
  }
  return null
}

/** Alle Fehlertexte der cause-Kette (für die Unterscheidung von Constraint-Arten). */
function fehlerText(e: unknown): string {
  const teile: string[] = []
  let aktuell: unknown = e
  for (let i = 0; i < 5 && aktuell != null; i++) {
    const text = (aktuell as { message?: unknown }).message
    if (typeof text === 'string') teile.push(text)
    aktuell = (aktuell as { cause?: unknown }).cause
  }
  return teile.join(' | ')
}

export interface FehlerKontext {
  /** Meldung bei doppelten Werten (UNIQUE), z. B. "Diese Adresse ist schon vergeben." */
  eindeutig?: string
  /** Meldung, wenn noch verknüpfte Einträge das Löschen verhindern (FOREIGN KEY). */
  verknuepft?: string
}

/** Übersetzt einen beliebigen Fehler in eine verständliche Meldung (unbekannte Fehler landen im Server-Log). */
export function verstaendlicheMeldung(e: unknown, kontext: FehlerKontext = {}): string {
  if (istMeldungsFehler(e)) return e.message
  const code = sqliteCode(e)
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return kontext.eindeutig ?? 'Diesen Eintrag gibt es schon. Bitte die Eingaben prüfen.'
  }
  // Achtung: Verstöße gegen ON DELETE RESTRICT meldet SQLite als SQLITE_CONSTRAINT_TRIGGER
  // ("FOREIGN KEY constraint failed"), andere Fremdschlüssel-Fehler als SQLITE_CONSTRAINT_FOREIGNKEY.
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (code === 'SQLITE_CONSTRAINT_TRIGGER' && /FOREIGN KEY/i.test(fehlerText(e)))) {
    return (
      kontext.verknuepft ??
      'Das geht nicht, weil noch andere Einträge damit verknüpft sind – oder weil ein ausgewählter Eintrag inzwischen gelöscht wurde. Bitte die Seite neu laden.'
    )
  }
  if (code === 'SQLITE_CONSTRAINT_CHECK' || code === 'SQLITE_CONSTRAINT_NOTNULL') {
    return 'Einige Angaben sind unvollständig oder ungültig. Bitte die Eingaben prüfen.'
  }
  if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
    return 'Die Datenbank ist gerade beschäftigt. Bitte in ein paar Sekunden noch einmal versuchen.'
  }
  console.error(e)
  return 'Da ist leider etwas schiefgegangen. Bitte noch einmal versuchen – und falls es wieder passiert, dem Vorstand Bescheid geben.'
}

/** Fehler als Rückgabe für useFormState (inkl. Feldfehlern bei MeldungsFehler). */
export function fehlerErgebnis(e: unknown, kontext?: FehlerKontext): FormErgebnis {
  return fehler(verstaendlicheMeldung(e, kontext), istMeldungsFehler(e) ? e.felder : undefined)
}
