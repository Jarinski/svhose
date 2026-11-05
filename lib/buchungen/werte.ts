/**
 * lib/buchungen/werte.ts
 *
 * Wertelisten der Buchungen – ohne Importe, damit Schema (lib/db/schema.ts, auch von drizzle-kit
 * gelesen) und Browser-Code (lib/buchungen/zeit.ts) dieselben Listen nutzen.
 */

/** "beides" = Vereinsheim und Gelände zusammen (z. B. ein Sommerfest). */
export const BUCHUNG_ORTE = ['vereinsheim', 'gelaende', 'beides'] as const
/** verein = vom Verein selbst eingetragen (Vorstandssitzung, Lehrgang …), mitglied = reserviert, extern = gemietet. */
export const BUCHUNG_ARTEN = ['verein', 'mitglied', 'extern'] as const
export const BUCHUNG_STATUS = ['angefragt', 'rueckfrage', 'bestaetigt', 'abgelehnt', 'storniert'] as const
export const BUCHUNG_QUELLEN = ['website', 'verwaltung'] as const
