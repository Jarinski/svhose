'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { MapPin, Clock, Tag, X } from 'lucide-react'

interface Termin {
  id: string
  titel: string
  datum: string
  uhrzeit: string
  ort: string
  sparte: string
  beschreibung: string
  bild?: string
  tags?: string[]
}

export default function TermineClient({ termine }: { termine: Termin[] }) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const heute = new Date()

  /* ── Collect all unique filter values (sparte + tags) ── */
  const allFilters = useMemo(() => {
    const set = new Set<string>()
    termine.forEach(t => {
      set.add(t.sparte)
      t.tags?.forEach(tag => set.add(tag))
    })
    return Array.from(set).sort()
  }, [termine])

  /* ── Toggle a filter chip ── */
  function toggleFilter(value: string) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  function clearFilters() {
    setActiveFilters(new Set())
  }

  /* ── Apply filters ── */
  function matchesFilter(t: Termin): boolean {
    if (activeFilters.size === 0) return true
    const termineValues = new Set([t.sparte, ...(t.tags ?? [])])
    return Array.from(activeFilters).some(f => termineValues.has(f))
  }

  const kommend = termine.filter(t => new Date(t.datum) >= heute && matchesFilter(t))
  const vergangen = termine.filter(t => new Date(t.datum) < heute && matchesFilter(t))

  const hasActiveFilters = activeFilters.size > 0

  return (
    <div>
      {/* ── Filter Bar ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={11} className="text-[#6b6b6b]" />
          <span className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]">Filtern nach</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
            >
              <X size={10} /> Zurücksetzen
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allFilters.map(filter => {
            const isActive = activeFilters.has(filter)
            return (
              <button
                key={filter}
                onClick={() => toggleFilter(filter)}
                className={`text-[11px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0a0a0a] text-[#f5f5f0] border-[#0a0a0a]'
                    : 'bg-transparent text-[#6b6b6b] border-[#0a0a0a]/20 hover:border-[#0a0a0a]/50 hover:text-[#0a0a0a]'
                }`}
              >
                {filter}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Kommende Termine ── */}
      <div className="mb-20">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Kommende Termine</div>
        <div className="space-y-px bg-[#0a0a0a]/10">
          {kommend.map(t => (
            <div key={t.id} className="bg-[#f5f5f0] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              {/* Datum Block */}
              <div className="bg-[#0a0a0a] text-[#f5f5f0] p-4 text-center shrink-0 w-20">
                <div className="font-display text-3xl leading-none">
                  {format(new Date(t.datum), 'd')}
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#f5f5f0]/60 mt-1">
                  {format(new Date(t.datum), 'MMM', { locale: de })}
                </div>
                <div className="text-[10px] text-[#f5f5f0]/40">
                  {format(new Date(t.datum), 'yyyy')}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {/* Sparte + Tags */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] border border-[#0a0a0a]/20 px-2 py-0.5">
                    {t.sparte}
                  </span>
                  {t.tags?.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleFilter(tag)}
                      className={`text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border transition-all duration-150 ${
                        activeFilters.has(tag)
                          ? 'bg-[#0a0a0a] text-[#f5f5f0] border-[#0a0a0a]'
                          : 'text-[#6b6b6b] border-[#0a0a0a]/10 hover:border-[#0a0a0a]/30 hover:text-[#0a0a0a]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <h3 className="font-medium text-lg mb-2">{t.titel}</h3>
                <p className="text-sm text-[#6b6b6b]">{t.beschreibung}</p>
              </div>

              <div className="flex flex-col gap-2 text-xs text-[#6b6b6b] shrink-0">
                <span className="flex items-center gap-1"><Clock size={11} /> {t.uhrzeit} Uhr</span>
                <span className="flex items-start gap-1">
                  <MapPin size={11} className="mt-0.5 shrink-0" />
                  <span className="max-w-[200px]">{t.ort}</span>
                </span>
              </div>
            </div>
          ))}
          {kommend.length === 0 && (
            <div className="bg-[#f5f5f0] p-8 text-[#6b6b6b] text-sm">
              {hasActiveFilters
                ? 'Keine kommenden Termine für die gewählten Filter.'
                : 'Keine kommenden Termine eingetragen.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Vergangene Termine ── */}
      {(vergangen.length > 0 || (hasActiveFilters && termine.filter(t => new Date(t.datum) < heute).length > 0)) && (
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Vergangene Termine</div>
          <div className="space-y-px bg-[#0a0a0a]/10 opacity-50">
            {vergangen.map(t => (
              <div key={t.id} className="bg-[#f5f5f0] p-6 flex flex-wrap items-center gap-2 sm:gap-6">
                <div className="text-sm text-[#6b6b6b] w-24 shrink-0">
                  {format(new Date(t.datum), 'd. MMM yyyy', { locale: de })}
                </div>
                <div className="font-medium text-sm flex-1 min-w-0">{t.titel}</div>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b] border border-[#0a0a0a]/10 px-2 py-0.5">
                    {t.sparte}
                  </div>
                  {t.tags?.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-widest text-[#6b6b6b] border border-[#0a0a0a]/10 px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {vergangen.length === 0 && (
              <div className="bg-[#f5f5f0] p-6 text-[#6b6b6b] text-sm">
                Keine vergangenen Termine für die gewählten Filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
