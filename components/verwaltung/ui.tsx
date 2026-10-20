/**
 * components/verwaltung/ui.tsx
 *
 * Schlichte Bausteine für die Verwaltung unter /verwaltung. Ohne Hooks – in Server- und
 * Client-Komponenten nutzbar. Optik: ruhig und gut lesbar, große Tipp-Flächen fürs Handy.
 */

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const eingabeKlasse =
  'w-full bg-white border border-[#0a0a0a]/20 rounded-sm px-3 py-2.5 text-[15px] text-[#0a0a0a] placeholder:text-[#0a0a0a]/35 focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/70 focus:border-transparent disabled:bg-[#f0f0ea] disabled:text-[#6b6b6b]'

export const auswahlKlasse = eingabeKlasse + ' pr-8'

const KNOPF_BASIS =
  'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0a0a0a]'

export const knopfKlassen = {
  primaer: `${KNOPF_BASIS} bg-[#0a0a0a] text-[#f5f5f0] hover:bg-[#2a2a2a]`,
  sekundaer: `${KNOPF_BASIS} bg-white text-[#0a0a0a] border border-[#0a0a0a]/20 hover:border-[#0a0a0a]/50`,
  gefahr: `${KNOPF_BASIS} bg-white text-red-700 border border-red-300 hover:bg-red-50`,
  leise: `${KNOPF_BASIS} px-2 py-1.5 text-[#6b6b6b] hover:text-[#0a0a0a]`,
} as const

export function Seitenkopf({
  titel,
  untertitel,
  zurueck,
  aktionen,
}: {
  titel: string
  untertitel?: React.ReactNode
  zurueck?: { href: string; text: string }
  aktionen?: React.ReactNode
}) {
  return (
    <div className="mb-8">
      {zurueck && (
        <Link href={zurueck.href} className="inline-flex items-center gap-1.5 text-sm text-[#6b6b6b] hover:text-[#0a0a0a] mb-3">
          <ArrowLeft size={14} /> {zurueck.text}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-none">{titel}</h1>
          {untertitel && <div className="mt-2 text-sm text-[#6b6b6b]">{untertitel}</div>}
        </div>
        {aktionen && <div className="flex flex-wrap gap-2">{aktionen}</div>}
      </div>
    </div>
  )
}

export function Karte({
  titel,
  beschreibung,
  aktionen,
  children,
  className = '',
}: {
  titel?: string
  beschreibung?: React.ReactNode
  aktionen?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`bg-white border border-[#0a0a0a]/10 rounded-sm p-5 md:p-6 ${className}`}>
      {(titel || aktionen) && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            {titel && <h2 className="text-[11px] tracking-[0.18em] uppercase font-semibold text-[#0a0a0a]">{titel}</h2>}
            {beschreibung && <p className="mt-1 text-sm text-[#6b6b6b]">{beschreibung}</p>}
          </div>
          {aktionen}
        </div>
      )}
      {children}
    </section>
  )
}

export function Feld({
  label,
  htmlFor,
  hinweis,
  fehler,
  children,
  className = '',
}: {
  label: string
  htmlFor?: string
  hinweis?: React.ReactNode
  fehler?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[#0a0a0a] mb-1.5">
        {label}
      </label>
      {children}
      {fehler ? (
        <p className="mt-1.5 text-sm text-red-700">{fehler}</p>
      ) : hinweis ? (
        <p className="mt-1.5 text-xs text-[#6b6b6b] leading-relaxed">{hinweis}</p>
      ) : null}
    </div>
  )
}

export function Meldung({ art, children }: { art: 'erfolg' | 'fehler' | 'hinweis'; children: React.ReactNode }) {
  const stil =
    art === 'erfolg'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
      : art === 'fehler'
        ? 'bg-red-50 border-red-300 text-red-900'
        : 'bg-amber-50 border-amber-300 text-amber-950'
  return (
    <div role={art === 'fehler' ? 'alert' : 'status'} className={`border rounded-sm px-4 py-3 text-sm leading-relaxed ${stil}`}>
      {children}
    </div>
  )
}

export function Badge({ children, ton = 'neutral' }: { children: React.ReactNode; ton?: 'neutral' | 'warnung' | 'erfolg' }) {
  const stil =
    ton === 'warnung'
      ? 'bg-amber-100 text-amber-900'
      : ton === 'erfolg'
        ? 'bg-emerald-100 text-emerald-900'
        : 'bg-[#0a0a0a]/[0.06] text-[#4a4a4a]'
  return <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium ${stil}`}>{children}</span>
}

export function LeerHinweis({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#6b6b6b] py-6 text-center">{children}</p>
}
