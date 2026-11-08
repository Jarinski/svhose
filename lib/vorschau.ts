/**
 * lib/vorschau.ts
 *
 * Daten und Hilfsfunktionen für die Startseite im Bento-Design (components/vorschau/b).
 * Der Name stammt noch aus der Zeit, als Bento nur als Design-Vorschau per Cookie lief.
 *
 * Diese Datei enthält nur Typen und reine Hilfsfunktionen – sie darf auch in Client-Komponenten.
 */

import type { NewsPost, SparteUebersicht, Termin } from '@/lib/content'
import type { InstagramFoto } from '@/lib/instagram'

// ─── Daten für die Startseite ────────────────────────────────────────────────

export interface StartseitenDaten {
  /** Alle veröffentlichten News, neueste zuerst */
  news: NewsPost[]
  /** Termine ab heute, chronologisch */
  termine: Termin[]
  /** Sichtbare Sparten in gepflegter Reihenfolge */
  sparten: SparteUebersicht[]
  zahlen: { sparten: number; mannschaften: number }
  /** Neueste Instagram-Beiträge (lib/instagram.ts); leer, solange nichts abgerufen ist */
  instagram: InstagramFoto[]
  /** Heutiges Datum in Europe/Berlin, "YYYY-MM-DD" */
  heute: string
}

/** Heutiges Datum in Europe/Berlin als "YYYY-MM-DD". */
export function heuteInBerlin(jetzt = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(jetzt)
}

/** "Heute", "Morgen", "in 3 Tagen" – datum und heute als "YYYY-MM-DD". */
export function tageLabel(datum: string, heute: string): string {
  const tage = Math.round((Date.parse(datum) - Date.parse(heute)) / 86_400_000)
  if (tage <= 0) return 'Heute'
  if (tage === 1) return 'Morgen'
  return `in ${tage} Tagen`
}

/** "18:30" → "18:30 Uhr"; Freitext wie "ganztägig" bleibt unverändert. */
export function uhrzeitLabel(uhrzeit: string): string {
  return /^\d/.test(uhrzeit) && !/uhr/i.test(uhrzeit) ? `${uhrzeit} Uhr` : uhrzeit
}

// ─── Spiele aus Terminen ─────────────────────────────────────────────────────

export interface SpielInfo {
  /** null bei Terminen, die kein Spiel sind (z. B. Vereinsfest) */
  art: 'heim' | 'auswaerts' | null
  /** "Fußball", "Tischtennis" o. Ä. aus den Tags, sonst null */
  sportart: string | null
  /** Gegner ohne "SV Holm-Seppensen – "; bei Nicht-Spielen der Titel */
  gegner: string
  /** Aus der Beschreibung ("Liga: 2.Kreisklasse"), sonst null */
  liga: string | null
}

const SPORTARTEN = ['Fußball', 'Tischtennis']
const VEREIN = /^SV Holm-Seppensen( II| III)?\s*[–-]\s*/

/**
 * Zerlegt einen synchronisierten Spieltermin ("Heimspiel: SV Holm-Seppensen – TSV Eintr. Hittfeld",
 * Tags ["Fußball", "Herren", "Heimspiel"], Beschreibung "Liga: 2.Kreisklasse …").
 */
export function spielInfo(termin: Termin): SpielInfo {
  const tags = termin.tags.map(t => t.toLowerCase())
  const titel = termin.titel
  const art =
    tags.includes('heimspiel') || /^heimspiel:/i.test(titel)
      ? 'heim'
      : tags.includes('auswärtsspiel') || /^auswärtsspiel:/i.test(titel)
        ? 'auswaerts'
        : null
  const ohnePraefix = titel.replace(/^(heimspiel|auswärtsspiel):\s*/i, '')
  const liga = termin.beschreibung.match(/^Liga:\s*(.+)$/m)?.[1]?.trim() ?? null
  return {
    art,
    sportart: termin.tags.find(t => SPORTARTEN.includes(t)) ?? null,
    gegner: art ? ohnePraefix.replace(VEREIN, '') : titel,
    liga,
  }
}
