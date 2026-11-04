import type { Metadata } from 'next'
import ChronikBausteine, { ChronikKopf } from '@/components/foerderverein/ChronikBausteine'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import { getChronik } from '@/lib/content'

// Chronik des Fördervereins: wie aus der Elterninitiative der eigene Sportplatz wurde.
// Inhalt und Aufbau pflegt der Förderverein selbst unter /verwaltung/chronik (lib/chronik.ts);
// solange dort nichts gespeichert ist, steht hier die Vorlage aus dem Code.

export const metadata: Metadata = {
  title: 'Chronik – Förderverein',
  description: 'Von der Idee der Eltern bis zum eigenen Rasenplatz am Tostedter Weg: die Geschichte des Fördervereins Sportplatz.',
}

// Änderungen aus der Verwaltung sofort zeigen
export const dynamic = 'force-dynamic'

export default async function FoerdervereinChronikPage() {
  const chronik = await getChronik()

  return (
    <div className="pt-32 pb-24">
      <ChronikKopf einleitung={chronik.einleitung} />
      <Unternavigation aktiv="/foerderverein/chronik" />
      <ChronikBausteine bausteine={chronik.bausteine} />
    </div>
  )
}
