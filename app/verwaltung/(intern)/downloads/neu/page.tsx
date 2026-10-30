import type { Metadata } from 'next'
import { datenbank } from '@/lib/db'
import { downloadFormularDaten } from '@/lib/verwaltung/inhalte/downloads'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import DownloadFormular from '../DownloadFormular'

export const metadata: Metadata = { title: 'Neuer Download' }

export default async function NeuerDownload() {
  await adminErzwingen()
  return (
    <>
      <Seitenkopf titel="NEUER DOWNLOAD" untertitel="Erscheint nach dem Speichern auf der Download-Seite." zurueck={{ href: '/verwaltung/downloads', text: 'Alle Downloads' }} />
      <DownloadFormular download={null} {...downloadFormularDaten(datenbank())} />
    </>
  )
}
