'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import CookieBanner from './CookieBanner'
import NavbarA from './vorschau/a/NavbarA'
import NavbarB from './vorschau/b/NavbarB'
import DesignUmschalter from './vorschau/DesignUmschalter'
import { wahlAusCookieText, type Design } from '@/lib/vorschau'

// ─── Seitenrahmen ────────────────────────────────────────────────────────────
// Navigation, Inhalt, Footer und Cookie-Banner auf jeder Seite der Website.
// Die Verwaltung unter /verwaltung hat ihren eigenen Rahmen. Der Footer kommt als
// fertig gerenderte Server-Komponente aus dem Layout herein.
//
// Design-Vorschau (lib/vorschau.ts): Navigation und Footer der Vorschau-Designs werden
// mitgerendert und per CSS (app/vorschau.css) nur im passenden Vorschau-Modus gezeigt.
export default function SiteChrome({
  children,
  footer,
  vorschauFooter,
}: {
  children: React.ReactNode
  footer: React.ReactNode
  vorschauFooter: Record<Design, React.ReactNode>
}) {
  const pathname = usePathname()
  const istVerwaltung = pathname?.startsWith('/verwaltung') ?? false

  // Das Skript im <head> setzt data-design nur beim ersten Laden – bei Navigation
  // zwischen Website und Verwaltung hier nachziehen, damit die Verwaltung unberührt bleibt.
  useEffect(() => {
    const html = document.documentElement
    const wahl = istVerwaltung ? null : wahlAusCookieText(document.cookie)
    if (wahl) html.setAttribute('data-design', wahl)
    else html.removeAttribute('data-design')
  }, [istVerwaltung])

  if (istVerwaltung) {
    return <>{children}</>
  }

  return (
    <div className="site">
      <DesignUmschalter pfad={pathname ?? '/'} />
      <div className="chrome-standard"><Navbar /></div>
      <div className="chrome-a"><NavbarA /></div>
      <div className="chrome-b"><NavbarB /></div>
      <main>{children}</main>
      <div className="chrome-standard">{footer}</div>
      <div className="chrome-a">{vorschauFooter.a}</div>
      <div className="chrome-b">{vorschauFooter.b}</div>
      <CookieBanner />
    </div>
  )
}
