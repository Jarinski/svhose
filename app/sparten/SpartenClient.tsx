'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, MapPin, Mail, Phone, MessageCircle, ArrowRight, Clock,
} from 'lucide-react'

/* ─────────────────────────────────────────────── Types ── */
interface Mannschaft {
  name: string
  beschreibung: string
  foto: string | null
}
interface Ansprechpartner {
  name: string
  rolle: string
  email: string
  telefon: string
  whatsapp: string
  foto: string | null
}
interface Sparte {
  slug: string
  name: string
  icon: string
  farbe: string
  beschreibung: string
  langbeschreibung: string
  foto: string | null
  trainingszeiten_spartes: string[]
  mannschaften: Mannschaft[]
  ansprechpartner: Ansprechpartner[]
}
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

/* ─────────────────────────────────────────── Constants ── */
const TAG_SHORT: Record<string, string> = {
  Montag: 'Mo', Dienstag: 'Di', Mittwoch: 'Mi',
  Donnerstag: 'Do', Freitag: 'Fr', Samstag: 'Sa', Sonntag: 'So',
}
const TAG_COLOR: Record<string, string> = {
  Montag: '#2563eb', Dienstag: '#dc2626', Mittwoch: '#16a34a',
  Donnerstag: '#ea580c', Freitag: '#7c3aed', Samstag: '#0891b2', Sonntag: '#db2777',
}
const TAG_ORDER = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

/* ─────────────────────────────────────────────── Utils ── */
function normSaison(j: string): string {
  const l = j.toLowerCase()
  if (l.includes('ganz')) return 'ganzjährig'
  if (l === 'sommer') return 'Sommer'
  if (l === 'winter') return 'Winter'
  return j
}

