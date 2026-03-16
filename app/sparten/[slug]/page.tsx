import { getSparten, getTrainingszeiten } from '@/lib/content'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Mail, Phone, MessageCircle, RefreshCw } from 'lucide-react'
import type { Metadata } from 'next'

/* ── Types ─────────────────────────────────────────────────── */
interface Mannschaft  { name: string; beschreibung: string; foto: string | null }
interface Ansprechpartner {
  name: string; rolle: string; email: string
  telefon: string; whatsapp: string; foto: string | null
}
interface Sparte {
  slug: string; name: string; icon: string; farbe: string
  beschreibung: string; langbeschreibung: string; foto: string | null
  trainingszeiten_spartes: string[]
  mannschaften: Mannschaft[]
  ansprechpartner: Ansprechpartner[]
}
interface TrainingsEntry {
  sparte: string; gruppe: string; tag: string; uhrzeit: string
  ort: string; jahreszeit: string; frequenz: string
  trainer: string; email: string; telefon: string
}

/* ── Static params ─────────────────────────────────────────── */
export async function generateStaticParams() {
  const sparten: Sparte[] = getSparten()
  return sparten.map(s => ({ slug: s.slug }))
}

/* ── Metadata ──────────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const sparte: Sparte | undefined = getSparten().find((s: Sparte) => s.slug === params.slug)
  return { title: sparte ? `${sparte.name} – SV Holm-Seppensen` : 'Sparte' }
}

/* ── Constants ─────────────────────────────────────────────── */
const TAG_SHORT: Record<string, string> = {
  Montag: 'Mo', Dienstag: 'Di', Mittwoch: 'Mi',
  Donnerstag: 'Do', Freitag: 'Fr', Samstag: 'Sa', Sonntag: 'So',
}
const TAG_COLOR: Record<string, string> = {
  Montag: '#2563eb', Dienstag: '#dc2626', Mittwoch: '#16a34a',
  Donnerstag: '#ea580c', Freitag: '#7c3aed', Samstag: '#0891b2', Sonntag: '#db2777',
}
const TAG_ORDER = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

