/**
 * lib/suche/typen.ts
 *
 * Was die Website-Suche zurückgibt – gemeinsam für die Seite /suche, die Schnellsuche im Fenster
 * (components/suche) und die Schnittstelle /api/suche. Ohne Datenbank, auch im Browser nutzbar.
 */

import type { MarkierterText } from './text'

export type { MarkierterText }

/** Arten von Treffern, in der Reihenfolge der Filter auf /suche. */
export const SUCH_ARTEN = ['seite', 'sparte', 'team', 'news', 'termin', 'person', 'download'] as const
export type SuchArt = (typeof SUCH_ARTEN)[number]

/** Name eines einzelnen Treffers ("News") und der Gruppe im Filter ("News"). */
export const ART_NAMEN: Record<SuchArt, { einzeln: string; mehrere: string }> = {
  seite: { einzeln: 'Seite', mehrere: 'Seiten' },
  sparte: { einzeln: 'Sparte', mehrere: 'Sparten' },
  team: { einzeln: 'Mannschaft', mehrere: 'Mannschaften & Gruppen' },
  news: { einzeln: 'News', mehrere: 'News' },
  termin: { einzeln: 'Termin', mehrere: 'Termine' },
  person: { einzeln: 'Kontakt', mehrere: 'Kontakte' },
  download: { einzeln: 'Download', mehrere: 'Downloads' },
}

export function istSuchArt(wert: unknown): wert is SuchArt {
  return typeof wert === 'string' && (SUCH_ARTEN as readonly string[]).includes(wert)
}

export interface SuchTreffer {
  id: string
  art: SuchArt
  /** Beschriftung der Art, falls abweichend ("Gruppe" statt "Mannschaft") */
  artName: string
  titel: MarkierterText
  /** Adresse samt Sprung zur Fundstelle (#:~:text=…) */
  url: string
  /** Datei oder fremde Seite: öffnet in neuem Tab */
  extern: boolean
  /** Kleine Zeile über dem Titel: Sparte, Datum, Abschnitt der Seite … */
  zusatz: string
  /** Textstelle mit den Fundstellen, falls es eine gibt */
  ausschnitt: MarkierterText | null
}

export interface SuchErgebnis {
  /** Eingabe, wie sie kam */
  eingabe: string
  /** Gesucht wurde stattdessen nach diesem Begriff (Tippfehler korrigiert) */
  korrektur: string | null
  /** Keine Seite enthielt alle Wörter – die Treffer enthalten nur einen Teil davon */
  teilweise: boolean
  /** Treffer der gewählten Art (bzw. aller Arten), beste zuerst, höchstens `grenze` */
  treffer: SuchTreffer[]
  /** Anzahl aller Treffer der gewählten Art */
  anzahl: number
  /** Anzahl je Art, unabhängig vom Filter */
  proArt: Partial<Record<SuchArt, number>>
}