function saisonStyle(s: string): { bg: string; color: string } {
  const m: Record<string, { bg: string; color: string }> = {
    ganzjährig: { bg: '#e5e7eb', color: '#374151' },
    Sommer:     { bg: '#fef9c3', color: '#92400e' },
    Winter:     { bg: '#dbeafe', color: '#1e40af' },
  }
  return m[s] ?? m['ganzjährig']
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '49')}`
}

/** Extract meaningful tokens from a display name for fuzzy matching */
function keyWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')       // strip parentheticals
    .split(/[\s/\-,·]+/)
    .map(w => w.replace(/[^a-z0-9äöüß]/g, ''))
    .filter(w => w.length > 2)
}

function getZeitenForMannschaft(
  allZeiten: TrainingsEntry[],
  sparteSlugs: string[],
  mann: Mannschaft,
): TrainingsEntry[] {
  const base = allZeiten.filter(e => sparteSlugs.includes(e.sparte))
  const words = keyWords(mann.name)
  if (!words.length) return base
  const matched = base.filter(e => {
    const g = e.gruppe.toLowerCase()
    return words.some(w => g.includes(w))
  })
  return matched.sort((a, b) => TAG_ORDER.indexOf(a.tag) - TAG_ORDER.indexOf(b.tag))
}

function getTrainerForMannschaft(
  ap: Ansprechpartner[],
  zeiten: TrainingsEntry[],
  mann: Mannschaft,
): Ansprechpartner[] {
  // 1) match by trainer name listed in Trainingszeiten
  if (zeiten.length > 0) {
    const names = new Set<string>()
    zeiten.forEach(e => e.trainer.split(',').forEach(t => names.add(t.trim().toLowerCase())))
    const byName = ap.filter(a => names.has(a.name.toLowerCase()))
    if (byName.length > 0) return byName
  }
  // 2) match by role containing mannschaft key words
  const words = keyWords(mann.name)
  if (words.length > 0) {
    const byRole = ap.filter(a => words.some(w => a.rolle.toLowerCase().includes(w)))
    if (byRole.length > 0) return byRole
  }
  // 3) fallback: show all if sparte has ≤3 contacts
  return ap.length <= 3 ? ap : []
}

/* ═══════════════════════════════════════ Main component ═══ */
export default function SpartenClient({
  sparten,
  trainingszeiten,
}: {
  sparten: Sparte[]
  trainingszeiten: TrainingsEntry[]
}) {
  const [openSparte, setOpenSparte] = useState<string | null>(null)

  return (
    <div className="divide-y divide-[#0a0a0a]/10 border-t border-[#0a0a0a]/10">
      {sparten.map(sparte => {
        const isOpen = openSparte === sparte.slug
        const farbe  = sparte.farbe ?? '#0a0a0a'

        return (
          <div key={sparte.slug}>

            {/* ── Accordion trigger ── */}
            <button
              onClick={() => setOpenSparte(isOpen ? null : sparte.slug)}
              aria-expanded={isOpen}
              className="w-full text-left py-6 flex items-center gap-4 sm:gap-5 group"
            >
              {/* Color bar */}
              <div
                className="w-[3px] h-12 shrink-0 rounded-full transition-opacity duration-300"
                style={{ background: farbe, opacity: isOpen ? 1 : 0.35 }}
              />

              {/* Icon */}
              <span className="text-3xl shrink-0 leading-none">{sparte.icon}</span>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <h2 className="font-display text-2xl md:text-3xl tracking-tight leading-tight group-hover:opacity-80 transition-opacity">
                    {sparte.name}
                  </h2>
                  <div className="flex gap-1.5 flex-wrap">
                    {(sparte.mannschaften?.length ?? 0) > 0 && (
                      <span
                        className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5"
                        style={{ background: `${farbe}18`, color: farbe }}
                      >
                        {sparte.mannschaften.length} {sparte.mannschaften.length === 1 ? 'Gruppe' : 'Gruppen'}
                      </span>
                    )}
                    {(sparte.ansprechpartner?.length ?? 0) > 0 && (
                      <span
                        className="hidden sm:inline text-[9px] tracking-[0.15em] uppercase px-2 py-0.5"
                        style={{ background: `${farbe}18`, color: farbe }}
                      >
                        {sparte.ansprechpartner.length} Trainer
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#6b6b6b] mt-0.5 leading-snug line-clamp-1 pr-4">
                  {sparte.beschreibung}
                </p>
              </div>

              {/* Chevron */}
              <ChevronDown
                size={18}
                className="shrink-0 text-[#6b6b6b] transition-transform duration-300"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* ── Accordion body ── */}
            <div
              className="grid overflow-hidden"
              style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.4s ease-in-out',
              }}
            >
              <div className="overflow-hidden">
                <div
                  className="ml-[3px] pl-6 sm:pl-10 pb-10 border-l-2"
                  style={{ borderColor: `${farbe}30` }}
                >
                  {/* Long description */}
                  <p className="text-sm leading-relaxed text-[#4a4a4a] mb-8 max-w-3xl pt-3">
                    {sparte.langbeschreibung}
                  </p>

                  {/* ── Mannschaften / Gruppen ── */}
                  {(sparte.mannschaften?.length ?? 0) > 0 ? (
                    <div className="mb-8">
                      <SectionLabel
                        label="Gruppen & Mannschaften"
                        farbe={farbe}
                        count={sparte.mannschaften.length}
                      />
                      <div className="mt-4 space-y-2">
                        {sparte.mannschaften.map((mann, i) => {
                          const mZeiten  = getZeitenForMannschaft(trainingszeiten, sparte.trainingszeiten_spartes ?? [], mann)
                          const mTrainer = getTrainerForMannschaft(sparte.ansprechpartner ?? [], mZeiten, mann)
                          return (
                            <MannschaftCard
                              key={i}
                              mann={mann}
                              zeiten={mZeiten}
                              trainer={mTrainer}
                              farbe={farbe}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    /* No mannschaften → show contacts + times directly */
                    <>
                      {(sparte.ansprechpartner?.length ?? 0) > 0 && (
                        <div className="mb-8">
                          <SectionLabel
                            label="Ansprechpartner & Trainer"
                            farbe={farbe}
                            count={sparte.ansprechpartner.length}
                          />
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sparte.ansprechpartner.map((a, i) => (
                              <KontaktMini key={i} person={a} farbe={farbe} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Link to full detail page ── */}
                  <div className="flex justify-end pt-4 border-t border-[#0a0a0a]/8">
                    <Link
                      href={`/sparten/${sparte.slug}`}
                      className="inline-flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 transition-all duration-200 hover:brightness-90"
                      style={{ background: `${farbe}18`, color: farbe }}
                    >
                      Alle Details <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════ MannschaftCard ═══════ */
function MannschaftCard({
  mann, zeiten, trainer, farbe,
}: {
  mann: Mannschaft
  zeiten: TrainingsEntry[]
  trainer: Ansprechpartner[]
  farbe: string
}) {
  const [open, setOpen]      = useState(false)
  const hasDetails           = zeiten.length > 0 || trainer.length > 0
  const trainerPreview       = trainer.slice(0, 2).map(t => t.name.split(' ')[0]).join(', ')
  const trainerMore          = trainer.length > 2 ? ` +${trainer.length - 2}` : ''

  return (
    <div className="border border-[#0a0a0a]/[0.08] bg-[#fafaf8] overflow-hidden">

      {/* ── Card header ── */}
      <button
        onClick={() => hasDetails && setOpen(p => !p)}
        className={`w-full text-left p-4 flex items-start gap-3 transition-colors duration-150 ${
          hasDetails ? 'hover:bg-white cursor-pointer' : 'cursor-default'
        }`}
      >
        <div
          className="w-[2px] self-stretch min-h-[1.25rem] rounded-full shrink-0"
          style={{ background: `${farbe}55` }}
        />

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-sm leading-tight">{mann.name}</span>

            {zeiten.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] text-[#6b6b6b] bg-[#0a0a0a]/[0.05] px-1.5 py-0.5">
                <Clock size={8} className="shrink-0" />
                {zeiten.length} Trainingszeit{zeiten.length !== 1 ? 'en' : ''}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-[#6b6b6b] leading-relaxed">{mann.beschreibung}</p>

          {/* Trainer preview */}
          {trainerPreview && (
            <p className="text-[10px] text-[#6b6b6b] mt-1.5 italic">
              {trainerPreview}{trainerMore}
            </p>
          )}
        </div>

        {hasDetails && (
          <ChevronDown
            size={14}
            className="shrink-0 mt-0.5 text-[#6b6b6b] transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>

      {/* ── Card expanded body ── */}
      <div
        className="grid overflow-hidden"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease-in-out',
        }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-5 border-t border-[#0a0a0a]/[0.06] space-y-5">

            {/* Training times */}
            {zeiten.length > 0 && (
              <div className="pt-4">
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#6b6b6b] mb-3 font-medium">
                  Trainingszeiten
                </div>
                <div className="space-y-2">
                  {zeiten.map((z, i) => {
                    const tc   = TAG_COLOR[z.tag] ?? '#6b6b6b'
                    const norm = normSaison(z.jahreszeit)
                    const ss   = saisonStyle(norm)
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        {/* Day badge */}
                        <span
                          className="w-7 h-7 flex items-center justify-center text-white text-[10px] font-semibold rounded-sm shrink-0"
                          style={{ background: tc }}
                        >
                          {TAG_SHORT[z.tag] ?? z.tag}
                        </span>

                        {/* Location + meta */}
                        <div className="flex-1 min-w-0 text-xs text-[#4a4a4a] truncate">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={9} className="shrink-0 text-[#6b6b6b]" />
                            <span className="font-medium">{z.ort}</span>
                          </span>
                          {z.uhrzeit && (
                            <span className="text-[#6b6b6b]"> · {z.uhrzeit} Uhr</span>
                          )}
                          <span className="text-[#6b6b6b]"> · {z.frequenz}</span>
                        </div>

                        {/* Season pill */}
                        <span
                          className="hidden sm:inline text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 shrink-0"
                          style={{ background: ss.bg, color: ss.color }}
                        >
                          {norm === 'ganzjährig' ? 'Ganzj.' : norm}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trainer / Ansprechpartner */}
            {trainer.length > 0 && (
              <div>
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#6b6b6b] mb-3 font-medium">
                  Trainer & Ansprechpartner
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {trainer.map((t, i) => (
                    <KontaktMini key={i} person={t} farbe={farbe} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  )
}

/* ══════════════════════════════════════ SectionLabel ═══════ */
function SectionLabel({
  label, farbe, count,
}: {
  label: string
  farbe: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: farbe }} />
      <span className="text-[11px] tracking-[0.22em] uppercase font-medium shrink-0" style={{ color: farbe }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: `${farbe}25` }} />
      {count !== undefined && (
        <span className="text-[10px] text-[#6b6b6b] shrink-0">{count}</span>
      )}
    </div>
  )
}

/* ══════════════════════════════════════ KontaktMini ════════ */
function KontaktMini({
  person, farbe,
}: {
  person: Ansprechpartner
  farbe: string
}) {
  const ini     = initials(person.name)
  const hasTel  = !!person.telefon
  const waPhone = person.whatsapp || (hasTel ? person.telefon : '')
  const waHref  = waPhone ? whatsappHref(waPhone) : null

  return (
    <div className="bg-white border border-[#0a0a0a]/[0.06] p-3 flex gap-2.5 items-start">
      {/* Avatar */}
      {person.foto
        ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.foto}
            alt={person.name}
            className="w-[72px] h-[72px] rounded-full object-cover shrink-0"
          />
        )
        : (
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 select-none"
            style={{ background: farbe }}
          >
            {ini}
          </div>
        )
      }

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs leading-tight mb-0.5">{person.name}</div>
        <div className="text-[10px] text-[#6b6b6b] mb-2 leading-snug">{person.rolle}</div>

        <div className="space-y-0.5">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="flex items-center gap-1 text-[10px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
            >
              <Mail size={9} className="shrink-0" />
              <span className="truncate">{person.email}</span>
            </a>
          )}
          {hasTel && (
            <a
              href={`tel:${person.telefon.replace(/\s/g, '')}`}
              className="flex items-center gap-1 text-[10px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
            >
              <Phone size={9} className="shrink-0" />
              {person.telefon}
            </a>
          )}
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#16a34a] hover:text-[#15803d] transition-colors"
            >
              <MessageCircle size={9} className="shrink-0" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
