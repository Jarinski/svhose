import { getTrainingszeiten } from '@/lib/content'
import { Clock, MapPin } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Trainingszeiten' }

export default function TrainingszeitenPage() {
  const zeiten = getTrainingszeiten()

  const wochentage = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Wann wir trainieren</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">TRAINING</h1>
      </div>

      {/* Nach Sparte */}
      <div className="space-y-8">
        {zeiten.map((z: any) => (
          <div key={z.sparte}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3 pb-2 border-b border-[#0a0a0a]/10">
              {z.sparte}
            </div>
            <div className="space-y-px bg-[#0a0a0a]/10">
              {z.gruppen.map((g: any, i: number) => (
                <div key={i} className="bg-[#f5f5f0] px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="font-medium sm:w-32 shrink-0">{g.name}</div>
                  <div className="flex flex-wrap gap-4 text-sm text-[#6b6b6b]">
                    <span className="flex items-center gap-1"><Clock size={12} /> {g.tag}, {g.uhrzeit}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {g.ort}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 border border-[#0a0a0a]/10 p-6">
        <p className="text-sm text-[#6b6b6b]">
          Änderungen und Ausfälle werden kurzfristig über unsere Social-Media-Kanäle bekannt gegeben.
        </p>
      </div>
    </div>
  )
}
