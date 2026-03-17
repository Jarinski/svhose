import { getSparteBySlug, getSpartenSlugs, getTrainingszeiten } from '@/lib/content'
import { notFound } from 'next/navigation'

export const revalidate = 60
import Link from 'next/link'
import { ArrowLeft, MapPin, Mail, Phone, MessageCircle, RefreshCw, Clock, FileText, Download } from 'lucide-react'
import type { Metadata } from 'next'

/* ── Types ─────────────────────────────────────────────────── */
interface Mannschaft  { name: string; beschreibung: string; foto: string | null }
interface Ansprechpartner {
  name: string; rolle: string; email: string
  telefon: string; whatsapp: string; foto: string | null
}
interface SparteDownload { titel: string; beschreibung: string; datei: string }
interface Sparte {
  slug: string; name: string; icon: string; farbe: string
  beschreibung: string; langbeschreibung: string; foto: string | null
  trainingszeiten_spartes: string[]
  mannschaften: Mannschaft[]
  ansprechpartner: Ansprechpartner[]
  downloads?: SparteDownload[]
}
interface TrainingsEntry {
  sparte: string; gruppe: string; tag: string; uhrzeit: string
  ort: string; jahreszeit: string; frequenz: string
  trainer: string; email: string; telefon: string
}

/* ── Static params ─────────────────────────────────────────── */
export async function generateStaticParams() {
  const slugs = await getSpartenSlugs()
  return slugs.map(s => ({ slug: s.slug }))
}

/* ── Metadata ──────────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const sparte = await getSparteBySlug(params.slug)
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
  if (l.includes('ganz')) return { label: 'Ganzjährig', bg: '#e5e7eb', color: '#374151' }
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

/* ── Matching helpers (mirrored from SpartenClient) ─────────── */
function keyWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
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
  if (zeiten.length > 0) {
    const names = new Set<string>()
    zeiten.forEach(e => e.trainer.split(',').forEach(t => names.add(t.trim().toLowerCase())))
    const byName = ap.filter(a => names.has(a.name.toLowerCase()))
    if (byName.length > 0) return byName
  }
  const words = keyWords(mann.name)
  if (words.length > 0) {
    const byRole = ap.filter(a => words.some(w => a.rolle.toLowerCase().includes(w)))
    if (byRole.length > 0) return byRole
  }
  return ap.length <= 3 ? ap : []
}

