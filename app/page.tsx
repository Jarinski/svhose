import { getAllNews, getTermine, getSparten, getMannschaftenAnzahl } from '@/lib/content'
import StartseiteB from '@/components/vorschau/b/StartseiteB'
import { heuteInBerlin } from '@/lib/vorschau'

// Liest bei jedem Aufruf direkt aus der Datenbank – neue News und Termine sind sofort sichtbar.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [news, termine, sparten, mannschaften] = await Promise.all([
    getAllNews(),
    getTermine(),
    getSparten(),
    getMannschaftenAnzahl(),
  ])

  const heute = heuteInBerlin()
  const daten = {
    news,
    termine: termine.filter(t => t.datum >= heute),
    sparten,
    zahlen: { sparten: sparten.length, mannschaften },
    heute,
  }
  return <StartseiteB daten={daten} />
}
