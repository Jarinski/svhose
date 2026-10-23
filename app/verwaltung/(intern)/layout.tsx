import { abmelden } from '../aktionen'
import Navigation, { type NavPunkt } from '@/components/verwaltung/Navigation'
import { datenbank } from '@/lib/db'
import { bearbeitbareTeams } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'

// Alles unter diesem Layout braucht eine gültige Sitzung. Die Rechte prüft trotzdem jede
// Seite und jede Server-Aktion selbst – das Layout blendet nur passende Menüpunkte ein.
export const dynamic = 'force-dynamic'

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const { rechte } = await sitzungErzwingen()
  const admin = rechte.istAdmin
  const hatSparte = admin || rechte.sparten.length > 0
  const hatTeams = admin || bearbeitbareTeams(datenbank(), rechte).length > 0

  const punkte: NavPunkt[] = [
    { href: '/verwaltung', text: 'Übersicht' },
    ...(hatTeams ? [{ href: '/verwaltung/teams', text: 'Mannschaften & Gruppen' }] : []),
    { href: '/verwaltung/personen', text: 'Personen' },
    ...(hatSparte ? [{ href: '/verwaltung/sparten', text: 'Sparten' }] : []),
    { href: '/verwaltung/news', text: 'News' },
    ...(hatSparte ? [{ href: '/verwaltung/termine', text: 'Termine' }] : []),
    ...(admin
      ? [
          { href: '/verwaltung/downloads', text: 'Downloads' },
          { href: '/verwaltung/kontakte', text: 'Kontaktseite' },
          { href: '/verwaltung/zugaenge', text: 'Zugänge' },
          { href: '/verwaltung/verlauf', text: 'Verlauf' },
        ]
      : []),
    { href: '/verwaltung/geraete', text: 'Mein Zugang' },
  ]

  const abmeldenKnopf = (
    <form action={abmelden}>
      <button type="submit" className="text-sm text-[#6b6b6b] hover:text-[#0a0a0a] underline underline-offset-4">
        Abmelden
      </button>
    </form>
  )

  return (
    <>
      <Navigation punkte={punkte} name={rechte.name} abmelden={abmeldenKnopf} />
      <main className="lg:pl-60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-12">{children}</div>
      </main>
    </>
  )
}
