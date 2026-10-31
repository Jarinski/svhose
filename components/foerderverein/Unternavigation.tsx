import Link from 'next/link'
import { FOERDERVEREIN_MENUE } from '@/lib/foerderverein'

// Leiste mit den Unterseiten des Fördervereins, oben auf jeder Seite unter /foerderverein.
// Die Übersichtsseite ist im Menü nicht aufgeführt, hat hier aber einen eigenen Eintrag,
// damit man von jeder Unterseite zurückfindet.
const EINTRAEGE = [{ href: '/foerderverein', label: 'Übersicht' }, ...FOERDERVEREIN_MENUE.kinder]

export default function Unternavigation({ aktiv }: { aktiv: string }) {
  return (
    <nav aria-label="Förderverein" className="px-6 max-w-7xl mx-auto mb-12">
      <ul className="flex flex-wrap gap-2">
        {EINTRAEGE.map(e => {
          const istAktiv = e.href === aktiv
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={istAktiv ? 'page' : undefined}
                className={`inline-block px-4 py-2 text-xs tracking-[0.1em] uppercase font-medium border transition-colors ${
                  istAktiv ? 'bg-[#0a0a0a] text-[#f5f5f0] border-[#0a0a0a]' : 'border-[#0a0a0a]/20 hover:border-[#0a0a0a]'
                }`}
              >
                {e.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
