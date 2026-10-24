'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

type NavLink =
  | { href: string; label: string; children?: undefined }
  | { label: string; href?: undefined; children: { href: string; label: string }[] }

const navLinks: NavLink[] = [
  { href: '/news', label: 'News' },
  { href: '/sparten', label: 'Sparten' },
  {
    label: 'Spielpläne',
    children: [
      { href: '/fussball', label: 'Fußball' },
      { href: '/tischtennis', label: 'Tischtennis' },
    ],
  },
  { href: '/termine', label: 'Termine' },
  { href: '/trainingszeiten', label: 'Training' },
  { href: '/ansprechpartner', label: 'Kontakt' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/kinderschutz', label: 'Kinderschutz' },
]

function DropdownMenu({ label, children }: { label: string; children: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <li ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[13px] tracking-[0.08em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors font-medium"
      >
        {label}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="absolute top-full left-0 mt-2 min-w-[160px] bg-[#f5f5f0] border border-[#0a0a0a]/10 rounded shadow-md py-1 z-50">
          {children.map(child => (
            <li key={child.href}>
              <Link
                href={child.href}
                className="block px-4 py-2 text-[12px] tracking-[0.08em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] hover:bg-[#0a0a0a]/5 transition-colors font-medium"
                onClick={() => setOpen(false)}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [spielplaeneOpen, setSpieleplaeneOpen] = useState(false)

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
          {navLinks.map(link =>
            link.children ? (
              <DropdownMenu key={link.label} label={link.label} children={link.children} />
            ) : (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[13px] tracking-[0.08em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors font-medium"
                >
                  {link.label}
                </Link>
              </li>
            )
          )}
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
            {navLinks.map(link =>
              link.children ? (
                <li key={link.label}>
                  <button
                    className="flex items-center gap-1 w-full text-left text-sm tracking-[0.08em] uppercase text-[#0a0a0a] font-medium py-2"
                    onClick={() => setSpieleplaeneOpen(!spielplaeneOpen)}
                  >
                    {link.label}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${spielplaeneOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {spielplaeneOpen && (
                    <ul className="pl-4 flex flex-col gap-2 mt-1">
                      {link.children.map(child => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block text-sm tracking-[0.08em] uppercase text-[#6b6b6b] font-medium py-1"
                            onClick={() => { setOpen(false); setSpieleplaeneOpen(false) }}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block text-sm tracking-[0.08em] uppercase text-[#0a0a0a] font-medium py-2"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </header>
  )
}
