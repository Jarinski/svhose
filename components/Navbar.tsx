'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/news', label: 'News' },
  { href: '/sparten', label: 'Sparten' },
  { href: '/termine', label: 'Termine' },
  { href: '/trainingszeiten', label: 'Training' },
  { href: '/ansprechpartner', label: 'Kontakt' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/ueber-uns', label: 'Über uns' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f0]/90 backdrop-blur-md border-b border-[#0a0a0a]/10">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-10 h-10 shrink-0">
            {/* Subtle glow ring on hover */}
            <div className="absolute inset-0 rounded-full bg-[#0a0a0a]/0 group-hover:bg-[#0a0a0a]/5 transition-all duration-300 scale-110" />
            <img
              src="/SV_Holm_Seppensen_Logo.svg"
              alt="SV Holm-Seppensen Logo"
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm tracking-[0.12em] text-[#0a0a0a]">HOLM-SEPPENSEN</div>
            <div className="text-[10px] text-[#6b6b6b] tracking-[0.2em] uppercase">Sportverein e.V.</div>
          </div>
        </Link>

        {/* Desktop links */}
        <ul className="hidden lg:flex items-center gap-8">
          {navLinks.map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[13px] tracking-[0.08em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menü"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-[#0a0a0a]/10 bg-[#f5f5f0]">
          <ul className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-sm tracking-[0.08em] uppercase text-[#0a0a0a] font-medium py-2"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
