// ─── Startseite mit News-Fenster ─────────────────────────────────────────────
// Die Startseite liegt in der Routengruppe (start), damit nur sie den Slot @modal hat: Ein Klick auf
// eine News öffnet sie hier als Glas-Fenster über der Startseite (abgefangene Route
// @modal/(.)news/[slug]). Von anderen Seiten aus, beim Neuladen oder über einen geteilten Link
// erscheint weiter die normale Seite app/news/[slug].

// Startseite und News lesen bei jedem Aufruf aus der Datenbank – beide Slots sind dynamisch.
export const dynamic = 'force-dynamic'

export default function StartLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
