import Link from 'next/link'
import { FOERDERVEREIN_MENUE } from '@/lib/foerderverein'

// Leiste mit den Unterseiten des Fördervereins, oben auf jeder Seite unter /foerderverein –
// dieselben Einträge wie im Menü, "Was ist der Förderverein" ist der Einstieg.
const EINTRAEGE = FOERDERVEREIN_MENUE.kinder

export default function Unternavigation({ aktiv }: { aktiv: string }) {
  return (
    <nav aria-label="Förderverein" className="px-6 max-w-7xl mx-auto mb-12">
      <ul className="flex flex-wrap gap-2">
        {EINTRAEGE.map(e => {
          const istAktiv = e.href === aktiv
          return (
            // shrink-0 + nowrap: Mobil ist die Leiste eine waagerecht scrollbare Reihe (app/vorschau-b.css) –
            // lange Reiter wie "Was ist der Förderverein" sollen dort einzeilig bleiben
            <li key={e.href} className="shrink-0">
              <Link
                href={e.href}
                aria-current={istAktiv ? 'page' : undefined}
                className={`inline-block whitespace-nowrap px-4 py-2 text-xs tracking-[0.1em] uppercase font-medium border transition-colors ${
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
