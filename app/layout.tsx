import type { Metadata } from 'next'
import { Bebas_Neue, DM_Sans } from 'next/font/google'
import './globals.css'
import './vorschau.css'
import './vorschau-a.css'
import './vorschau-b.css'
import SiteChrome from '@/components/SiteChrome'
import Footer from '@/components/Footer'
import FooterA from '@/components/vorschau/a/FooterA'
import FooterB from '@/components/vorschau/b/FooterB'
import { designSkript } from '@/lib/vorschau'

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
 * Next 16/Turbopack nicht mehr im CSS an.) Genutzt über --font-display/--font-body in globals.css.
 */
const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas-neue', display: 'swap' })
const dmSans = DM_Sans({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
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
  return (
    // suppressHydrationWarning: data-design setzt das Vorschau-Skript schon vor React (lib/vorschau.ts)
    <html lang="de" className={`${bebasNeue.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: designSkript() }} />
      </head>
      <body>
        <SiteChrome footer={<Footer />} vorschauFooter={{ a: <FooterA />, b: <FooterB /> }}>
          {children}
        </SiteChrome>
      </body>
    </html>
  )
}
