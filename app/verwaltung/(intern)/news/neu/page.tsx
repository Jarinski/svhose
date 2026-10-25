import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { datenbank, schema } from '@/lib/db'
import { heuteBerlin, vorschlaege, zuordnungsOptionen } from '@/lib/verwaltung/inhalte/gemeinsam'
import { FOERDERVEREIN_KATEGORIE } from '@/lib/foerderverein'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import NewsFormular from '../NewsFormular'

export const metadata: Metadata = { title: 'Neue News' }

export default async function NeueNews() {
  const { rechte } = await sitzungErzwingen()
  const db = datenbank()
  const zuordnungen = zuordnungsOptionen(db, rechte)
  if (zuordnungen.length === 0) redirect('/verwaltung/news')

  const kategorien = vorschlaege([FOERDERVEREIN_KATEGORIE, ...db.select({ k: schema.news.kategorie }).from(schema.news).all().map(n => n.k)])

  return (
    <>
      <Seitenkopf
        titel="NEUE NEWS"
        untertitel="Wird erst auf der Website gezeigt, wenn „Veröffentlicht“ eingeschaltet ist."
        zurueck={{ href: '/verwaltung/news', text: 'Alle News' }}
      />
      <NewsFormular news={null} heute={heuteBerlin()} zuordnungen={zuordnungen} kategorien={kategorien} />
    </>
  )
}
