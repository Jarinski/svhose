'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export interface NavPunkt {
  href: string
  text: string
}

function istAktiv(pathname: string, href: string): boolean {
  return href === '/verwaltung' ? pathname === href : pathname === href || pathname.startsWith(href + '/')
}

export default function Navigation({ punkte, name, abmelden }: { punkte: NavPunkt[]; name: string; abmelden: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const [offen, setOffen] = useState(false)

  const liste = (
    <ul className="space-y-0.5">
      {punkte.map(p => (
        <li key={p.href}>
          <Link
            href={p.href}
            onClick={() => setOffen(false)}
            className={`block rounded-sm px-3 py-2 text-sm transition-colors ${
              istAktiv(pathname, p.href) ? 'bg-[#0a0a0a] text-[#f5f5f0]' : 'text-[#4a4a4a] hover:bg-[#0a0a0a]/[0.06]'
            }`}
          >
            {p.text}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {/* Kopfzeile auf dem Handy */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#f5f5f0]/95 backdrop-blur border-b border-[#0a0a0a]/10 flex items-center justify-between px-4 h-14">
        <Link href="/verwaltung" className="font-display text-xl tracking-tight">
          VERWALTUNG
        </Link>
        <button type="button" onClick={() => setOffen(o => !o)} className="p-2 -mr-2" aria-label={offen ? 'Menü schließen' : 'Menü öffnen'} aria-expanded={offen}>
          {offen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {offen && (
        <div className="lg:hidden fixed inset-0 top-14 z-30 bg-[#f5f5f0] overflow-y-auto px-4 py-4">
          {liste}
          <div className="mt-6 pt-4 border-t border-[#0a0a0a]/10 text-sm text-[#6b6b6b]">
            Angemeldet als <span className="text-[#0a0a0a] font-medium">{name}</span>
            <div className="mt-3">{abmelden}</div>
          </div>
        </div>
      )}

      {/* Seitenleiste ab Desktop */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-60 border-r border-[#0a0a0a]/10 bg-[#f5f5f0] px-4 py-6">
        <Link href="/verwaltung" className="flex items-center gap-2.5 px-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/SV_Holm_Seppensen_Logo.svg" alt="" className="w-8 h-8" />
          <span className="font-display text-xl tracking-tight leading-none">VERWALTUNG</span>
        </Link>
        <nav className="flex-1 overflow-y-auto">{liste}</nav>
        <div className="pt-4 border-t border-[#0a0a0a]/10 px-3 text-sm text-[#6b6b6b]">
          <div className="truncate">
            Angemeldet als <span className="text-[#0a0a0a] font-medium">{name}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Link href="/" className="hover:text-[#0a0a0a]" target="_blank">
              Zur Website ↗
            </Link>
            {abmelden}
          </div>
        </div>
      </aside>
    </>
  )
}
