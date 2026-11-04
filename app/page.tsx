import Link from 'next/link'
import { getAllNews, getTermine, getSparten, getMannschaftenAnzahl } from '@/lib/content'
import { ArrowRight, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import HeroBanner from '@/components/HeroBanner'
import NewsThumbnail from '@/components/NewsThumbnail'
import SpartenBand from '@/components/startseite/SpartenBand'
import StartseiteA from '@/components/vorschau/a/StartseiteA'
import StartseiteB from '@/components/vorschau/b/StartseiteB'
import { heuteInBerlin } from '@/lib/vorschau'
import { vorschauDesign } from '@/lib/vorschau-server'
import { FOERDERVEREIN_MENUE, istFoerderverein } from '@/lib/foerderverein'

// Liest bei jedem Aufruf direkt aus der Datenbank – neue News und Termine sind sofort sichtbar.
export const dynamic = 'force-dynamic'

/** Kacheln für „Wichtiges auf einen Blick“ unter den News */
const AUF_EINEN_BLICK = [
  { titel: 'Mitglied werden', text: 'Aufnahmeantrag herunterladen, ausfüllen und abgeben – schon bist du dabei.', knopf: 'Zum Antrag', href: '/downloads' },
  { titel: 'Sportangebot', text: 'Von Fußball über Judo bis Yoga: Finde die Sparte, die zu dir passt.', knopf: 'Sparten ansehen', href: '/sparten' },
  { titel: 'Trainingszeiten', text: 'Wann und wo trainiert wird – alle Gruppen auf einen Blick.', knopf: 'Zu den Zeiten', href: '/trainingszeiten' },
  { titel: 'Ansprechpartner', text: 'Für jede Sparte und jede Frage gibt es bei uns die richtige Person.', knopf: 'Zum Kontakt', href: '/ansprechpartner' },
  { titel: 'Sportplätze', text: 'Plätze und Hallen in Holm-Seppensen – mit Adresse und Anfahrt.', knopf: 'Zu den Plätzen', href: '/sportplaetze' },
  { titel: 'Förderverein', text: 'Der Förderverein unterstützt Projekte, Ausstattung und Nachwuchs im Verein.', knopf: 'Mehr erfahren', href: '/foerderverein' },
]

/** "18:30" → "18:30 Uhr"; Freitext wie "ganztägig" bleibt unverändert. */
function uhrzeitLabel(uhrzeit: string) {
  return /^\d/.test(uhrzeit) && !/uhr/i.test(uhrzeit) ? `${uhrzeit} Uhr` : uhrzeit
}

export default async function HomePage() {
  const [newsAll, termine, sparten, design] = await Promise.all([
    getAllNews(),
    getTermine(),
    getSparten(),
    vorschauDesign(),
  ])

  // Design-Vorschau (lib/vorschau.ts): eigene Startseite für Design A bzw. B
  if (design) {
    const heute = heuteInBerlin()
    const daten = {
      news: newsAll,
      termine: termine.filter(t => t.datum >= heute),
      sparten,
      zahlen: { sparten: sparten.length, mannschaften: await getMannschaftenAnzahl() },
      heute,
    }
    return design === 'a' ? <StartseiteA daten={daten} /> : <StartseiteB daten={daten} />
  }

  const news = newsAll.slice(0, 6)
  const fvNews = newsAll.find(n => istFoerderverein(n.category))
  const heuteStr = new Date().toISOString().slice(0, 10)
  const termineSliced = termine.filter(t => t.datum >= heuteStr).slice(0, 3)

  return (
    <>
      {/* HERO */}
      <HeroBanner />

      {/* SPARTEN TICKER */}
      <section className="bg-[#0a0a0a] border-t border-[#f5f5f0]/10 overflow-hidden py-4">
        <div className="animate-ticker flex gap-12 whitespace-nowrap">
          {[...sparten, ...sparten].map((s, i) => (
            <span key={i} className="font-display text-lg text-[#f5f5f0]/40 tracking-widest uppercase shrink-0">
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* NEWS – über die volle Breite; md:px-20 hält rechts Abstand zur festen Seitenleiste */}
      <section className="py-24 px-6 md:px-20">
        <div className="mb-12">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Aktuelles</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tight">NEWS</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
          {news.map((post, i) => (
            // Auf dem Handy reichen drei Beiträge, sonst wird die Startseite sehr lang
            <Link key={post.slug} href={`/news/${post.slug}`} className={`group flex-col ${i >= 3 ? 'hidden sm:flex' : 'flex'}`}>
              <div className="relative">
                <NewsThumbnail
                  bild={post.image}
                  alt={post.title}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span className="absolute left-3 bottom-3 bg-[#0a0a0a]/80 text-[#f5f5f0] text-[10px] tracking-[0.15em] uppercase px-2.5 py-1">
                  {post.sparte}
                </span>
              </div>
              <div className="mt-5 text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]">
                {format(new Date(post.date), 'd. MMMM yyyy', { locale: de })}
              </div>
              <h3 className="mt-2 font-display text-2xl md:text-[1.75rem] tracking-tight leading-[1.05] group-hover:underline decoration-1 underline-offset-4">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="mt-3 text-sm text-[#6b6b6b] leading-relaxed line-clamp-4">{post.excerpt}</p>
              )}
              <span className="mt-5 self-start inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-4 py-2 text-[11px] tracking-[0.15em] uppercase transition-colors group-hover:bg-[#333]">
                Weiterlesen <ArrowRight size={12} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-14">
          <Link href="/news" className="inline-flex items-center gap-2 border border-[#0a0a0a] px-6 py-3 text-xs tracking-[0.15em] uppercase font-medium hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-colors">
            Alle News <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* AUF EINEN BLICK */}
      {/* Geht ohne eigenen unteren Abstand in die ebenfalls schwarzen Termine über */}
      <section className="pt-24 pb-4 px-6 md:px-20 bg-[#0a0a0a] text-[#f5f5f0]">
        <div className="mb-12">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Service</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tight">WICHTIGES AUF EINEN BLICK</h2>
        </div>
        {/* Auf dem Handy nur Titel mit Pfeil, sonst werden sechs Kacheln untereinander sehr lang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
          {AUF_EINEN_BLICK.map(k => (
            <Link key={k.href} href={k.href} className="group flex flex-col bg-[#f5f5f0] text-[#0a0a0a] px-5 py-4 sm:p-7 md:p-9">
              <h3 className="flex items-center justify-between gap-4 font-display text-2xl sm:text-3xl md:text-4xl tracking-tight">
                {k.titel}
                <ArrowRight size={18} aria-hidden="true" className="sm:hidden shrink-0" />
              </h3>
              <p className="hidden sm:block mt-3 mb-8 text-sm text-[#6b6b6b] leading-relaxed">{k.text}</p>
              <span className="hidden sm:inline-flex mt-auto self-start items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-5 py-2.5 text-[11px] tracking-[0.15em] uppercase transition-colors group-hover:bg-[#333]">
                {k.knopf} <ArrowRight size={12} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* TERMINE */}
      <section className="py-24 px-6 bg-[#0a0a0a] text-[#f5f5f0]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Kalender</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tight">TERMINE</h2>
            </div>
            <Link href="/termine" className="hidden sm:flex items-center gap-2 text-sm tracking-[0.08em] uppercase text-[#6b6b6b] hover:text-[#f5f5f0] transition-colors">
              Alle Termine <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-px">
            {termineSliced.map(t => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 py-6 border-b border-[#f5f5f0]/10 group">
                <div className="shrink-0 w-16">
                  <div className="font-display text-3xl leading-none">
                    {format(new Date(t.datum), 'd', { locale: de })}
                  </div>
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] mt-1">
                    {format(new Date(t.datum), 'MMM', { locale: de })}
                  </div>
                </div>
                <div className="w-px h-10 bg-[#f5f5f0]/10 hidden sm:block shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-[#f5f5f0] mb-1">{t.titel}</h3>
                  {t.ort && (
                    <div className="flex items-center gap-1 text-xs text-[#6b6b6b]">
                      <MapPin size={11} />
                      {t.ort}
                    </div>
                  )}
                </div>
                {t.uhrzeit && (
                  <div className="shrink-0">
                    <span className="text-xs tracking-[0.15em] uppercase border border-[#f5f5f0]/20 px-3 py-1 text-[#6b6b6b]">
                      {uhrzeitLabel(t.uhrzeit)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPARTEN – geschlossenes Band über die volle Breite */}
      <section className="py-24 px-6 md:px-20">
        <div className="mb-12">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Was wir bieten</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tight">SPARTEN</h2>
        </div>
        <SpartenBand sparten={sparten} />
      </section>

      {/* FÖRDERVEREIN */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#0a0a0a]/10 border border-[#0a0a0a]/10">
          <div className="bg-[#f5f5f0] p-8 sm:p-12 flex flex-col">
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Gemeinsam für Holm-Seppensen</div>
            <h2 className="font-display text-5xl md:text-7xl tracking-tight mb-6 break-words">FÖRDERVEREIN</h2>
            <p className="text-[#6b6b6b] leading-relaxed max-w-md mb-8">
              Der Förderverein Sportplatz hat über Jahre Spenden gesammelt und mit angepackt, damit der SV seinen Rasenplatz am Tostedter Weg
              bekommt – und der Ausbau geht weiter.
            </p>
            {fvNews && (
              <Link
                href={`/news/${fvNews.slug}`}
                className="group block border-l-2 border-[#0a0a0a] pl-4 mb-8 max-w-md"
              >
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-1">
                  Neu vom Förderverein — {format(new Date(fvNews.date), 'd. MMM yyyy', { locale: de })}
                </div>
                <div className="font-display text-xl tracking-tight leading-tight group-hover:underline underline-offset-4">{fvNews.title}</div>
              </Link>
            )}
            <div className="mt-auto flex flex-wrap gap-3">
              <Link href="/foerderverein/mitglied-werden" className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors">
                Mitglied werden <ArrowRight size={16} className="shrink-0" />
              </Link>
              <Link href="/foerderverein" className="inline-flex items-center gap-2 border border-[#0a0a0a]/20 px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:border-[#0a0a0a] transition-colors">
                Mehr erfahren
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#0a0a0a]/10">
            {FOERDERVEREIN_MENUE.kinder.map(k => (
              <Link
                key={k.href}
                href={k.href}
                className="bg-[#f5f5f0] group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-300 p-6 sm:p-8 min-h-[9rem] flex flex-col justify-between"
              >
                <h3 className="font-display text-2xl tracking-tight">{k.label}</h3>
                <ArrowRight size={16} className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="bg-[#0a0a0a] text-[#f5f5f0] p-8 sm:p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-4xl md:text-6xl tracking-tight mb-3">MACH MIT.</h2>
            <p className="text-[#6b6b6b] max-w-md">Werde Teil unserer Gemeinschaft. Lade den Aufnahmeantrag herunter oder kontaktiere uns direkt.</p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <Link href="/downloads" className="inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white transition-colors">
              Aufnahmeantrag <ArrowRight size={16} />
            </Link>
            <Link href="/ansprechpartner" className="inline-flex items-center justify-center gap-2 border border-[#f5f5f0]/30 text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase hover:border-[#f5f5f0] transition-colors">
              Kontakt
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
