'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Sparte {
  slug: string
  name: string
  icon: string
  farbe: string
  beschreibung: string
}

export default function SpartenClient({ sparten }: { sparten: Sparte[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
      {sparten.map(sparte => {
        const farbe = sparte.farbe ?? '#0a0a0a'

        return (
          <Link
            key={sparte.slug}
            href={`/sparten/${sparte.slug}`}
            className="group relative overflow-hidden border border-[#0a0a0a]/10 bg-[#fafaf8] p-6 min-h-[220px] flex flex-col transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_45px_rgba(10,10,10,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0a0a0a]"
            aria-label={`${sparte.name} ansehen`}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: farbe, opacity: 0.75 }}
            />

            <div className="flex items-start justify-between gap-5">
              <div
                className="w-16 h-16 flex items-center justify-center text-4xl shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{ background: `${farbe}14` }}
                aria-hidden="true"
              >
                {sparte.icon}
              </div>
              <ArrowRight
                size={18}
                className="mt-1 text-[#6b6b6b] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#0a0a0a]"
                aria-hidden="true"
              />
            </div>

            <div className="mt-8 flex-1">
              <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-none">
                {sparte.name}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#6b6b6b]">
                {sparte.beschreibung}
              </p>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-medium" style={{ color: farbe }}>
              Mehr erfahren <ArrowRight size={12} aria-hidden="true" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
