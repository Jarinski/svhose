import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { downloadFormularDaten } from '@/lib/verwaltung/inhalte/downloads'
import { darfDownloads } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import DownloadFormular from '../DownloadFormular'

export const metadata: Metadata = { title: 'Neuer Download' }

export default async function NeuerDownload() {
  const { rechte } = await sitzungErzwingen()
  if (!darfDownloads(rechte)) redirect('/verwaltung')
  return (
    <>
      <Seitenkopf titel="NEUER DOWNLOAD" untertitel="Erscheint nach dem Speichern auf der Download-Seite." zurueck={{ href: '/verwaltung/downloads', text: 'Alle Downloads' }} />
      <DownloadFormular download={null} nurFoerderverein={!rechte.istAdmin} {...downloadFormularDaten(datenbank())} />
    </>
  )
}
