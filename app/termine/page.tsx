import { getTermine } from '@/lib/content'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { MapPin, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Termine' }

export default function TerminePage() {
  const termine = getTermine()
  const heute = new Date()
  const kommend = termine.filter((t: any) => new Date(t.datum) >= heute)
  const vergangen = termine.filter((t: any) => new Date(t.datum) < heute)

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Kalender</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">TERMINE</h1>
      </div>

      {/* Kommende Termine */}
      <div className="mb-20">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Kommende Termine</div>
        <div className="space-y-px bg-[#0a0a0a]/10">
          {kommend.map((t: any) => (
            <div key={t.id} className="bg-[#f5f5f0] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              {/* Datum Block */}
              <div className="bg-[#0a0a0a] text-[#f5f5f0] p-4 text-center shrink-0 w-20">
                <div className="font-display text-3xl leading-none">
                  {format(new Date(t.datum), 'd')}
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#f5f5f0]/60 mt-1">
                  {format(new Date(t.datum), 'MMM', { locale: de })}
                </div>
                <div className="text-[10px] text-[#f5f5f0]/40">
                  {format(new Date(t.datum), 'yyyy')}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] border border-[#0a0a0a]/20 px-2 py-0.5">
                    {t.sparte}
                  </span>
                </div>
                <h3 className="font-medium text-lg mb-2">{t.titel}</h3>
                <p className="text-sm text-[#6b6b6b]">{t.beschreibung}</p>
              </div>

              <div className="flex flex-col gap-2 text-xs text-[#6b6b6b] shrink-0">
                <span className="flex items-center gap-1"><Clock size={11} /> {t.uhrzeit} Uhr</span>
                <span className="flex items-start gap-1"><MapPin size={11} className="mt-0.5 shrink-0" /> <span className="max-w-[200px]">{t.ort}</span></span>
              </div>
            </div>
          ))}
          {kommend.length === 0 && (
            <div className="bg-[#f5f5f0] p-8 text-[#6b6b6b] text-sm">Keine kommenden Termine eingetragen.</div>
          )}
        </div>
      </div>

      {/* Vergangene Termine */}
      {vergangen.length > 0 && (
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Vergangene Termine</div>
          <div className="space-y-px bg-[#0a0a0a]/10 opacity-50">
            {vergangen.map((t: any) => (
              <div key={t.id} className="bg-[#f5f5f0] p-6 flex flex-wrap items-center gap-2 sm:gap-6">
                <div className="text-sm text-[#6b6b6b] w-24 shrink-0">
                  {format(new Date(t.datum), 'd. MMM yyyy', { locale: de })}
                </div>
                <div className="font-medium text-sm flex-1 min-w-0">{t.titel}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b] border border-[#0a0a0a]/10 px-2 py-0.5 shrink-0">
                  {t.sparte}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
