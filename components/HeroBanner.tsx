'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function HeroBanner() {
  return (
    <section className="relative min-h-[50vh] flex flex-col justify-end pb-10 pt-20 px-6 overflow-hidden bg-[#0a0a0a]">

      {/* ── VIDEO HINTERGRUND ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          src="/videos/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '56.25vw',
            minWidth: '177.78vh',
            minHeight: '100%',
            transform: 'translate(-50%, -50%)',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      </div>
      {/* Dunkles Overlay für Lesbarkeit */}
      <div className="absolute inset-0 bg-[#0a0a0a]/60 z-[1]" />

      {/* ── INHALT ── */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="animate-fade-up stagger-1">
          <span className="inline-block text-[10px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.3em] uppercase text-[#6b6b6b] mb-8 border border-[#f5f5f0]/20 px-3 sm:px-4 py-2 rounded-full max-w-full">
            SV Holm-Seppensen e.V. — Gegründet in der Lüneburger Heide
          </span>
        </div>
        <h1 className="font-display text-[clamp(4rem,12vw,11rem)] leading-[0.9] text-[#f5f5f0] tracking-tight animate-fade-up stagger-2">
          GEMEINSAM<br />
          <span className="text-[#f5f5f0]/30">STARK.</span>
        </h1>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-up stagger-3">
          <Link
            href="/sparten"
            className="inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white transition-colors"
          >
            Unsere Sparten <ArrowRight size={16} />
          </Link>
          <Link
            href="/downloads"
            className="inline-flex items-center gap-2 border border-[#f5f5f0]/30 text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:border-[#f5f5f0] transition-colors"
          >
            Aufnahmeantrag
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-4 sm:gap-8 max-w-sm animate-fade-up stagger-4">
          {[
            { num: '14', label: 'Sparten' },
            { num: '∞', label: 'Leidenschaft' },
            { num: '1', label: 'Team' },
          ].map(s => (
            <div key={s.label}>
              <div className="font-display text-4xl text-[#f5f5f0]">{s.num}</div>
              <div className="text-[11px] tracking-[0.15em] uppercase text-[#6b6b6b] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
