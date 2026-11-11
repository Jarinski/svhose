import Link from 'next/link'
import { Lock, MapPin, MessagesSquare, Search, Send, type LucideIcon } from 'lucide-react'
import GlasEbenen from './glas/GlasEbenen'
import MitgliedWerdenLasche from './MitgliedWerdenLasche'
import s from './SeitenLeiste.module.css'

// ─── Seitenleiste ────────────────────────────────────────────────────────────
// Am rechten Bildschirmrand: oben die „Mitglied werden“-Lasche, darunter Schnellzugriffe
// in einer Glasleiste. Auf dem Handy nur die Lasche – die Ziele der Knöpfe stehen dort im
// Menü und im Footer.
type Schnellzugriff = { href: string; label: string; icon: LucideIcon; extern?: boolean }

const schnellzugriffe: Schnellzugriff[] = [
  { href: '/suche', label: 'Suche', icon: Search },
  { href: '/ansprechpartner', label: 'Kontakt', icon: Send },
  { href: '/sportplaetze', label: 'Sportplätze', icon: MapPin },
  { href: 'https://www.instagram.com/svholmseppensen/', label: 'Folgt uns bei Social Media', icon: MessagesSquare, extern: true },
  { href: '/verwaltung/login', label: 'Mitgliederbereich', icon: Lock },
]

export default function SeitenLeiste() {
  return (
    <div className="fixed right-0 top-[25vh] z-40 flex flex-col items-end gap-2 pointer-events-none *:pointer-events-auto">
      <MitgliedWerdenLasche />
      <nav aria-label="Schnellzugriff" className={s.schnell}>
        <GlasEbenen band={7} staerke={6} />
        {schnellzugriffe.map(({ href, label, icon: Icon, extern }) => {
          const inhalt = (
            <>
              <Icon size={18} aria-hidden />
              <span className={s.hinweis}>{label}</span>
            </>
          )
          return extern ? (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={s.knopf}>
              {inhalt}
            </a>
          ) : (
            <Link key={href} href={href} aria-label={label} className={s.knopf}>
              {inhalt}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
