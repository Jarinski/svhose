import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, MapPin, Mail, Phone, MessageCircle, Clock, FileText, Download } from 'lucide-react'
import { getSparteBySlug, type Kontakt, type TeamKarte, type WochentagName } from '@/lib/content'
import { MANNSCHAFT_BEREICHE } from '@/lib/db/schema'

/* ── Rendering ─────────────────────────────────────────────── */
// Die Seite liest bei jedem Aufruf direkt aus der Datenbank –
// Änderungen in der Verwaltung sind damit sofort sichtbar.
export const dynamic = 'force-dynamic'

/* ── Metadaten ─────────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const sparte = await getSparteBySlug(params.slug)
  return { title: sparte ? `${sparte.name} – SV Holm-Seppensen` : 'Sparte' }
}

/* ── Konstanten ────────────────────────────────────────────── */
const TAG_SHORT: Record<WochentagName, string> = {
  Montag: 'Mo', Dienstag: 'Di', Mittwoch: 'Mi',
  Donnerstag: 'Do', Freitag: 'Fr', Samstag: 'Sa', Sonntag: 'So',
}
const TAG_COLOR: Record<WochentagName, string> = {
  Montag: '#2563eb', Dienstag: '#dc2626', Mittwoch: '#16a34a',
  Donnerstag: '#ea580c', Freitag: '#7c3aed', Samstag: '#0891b2', Sonntag: '#db2777',
}

type Bereich = (typeof MANNSCHAFT_BEREICHE)[number]

/** Überschriften der Mannschaftsbereiche; die Reihenfolge kommt aus MANNSCHAFT_BEREICHE. */
const BEREICH_TITEL: Record<Bereich, string> = {
  Herren: 'Herren',
  Damen: 'Damen',
  Junioren: 'Junioren',
  Juniorinnen: 'Juniorinnen',
  Senioren: 'Senioren',
  Freizeit: 'Freizeit / Hobby',
}

/** Mannschaften ohne Bereich stehen am Ende. */
const OHNE_BEREICH = { key: 'ohne-bereich', title: 'Weitere Mannschaften' }

const LOGO = '/SV_Holm_Seppensen_Logo.svg'

/* ── Hilfen ────────────────────────────────────────────────── */
function saisonBadge(j: string) {
  const l = j.toLowerCase()
  if (l.includes('ganz')) return { label: 'Ganzjährig', bg: '#e5e7eb', color: '#374151' }
  if (l === 'sommer') return { label: 'Sommer', bg: '#fef9c3', color: '#92400e' }
  if (l === 'winter') return { label: 'Winter', bg: '#dbeafe', color: '#1e40af' }
  return { label: 'Ganzjährig', bg: '#e5e7eb', color: '#374151' }
}

function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function whatsappHref(phone: string) {
  const num = phone.replace(/\D/g, '').replace(/^0/, '49')
  return `https://wa.me/${num}`
}

function istBereich(bereich: string | null): bereich is Bereich {
  return (MANNSCHAFT_BEREICHE as readonly (string | null)[]).includes(bereich)
}

/**
 * Mannschaften nach Bereich gruppieren. Die Datenschicht liefert sie bereits
 * sortiert (Reihenfolge, dann Name) – filter() behält diese Reihenfolge bei.
 */
function mannschaftenNachBereich(mannschaften: TeamKarte[]) {
  return [
    ...MANNSCHAFT_BEREICHE.map(bereich => ({
      key: bereich as string,
      title: BEREICH_TITEL[bereich],
      mannschaften: mannschaften.filter(m => m.bereich === bereich),
    })),
    { ...OHNE_BEREICH, mannschaften: mannschaften.filter(m => !istBereich(m.bereich)) },
  ].filter(abschnitt => abschnitt.mannschaften.length > 0)
}

