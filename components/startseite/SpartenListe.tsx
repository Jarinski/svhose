import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { SparteUebersicht } from '@/lib/content'

/**
 * Sparten auf der Startseite als kompakte Textliste – Fotos zeigt erst die Übersicht unter /sparten.
 * Jede Zeile trägt einen Punkt in der Akzentfarbe der Sparte.
 */
export default function SpartenListe({ sparten }: { sparten: SparteUebersicht[] }) {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Was wir bieten</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tight">SPARTEN</h2>
        </div>
        <Link href="/sparten" className="hidden sm:flex items-center gap-2 text-sm tracking-[0.08em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
          Alle Sparten <ArrowRight size={14} />
        </Link>
      </div>

      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 md:gap-x-10 border-t border-[#0a0a0a]/10">
        {sparten.map(s => (
          <li key={s.slug} className="border-b border-[#0a0a0a]/10">
            <Link
              href={`/sparten/${s.slug}`}
              className="group flex items-center gap-3 py-4 md:py-5"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.farbe }} aria-hidden="true" />
              <span className="font-display text-xl md:text-3xl tracking-tight leading-none flex-1 min-w-0 transition-transform duration-300 group-hover:translate-x-1">
                {s.name}
              </span>
              <ArrowRight
                size={18}
                className="hidden md:block shrink-0 text-[#6b6b6b] opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#0a0a0a]"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/sparten" className="sm:hidden mt-8 inline-flex items-center gap-2 border border-[#0a0a0a] px-6 py-3 text-xs tracking-[0.15em] uppercase font-medium">
        Alle Sparten <ArrowRight size={14} />
      </Link>
    </section>
  )
}
