import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { darfTermineAnlegen, terminFormularDaten } from '@/lib/verwaltung/inhalte/termine'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import TerminFormular from '../TerminFormular'

export const metadata: Metadata = { title: 'Neuer Termin' }

export default function NeuerTermin() {
  const { rechte } = sitzungErzwingen()
  if (!darfTermineAnlegen(rechte)) redirect('/verwaltung/termine')
  const daten = terminFormularDaten(datenbank(), rechte)

  return (
    <>
      <Seitenkopf titel="NEUER TERMIN" untertitel="Erscheint nach dem Speichern im Terminkalender der Website." zurueck={{ href: '/verwaltung/termine', text: 'Alle Termine' }} />
      <TerminFormular termin={null} {...daten} />
    </>
  )
}
