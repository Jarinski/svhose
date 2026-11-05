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

/** Kontaktverlauf: Weg der Nachricht. */
export const NACHRICHT_KANAELE = ['email', 'telefon', 'persoenlich', 'notiz'] as const
/** eingang = an den Verein, ausgang = vom Verein, intern = nur für die Verwaltung (Notiz). */
export const NACHRICHT_RICHTUNGEN = ['eingang', 'ausgang', 'intern'] as const
/** Wie eine eingegangene Mail ihrer Buchung zugeordnet wurde. */
export const NACHRICHT_ZUORDNUNGEN = ['antwort', 'nummer', 'absender', 'hand'] as const
