import SeitenBausteine, { SeitenKopf } from '@/components/foerderverein/SeitenBausteine'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import { getFoerdervereinSeite } from '@/lib/content'
import type { FoerdervereinSeite } from '@/lib/foerderverein-seiten'

// Eine Förderverein-Seite (Über den Förderverein, Aktuelles, Chronik, Mitglied werden) auf der Website: Kopf, Unternavigation
// und die Bausteine, die der Förderverein unter /verwaltung/foerderverein-seiten pflegt.
export default async function SeitenAnsicht({ seite }: { seite: FoerdervereinSeite }) {
  const { inhalt, daten } = await getFoerdervereinSeite(seite)
  return (
    <div className="pt-32 pb-24">
      <SeitenKopf kicker={seite.kicker} titel={seite.titel} einleitung={inhalt.einleitung} />
      <Unternavigation aktiv={seite.pfad} />
      <SeitenBausteine bausteine={inhalt.bausteine} daten={daten} />
    </div>
  )
}
