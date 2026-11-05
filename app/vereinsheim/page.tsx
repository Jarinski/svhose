import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, MapPin } from 'lucide-react'
import { heute } from '@/lib/buchungen/zeit'
import AnfrageFormular from './AnfrageFormular'

export const metadata: Metadata = {
  title: 'Vereinsheim buchen',
  description: 'Vereinsheim und Gelände des SV Holm-Seppensen am Tostedter Weg anfragen – für Vereinsmitglieder und Externe.',
}

// Frühestes wählbares Datum ist "heute" – deshalb nicht beim Build vorrendern.
export const dynamic = 'force-dynamic'

const SCHRITTE = [
  { titel: 'Anfragen', text: 'Sag uns, wann und wofür du Vereinsheim oder Gelände brauchst. Du siehst gleich, was an dem Tag schon belegt ist.' },
  { titel: 'Nummer merken', text: 'Nach dem Absenden bekommst du eine Buchungsnummer. Wir prüfen die Anfrage und melden uns.' },
  { titel: 'Stand abrufen', text: 'Mit Buchungsnummer und Datum siehst du jederzeit, ob deine Buchung bestätigt ist.' },
]

export default function VereinsheimSeite() {
  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Verein</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">VEREINSHEIM</h1>
        <div className="max-w-2xl">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            Unser Vereinsheim und das Gelände am Tostedter Weg kannst du für Feiern, Besprechungen und Veranstaltungen anfragen – als Vereinsmitglied
            oder als Gast von außerhalb.
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm text-[#6b6b6b]">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            <span>Tostedter Weg 1, Holm-Seppensen</span>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto space-y-16 md:space-y-20">
        <section aria-label="So funktioniert's" className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          {SCHRITTE.map((s, i) => (
            <div key={s.titel} className="bg-[#f5f5f0] p-8">
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">{String(i + 1).padStart(2, '0')}</div>
              <h2 className="font-display text-2xl tracking-tight mb-3">{s.titel}</h2>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">{s.text}</p>
              {i === 2 && (
                <Link href="/vereinsheim/status" className="mt-4 inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]">
                  Stand abrufen <ArrowRight size={12} className="shrink-0" />
                </Link>
              )}
            </div>
          ))}
        </section>

        <section id="anfrage" aria-labelledby="anfrage-titel" className="scroll-mt-28">
          <h2 id="anfrage-titel" className="font-display text-4xl md:text-5xl tracking-tight mb-10">
            ANFRAGE STELLEN
          </h2>
          <AnfrageFormular heute={heute()} />
        </section>
      </div>
    </div>
  )
}
