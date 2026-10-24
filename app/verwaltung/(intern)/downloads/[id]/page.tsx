import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { downloadFormularDaten } from '@/lib/verwaltung/inhalte/downloads'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Seitenkopf } from '@/components/verwaltung/ui'
import DownloadFormular from '../DownloadFormular'

export const metadata: Metadata = { title: 'Download bearbeiten' }

export default async function DownloadBearbeiten(props: { params: Promise<{ id: string }>; searchParams: Promise<{ neu?: string }> }) {
  const params = await props.params
  const searchParams = await props.searchParams
  await adminErzwingen()
  const db = datenbank()
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, id)).get()
  if (!download) notFound()

  return (
    <>
      <Seitenkopf
        titel="DOWNLOAD BEARBEITEN"
        zurueck={{ href: '/verwaltung/downloads', text: 'Alle Downloads' }}
        untertitel={`Zuletzt gespeichert ${zeitpunktDeutsch(download.geaendertAm)}`}
      />
      <DownloadFormular
        download={{
          id: download.id,
          titel: download.titel,
          beschreibung: download.beschreibung ?? '',
          kategorie: download.kategorie ?? '',
          datum: download.datum ?? '',
          sparteId: download.sparteId,
          dateiUrl: medienUrl(download.datei) ?? '#',
          dateiName: download.datei.split('/').pop() ?? download.datei,
          geaendertAm: download.geaendertAm,
        }}
        {...downloadFormularDaten(db)}
        hinweis={searchParams.neu ? 'Der Download ist angelegt und auf der Website zu sehen.' : undefined}
      />
    </>
  )
}
