import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import NewsKarten from '@/components/foerderverein/NewsKarten'
import { getAllNews } from '@/lib/content'
import { FOERDERVEREIN, istFoerderverein } from '@/lib/foerderverein'

// News mit der Kategorie "Förderverein" (lib/foerderverein.ts) – alle, neueste zuerst.

export const metadata: Metadata = {
  title: 'Aktuelles – Förderverein',
  description: 'Aktionen und Neuigkeiten aus dem Förderverein Sportplatz des SV Holm-Seppensen e.V.',
}

// News frisch aus der Datenbank
export const dynamic = 'force-dynamic'

export default async function FoerdervereinAktuellesPage() {
  const news = (await getAllNews()).filter(n => istFoerderverein(n.category))

  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Förderverein</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">AKTUELLES</h1>
        <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed">Aktionen und Neuigkeiten aus dem Förderverein.</p>
      </div>

      <Unternavigation aktiv="/foerderverein/aktuelles" />

      <div className="px-6 max-w-7xl mx-auto">
        {news.length > 0 ? (
          <NewsKarten news={news} />
        ) : (
          <div className="border border-[#0a0a0a]/10 p-8 md:p-12 max-w-2xl">
            <h2 className="font-display text-3xl tracking-tight mb-3">NOCH KEINE MELDUNGEN</h2>
            <p className="text-[#6b6b6b] leading-relaxed mb-6">
              Sobald es Neuigkeiten gibt, stehen sie hier. Fragen an den Förderverein beantwortet er gern per E-Mail an{' '}
              <a href={`mailto:${FOERDERVEREIN.email}`} className="underline underline-offset-4 hover:text-[#0a0a0a]">
                {FOERDERVEREIN.email}
              </a>
              .
            </p>
            <Link href="/news" className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]">
              Zu den News des Vereins <ArrowRight size={14} className="shrink-0" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
