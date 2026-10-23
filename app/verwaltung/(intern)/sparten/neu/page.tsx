import type { Metadata } from 'next'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { Karte, Seitenkopf } from '@/components/verwaltung/ui'
import NeueSparteFormular from './NeueSparteFormular'

export const metadata: Metadata = { title: 'Neue Sparte' }

export default async function NeueSparteSeite() {
  await adminErzwingen()
  return (
    <>
      <Seitenkopf titel="NEUE SPARTE" zurueck={{ href: '/verwaltung/sparten', text: 'Alle Sparten' }} />
      <Karte titel="Schritt 1: Name" beschreibung="Zuerst nur den Namen – Texte, Foto, Farbe und Ansprechpartner:innen kommen im nächsten Schritt. Die Sparte bleibt auf der Website ausgeblendet, bis du sie dort sichtbar schaltest.">
        <NeueSparteFormular />
      </Karte>
    </>
  )
}
