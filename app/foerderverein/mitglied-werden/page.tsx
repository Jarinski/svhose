import type { Metadata } from 'next'
import SeitenAnsicht from '@/components/foerderverein/SeitenAnsicht'
import { foerdervereinSeite } from '@/lib/foerderverein-seiten'

// Wege zu helfen, Beitrittserklärung und Unterlagen; die PDFs kommen aus den Downloads mit der Kategorie "Förderverein".
// Inhalt und Aufbau pflegt der Förderverein selbst unter /verwaltung/foerderverein-seiten
// (lib/foerderverein-seiten.ts); solange dort nichts gespeichert ist, steht hier die Vorlage.

export const metadata: Metadata = {
  title: 'Mitglied werden – Förderverein',
  description: 'Mitglied im Förderverein Sportplatz werden, spenden, Bandenwerbung buchen oder mit anpacken.',
}

// Änderungen aus der Verwaltung sofort zeigen
export const dynamic = 'force-dynamic'

export default function FoerdervereinMitgliedWerdenPage() {
  return <SeitenAnsicht seite={foerdervereinSeite('mitglied-werden')!} />
}