/* ── Seite ─────────────────────────────────────────────────── */
export default async function SparteDetailPage({ params }: { params: { slug: string } }) {
  const sparte = await getSparteBySlug(params.slug)
  if (!sparte) notFound()

  const { farbe, mannschaften, gruppen, ansprechpartner, downloads } = sparte
  const isAkrobatik = sparte.slug === 'akrobatik'
  const mannschaftenByBereich = mannschaftenNachBereich(mannschaften)
  const hatTeams = mannschaften.length > 0 || gruppen.length > 0
  const alleTeams = [...mannschaften, ...gruppen]
  const hatTrainingszeiten = alleTeams.some(team => team.trainingszeiten.length > 0)
  // Ansprechpartner:innen, die schon in jeder Team-Karte stehen (z. B. bei der einzigen Gruppe
  // einer Sparte), nicht ein zweites Mal im eigenen Abschnitt zeigen.
  const weitereAnsprechpartner = ansprechpartner.filter(
    a => !(hatTeams && alleTeams.every(team => team.trainer.some(t => t.id === a.id))),
  )

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

      {/* Zurück */}
      <Link
        href="/sparten"
        className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors mb-14"
      >
        <ArrowLeft size={11} /> Alle Sparten
      </Link>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="mb-14 pl-6" style={{ borderLeft: `3px solid ${farbe}` }}>
        {sparte.icon && <div className="text-5xl mb-4 leading-none">{sparte.icon}</div>}
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[6.5rem] tracking-tight leading-none">
          {sparte.name.toUpperCase()}
        </h1>
        {sparte.beschreibung && (
          <p className="mt-4 text-lg text-[#6b6b6b] font-light max-w-2xl leading-relaxed">
            {sparte.beschreibung}
          </p>
        )}
      </div>

      <div className="h-px bg-[#0a0a0a]/10 mb-12" />

      {/* ── ÜBER DIE SPARTE ───────────────────────────────────── */}
      {sparte.langbeschreibung && (
        <section className="mb-16">
          <p className="text-base leading-[1.8] text-[#4a4a4a] max-w-3xl whitespace-pre-line">
            {sparte.langbeschreibung}
          </p>
        </section>
      )}

      {/* ── TEAMFOTO ──────────────────────────────────────────── */}
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

      {/* ── MANNSCHAFTEN & GRUPPEN (mit Trainingszeiten und Trainerteam) ── */}
      {hatTeams && (
        <div className="mb-16">
          <div className="space-y-16">

            {/* Mannschaften, nach Bereich gruppiert */}
            {mannschaften.length > 0 && (
              <section>
                <SectionHeader title="MANNSCHAFTEN" farbe={farbe} count={mannschaften.length} />
                <div className="mt-8 space-y-10">
                  {mannschaftenByBereich.map(abschnitt => (
                    <div key={abschnitt.key}>
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-sm tracking-[0.18em] uppercase font-medium" style={{ color: farbe }}>
                          {abschnitt.title}
                        </h3>
                        <div className="flex-1 h-px" style={{ background: `${farbe}20` }} />
                        <span className="text-[11px] text-[#6b6b6b] shrink-0">{abschnitt.mannschaften.length}</span>
                      </div>

                      <div className="space-y-3">
                        {abschnitt.mannschaften.map(mannschaft => (
                          <MannschaftCard
                            key={`mannschaft-${mannschaft.id}`}
                            team={mannschaft}
                            farbe={farbe}
                            sparteIcon={sparte.icon}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gruppen (Trainings- und Kursgruppen ohne Ligabetrieb) */}
            {gruppen.length > 0 && (
              <section>
                <SectionHeader title="GRUPPEN" farbe={farbe} count={gruppen.length} />
                <div className="mt-8 space-y-3">
                  {gruppen.map(gruppe => (
                    <MannschaftCard
                      key={`gruppe-${gruppe.id}`}
                      team={gruppe}
                      farbe={farbe}
                      sparteIcon={sparte.icon}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {hatTrainingszeiten && (
            <div className="mt-4">
              <Link
                href="/trainingszeiten"
                className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors underline underline-offset-4"
              >
                Alle Trainingszeiten ansehen →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── ANSPRECHPARTNER DER SPARTE ────────────────────────── */}
      {weitereAnsprechpartner.length > 0 && (
        <section className="mb-16">
          <SectionHeader title="ANSPRECHPARTNER" farbe={farbe} count={weitereAnsprechpartner.length} />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            {weitereAnsprechpartner.map(person => (
              <KontaktKarte key={person.id} person={person} farbe={farbe} />
            ))}
          </div>
        </section>
      )}

      {/* ── HINWEIS, wenn weder Teams noch Ansprechpartner gepflegt sind ── */}
      {!hatTeams && ansprechpartner.length === 0 && (
        <section className="mb-16">
          <div className="bg-[#f5f5f0] border border-[#0a0a0a]/10 p-5 sm:p-6 max-w-3xl">
            <p className="text-sm text-[#4a4a4a] leading-relaxed">
              Du möchtest mitmachen oder hast Fragen zum Angebot? Unsere Ansprechpartner:innen im Verein helfen dir gern weiter.
            </p>
            <Link
              href="/ansprechpartner"
              className="mt-3 inline-block text-xs tracking-[0.15em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors underline underline-offset-4"
            >
              Zu den Ansprechpartner:innen →
            </Link>
          </div>
        </section>
      )}

      {/* ── DOWNLOADS ─────────────────────────────────────────── */}
      {downloads.length > 0 && (
        <section className="mb-16">
          <SectionHeader title="DOWNLOADS & FORMULARE" farbe={farbe} count={downloads.length} />
          <div className="mt-6 space-y-px bg-[#0a0a0a]/10">
            {downloads.map((d, i) => (
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
                  {d.beschreibung && (
                    <div className="text-xs text-[#6b6b6b] group-hover:text-[#f5f5f0]/50 mt-0.5">{d.beschreibung}</div>
                  )}
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

/* ── Abschnittsüberschrift ─────────────────────────────────── */
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

/* ── Karte für Mannschaft oder Gruppe (mit Trainingszeiten und Trainerteam) ── */
function MannschaftCard({
  team, farbe, sparteIcon,
}: {
  team: TeamKarte
  farbe: string
  sparteIcon: string
}) {
  const zeiten = team.trainingszeiten
  const trainer = team.trainer
  const hasDetails = zeiten.length > 0 || trainer.length > 0

  return (
    <div className="border border-[#0a0a0a]/[0.08] bg-[#fafaf8] overflow-hidden">

      {/* ── Kartenkopf ── */}
      <div className="p-5 flex gap-4">
        {/* Teambild: 512×320 px (16:10) */}
        <div
          className="w-[512px] h-[320px] shrink-0 flex items-center justify-center text-2xl overflow-hidden"
          style={{ background: `${farbe}12` }}
        >
          {team.foto
            ? /* eslint-disable-next-line @next/next/no-img-element */
              <img src={team.foto} alt={team.name} className="w-full h-full object-cover" />
            : sparteIcon
              ? <span>{sparteIcon}</span>
              : /* eslint-disable-next-line @next/next/no-img-element */
                <img src={LOGO} alt="" aria-hidden="true" className="w-14 h-14 object-contain opacity-20" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-medium text-base leading-tight">{team.name}</h3>
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
          {team.beschreibung && (
            <p className="text-sm text-[#6b6b6b] leading-relaxed whitespace-pre-line">{team.beschreibung}</p>
          )}
          {(team.bereich || team.altersklasse) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {team.bereich && (
                <span className="text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 bg-[#0a0a0a]/5 text-[#6b6b6b]">
                  {team.bereich}
                </span>
              )}
              {team.altersklasse && (
                <span className="text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 bg-[#0a0a0a]/5 text-[#6b6b6b]">
                  {team.altersklasse}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Details ── */}
      {hasDetails && (
        <div className="border-t border-[#0a0a0a]/[0.06] px-5 pb-5 space-y-5">

          {/* Trainingszeiten */}
          {zeiten.length > 0 && (
            <div className="pt-4">
              <div
                className="text-[11px] tracking-[0.18em] uppercase font-medium mb-3"
                style={{ color: farbe }}
              >
                Trainingszeiten
              </div>
              <div className="space-y-2">
                {zeiten.map(z => {
                  const tc = TAG_COLOR[z.tag] ?? '#6b6b6b'
                  const sb = saisonBadge(z.jahreszeit)
                  return (
                    <div key={z.id} className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 flex items-center justify-center text-white text-[11px] font-semibold rounded-sm shrink-0"
                        style={{ background: tc }}
                      >
                        {TAG_SHORT[z.tag] ?? z.tag}
                      </span>
                      <div className="flex-1 min-w-0 text-sm text-[#4a4a4a]">
                        <div className="truncate">
                          {z.ort && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={9} className="shrink-0 text-[#6b6b6b]" />
                              <span className="font-medium">{z.ort}</span>
                            </span>
                          )}
                          <span className="text-[#6b6b6b]">{z.ort ? ' · ' : ''}{z.uhrzeit} Uhr</span>
                          <span className="text-[#6b6b6b]"> · {z.frequenz}</span>
                        </div>
                        {z.hinweis && (
                          <div className="text-xs text-[#6b6b6b] italic mt-0.5">{z.hinweis}</div>
                        )}
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

          {/* Trainerteam */}
          {trainer.length > 0 && (
            <div className={zeiten.length > 0 ? undefined : 'pt-4'}>
              <div
                className="text-[11px] tracking-[0.18em] uppercase font-medium mb-3"
                style={{ color: farbe }}
              >
                Trainer & Ansprechpartner
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
                {trainer.map(t => (
                  <KontaktKarte key={t.id} person={t} farbe={farbe} compact />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

/* ── Kontaktkarte ──────────────────────────────────────────── */
function KontaktKarte({ person, farbe, compact = false }: { person: Kontakt; farbe: string; compact?: boolean }) {
  const displayName = person.name || 'Kontakt'
  const ini = initials(displayName)
  const telefon = person.telefon
  const waHref = person.whatsapp
    ? whatsappHref(person.whatsapp)
    : telefon ? whatsappHref(telefon) : null

  if (compact) {
    return (
      <div className="bg-white border border-[#0a0a0a]/[0.06] p-3 flex gap-2.5 items-start">
        {person.foto
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img src={person.foto} alt={displayName} className="w-[4.5rem] h-[4.5rem] rounded-full object-cover shrink-0" />
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
          <div className="font-medium text-sm leading-tight mb-0.5">{displayName}</div>
          <div className="text-[11px] text-[#6b6b6b] mb-2 leading-snug">{person.rolle}</div>
          <div className="space-y-0.5">
            {person.email && (
              <a href={`mailto:${person.email}`} title={person.email} className="flex items-center gap-1 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors min-w-0">
                <Mail size={9} className="shrink-0" />
                <span className="truncate leading-tight min-w-0">{person.email}</span>
              </a>
            )}
            {telefon && (
              <a href={`tel:${telefon.replace(/\s/g, '')}`} className="flex items-center gap-1 text-[11px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                <Phone size={9} className="shrink-0" />
                {telefon}
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
    <div className="bg-[#f5f5f0] p-5 flex flex-col min-w-0">
      <div className="mb-4">
        {person.foto
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img src={person.foto} alt={displayName} className="w-16 h-16 rounded-full object-cover" />
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

      <div className="font-medium text-base leading-tight mb-0.5">{displayName}</div>
      <div className="text-xs text-[#6b6b6b] mb-4 leading-snug">{person.rolle}</div>

      <div className="mt-auto space-y-2 min-w-0">
        {person.email && (
          <a href={`mailto:${person.email}`} title={person.email} className="flex items-center gap-2 text-xs text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors group min-w-0">
            <Mail size={11} className="shrink-0" />
            <span className="truncate leading-tight min-w-0">{person.email}</span>
          </a>
        )}
        {telefon && (
          <a href={`tel:${telefon.replace(/\s/g, '')}`} className="flex items-center gap-2 text-xs text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
            <Phone size={11} className="shrink-0" />
            {telefon}
          </a>
        )}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 text-xs transition-colors ${
              person.whatsapp ? 'text-[#16a34a] hover:text-[#15803d]' : 'text-[#6b6b6b] hover:text-[#16a34a]'
            }`}
          >
            <MessageCircle size={11} className="shrink-0" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
