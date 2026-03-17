import { getTrainingszeiten } from '@/lib/content'
import TrainingszeitenClient from './TrainingszeitenClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Trainingszeiten' }

export default async function TrainingszeitenPage() {
  const data = await getTrainingszeiten()

  return (
    <div className="pt-32 pb-24 px-6 max-w-6xl mx-auto">

      {/* Hero */}
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">
          Wann wir trainieren
        </div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">TRAININGSZEITEN</h1>
        <div className="mt-5 flex flex-wrap items-center gap-6">
          <p className="text-sm text-[#6b6b6b]">
            Gültig ab <span className="font-medium text-[#0a0a0a]">01.12.2025</span>
          </p>
          <div className="h-3 w-px bg-[#0a0a0a]/20 hidden sm:block" />
          <p className="text-sm text-[#6b6b6b]">
            <span className="font-medium text-[#0a0a0a]">{data.length}</span> Trainingseinheiten in{' '}
            <span className="font-medium text-[#0a0a0a]">
              {Array.from(new Set(data.map((e: any) => e.sparte))).length}
            </span>{' '}
            Sparten
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-[#0a0a0a]/10 mb-12" />

      {/* Interactive filter + list */}
      <TrainingszeitenClient data={data} />

      {/* Footer note */}
      <div className="mt-16 border border-[#0a0a0a]/10 p-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-1 h-8 bg-[#0a0a0a]/10 shrink-0 hidden sm:block" />
        <p className="text-sm text-[#6b6b6b]">
          Änderungen und Ausfälle werden kurzfristig über unsere Social-Media-Kanäle bekannt gegeben.
          Bei Fragen wende dich direkt an den jeweiligen Trainer.
        </p>
      </div>
    </div>
  )
}
