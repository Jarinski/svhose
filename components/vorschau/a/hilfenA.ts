/**
 * Hilfen für Design A (Matchday): bereiten Termine und News serverseitig zu fertigen Texten auf,
 * damit Client-Komponenten (Spielplan-Filter) nur noch filtern und nichts selbst formatieren –
 * so passen Server- und Browser-Ausgabe immer zusammen.
 */

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Termin } from '@/lib/content'
import { spielInfo, tageLabel } from '@/lib/vorschau'

export type SportA = 'fussball' | 'tischtennis' | null

/** Eine Karte im Spielplan der Startseite – alle Texte sind schon fertig. */
export interface SpielKarteA {
  id: string
  art: 'heim' | 'auswaerts' | null
  sport: SportA
  /** "Fußball", "Tischtennis" – für das Icon-Label */
  sportName: string | null
  /** "Herren" – Mannschaft bzw. Sparte, steht neben dem Icon */
  sparte: string
  /** "2.Kreisklasse" – eigene Zeile über die volle Kartenbreite, '' wenn keine */
  liga: string
  /** "Fr 23.10." */
  datum: string
  /** "20:00" oder Freitext, '' wenn leer */
  uhrzeit: string
  /** Zeile über dem Gegner: "SV Holm-Seppensen vs.", "Zu Gast bei" oder Sparte */
  vorzeile: string
  /** Gegner bzw. Titel des Termins */
  titel: string
  /** Ort oder "Auswärts" */
  ort: string
  /** "Heute", "Morgen", "in 3 Tagen" */
  wann: string
  heute: boolean
  /** Wohin die Karte führt: Spielplan der Sportart bzw. Kalender */
  href: string
}

/** "YYYY-MM-DD" als Datum in der lokalen Zeitzone (ohne Verschiebung um einen Tag). */
export function alsDatum(datum: string): Date {
  const [jahr, monat, tag] = datum.slice(0, 10).split('-').map(Number)
  return new Date(jahr || 1970, (monat || 1) - 1, tag || 1)
}

/** "Fr 23.10." */
export function kurzDatum(datum: string): string {
  return format(alsDatum(datum), 'EEEEEE dd.MM.', { locale: de })
}

/** "4. Juni 2026" */
export function langDatum(datum: string): string {
  return format(alsDatum(datum), 'd. MMMM yyyy', { locale: de })
}

/** "20:00" bleibt, "20:00 Uhr" wird kurz – Freitext wie "ganztägig" bleibt unverändert. */
export function kurzUhrzeit(uhrzeit: string): string {
  return uhrzeit.replace(/\s*uhr\s*$/i, '').trim()
}

export function sportAus(sportart: string | null): SportA {
  if (sportart === 'Fußball') return 'fussball'
  if (sportart === 'Tischtennis') return 'tischtennis'
  return null
}

/** Spielplan der Sportart, sonst der Kalender. */
export function spielplanLink(sport: SportA): string {
  return sport === 'fussball' ? '/fussball' : sport === 'tischtennis' ? '/tischtennis' : '/termine'
}

/** Synchronisierte Auswärtsspiele haben als Ort nur "Auswärtsspiel" – das ist kein Ort. */
export function ortText(ort: string, art: 'heim' | 'auswaerts' | null): string {
  const leer = !ort.trim() || /^(heim|auswärts)spiel$/i.test(ort.trim())
  if (!leer) return ort
  if (art === 'auswaerts') return 'Auswärts'
  if (art === 'heim') return 'Heimspiel'
  return ''
}

/** Name der eigenen Mannschaft aus dem Titel ("SV Holm-Seppensen II"). */
export function eigenerName(titel: string): string {
  return titel.match(/SV Holm-Seppensen(?: II| III)?/)?.[0] ?? 'SV Holm-Seppensen'
}

/** Kürzel für das Gegner-Wappen: "TSV Eintr. Hittfeld" → "TEH". */
export function kuerzel(name: string): string {
  const woerter = name
    .split(/[\s/–-]+/)
    .filter(w => /^[A-Za-zÄÖÜäöüß]/.test(w) && !/^U\d+$/i.test(w) && !/^(I{1,3}|IV)$/.test(w))
  return woerter.slice(0, 3).map(w => w[0]).join('').toUpperCase() || '?'
}

/** Termine (ab heute, chronologisch) als Karten für den Spielplan. */
export function spielKarten(termine: Termin[], heute: string): SpielKarteA[] {
  return termine.map(termin => {
    const info = spielInfo(termin)
    const sport = sportAus(info.sportart)
    const liga = info.liga && info.liga !== termin.sparte ? info.liga : ''
    const vorzeile =
      info.art === 'heim' ? `${eigenerName(termin.titel)} vs.` : info.art === 'auswaerts' ? 'Zu Gast bei' : termin.sparte
    return {
      id: termin.id,
      art: info.art,
      sport,
      sportName: info.sportart,
      sparte: termin.sparte,
      liga,
      datum: kurzDatum(termin.datum),
      uhrzeit: kurzUhrzeit(termin.uhrzeit),
      vorzeile,
      titel: info.gegner,
      ort: ortText(termin.ort, info.art),
      wann: tageLabel(termin.datum, heute),
      heute: termin.datum === heute,
      href: spielplanLink(sport),
    }
  })
}