function saisonBadge(j: string) {
  const l = j.toLowerCase()
  if (l === 'sommer') return { label: 'Sommer', bg: '#fef9c3', color: '#92400e' }
  if (l === 'winter') return { label: 'Winter', bg: '#dbeafe', color: '#1e40af' }
  return { label: 'Ganzjährig', bg: '#e5e7eb', color: '#374151' }
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function whatsappHref(phone: string) {
  const num = phone.replace(/\D/g, '').replace(/^0/, '49')
  return `https://wa.me/${num}`
}

/* ── Page ──────────────────────────────────────────────────── */
export default function SparteDetailPage({ params }: { params: { slug: string } }) {
  const sparten: Sparte[]          = getSparten()
  const sparte: Sparte | undefined = sparten.find(s => s.slug === params.slug)
  if (!sparte) notFound()

  const alleZeiten: TrainingsEntry[] = getTrainingszeiten()
  const zeiten = alleZeiten
    .filter(e => (sparte.trainingszeiten_spartes ?? []).includes(e.sparte))

  // Sort by day order within each sub-group
  const sorted = [...zeiten].sort((a, b) => {
    const ai = TAG_ORDER.indexOf(a.tag), bi = TAG_ORDER.indexOf(b.tag)
    return ai - bi
  })

  // Group by sparte sub-name (for multi-sparte like football)
  const multiSparte = (sparte.trainingszeiten_spartes ?? []).length > 1
  const zeitenGruppen = new Map<string, TrainingsEntry[]>()
  sorted.forEach(e => {
    if (!zeitenGruppen.has(e.sparte)) zeitenGruppen.set(e.sparte, [])
    zeitenGruppen.get(e.sparte)!.push(e)
  })

  const farbe = sparte.farbe ?? '#0a0a0a'

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

      {/* Back */}
      <Link
        href="/sparten"
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors mb-14"
      >
        <ArrowLeft size={11} /> Alle Sparten
      </Link>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="mb-14 pl-6" style={{ borderLeft: `3px solid ${farbe}` }}>
        <div className="text-5xl mb-4 leading-none">{sparte.icon}</div>
        <h1 className="font-display text-7xl md:text-[6.5rem] tracking-tight leading-none">
          {sparte.name.toUpperCase()}
        </h1>
        <p className="mt-4 text-lg text-[#6b6b6b] font-light max-w-2xl leading-relaxed">
          {sparte.beschreibung}
        </p>
      </div>

      <div className="h-px bg-[#0a0a0a]/10 mb-12" />

      {/* ── ABOUT ─────────────────────────────────────────────── */}
      <section className="mb-16">
        <p className="text-base leading-[1.8] text-[#4a4a4a] max-w-3xl">
          {sparte.langbeschreibung}
        </p>
      </section>

      {/* ── TEAM PHOTO ────────────────────────────────────────── */}
      {sparte.foto && (
        <section className="mb-16">
          <div className="aspect-[21/9] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sparte.foto}
              alt={`${sparte.name} – Teamfoto`}
              className="w-full h-full object-cover"
            />
          </div>
        </section>
      )}

      {/* ── MANNSCHAFTEN ──────────────────────────────────────── */}
      {sparte.mannschaften?.length > 0 && (
        <section className="mb-16">
          <SectionHeader title="MANNSCHAFTEN & GRUPPEN" farbe={farbe} count={sparte.mannschaften.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10 mt-6">
            {sparte.mannschaften.map((m, i) => (
              <div key={i} className="bg-[#f5f5f0] flex flex-col">
                {/* Photo or placeholder */}
                <div
                  className="aspect-video flex items-center justify-center text-5xl"
                  style={{ background: `${farbe}12` }}
                >
                  {m.foto
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={m.foto} alt={m.name} className="w-full h-full object-cover" />
                    : <span>{sparte.icon}</span>
                  }
                </div>
                <div className="p-5 flex-1">
                  <h3 className="font-medium text-sm mb-2 leading-snug">{m.name}</h3>
                  <p className="text-xs text-[#6b6b6b] leading-relaxed">{m.beschreibung}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TRAININGSZEITEN ───────────────────────────────────── */}
      {sorted.length > 0 && (
        <section className="mb-16">
          <SectionHeader title="TRAININGSZEITEN" farbe={farbe} count={sorted.length} />
          <div className="mt-6 space-y-8">
            {Array.from(zeitenGruppen.entries()).map(([subSparte, entries]) => (
              <div key={subSparte}>
                {multiSparte && (
                  <div
                    className="text-[10px] tracking-[0.22em] uppercase font-medium mb-3 flex items-center gap-2"
                    style={{ color: farbe }}
                  >
                    <span className="w-1 h-1 rounded-full inline-block" style={{ background: farbe }} />
                    {subSparte}
                  </div>
                )}
                <div className="space-y-px" style={{ borderLeft: `2px solid ${farbe}25` }}>
                  {entries.map((e, i) => {
                    const tc = TAG_COLOR[e.tag] ?? '#6b6b6b'
                    const sb = saisonBadge(e.jahreszeit)
                    return (
                      <div
                        key={i}
                        className="bg-[#f5f5f0] hover:bg-white transition-colors pl-4 pr-5 py-3.5 flex items-center gap-4"
                      >
                        {/* Day */}
                        <div
                          className="w-9 h-9 shrink-0 flex items-center justify-center text-white text-[11px] font-semibold tracking-wide rounded-sm"
                          style={{ background: tc }}
                        >
                          {TAG_SHORT[e.tag] ?? e.tag}
                        </div>
                        {/* Center */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{e.gruppe}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#6b6b6b] mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin size={9} className="shrink-0" />{e.ort}
                            </span>
                            <span className="opacity-50">·</span>
                            <RefreshCw size={9} className="shrink-0 opacity-50" />
                            <span>{e.frequenz}</span>
                            {e.uhrzeit && <><span className="opacity-50">·</span><span>{e.uhrzeit} Uhr</span></>}
                          </div>
                        </div>
                        {/* Season */}
                        <span
                          className="shrink-0 hidden sm:inline text-[9px] tracking-[0.15em] uppercase px-2 py-0.5"
                          style={{ background: sb.bg, color: sb.color }}
                        >
                          {sb.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href="/trainingszeiten"
              className="text-[11px] tracking-[0.15em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors underline underline-offset-4"
            >
              Alle Trainingszeiten ansehen →
            </Link>
          </div>
        </section>
      )}

      {/* ── ANSPRECHPARTNER ───────────────────────────────────── */}
      {sparte.ansprechpartner?.length > 0 && (
        <section className="mb-16">
          <SectionHeader title="ANSPRECHPARTNER & TRAINER" farbe={farbe} count={sparte.ansprechpartner.length} />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sparte.ansprechpartner.map((a, i) => (
              <KontaktKarte key={i} person={a} farbe={farbe} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────── */}
      <div
        className="p-8 flex flex-col sm:flex-row sm:items-center gap-6"
        style={{ background: farbe }}
      >
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.2em] uppercase text-white/60 mb-1">Interesse?</div>
          <p className="text-white font-medium">
            Komm einfach zum Probetraining – wir freuen uns auf dich!
          </p>
          <p className="text-white/60 text-sm mt-1">
            Kein Anmeldung nötig. Einfach vorbeikommen.
          </p>
        </div>
        <Link
          href="/ansprechpartner"
          className="shrink-0 inline-flex items-center gap-2 text-[12px] tracking-[0.12em] uppercase bg-white/15 hover:bg-white/25 border border-white/30 px-5 py-3 text-white transition-colors"
        >
          Kontakt aufnehmen
        </Link>
      </div>

    </div>
  )
}

/* ── Section header helper ──────────────────────────────────── */
function SectionHeader({ title, farbe, count }: { title: string; farbe: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: farbe }} />
      <div className="text-[11px] tracking-[0.22em] uppercase font-medium" style={{ color: farbe }}>
        {title}
      </div>
      <div className="flex-1 h-px" style={{ background: `${farbe}25` }} />
      <div className="text-[10px] text-[#6b6b6b] shrink-0">{count}</div>
    </div>
  )
}

/* ── Kontakt card ────────────────────────────────────────────── */
function KontaktKarte({ person, farbe }: { person: Ansprechpartner; farbe: string }) {
  const ini = initials(person.name)
  const hasTel = !!person.telefon
  const waHref = person.whatsapp
    ? whatsappHref(person.whatsapp)
    : hasTel ? whatsappHref(person.telefon) : null

  return (
    <div className="bg-[#f5f5f0] p-5 flex flex-col">
      {/* Avatar */}
      <div className="mb-4">
        {person.foto
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={person.foto}
              alt={person.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-semibold select-none"
              style={{ background: farbe }}
            >
              {ini}
            </div>
          )
        }
      </div>

      {/* Name + Rolle */}
      <div className="font-medium text-sm leading-tight mb-0.5">{person.name}</div>
      <div className="text-[11px] text-[#6b6b6b] mb-4 leading-snug">{person.rolle}</div>

      {/* Contact links */}
      <div className="mt-auto space-y-2">
        {person.email && (
          <a
            href={`mailto:${person.email}`}
            className="flex items-start gap-2 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors group"
          >
            <Mail size={11} className="shrink-0 mt-0.5" />
            <span className="break-all leading-tight">{person.email}</span>
          </a>
        )}
        {hasTel && (
          <a
            href={`tel:${person.telefon.replace(/\s/g, '')}`}
            className="flex items-center gap-2 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
          >
            <Phone size={11} className="shrink-0" />
            {person.telefon}
          </a>
        )}
        {person.whatsapp ? (
          <a
            href={whatsappHref(person.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] text-[#16a34a] hover:text-[#15803d] transition-colors"
          >
            <MessageCircle size={11} className="shrink-0" />
            WhatsApp
          </a>
        ) : hasTel && (
          <a
            href={waHref!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] text-[#6b6b6b] hover:text-[#16a34a] transition-colors"
          >
            <MessageCircle size={11} className="shrink-0" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
