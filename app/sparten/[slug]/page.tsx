import { getSparten, getTrainingszeiten } from '@/lib/content'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  const sparten = getSparten()
  return sparten.map((s: any) => ({ slug: s.slug }))
}

export default function SparteDetailPage({ params }: { params: { slug: string } }) {
  const sparten = getSparten()
  const sparte = sparten.find((s: any) => s.slug === params.slug)
  if (!sparte) notFound()

  const alleZeiten = getTrainingszeiten()
  const trainingszeiten = alleZeiten.find((t: any) => t.sparte === sparte.name)

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <Link href="/sparten" className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors mb-12">
        <ArrowLeft size={12} /> Alle Sparten
      </Link>

      <div className="flex items-start gap-6 mb-12">
        <span className="text-6xl">{sparte.icon}</span>
        <div>
          <h1 className="font-display text-6xl md:text-8xl tracking-tight">{sparte.name.toUpperCase()}</h1>
        </div>
      </div>

      <div className="w-16 h-px bg-[#0a0a0a] mb-12" />

      <p className="text-xl text-[#6b6b6b] font-light leading-relaxed mb-16 max-w-2xl">{sparte.beschreibung}</p>

      {trainingszeiten && (
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Trainingszeiten</div>
          <div className="space-y-px bg-[#0a0a0a]/10">
            {trainingszeiten.gruppen.map((g: any, i: number) => (
              <div key={i} className="bg-[#f5f5f0] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="font-medium flex-1">{g.name}</div>
                <div className="flex items-center gap-4 text-sm text-[#6b6b6b]">
                  <span className="flex items-center gap-1"><Clock size={12} /> {g.tag}, {g.uhrzeit}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {g.ort}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-16 bg-[#0a0a0a] text-[#f5f5f0] p-8">
        <p className="text-sm text-[#6b6b6b] mb-4">Interesse? Komm einfach zum Probetraining oder kontaktiere uns.</p>
        <Link href="/ansprechpartner" className="inline-flex items-center gap-2 text-sm tracking-[0.1em] uppercase border border-[#f5f5f0]/30 px-6 py-3 hover:border-[#f5f5f0] transition-colors">
          Ansprechpartner finden
        </Link>
      </div>
    </div>
  )
}
