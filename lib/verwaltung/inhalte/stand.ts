/**
 * lib/verwaltung/inhalte/stand.ts
 *
 * Optimistische Sperre in den Formularen für News, Termine und Downloads. Ohne Datenbank –
 * auch im Browser nutzbar.
 *
 * Jedes Formular schickt im versteckten Feld "stand" den Wert von geaendertAm mit, den es beim
 * Öffnen gesehen hat. Weicht der Wert in der Datenbank ab, hat inzwischen jemand anderes
 * gespeichert, und das Speichern wird abgelehnt.
 */

import type { FormErgebnis } from '@/lib/verwaltung/formular'

/** Rückgabe der Formular-Aktionen: wie FormErgebnis, plus neuer Stand nach erfolgreichem Speichern. */
export interface AktionsErgebnis extends FormErgebnis {
  stand?: string
}

/** Der jüngere von zwei ISO-Zeitstempeln – Seite (nach Neuladen) oder Ergebnis der letzten Aktion. */
export function neuererStand(a: string | null | undefined, b: string | null | undefined): string {
  const x = a ?? ''
  const y = b ?? ''
  return x > y ? x : y
}
