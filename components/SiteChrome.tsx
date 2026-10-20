'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import CookieBanner from './CookieBanner'

// ─── Seitenrahmen ────────────────────────────────────────────────────────────
// Navigation, Inhalt, Footer und Cookie-Banner auf jeder Seite der Website.
// Die Verwaltung unter /verwaltung hat ihren eigenen Rahmen. Der Footer kommt als
// fertig gerenderte Server-Komponente aus dem Layout herein.
export default function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname?.startsWith('/verwaltung')) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      {footer}
      <CookieBanner />
    </>
  )
}
