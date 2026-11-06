/**
 * lib/foerderverein-gruppenfoto.ts
 *
 * Gruppenfoto des Förderverein-Vorstands – steht oben auf /foerderverein/vorstand über den Namen.
 * Gespeichert in der Tabelle einstellungen unter GRUPPENFOTO_SCHLUESSEL als
 * { foto: "<Pfad im Medienordner>", ausschnitt: "<JSON aus lib/bild-ausschnitt.ts>" | null }.
 * Gepflegt wird es zusammen mit dem Vorstand unter /verwaltung/foerderverein-vorstand.
 */

import { eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'

export const GRUPPENFOTO_SCHLUESSEL = 'foerderverein-gruppenfoto'

export interface Gruppenfoto {
  /** Relativer Pfad im Medienordner */
  foto: string
  /** Gewählter Ausschnitt als JSON-Text oder null (mittig) */
  ausschnitt: string | null
}

/** Das gespeicherte Gruppenfoto oder null. */
export function gruppenfotoLesen(db: Pick<Datenbank, 'select'>): Gruppenfoto | null {
  const zeile = db.select().from(schema.einstellungen).where(eq(schema.einstellungen.schluessel, GRUPPENFOTO_SCHLUESSEL)).get()
  const w = (zeile?.wert ?? null) as Partial<Gruppenfoto> | null
  if (!w || typeof w.foto !== 'string' || !w.foto) return null
  return { foto: w.foto, ausschnitt: typeof w.ausschnitt === 'string' ? w.ausschnitt : null }
}
