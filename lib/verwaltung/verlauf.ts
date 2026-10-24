/**
 * lib/verwaltung/verlauf.ts
 *
 * Änderungsprotokoll. Jede Änderung über die Verwaltung (später auch API und Bot) wird mit
 * Zugang, Zeitpunkt sowie Stand vorher und nachher festgehalten.
 */

import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import type { Rechte } from './rechte'

type Aktion = (typeof schema.VERLAUF_AKTIONEN)[number]
type Quelle = (typeof schema.VERLAUF_QUELLEN)[number]

export function protokollieren(
  db: Pick<Datenbank, 'insert'>,
  wer: Pick<Rechte, 'zugangId' | 'name'> | null,
  eintrag: {
    aktion: Aktion
    objektTyp: string
    objektId?: number | null
    bezeichnung: string
    vorher?: unknown
    nachher?: unknown
    quelle?: Quelle
  },
): void {
  db.insert(schema.verlauf)
    .values({
      zugangId: wer?.zugangId ?? null,
      zugangName: wer?.name ?? null,
      quelle: eintrag.quelle ?? 'verwaltung',
      aktion: eintrag.aktion,
      objektTyp: eintrag.objektTyp,
      objektId: eintrag.objektId ?? null,
      bezeichnung: eintrag.bezeichnung,
      vorher: eintrag.vorher ?? null,
      nachher: eintrag.nachher ?? null,
    })
    .run()
}