/* ── Page ──────────────────────────────────────────────────── */
export default async function SparteDetailPage({ params }: { params: { slug: string } }) {
  const [sparte, alleZeiten] = await Promise.all([
    getSparteBySlug(params.slug) as Promise<Sparte | null>,
    getTrainingszeiten() as Promise<TrainingsEntry[]>,
  ])
  if (!sparte) notFound()

  const farbe = sparte.farbe ?? '#0a0a0a'
  const isAkrobatik = sparte.slug === 'akrobatik'
  const hasMannschaften = (sparte.mannschaften?.length ?? 0) > 0
  const sparteDownloads: SparteDownload[] = sparte.downloads ?? []

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

      {/* Back */}
      <Link
        href="/sparten"
        className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors mb-14"
      >
        <ArrowLeft size={11} /> Alle Sparten
      </Link>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="mb-14 pl-6" style={{ borderLeft: `3px solid ${farbe}` }}>
        <div className="text-5xl mb-4 leading-none">{sparte.icon}</div>
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[6.5rem] tracking-tight leading-none">
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
          {isAkrobatik ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: farbe }} />
                <h2 className="text-xs tracking-[0.22em] uppercase font-medium" style={{ color: farbe }}>
                  Trainerteam
                </h2>
                <div className="flex-1 h-px" style={{ background: `${farbe}25` }} />
              </div>

              <div className="overflow-hidden border border-[#0a0a0a]/10 bg-[#fafaf8]">
                <div className="aspect-[16/9] sm:aspect-[21/10]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sparte.foto}
                    alt={`${sparte.name} – Trainerteam`}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <p className="px-4 py-3 text-xs text-[#6b6b6b] tracking-[0.08em] uppercase">
                  Unser Trainerteam der Akrobatik
                </p>
              </div>
            </div>
          ) : (
            <div className="aspect-[21/9] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sparte.foto}
                alt={`${sparte.name} – Teamfoto`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {isAkrobatik && (
            <div className="mt-8 bg-[#f5f5f0] border border-[#0a0a0a]/10 p-5 sm:p-6 max-w-3xl mx-auto">
              <h3 className="font-medium text-lg mb-3">Information zu unseren Show-Akrobatik-Gruppen</h3>
              <p className="text-sm text-[#4a4a4a] leading-relaxed mb-3">
                Unsere Akrobatik-Abteilung besteht aus drei eigenständigen Showgruppen:
              </p>
              <ul className="text-sm text-[#4a4a4a] leading-relaxed mb-4 space-y-1">
                <li>• Kids</li>
                <li>• Girls</li>
                <li>• Friends</li>
              </ul>
              <p className="text-sm text-[#4a4a4a] leading-relaxed mb-3">
                Alle Gruppen treten regelmäßig bei Shows auf, die Girls und Friends nehmen auch an Wettbewerben teil. Damit wir gemeinsam tolle Auftritte zeigen können, ist es wichtig, dass alle mit Freude und zuverlässig am Training teilnehmen.
              </p>
              <p className="text-sm text-[#4a4a4a] leading-relaxed mb-3">
                Oft kommt die Frage auf: „Wann darf ich in eine andere Gruppe wechseln?“ Ein Wechsel erfolgt nicht automatisch und es gibt auch keine feste Regel, wann oder nach welchen Kriterien er stattfindet. Jeder Wechsel wird vom Trainerteam individuell entschieden. Dabei berücksichtigen wir verschiedene Faktoren, zum Beispiel:
              </p>
              <ul className="text-sm text-[#4a4a4a] leading-relaxed space-y-1 mb-4">
                <li>• die aktuelle Leistung und Entwicklung,</li>
                <li>• die Trainingsbeteiligung,</li>
                <li>• das Sozialverhalten,</li>
                <li>• die Zusammensetzung der Gruppen (z. B. ob gerade Bases oder Flyer benötigt werden),</li>
                <li>• und auch das Alter (bei manchen Wettbewerben müssen Altersvorgaben eingehalten werden).</li>
              </ul>
              <p className="text-sm text-[#4a4a4a] leading-relaxed">
                So stellen wir sicher, dass jede Gruppe optimal zusammenpasst und alle Kinder die Chance haben, ihr Können zu zeigen und weiter zu wachsen. 💪🤸‍♀️
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── MANNSCHAFTEN (with embedded times + contacts) ─────── */}
      {hasMannschaften && (
        <section className="mb-16">
          <SectionHeader title="MANNSCHAFTEN & GRUPPEN" farbe={farbe} count={sparte.mannschaften.length} />
          <div className="mt-6 space-y-3">
            {sparte.mannschaften.map((mann, i) => {
              const mZeiten  = getZeitenForMannschaft(alleZeiten, sparte.trainingszeiten_spartes ?? [], mann)
              const mTrainer = getTrainerForMannschaft(sparte.ansprechpartner ?? [], mZeiten, mann)
              return (
                <MannschaftCard
                  key={i}
                  mann={mann}
                  zeiten={mZeiten}
                  trainer={mTrainer}
                  farbe={farbe}
                  sparteIcon={sparte.icon}
                />
              )
            })}
          </div>
          <div className="mt-4">
            <Link
              href="/trainingszeiten"
              className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors underline underline-offset-4"
            >
              Alle Trainingszeiten ansehen →
            </Link>
          </div>
        </section>
      )}

      {/* ── FALLBACK: no mannschaften → show contacts + times directly ── */}
      {!hasMannschaften && (
        <>
          {/* Training times */}
          {(sparte.trainingszeiten_spartes?.length ?? 0) > 0 && (() => {
            const zeiten = alleZeiten
              .filter(e => (sparte.trainingszeiten_spartes ?? []).includes(e.sparte))
              .sort((a, b) => TAG_ORDER.indexOf(a.tag) - TAG_ORDER.indexOf(b.tag))
            return zeiten.length > 0 ? (
              <section className="mb-16">
                <SectionHeader title="TRAININGSZEITEN" farbe={farbe} count={zeiten.length} />
                <div className="mt-6 space-y-px" style={{ borderLeft: `2px solid ${farbe}25` }}>
                  {zeiten.map((e, i) => {
                    const tc = TAG_COLOR[e.tag] ?? '#6b6b6b'
                    const sb = saisonBadge(e.jahreszeit)
                    return (
                      <div
                        key={i}
                        className="bg-[#f5f5f0] hover:bg-white transition-colors pl-4 pr-5 py-3.5 flex items-center gap-4"
                      >
                        <div
                          className="w-9 h-9 shrink-0 flex items-center justify-center text-white text-xs font-semibold tracking-wide rounded-sm"
                          style={{ background: tc }}
                        >
                          {TAG_SHORT[e.tag] ?? e.tag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-base truncate">{e.gruppe}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6b6b6b] mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin size={9} className="shrink-0" />{e.ort}
                            </span>
                            <span className="opacity-50">·</span>
                            <RefreshCw size={9} className="shrink-0 opacity-50" />
                            <span>{e.frequenz}</span>
                            {e.uhrzeit && <><span className="opacity-50">·</span><span>{e.uhrzeit} Uhr</span></>}
                          </div>
                        </div>
                        <span
                          className="shrink-0 hidden sm:inline text-[10px] tracking-[0.15em] uppercase px-2 py-0.5"
                          style={{ background: sb.bg, color: sb.color }}
                        >
                          {sb.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4">
                  <Link
                    href="/trainingszeiten"
                    className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors underline underline-offset-4"
                  >
                    Alle Trainingszeiten ansehen →
                  </Link>
                </div>
              </section>
            ) : null
          })()}

          {/* Contacts */}
          {(sparte.ansprechpartner?.length ?? 0) > 0 && (
            <section className="mb-16">
              <SectionHeader title="ANSPRECHPARTNER & TRAINER" farbe={farbe} count={sparte.ansprechpartner.length} />
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sparte.ansprechpartner.map((a, i) => (
                  <KontaktKarte key={i} person={a} farbe={farbe} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── DOWNLOADS ─────────────────────────────────────────── */}
      {sparteDownloads.length > 0 && (
        <section className="mb-16">
          <SectionHeader title="DOWNLOADS & FORMULARE" farbe={farbe} count={sparteDownloads.length} />
          <div className="mt-6 space-y-px bg-[#0a0a0a]/10">
            {sparteDownloads.map((d: SparteDownload, i: number) => (
              <a
                key={i}
                href={d.datei}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#f5f5f0] p-5 flex items-center gap-4 group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-200"
              >
                <FileText size={18} className="text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{d.titel}</div>
                  <div className="text-xs text-[#6b6b6b] group-hover:text-[#f5f5f0]/50 mt-0.5">{d.beschreibung}</div>
                </div>
                <Download size={14} className="text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

/* ── Section header helper ──────────────────────────────────── */
function SectionHeader({ title, farbe, count }: { title: string; farbe: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: farbe }} />
      <div className="text-xs tracking-[0.22em] uppercase font-medium" style={{ color: farbe }}>
        {title}
      </div>
      <div className="flex-1 h-px" style={{ background: `${farbe}25` }} />
      <div className="text-[11px] text-[#6b6b6b] shrink-0">{count}</div>
    </div>
  )
}

/* ── Mannschaft card with embedded times + contacts ─────────── */
function MannschaftCard({
  mann, zeiten, trainer, farbe, sparteIcon,
}: {
  mann: Mannschaft
  zeiten: TrainingsEntry[]
  trainer: Ansprechpartner[]
  farbe: string
  sparteIcon: string
}) {
  const hasDetails = zeiten.length > 0 || trainer.length > 0

  return (
    <div className="border border-[#0a0a0a]/[0.08] bg-[#fafaf8] overflow-hidden">

      {/* ── Card header ── */}
      <div className="p-5 flex gap-4">
        {/* Team image: 512×320 px (16:10 ratio, nochmals verdoppelt) */}
        <div
          className="w-[512px] h-[320px] shrink-0 flex items-center justify-center text-2xl overflow-hidden"
          style={{ background: `${farbe}12` }}
        >
          {mann.foto
            ? /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mann.foto} alt={mann.name} className="w-full h-full object-cover" />
            : <span>{sparteIcon}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-medium text-base leading-tight">{mann.name}</h3>
            {zeiten.length > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5"
                style={{ background: `${farbe}18`, color: farbe }}
              >
                <Clock size={8} className="shrink-0" />
                {zeiten.length} Trainingszeit{zeiten.length !== 1 ? 'en' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6b6b6b] leading-relaxed">{mann.beschreibung}</p>
        </div>
      </div>

      {/* ── Expanded details ── */}
      {hasDetails && (
        <div className="border-t border-[#0a0a0a]/[0.06] px-5 pb-5 space-y-5">

          {/* Training times */}
          {zeiten.length > 0 && (
            <div className="pt-4">
              <div
                className="text-[11px] tracking-[0.18em] uppercase font-medium mb-3"
                style={{ color: farbe }}
              >
                Trainingszeiten
              </div>
              <div className="space-y-2">
                {zeiten.map((z, i) => {
                  const tc = TAG_COLOR[z.tag] ?? '#6b6b6b'
                  const sb = saisonBadge(z.jahreszeit)
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 flex items-center justify-center text-white text-[11px] font-semibold rounded-sm shrink-0"
                        style={{ background: tc }}
                      >
                        {TAG_SHORT[z.tag] ?? z.tag}
                      </span>
                      <div className="flex-1 min-w-0 text-sm text-[#4a4a4a] truncate">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={9} className="shrink-0 text-[#6b6b6b]" />
                          <span className="font-medium">{z.ort}</span>
                        </span>
                        {z.uhrzeit && (
                          <span className="text-[#6b6b6b]"> · {z.uhrzeit} Uhr</span>
                        )}
                        <span className="text-[#6b6b6b]"> · {z.frequenz}</span>
                      </div>
                      <span
                        className="hidden sm:inline text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 shrink-0"
                        style={{ background: sb.bg, color: sb.color }}
                      >
                        {sb.label === 'Ganzjährig' ? 'Ganzj.' : sb.label}
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
              <div
                className="text-[11px] tracking-[0.18em] uppercase font-medium mb-3"
                style={{ color: farbe }}
              >
                Trainer & Ansprechpartner
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {trainer.map((t, i) => (
                  <KontaktKarte key={i} person={t} farbe={farbe} compact />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

/* ── Kontakt card ────────────────────────────────────────────── */
function KontaktKarte({ person, farbe, compact = false }: { person: Ansprechpartner; farbe: string; compact?: boolean }) {
  const ini = initials(person.name)
  const hasTel = !!person.telefon
  const waHref = person.whatsapp
    ? whatsappHref(person.whatsapp)
    : hasTel ? whatsappHref(person.telefon) : null

  if (compact) {
    return (
      <div className="bg-white border border-[#0a0a0a]/[0.06] p-3 flex gap-2.5 items-start">
        {person.foto
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img src={person.foto} alt={person.name} className="w-[4.5rem] h-[4.5rem] rounded-full object-cover shrink-0" />
          : (
            <div
              className="w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 select-none"
              style={{ background: farbe }}
            >
              {ini}
            </div>
          )
        }
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight mb-0.5">{person.name}</div>
          <div className="text-[11px] text-[#6b6b6b] mb-2 leading-snug">{person.rolle}</div>
          <div className="space-y-0.5">
            {person.email && (
              <a href={`mailto:${person.email}`} className="flex items-center gap-1 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                <Mail size={9} className="shrink-0" />
                <span className="break-all leading-tight">{person.email}</span>
              </a>
            )}
            {hasTel && (
              <a href={`tel:${person.telefon.replace(/\s/g, '')}`} className="flex items-center gap-1 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                <Phone size={9} className="shrink-0" />
                {person.telefon}
              </a>
            )}
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#16a34a] hover:text-[#15803d] transition-colors">
                <MessageCircle size={9} className="shrink-0" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#f5f5f0] p-5 flex flex-col">
      <div className="mb-4">
        {person.foto
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img src={person.foto} alt={person.name} className="w-16 h-16 rounded-full object-cover" />
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

      <div className="font-medium text-base leading-tight mb-0.5">{person.name}</div>
      <div className="text-xs text-[#6b6b6b] mb-4 leading-snug">{person.rolle}</div>

      <div className="mt-auto space-y-2">
        {person.email && (
          <a href={`mailto:${person.email}`} className="flex items-start gap-2 text-xs text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors group">
            <Mail size={11} className="shrink-0 mt-0.5" />
            <span className="break-all leading-tight">{person.email}</span>
          </a>
        )}
        {hasTel && (
          <a href={`tel:${person.telefon.replace(/\s/g, '')}`} className="flex items-center gap-2 text-xs text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
            <Phone size={11} className="shrink-0" />
            {person.telefon}
          </a>
        )}
        {person.whatsapp ? (
          <a href={whatsappHref(person.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#16a34a] hover:text-[#15803d] transition-colors">
            <MessageCircle size={11} className="shrink-0" />
            WhatsApp
          </a>
        ) : hasTel && (
          <a href={waHref!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#6b6b6b] hover:text-[#16a34a] transition-colors">
            <MessageCircle size={11} className="shrink-0" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
