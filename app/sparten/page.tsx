import { getSparten } from '@/lib/content'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sparten' }

export default function SpartenPage() {
  const sparten = getSparten()

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Was wir anbieten</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">SPARTEN</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
        {sparten.map((s: any) => (
          <Link
            key={s.slug}
            href={`/sparten/${s.slug}`}
            className="bg-[#f5f5f0] p-8 group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-300 flex flex-col"
          >
            <span className="text-4xl mb-6">{s.icon}</span>
            <h2 className="font-display text-3xl tracking-tight mb-3">{s.name}</h2>
            <p className="text-sm text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 leading-relaxed flex-1">{s.beschreibung}</p>
            <div className="mt-6 flex items-center gap-2 text-xs tracking-[0.1em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Mehr erfahren <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
