import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { datenbank, schema } from '@/lib/db'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Seitenkopf } from '@/components/verwaltung/ui'
import RegelFormular from '../RegelFormular'

export const metadata: Metadata = { title: 'Regelbelegung' }

export default async function RegelSeite(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  const r = datenbank().select().from(schema.belegungRegeln).where(eq(schema.belegungRegeln.id, id)).get()
  if (!r) notFound()
  return (
    <>
      <Seitenkopf
        titel={r.titel.toUpperCase()}
        zurueck={{ href: '/verwaltung/buchungen/regeln', text: 'Regelbelegung' }}
        untertitel={`Zuletzt gespeichert ${zeitpunktDeutsch(r.geaendertAm)}`}
      />
      <RegelFormular
        regel={{
          id: r.id,
          titel: r.titel,
          ort: r.ort,
          wochentag: r.wochentag,
          beginn: r.beginn,
          ende: r.ende,
          gueltigAb: r.gueltigAb ?? '',
          gueltigBis: r.gueltigBis ?? '',
          hinweis: r.hinweis ?? '',
          geaendertAm: r.geaendertAm,
        }}
      />
    </>
  )
}
