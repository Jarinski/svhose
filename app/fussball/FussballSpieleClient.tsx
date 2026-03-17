'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ExternalLink, Tag, X, Home, Plane } from 'lucide-react'
import type { FussballSpiel } from '@/lib/fussball-de'

interface Props {
  kommend: FussballSpiel[]
  vergangen: FussballSpiel[]
}

export default function FussballSpieleClient({ kommend, vergangen }: Props) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  /* ── Collect all unique mannschaftsart values ── */
  const allTeams = useMemo(() => {
    const set = new Set<string>()
    ;[...kommend, ...vergangen].forEach(s => set.add(s.mannschaftsart))
    return Array.from(set).sort()
  }, [kommend, vergangen])

  function toggleFilter(value: string) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  function matchesFilter(s: FussballSpiel): boolean {
    if (activeFilters.size === 0) return true
    return activeFilters.has(s.mannschaftsart)
  }

  const filteredKommend = kommend.filter(matchesFilter)
  const filteredVergangen = vergangen.filter(matchesFilter)
  const hasFilters = activeFilters.size > 0

  return (
    <div>
      {/* ── Filter Bar ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={11} className="text-[#6b6b6b]" />
          <span className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]">Mannschaft</span>
          {hasFilters && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="ml-auto flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
            >
              <X size={10} /> Zurücksetzen
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allTeams.map(team => {
            const active = activeFilters.has(team)
            return (
              <button
                key={team}
                onClick={() => toggleFilter(team)}
                className={`text-[11px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-all duration-150 ${
                  active
                    ? 'bg-[#0a0a0a] text-[#f5f5f0] border-[#0a0a0a]'
                    : 'bg-transparent text-[#6b6b6b] border-[#0a0a0a]/20 hover:border-[#0a0a0a]/50 hover:text-[#0a0a0a]'
                }`}
              >
                {team}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Kommende Spiele ── */}
      <div className="mb-20">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">
          Kommende Spiele
        </div>
        <div className="space-y-px bg-[#0a0a0a]/10">
          {filteredKommend.map(s => (
            <SpielRow key={s.id} spiel={s} />
          ))}
          {filteredKommend.length === 0 && (
            <div className="bg-[#f5f5f0] p-8 text-[#6b6b6b] text-sm">
              {hasFilters
                ? 'Keine kommenden Spiele für die gewählte Mannschaft.'
                : 'Keine kommenden Spiele gefunden.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Letzte Spiele ── */}
      {vergangen.length > 0 && (
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">
            Letzte Spiele
          </div>
          <div className="space-y-px bg-[#0a0a0a]/10 opacity-60">
            {filteredVergangen.map(s => (
              <SpielRowKompakt key={s.id} spiel={s} />
            ))}
            {filteredVergangen.length === 0 && (
              <div className="bg-[#f5f5f0] p-6 text-[#6b6b6b] text-sm">
                Keine vergangenen Spiele für die gewählte Mannschaft.
              </div>
            )}
          </div>
          <div className="mt-4 text-right">
            <a
              href={`https://www.fussball.de/verein/sv-holm-seppensen-niedersachsen/-/id/00ES8GN7RK00006QVV0AG08LVUPGND5I`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
            >
              Alle Spiele auf fussball.de <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Full row for upcoming games ── */
function SpielRow({ spiel }: { spiel: FussballSpiel }) {
  const date = new Date(spiel.datum + 'T' + spiel.uhrzeit + ':00')

  return (
    <div className="bg-[#f5f5f0] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
      {/* Date Block */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] p-4 text-center shrink-0 w-20">
        <div className="font-display text-3xl leading-none">
          {format(date, 'd')}
        </div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#f5f5f0]/60 mt-1">
          {format(date, 'MMM', { locale: de })}
        </div>
        <div className="text-[10px] text-[#f5f5f0]/40">
          {format(date, 'yyyy')}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] border border-[#0a0a0a]/20 px-2 py-0.5">
            {spiel.mannschaftsart}
          </span>
          <span className="text-[10px] tracking-[0.12em] text-[#6b6b6b] border border-[#0a0a0a]/10 px-2 py-0.5">
            {spiel.liga}
          </span>
          {spiel.heimspiel ? (
            <span className="flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase text-emerald-700 border border-emerald-700/30 px-2 py-0.5">
              <Home size={9} /> Heim
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase text-[#6b6b6b] border border-[#0a0a0a]/10 px-2 py-0.5">
              <Plane size={9} /> Auswärts
            </span>
          )}
        </div>

        <h3 className="font-medium text-lg leading-snug">
          {spiel.heim}
          <span className="text-[#6b6b6b] font-normal mx-2">vs.</span>
          {spiel.gast}
        </h3>
      </div>

      {/* Time + Link */}
      <div className="flex flex-col gap-2 items-start md:items-end shrink-0">
        <span className="text-sm font-medium tabular-nums">{spiel.uhrzeit} Uhr</span>
        {spiel.url && (
          <a
            href={spiel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
          >
            Zum Spiel <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  )
}

/* ── Compact row for past games ── */
function SpielRowKompakt({ spiel }: { spiel: FussballSpiel }) {
  return (
    <div className="bg-[#f5f5f0] p-5 flex flex-wrap items-center gap-2 sm:gap-6">
      <div className="text-sm text-[#6b6b6b] w-28 shrink-0 tabular-nums">
        {format(new Date(spiel.datum), 'd. MMM yyyy', { locale: de })}
      </div>
      <div className="font-medium text-sm flex-1 min-w-0">
        {spiel.heim} <span className="text-[#6b6b6b] font-normal">vs.</span> {spiel.gast}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-[#6b6b6b] border border-[#0a0a0a]/10 px-2 py-0.5">
          {spiel.mannschaftsart}
        </span>
        <span className="text-[10px] text-[#6b6b6b] border border-[#0a0a0a]/10 px-2 py-0.5">
          {spiel.liga}
        </span>
      </div>
      {spiel.url && (
        <a
          href={spiel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  )
}
