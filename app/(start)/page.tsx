import { after } from 'next/server'
import { getAllNews, getTermine, getSparten, getMannschaftenAnzahl } from '@/lib/content'
import { instagramAbgleichen, instagramAbgleichFaellig, instagramFotos } from '@/lib/instagram'
import StartseiteB from '@/components/vorschau/b/StartseiteB'
import { heuteInBerlin, spielInfo } from '@/lib/vorschau'

// Liest bei jedem Aufruf direkt aus der Datenbank – neue News und Termine sind sofort sichtbar.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [news, termine, sparten, mannschaften] = await Promise.all([
    getAllNews(),
    getTermine(),
    getSparten(),
    getMannschaftenAnzahl(),
  ])

  // Neue Instagram-Beiträge holt die Seite im Hintergrund, höchstens stündlich (lib/instagram.ts) –
  // dieser Aufruf zeigt noch den alten Stand, der nächste den neuen.
  if (instagramAbgleichFaellig()) after(() => instagramAbgleichen())

  const heute = heuteInBerlin()
  // Für die Spiele-Kachel: Spiele der letzten 30 Tage, damit man zu den letzten Ergebnissen zurückblättern kann
  const vor30Tagen = new Date(Date.parse(heute) - 30 * 86_400_000).toISOString().slice(0, 10)
  const daten = {
    news,
    termine: termine.filter(t => t.datum >= heute),
    letzteSpiele: termine.filter(t => t.datum >= vor30Tagen && t.datum <= heute && spielInfo(t).art !== null),
    sparten,
    zahlen: { sparten: sparten.length, mannschaften },
    instagram: instagramFotos(),
    heute,
  }
  return <StartseiteB daten={daten} />
}
