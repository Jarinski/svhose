import type { Metadata } from 'next'
import { Bebas_Neue, Bricolage_Grotesque, DM_Sans, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import './vorschau-b.css'
import SiteChrome from '@/components/SiteChrome'
import FooterB from '@/components/vorschau/b/FooterB'

/**
 * Öffentliche Adresse der Website aus SEITEN_URL (z. B. https://www.<vereinsdomain>.de).
 * Damit werden relative Vorschaubilder (og:image, z. B. /medien/news/…) absolut aufgelöst.
 * Ohne die Variable nimmt Next.js ersatzweise http://localhost:<port> – beim Teilen fehlt dann das Bild.
 */
function seitenUrl(): URL | undefined {
  const wert = process.env.SEITEN_URL?.trim()
  if (!wert) return undefined
  try {
    return new URL(wert)
  } catch {
    console.warn(`[layout] SEITEN_URL "${wert}" ist keine gültige URL und wird ignoriert.`)
    return undefined
  }
}

/**
 * Schriften: next/font lädt sie beim Build und liefert sie von der eigenen Domain aus –
 * Besucher*innen rufen nichts bei Google ab. (Der frühere @import in globals.css kam seit
 * Next 16/Turbopack nicht mehr im CSS an.)
 *
 * - Website (Bento): Bricolage Grotesque für Überschriften, Plus Jakarta Sans für Text –
 *   genutzt über --b-display/--b-schrift in app/vorschau-b.css.
 * - Verwaltung: weiter Bebas Neue und DM Sans über --font-display/--font-body in globals.css.
 *   Nicht vorgeladen, weil die Website sie nicht braucht.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-bricolage',
  display: 'swap',
})
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
  preload: false,
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: seitenUrl(),
  title: {
    default: 'SV Holm-Seppensen e.V.',
    template: '%s | SV Holm-Seppensen e.V.',
  },
  description: 'Sportverein Holm-Seppensen – Gemeinsam stark seit Jahren. Fußball, Judo, Volleyball, Yoga und viele weitere Sparten.',
  keywords: ['Sportverein', 'Holm-Seppensen', 'Fußball', 'Sport', 'Verein'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const schriften = [bricolage, jakarta, bebasNeue, dmSans].map(s => s.variable).join(' ')

  return (
    // data-design="b": Daran hängen die Regeln in app/vorschau-b.css (alle unter .site, das es nur
    // auf der Website gibt – die Verwaltung bleibt davon unberührt).
    <html lang="de" data-design="b" className={schriften}>
      <body>
        <SiteChrome footer={<FooterB />}>{children}</SiteChrome>
      </body>
    </html>
  )
}
