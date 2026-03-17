import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'
import EasterEggHunt from '@/components/EasterEggHunt'

export const metadata: Metadata = {
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
        <Navbar />
        <EasterEggHunt />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  )
}
