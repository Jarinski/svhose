import type { Metadata } from 'next'
import SeitenAnsicht from '@/components/foerderverein/SeitenAnsicht'
import { foerdervereinSeite } from '@/lib/foerderverein-seiten'

// Einstieg in den Förderverein (erster Reiter): warum es ihn gibt und was er tut.
// Inhalt und Aufbau pflegt der Förderverein selbst unter /verwaltung/foerderverein-seiten
// (lib/foerderverein-seiten.ts); solange dort nichts gespeichert ist, steht hier die Vorlage.

export const metadata: Metadata = {
  title: 'Was ist der Förderverein',
  description: 'Warum es den Förderverein Sportanlagen des SV Holm-Seppensen e.V. gibt und was er für den Sport im Ort tut.',
}

// Änderungen aus der Verwaltung sofort zeigen
export const dynamic = 'force-dynamic'

export default function FoerdervereinUeberUnsPage() {
  return <SeitenAnsicht seite={foerdervereinSeite('ueber-uns')!} />
}
