import type { Metadata } from 'next'
import './globals.css'
import SiteChrome from '@/components/SiteChrome'
import Footer from '@/components/Footer'

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
    <html lang="de">
      <body>
        <SiteChrome footer={<Footer />}>{children}</SiteChrome>
      </body>
    </html>
  )
}
