import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { istDatum } from '@/lib/buchungen/zeit'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import BuchungFormular from '../BuchungFormular'

export const metadata: Metadata = { title: 'Belegung eintragen' }

export default async function NeueBuchung(props: { searchParams: Promise<{ datum?: string }> }) {
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  return (
    <>
      <Seitenkopf
        titel="BELEGUNG EINTRAGEN"
        zurueck={{ href: '/verwaltung/buchungen', text: 'Alle Buchungen' }}
        untertitel="Für Sonderbelegungen des Vereins (Vorstandssitzung, Lehrgang, Saisonabschluss) oder Anfragen, die per Telefon oder E-Mail kamen."
      />
      <BuchungFormular buchung={null} datumVorschlag={istDatum(searchParams.datum) ? searchParams.datum : undefined} />
    </>
  )
}
