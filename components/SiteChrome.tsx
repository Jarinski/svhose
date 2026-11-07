'use client'

import { usePathname } from 'next/navigation'
import CookieBanner from './CookieBanner'
import SeitenLeiste from './SeitenLeiste'
import NavbarB from './vorschau/b/NavbarB'

// ─── Seitenrahmen ────────────────────────────────────────────────────────────
// Navigation, Inhalt, Footer und Cookie-Banner auf jeder Seite der Website.
// Die Verwaltung unter /verwaltung hat ihren eigenen Rahmen. Der Footer kommt als
// fertig gerenderte Server-Komponente aus dem Layout herein.
// .site ist zugleich der Rahmen, an dem die Bento-Regeln in app/vorschau-b.css hängen.
export default function SiteChrome({
  children,
  footer,
}: {
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const pathname = usePathname()
  const istVerwaltung = pathname?.startsWith('/verwaltung') ?? false

  if (istVerwaltung) {
    return <>{children}</>
  }

  return (
    <div className="site">
      <NavbarB />
      <main>{children}</main>
      {footer}
      <SeitenLeiste />
      <CookieBanner />
    </div>
  )
}
