/**
 * components/verwaltung/buchungen/Anzeige.tsx
 *
 * Kleine Anzeige-Bausteine für Buchungen in der Verwaltung (ohne Hooks): Status-Marke und die
 * Farben im Kalender. Abgelehnte und stornierte Buchungen stehen nicht im Kalender.
 */

import { STATUS_NAMEN, type BuchungStatus } from '@/lib/buchungen/zeit'

export const STATUS_FARBEN: Record<BuchungStatus, string> = {
  angefragt: 'bg-amber-100 text-amber-950',
  rueckfrage: 'bg-sky-100 text-sky-950',
  bestaetigt: 'bg-emerald-100 text-emerald-950',
  abgelehnt: 'bg-red-50 text-red-800',
  storniert: 'bg-[#0a0a0a]/[0.06] text-[#6b6b6b] line-through',
}

/** Farbe für Regelbelegung im Kalender. */
export const REGEL_FARBE = 'bg-[#0a0a0a]/[0.05] text-[#4a4a4a]'

export function StatusMarke({ status, gross = false }: { status: BuchungStatus; gross?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm font-medium whitespace-nowrap ${gross ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'} ${STATUS_FARBEN[status]}`}
    >
      {STATUS_NAMEN[status]}
    </span>
  )
}

/** Legende für den Kalender. */
export function Legende() {
  const punkt = (klasse: string, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm ${klasse}`} aria-hidden="true" />
      {text}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b6b6b]">
      {punkt(REGEL_FARBE, 'Regelbelegung')}
      {punkt(STATUS_FARBEN.angefragt, 'Angefragt')}
      {punkt(STATUS_FARBEN.rueckfrage, 'Rückfrage')}
      {punkt(STATUS_FARBEN.bestaetigt, 'Bestätigt')}
      {punkt('bg-white ring-2 ring-red-500', 'Überschneidung')}
    </div>
  )
}
