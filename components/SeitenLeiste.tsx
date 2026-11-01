import Link from 'next/link'
import { Lock, MapPin, MessagesSquare, Search, Send, type LucideIcon } from 'lucide-react'
import MitgliedWerdenLasche from './MitgliedWerdenLasche'

// ─── Seitenleiste ────────────────────────────────────────────────────────────
// Am rechten Bildschirmrand: oben die „Mitglied werden“-Lasche, darunter Schnellzugriffe.
// Auf dem Handy nur die Lasche – die Ziele der Knöpfe stehen dort im Menü und im Footer.
type Schnellzugriff = { href: string; label: string; icon: LucideIcon; extern?: boolean }

const schnellzugriffe: Schnellzugriff[] = [
  { href: '/suche', label: 'Suche', icon: Search },
  { href: '/ansprechpartner', label: 'Kontakt', icon: Send },
  { href: '/sportplaetze', label: 'Sportplätze', icon: MapPin },
  { href: 'https://www.instagram.com/svholmseppensen/', label: 'Folgt uns bei Social Media', icon: MessagesSquare, extern: true },
  { href: '/verwaltung/login', label: 'Mitgliederbereich', icon: Lock },
]

const knopf =
  'group relative w-11 h-11 bg-[#0a0a0a] text-[#f5f5f0] flex items-center justify-center hover:bg-[#1a1a1a] transition-colors'
const hinweis =
  'pointer-events-none absolute right-full mr-2 whitespace-nowrap bg-[#0a0a0a] text-[#f5f5f0] text-xs tracking-[0.1em] uppercase px-3 py-1.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity'

export default function SeitenLeiste() {
  return (
    <div className="fixed right-0 top-[25vh] z-40 flex flex-col items-end gap-2 pointer-events-none *:pointer-events-auto">
      <MitgliedWerdenLasche />
      <nav aria-label="Schnellzugriff" className="hidden md:flex flex-col gap-1">
        {schnellzugriffe.map(({ href, label, icon: Icon, extern }) => {
          const inhalt = (
            <>
              <Icon size={18} aria-hidden />
              <span className={hinweis}>{label}</span>
            </>
          )
          return extern ? (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={knopf}>
              {inhalt}
            </a>
          ) : (
            <Link key={href} href={href} aria-label={label} className={knopf}>
              {inhalt}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
