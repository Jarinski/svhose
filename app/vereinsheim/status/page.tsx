import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import StatusAbfrage from './StatusAbfrage'

export const metadata: Metadata = {
  title: 'Buchung: Stand abrufen',
  description: 'Mit Buchungsnummer und Datum den Stand einer Anfrage für das Vereinsheim des SV Holm-Seppensen abrufen.',
  robots: { index: false },
}

export default function StatusSeite() {
  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <Link href="/vereinsheim" className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] mb-6">
          <ArrowLeft size={12} /> Vereinsheim
        </Link>
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Stand abrufen</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-8">DEINE BUCHUNG</h1>
        <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed">
          Gib die Buchungsnummer und das Datum ein, für das du angefragt hast. Du siehst dann den Stand und unsere Rückmeldung.
        </p>
      </div>
      <div className="px-6 max-w-7xl mx-auto">
        <StatusAbfrage />
      </div>
    </div>
  )
}
