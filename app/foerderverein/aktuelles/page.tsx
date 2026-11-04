import type { Metadata } from 'next'
import SeitenAnsicht from '@/components/foerderverein/SeitenAnsicht'
import { foerdervereinSeite } from '@/lib/foerderverein-seiten'

// Aktionen und Neuigkeiten; die Meldungen kommen aus den News mit der Kategorie "Förderverein".
// Inhalt und Aufbau pflegt der Förderverein selbst unter /verwaltung/foerderverein-seiten
// (lib/foerderverein-seiten.ts); solange dort nichts gespeichert ist, steht hier die Vorlage.

export const metadata: Metadata = {
  title: 'Aktuelles – Förderverein',
  description: 'Aktionen und Neuigkeiten aus dem Förderverein Sportplatz des SV Holm-Seppensen e.V.',
}

// Änderungen aus der Verwaltung sofort zeigen
export const dynamic = 'force-dynamic'

export default function FoerdervereinAktuellesPage() {
  return <SeitenAnsicht seite={foerdervereinSeite('aktuelles')!} />
}
