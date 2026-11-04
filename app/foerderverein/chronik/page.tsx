import type { Metadata } from 'next'
import SeitenAnsicht from '@/components/foerderverein/SeitenAnsicht'
import { foerdervereinSeite } from '@/lib/foerderverein-seiten'

// Chronik des Fördervereins: wie aus der Elterninitiative der eigene Sportplatz wurde.
// Inhalt und Aufbau pflegt der Förderverein selbst unter /verwaltung/foerderverein-seiten
// (lib/foerderverein-seiten.ts); solange dort nichts gespeichert ist, steht hier die Vorlage.

export const metadata: Metadata = {
  title: 'Chronik – Förderverein',
  description: 'Von der Idee der Eltern bis zum eigenen Rasenplatz am Tostedter Weg: die Geschichte des Fördervereins Sportplatz.',
}

// Änderungen aus der Verwaltung sofort zeigen
export const dynamic = 'force-dynamic'

export default function FoerdervereinChronikPage() {
  return <SeitenAnsicht seite={foerdervereinSeite('chronik')!} />
}
