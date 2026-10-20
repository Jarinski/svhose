import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { datenbank, schema } from '@/lib/db'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import { bereichsBaum } from '../logik'
import ZugangFormular from '../ZugangFormular'

export const metadata: Metadata = { title: 'Neuer Zugang' }

export default function NeuerZugangSeite() {
  adminErzwingen()
  const db = datenbank()
  const personen = db.select({ id: schema.personen.id, name: schema.personen.name }).from(schema.personen).orderBy(asc(schema.personen.name)).all()
  return (
    <>
      <Seitenkopf
        titel="NEUER ZUGANG"
        untertitel="Nach dem Speichern bekommst du sofort einen Einladungs-Code (QR-Code) zum Weitergeben."
        zurueck={{ href: '/verwaltung/zugaenge', text: 'Alle Zugänge' }}
      />
      <ZugangFormular modus="neu" personen={personen} baum={bereichsBaum(db)} />
    </>
  )
}
