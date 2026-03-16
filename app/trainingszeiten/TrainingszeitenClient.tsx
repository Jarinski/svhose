'use client'

import { useState, useMemo } from 'react'
import { MapPin, Mail, Phone, User, RotateCcw } from 'lucide-react'

interface TrainingsEntry {
  sparte: string
  gruppe: string
  tag: string
  uhrzeit: string
  ort: string
  jahreszeit: string
  frequenz: string
  trainer: string
  email: string
  telefon: string
}

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

function normJahreszeit(j: string) {
  const l = j.toLowerCase()
  if (l === 'ganzjährig') return 'ganzjährig'
  if (l === 'sommer') return 'Sommer'
  if (l === 'winter') return 'Winter'
  return j
}

export default function TrainingszeitenClient({ data }: { data: TrainingsEntry[] }) {
  const [activeSparte, setActiveSparte] = useState<string>('Alle')
  const [activeTag, setActiveTag] = useState<string>('Alle')
  const [activeJahreszeit, setActiveJahreszeit] = useState<string>('Alle')

  // Unique sorted spartes in JSON order (preserving first occurrence)
  const spartes = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    data.forEach(e => { if (!seen.has(e.sparte)) { seen.add(e.sparte); list.push(e.sparte) } })
    return list
  }, [data])

  const availableTags = useMemo(
    () => TAG_ORDER.filter(t => data.some(e => e.tag === t)),
    [data]
  )

  const filtered = useMemo(() => {
    return data.filter(e => {
      const norm = normJahreszeit(e.jahreszeit)
      return (
        (activeSparte === 'Alle' || e.sparte === activeSparte) &&
        (activeTag === 'Alle' || e.tag === activeTag) &&
        (activeJahreszeit === 'Alle' || norm === activeJahreszeit)
      )
    })
  }, [data, activeSparte, activeTag, activeJahreszeit])

  // Group filtered entries by sparte (preserving order)
  const grouped = useMemo(() => {
    const map = new Map<string, TrainingsEntry[]>()
    filtered.forEach(e => {
      if (!map.has(e.sparte)) map.set(e.sparte, [])
      map.get(e.sparte)!.push(e)
    })
    return map
  }, [filtered])

  const hasActiveFilter = activeSparte !== 'Alle' || activeTag !== 'Alle' || activeJahreszeit !== 'Alle'

  function clearAll() {
    setActiveSparte('Alle')
    setActiveTag('Alle')
    setActiveJahreszeit('Alle')
  }

  return (
    <div>
      {/* ── FILTER BAR ─────────────────────────────────────────── */}
      <div className="mb-12 space-y-6">

        {/* Sparte */}
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-2.5">Sparte</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="Alle"
              active={activeSparte === 'Alle'}
              activeColor="#0a0a0a"
              onClick={() => setActiveSparte('Alle')}
            />
            {spartes.map(s => (
              <FilterChip
                key={s}
                label={s}
                count={data.filter(e => e.sparte === s).length}
                active={activeSparte === s}
                activeColor={SPARTE_COLOR[s] ?? '#0a0a0a'}
                onClick={() => setActiveSparte(activeSparte === s ? 'Alle' : s)}
              />
            ))}
          </div>
        </div>

        {/* Tag + Saison row */}
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-2.5">Wochentag</div>
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
            <div className="text-[10px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-2.5">Saison</div>
            <div className="flex flex-wrap gap-2">
              {(['Alle', 'ganzjährig', 'Sommer', 'Winter'] as const).map(j => {
                const style = SAISON_STYLE[j as keyof typeof SAISON_STYLE]
                const isActive = activeJahreszeit === j
                return (
                  <button
                    key={j}
                    onClick={() => setActiveJahreszeit(activeJahreszeit === j && j !== 'Alle' ? 'Alle' : j)}
                    className="text-[11px] tracking-[0.08em] uppercase px-3 py-1.5 border transition-all duration-150"
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
          <span className="text-xs text-[#6b6b6b]">
            <span className="font-medium text-[#0a0a0a]">{filtered.length}</span>{' '}
            Trainingseinheit{filtered.length !== 1 ? 'en' : ''} in{' '}
            <span className="font-medium text-[#0a0a0a]">{grouped.size}</span>{' '}
            Sparte{grouped.size !== 1 ? 'n' : ''}
          </span>
          {hasActiveFilter && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-[11px] tracking-wide text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
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
            const color = SPARTE_COLOR[sparte] ?? '#0a0a0a'
            return (
              <div key={sparte}>
                {/* Sparte header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <div
                    className="text-[11px] tracking-[0.22em] uppercase font-medium shrink-0"
                    style={{ color }}
                  >
                    {sparte}
                  </div>
                  <div className="flex-1 h-px" style={{ background: `${color}25` }} />
                  <div className="text-[10px] text-[#6b6b6b] shrink-0">
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
                        className="group bg-[#f5f5f0] hover:bg-white transition-colors duration-150 ml-0 pl-5 pr-5 py-4 grid gap-3"
                        style={{ gridTemplateColumns: '2.5rem 1fr auto' }}
                      >
                        {/* Day badge */}
                        <div
                          className="w-10 h-10 flex items-center justify-center text-white text-[11px] font-semibold tracking-wider rounded-sm shrink-0"
                          style={{ background: tagColor }}
                        >
                          {TAG_SHORT[e.tag] ?? e.tag}
                        </div>

                        {/* Center: group + location + frequency */}
                        <div className="min-w-0 flex flex-col justify-center gap-1">
                          <div className="font-medium text-sm leading-snug truncate">{e.gruppe}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#6b6b6b]">
                            <span className="flex items-center gap-1">
                              <MapPin size={9} className="shrink-0" />
                              <span className="truncate">{e.ort}</span>
                            </span>
                            <span className="opacity-60">·</span>
                            <span>{e.frequenz}</span>
                            {e.uhrzeit && (
                              <>
                                <span className="opacity-60">·</span>
                                <span>{e.uhrzeit} Uhr</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: season + trainer */}
                        <div className="shrink-0 flex flex-col items-end justify-center gap-1.5">
                          {/* Season badge */}
                          <span
                            className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 whitespace-nowrap"
                            style={{ background: saisonStyle.bg, color: saisonStyle.color }}
                          >
                            {norm === 'ganzjährig' ? 'Ganzjährig' : norm}
                          </span>

                          {/* Trainer */}
                          <div className="text-right space-y-0.5">
                            <div className="flex items-center justify-end gap-1 text-[10px] text-[#6b6b6b]">
                              <User size={9} className="shrink-0" />
                              <span className="max-w-[180px] truncate leading-tight">{e.trainer}</span>
                            </div>
                            {e.email && (
                              <a
                                href={`mailto:${e.email}`}
                                className="flex items-center justify-end gap-1 text-[10px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
                              >
                                <Mail size={9} className="shrink-0" />
                                <span className="max-w-[180px] truncate">{e.email}</span>
                              </a>
                            )}
                            {e.telefon && (
                              <div className="flex items-center justify-end gap-1 text-[10px] text-[#6b6b6b]">
                                <Phone size={9} className="shrink-0" />
                                <span>{e.telefon}</span>
                              </div>
                            )}
                          </div>
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
      className="flex items-center gap-1.5 text-[11px] tracking-[0.08em] uppercase px-3 py-1.5 border transition-all duration-150"
      style={
        active
          ? { background: activeColor, borderColor: activeColor, color: '#f5f5f0' }
          : { background: 'transparent', borderColor: 'rgba(10,10,10,0.15)', color: '#0a0a0a' }
      }
    >
      {label}
      {count !== undefined && (
        <span
          className="text-[9px] opacity-70"
          style={active ? { color: 'rgba(245,245,240,0.7)' } : {}}
        >
          {count}
        </span>
      )}
    </button>
  )
}
