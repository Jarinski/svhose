/**
 * lib/buchungen/schnappschuss.ts
 *
 * Stand einer Buchung für den Verlauf – bewusst OHNE Name, E-Mail, Telefon und Nachricht: Die
 * werden nach einem Jahr gelöscht (personendatenLoeschen) und dürfen nicht im Verlauf überdauern.
 */

import type { schema } from '@/lib/db'

type Buchung = typeof schema.buchungen.$inferSelect

export function buchungSchnappschuss(b: Buchung) {
  return {
    nummer: b.nummer,
    status: b.status,
    art: b.art,
    ort: b.ort,
    titel: b.titel,
    von: b.von,
    bis: b.bis,
    personenzahl: b.personenzahl,
    bereich: b.bereich,
    rueckmeldung: b.rueckmeldung,
    notiz: b.notiz,
  }
}
