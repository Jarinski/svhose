import Link from 'next/link'
import { getAllNews, getTermine, getSparten } from '@/lib/content'
import { ArrowRight, Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import HeroBanner from '@/components/HeroBanner'

export default async function HomePage() {
  const [newsAll, termine, sparten] = await Promise.all([
    getAllNews(),
    getTermine(),
    getSparten(),
  ])
  const news = newsAll.slice(0, 3)
  const termineSliced = termine.slice(0, 3)

  return (
    <>
      {/* HERO */}
      <HeroBanner />

      {/* SPARTEN TICKER */}
      <section className="bg-[#0a0a0a] border-t border-[#f5f5f0]/10 overflow-hidden py-4">
        <div className="animate-ticker flex gap-12 whitespace-nowrap">
          {[...sparten, ...sparten].map((s: any, i: number) => (
            <span key={i} className="font-display text-lg text-[#f5f5f0]/40 tracking-widest uppercase shrink-0">
              {s.icon} {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* NEWS */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Aktuelles</div>
            <h2 className="font-display text-5xl md:text-7xl tracking-tight">NEWS</h2>
          </div>
          <Link href="/news" className="hidden sm:flex items-center gap-2 text-sm tracking-[0.08em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
            Alle News <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          {news.map((post) => (
            <Link key={post.slug} href={`/news/${post.slug}`} className="bg-[#f5f5f0] p-8 group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-300">
              <div className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] group-hover:text-[#f5f5f0]/50 mb-4">
                {post.category} — {format(new Date(post.date), 'd. MMM yyyy', { locale: de })}
              </div>
              <h3 className="font-display text-2xl tracking-tight leading-tight mb-4">{post.title}</h3>
              <p className="text-sm text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 leading-relaxed">{post.excerpt}</p>
              <div className="mt-6 flex items-center gap-2 text-xs tracking-[0.1em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                Lesen <ArrowRight size={12} />
              </div>
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
            {termineSliced.map((t: any) => (
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
                  <div className="flex items-center gap-1 text-xs text-[#6b6b6b]">
                    <MapPin size={11} />
                    {t.ort}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="text-xs tracking-[0.15em] uppercase border border-[#f5f5f0]/20 px-3 py-1 text-[#6b6b6b]">
                    {t.uhrzeit} Uhr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPARTEN GRID */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="mb-12">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Was wir bieten</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tight">SPARTEN</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-px bg-[#0a0a0a]/10">
          {sparten.map((s: any) => (
            <Link
              key={s.slug}
              href={`/sparten/${s.slug}`}
              className="bg-[#f5f5f0] p-4 group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-200 flex flex-col items-center text-center gap-2 py-6"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-[11px] tracking-[0.1em] uppercase font-medium">{s.name}</span>
            </Link>
          ))}
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
