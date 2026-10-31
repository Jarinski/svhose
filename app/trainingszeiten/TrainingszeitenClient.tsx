'use client'

import { useState, useMemo } from 'react'
import { MapPin, Mail, Phone, User, RotateCcw, Info } from 'lucide-react'
import type { TrainingsEintrag } from '@/lib/content'

const TAG_ORDER = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

const TAG_SHORT: Record<string, string> = {
  Montag: 'Mo', Dienstag: 'Di', Mittwoch: 'Mi',
  Donnerstag: 'Do', Freitag: 'Fr', Samstag: 'Sa', Sonntag: 'So',
}

const TAG_COLOR: Record<string, string> = {
  Montag:     '#2563eb',
  Dienstag:   '#dc2626',
  Mittwoch:   '#16a34a',
  Donnerstag: '#ea580c',
  Freitag:    '#7c3aed',
  Samstag:    '#0891b2',
  Sonntag:    '#db2777',
}

const SAISON_STYLE: Record<string, { bg: string; color: string }> = {
  ganzjährig: { bg: '#e5e7eb', color: '#374151' },
  Sommer:     { bg: '#fef9c3', color: '#92400e' },
  Winter:     { bg: '#dbeafe', color: '#1e40af' },
}

/** Fallback, falls für eine Sparte keine Farbe in der Datenbank gepflegt ist. */
const SPARTE_COLOR: Record<string, string> = {
  'Akrobatik':           '#9333ea',
  'Badminton':           '#2563eb',
  'Bogenschießen':       '#16a34a',
  'Dart':                '#dc2626',
  'Fitness':             '#db2777',
  'Fußball Damen':       '#e11d48',
  'Fußball Herren':      '#0369a1',
  'Fußball Juniorinnen': '#7c3aed',
  'Fußball Junioren':    '#059669',
  'Fußball Freizeit':    '#d97706',
  'Judo':                '#b91c1c',
  'Kinderturnen':        '#ea580c',
  'Mutter-Kind Turnen':  '#be185d',
  'Nordic Walking':      '#15803d',
  'Sportabzeichen':      '#ca8a04',
  'Tischtennis':         '#0284c7',
  'Volleyball':          '#7c3aed',
}

const STANDARD_FARBE = '#0a0a0a'

function normJahreszeit(j: string) {
  const l = j.toLowerCase()
  if (l === 'ganzjährig') return 'ganzjährig'
  if (l === 'sommer') return 'Sommer'
  if (l === 'winter') return 'Winter'
  return j
}

