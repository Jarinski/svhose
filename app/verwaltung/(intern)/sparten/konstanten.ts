/**
 * Konstanten für die Sparten-Verwaltung – ohne Datenbank-Importe, damit sie auch im Browser nutzbar sind.
 */

/**
 * Sparten, die die nächtlichen Cronjobs über ihre Adresse (Slug) finden:
 * app/api/cron/sync-fussball und app/api/cron/sync-tischtennis.
 */
export const CRON_SLUGS: Record<string, string> = {
  fussball: 'die nächtliche Übernahme der Spiele von fussball.de',
  tischtennis: 'die nächtliche Übernahme der Spiele von click-tt',
}

/** Vorschläge für die Rolle von Ansprechpartner:innen einer Sparte (Freitext bleibt möglich). */
export const SPARTEN_ROLLEN = ['Abteilungsleitung', 'Ansprechpartner:in'] as const

export const STANDARD_ROLLE = 'Ansprechpartner:in'

export const KONFLIKT_MELDUNG = 'Inzwischen hat jemand anderes gespeichert. Bitte Seite neu laden.'
