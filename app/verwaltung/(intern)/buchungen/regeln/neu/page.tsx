import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import RegelFormular from '../RegelFormular'

export const metadata: Metadata = { title: 'Neue Regelbelegung' }

export default async function NeueRegel() {
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  return (
    <>
      <Seitenkopf titel="NEUE REGELBELEGUNG" zurueck={{ href: '/verwaltung/buchungen/regeln', text: 'Regelbelegung' }} />
      <RegelFormular regel={null} />
    </>
  )
}
