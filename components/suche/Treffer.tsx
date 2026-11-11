/**
 * components/suche/Treffer.tsx
 *
 * Ein Suchtreffer – gemeinsam für die Seite /suche und das Suchfenster. Ohne Hooks: nutzbar in
 * Server- und Client-Komponenten.
 *
 * Treffer sind normale Links (kein next/link): Nur beim richtigen Seitenaufruf springt der Browser
 * zur Fundstelle (#:~:text=…, lib/suche/text.ts) und markiert sie.
 */

import { CalendarDays, Download, FileText, Newspaper, Trophy, UserRound, Users, type LucideIcon } from 'lucide-react'
import type { MarkierterText, SuchArt, SuchTreffer } from '@/lib/suche/typen'
import s from './Suche.module.css'

export const ART_ICONS: Record<SuchArt, LucideIcon> = {
  seite: FileText,
  sparte: Trophy,
  team: Users,
  news: Newspaper,
  termin: CalendarDays,
  person: UserRound,
  download: Download,
}

/** Text mit <mark> an den Fundstellen */
export function Markiert({ wert }: { wert: MarkierterText }) {
  const teile: React.ReactNode[] = []
  let stelle = 0
  wert.marken.forEach(([von, bis], i) => {
    if (von > stelle) teile.push(wert.text.slice(stelle, von))
    teile.push(<mark key={i}>{wert.text.slice(von, bis)}</mark>)
    stelle = bis
  })
  teile.push(wert.text.slice(stelle))
  return <>{teile}</>
}

export default function Treffer({
  treffer,
  kompakt = false,
  ...rest
}: { treffer: SuchTreffer; kompakt?: boolean } & React.HTMLAttributes<HTMLAnchorElement>) {
  const Icon = ART_ICONS[treffer.art]
  return (
    <a
      href={treffer.url}
      className={`${s.treffer} ${kompakt ? s.kompakt : ''}`}
      {...(treffer.extern ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      <span className={s.icon} aria-hidden="true">
        <Icon size={kompakt ? 16 : 18} strokeWidth={1.9} />
      </span>
      <span className={s.inhalt}>
        <span className={s.meta}>
          <span className={s.art}>{treffer.artName}</span>
          {treffer.zusatz && <span className={s.zusatz}>{treffer.zusatz}</span>}
        </span>
        <span className={s.titel}>
          <Markiert wert={treffer.titel} />
          {treffer.extern && <span className="sr-only"> (öffnet in neuem Tab)</span>}
        </span>
        {treffer.ausschnitt && (
          <span className={s.ausschnitt}>
            <Markiert wert={treffer.ausschnitt} />
          </span>
        )}
      </span>
      <svg className={s.pfeil} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {treffer.extern ? <path d="M7 17 17 7M8 7h9v9" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
      </svg>
    </a>
  )
}