export default function TrainingszeitenClient({ data }: { data: TrainingsEintrag[] }) {
  const [activeSparte, setActiveSparte] = useState<string>('Alle')
  const [activeTag, setActiveTag] = useState<string>('Alle')
  const [activeJahreszeit, setActiveJahreszeit] = useState<string>('Alle')
  const [activeJahrgang, setActiveJahrgang] = useState<number | null>(null)

  // Sparten in der Reihenfolge der Daten (erstes Vorkommen zählt)
  const spartes = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    data.forEach(e => { if (!seen.has(e.sparte)) { seen.add(e.sparte); list.push(e.sparte) } })
    return list
  }, [data])

  // Akzentfarbe je Sparte: aus der Datenbank, sonst feste Tabelle, sonst Standardfarbe
  const sparteFarben = useMemo(() => {
    const map = new Map<string, string>()
    data.forEach(e => {
      if (!map.has(e.sparte) && e.farbe) map.set(e.sparte, e.farbe)
    })
    return map
  }, [data])

  function sparteFarbe(sparte: string): string {
    return sparteFarben.get(sparte) ?? SPARTE_COLOR[sparte] ?? STANDARD_FARBE
  }

  const availableTags = useMemo(
    () => TAG_ORDER.filter(t => data.some(e => e.tag === t)),
    [data]
  )

  // Jahrgänge der gewählten Sparte, neueste zuerst. Ohne gewählte Sparte gibt es keinen
  // Jahrgangsfilter – quer über alle Sparten wäre die Liste nur eine Wand aus Jahreszahlen.
  const jahrgaenge = useMemo(() => {
    if (activeSparte === 'Alle') return []
    const anzahl = new Map<number, number>()
    data.forEach(e => {
      if (e.sparte !== activeSparte) return
      e.jahrgaenge.forEach(j => anzahl.set(j, (anzahl.get(j) ?? 0) + 1))
    })
    return Array.from(anzahl.entries())
      .map(([jahr, count]) => ({ jahr, count }))
      .sort((a, b) => b.jahr - a.jahr)
  }, [data, activeSparte])

  const filtered = useMemo(() => {
    return data.filter(e => {
      const norm = normJahreszeit(e.jahreszeit)
      return (
        (activeSparte === 'Alle' || e.sparte === activeSparte) &&
        (activeTag === 'Alle' || e.tag === activeTag) &&
        (activeJahreszeit === 'Alle' || norm === activeJahreszeit) &&
        (activeJahrgang === null || e.jahrgaenge.includes(activeJahrgang))
      )
    })
  }, [data, activeSparte, activeTag, activeJahreszeit, activeJahrgang])

  // Group filtered entries by sparte (preserving order)
  const grouped = useMemo(() => {
    const map = new Map<string, TrainingsEintrag[]>()
    filtered.forEach(e => {
      if (!map.has(e.sparte)) map.set(e.sparte, [])
      map.get(e.sparte)!.push(e)
    })
    return map
  }, [filtered])

  const hasActiveFilter =
    activeSparte !== 'Alle' || activeTag !== 'Alle' || activeJahreszeit !== 'Alle' || activeJahrgang !== null

  function waehleSparte(sparte: string) {
    setActiveSparte(sparte)
    // Der gewählte Jahrgang gehört zur bisherigen Sparte und passt in der neuen meist nicht.
    setActiveJahrgang(null)
  }

  function clearAll() {
    waehleSparte('Alle')
    setActiveTag('Alle')
    setActiveJahreszeit('Alle')
  }

  return (
    <div>
      {/* ── FILTER BAR ─────────────────────────────────────────── */}
      <div className="mb-12 space-y-6">

        {/* Sparte */}
        <div>
          <div className="text-[11px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-2.5">Sparte</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="Alle"
              active={activeSparte === 'Alle'}
              activeColor="#0a0a0a"
              onClick={() => waehleSparte('Alle')}
            />
            {spartes.map(s => (
              <FilterChip
                key={s}
                label={s}
                count={data.filter(e => e.sparte === s).length}
                active={activeSparte === s}
                activeColor={sparteFarbe(s)}
                onClick={() => waehleSparte(activeSparte === s ? 'Alle' : s)}
              />
            ))}
          </div>
        </div>

        {/* Jahrgang – nur, wenn die gewählte Sparte Jahrgänge hat (z. B. Fußball-Jugend) */}
        {jahrgaenge.length > 0 && (
          <div>
            <div className="text-[11px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-2.5">Jahrgang</div>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Alle"
                active={activeJahrgang === null}
                activeColor="#0a0a0a"
                onClick={() => setActiveJahrgang(null)}
              />
              {jahrgaenge.map(({ jahr, count }) => (
                <FilterChip
                  key={jahr}
                  label={String(jahr)}
                  count={count}
                  active={activeJahrgang === jahr}
                  activeColor={sparteFarbe(activeSparte)}
                  onClick={() => setActiveJahrgang(activeJahrgang === jahr ? null : jahr)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tag + Saison row */}
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <div className="text-[11px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-2.5">Wochentag</div>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Alle"
                active={activeTag === 'Alle'}
                activeColor="#0a0a0a"
                onClick={() => setActiveTag('Alle')}
              />
              {availableTags.map(t => (
                <FilterChip
                  key={t}
                  label={TAG_SHORT[t]}
                  active={activeTag === t}
                  activeColor={TAG_COLOR[t]}
                  onClick={() => setActiveTag(activeTag === t ? 'Alle' : t)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-2.5">Saison</div>
            <div className="flex flex-wrap gap-2">
              {(['Alle', 'ganzjährig', 'Sommer', 'Winter'] as const).map(j => {
                const style = SAISON_STYLE[j as keyof typeof SAISON_STYLE]
                const isActive = activeJahreszeit === j
                return (
                  <button
                    key={j}
                    onClick={() => setActiveJahreszeit(activeJahreszeit === j && j !== 'Alle' ? 'Alle' : j)}
                    className="text-xs tracking-[0.08em] uppercase px-3 py-1.5 border transition-all duration-150"
                    style={
                      isActive && style
                        ? { background: style.bg, borderColor: style.color, color: style.color, fontWeight: 500 }
                        : isActive
                        ? { background: '#0a0a0a', borderColor: '#0a0a0a', color: '#f5f5f0' }
                        : { background: 'transparent', borderColor: 'rgba(10,10,10,0.15)', color: '#0a0a0a' }
                    }
                  >
                    {j === 'Alle' ? 'Alle' : j === 'ganzjährig' ? 'Ganzjährig' : j}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center gap-4 pt-1 border-t border-[#0a0a0a]/8">
          <span className="text-sm text-[#6b6b6b]">
            <span className="font-medium text-[#0a0a0a]">{filtered.length}</span>{' '}
            Trainingseinheit{filtered.length !== 1 ? 'en' : ''} in{' '}
            <span className="font-medium text-[#0a0a0a]">{grouped.size}</span>{' '}
            Sparte{grouped.size !== 1 ? 'n' : ''}
          </span>
          {hasActiveFilter && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-xs tracking-wide text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
            >
              <RotateCcw size={11} />
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* ── RESULTS ─────────────────────────────────────────────── */}
      {grouped.size === 0 ? (
        <div className="py-20 text-center">
          <div className="text-3xl mb-3 opacity-30">—</div>
          <p className="text-sm text-[#6b6b6b]">Keine Einträge für diese Filter gefunden.</p>
          <button onClick={clearAll} className="mt-4 text-xs underline underline-offset-4 text-[#6b6b6b] hover:text-[#0a0a0a]">
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {Array.from(grouped.entries()).map(([sparte, entries]) => {
            const color = sparteFarbe(sparte)
            return (
              <div key={sparte}>
                {/* Sparte header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <div
                    className="text-xs tracking-[0.22em] uppercase font-medium shrink-0"
                    style={{ color }}
                  >
                    {sparte}
                  </div>
                  <div className="flex-1 h-px" style={{ background: `${color}25` }} />
                  <div className="text-[11px] text-[#6b6b6b] shrink-0">
                    {entries.length} Einheit{entries.length !== 1 ? 'en' : ''}
                  </div>
                </div>

                {/* Entries */}
                <div className="space-y-px" style={{ borderLeft: `2px solid ${color}30` }}>
                  {entries.map((e, i) => {
                    const tagColor = TAG_COLOR[e.tag] ?? '#6b6b6b'
                    const norm = normJahreszeit(e.jahreszeit)
                    const saisonStyle = SAISON_STYLE[norm] ?? SAISON_STYLE['ganzjährig']

                    return (
                      <div
                        key={i}
                        className="group bg-[#f5f5f0] hover:bg-white transition-colors duration-150 pl-5 pr-5 py-4"
                      >
                        {/* Top row: day badge + center info + right column (sm+) */}
                        <div className="flex items-center gap-3">
                          {/* Day badge */}
                          <div
                            className="w-10 h-10 flex items-center justify-center text-white text-xs font-semibold tracking-wider rounded-sm shrink-0"
                            style={{ background: tagColor }}
                          >
                            {TAG_SHORT[e.tag] ?? e.tag}
                          </div>

                          {/* Center: group + location + frequency */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium text-base leading-snug">{e.gruppe}</div>
                              {/* Season badge – visible on sm+ only */}
                              <span
                                className="hidden sm:inline text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 whitespace-nowrap shrink-0"
                                style={{ background: saisonStyle.bg, color: saisonStyle.color }}
                              >
                                {norm === 'ganzjährig' ? 'Ganzjährig' : norm}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6b6b6b]">
                              {e.ort && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <MapPin size={9} className="shrink-0" />
                                    <span className="truncate">{e.ort}</span>
                                  </span>
                                  <span className="opacity-60">·</span>
                                </>
                              )}
                              <span>{e.frequenz}</span>
                              {e.uhrzeit && (
                                <>
                                  <span className="opacity-60">·</span>
                                  <span>{e.uhrzeit} Uhr</span>
                                </>
                              )}
                            </div>
                            {/* Hinweis, z. B. "ab Februar" */}
                            {e.hinweis && (
                              <div className="flex items-center gap-1 text-xs text-[#0a0a0a]/80">
                                <Info size={9} className="shrink-0" />
                                <span>{e.hinweis}</span>
                              </div>
                            )}
                          </div>

                          {/* Right: trainer info – hidden on mobile */}
                          <div className="hidden sm:flex shrink-0 flex-col items-end justify-center gap-1" style={{ maxWidth: '240px' }}>
                            {e.trainer && (
                              <div className="flex items-center gap-1 text-[11px] text-[#6b6b6b]">
                                <User size={9} className="shrink-0" />
                                <span className="leading-tight text-right">{e.trainer}</span>
                              </div>
                            )}
                            {e.email && (
                              <a
                                href={`mailto:${e.email}`}
                                className="flex items-center gap-1 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
                              >
                                <Mail size={9} className="shrink-0" />
                                <span className="break-all text-right">{e.email}</span>
                              </a>
                            )}
                            {e.telefon && (
                              <div className="flex items-center gap-1 text-[11px] text-[#6b6b6b]">
                                <Phone size={9} className="shrink-0" />
                                <span>{e.telefon}</span>
                              </div>
                            )}
                          </div>

                        </div>

                        {/* Mobile-only second row: season + trainer info */}
                        <div className="sm:hidden mt-2 ml-[3.25rem] flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span
                            className="text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 whitespace-nowrap"
                            style={{ background: saisonStyle.bg, color: saisonStyle.color }}
                          >
                            {norm === 'ganzjährig' ? 'Ganzjährig' : norm}
                          </span>
                          {e.trainer && (
                            <div className="flex items-center gap-1 text-[11px] text-[#6b6b6b]">
                              <User size={9} className="shrink-0" />
                              <span className="truncate max-w-[200px]">{e.trainer}</span>
                            </div>
                          )}
                          {e.email && (
                            <a
                              href={`mailto:${e.email}`}
                              className="flex items-center gap-1 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
                            >
                              <Mail size={9} className="shrink-0" />
                              <span className="break-all">{e.email}</span>
                            </a>
                          )}
                          {e.telefon && (
                            <div className="flex items-center gap-1 text-[11px] text-[#6b6b6b]">
                              <Phone size={9} className="shrink-0" />
                              <span>{e.telefon}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Small reusable chip ────────────────────────────────────────
function FilterChip({
  label,
  count,
  active,
  activeColor,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  activeColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs tracking-[0.08em] uppercase px-3 py-1.5 border transition-all duration-150"
      style={
        active
          ? { background: activeColor, borderColor: activeColor, color: '#f5f5f0' }
          : { background: 'transparent', borderColor: 'rgba(10,10,10,0.15)', color: '#0a0a0a' }
      }
    >
      {label}
      {count !== undefined && (
        <span
          className="text-[10px] opacity-70"
          style={active ? { color: 'rgba(245,245,240,0.7)' } : {}}
        >
          {count}
        </span>
      )}
    </button>
  )
}
