import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import Karte from '@/components/Karte'
import { getTrainingszeiten } from '@/lib/content'
import { SPORTPLAETZE, spartenAmPlatz } from '@/lib/sportplaetze'

export const metadata: Metadata = {
  title: 'Sportplätze',
  description: 'Hier trainiert der SV Holm-Seppensen: Sportplatz und Halle an der Mühlenschule, Hauptplatz und Trainingsplatz am Tostedter Weg und die Wiesenschule.',
}

// Welche Sparten wo trainieren, kommt aus den Trainingszeiten → bei jedem Aufruf frisch lesen
export const dynamic = 'force-dynamic'

export default async function SportplaetzePage() {
  const trainingszeiten = await getTrainingszeiten()

  return (
    <div className="pt-32 pb-24">
      {/* Hero */}
      <div className="px-6 max-w-7xl mx-auto mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Wo wir Sport machen</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">SPORTPLÄTZE</h1>
        <div className="max-w-2xl">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            Unsere Mannschaften und Gruppen trainieren an fünf Anlagen in Holm-Seppensen und Buchholz: auf dem eigenen Platz am Tostedter Weg
            und in Hallen und auf Plätzen der Schulen. Die Karten zeigen, wo du uns findest.
          </p>
        </div>
      </div>

      {/* Anlagen */}
      <div className="px-6 max-w-7xl mx-auto">
        <ul className="space-y-5">
          {SPORTPLAETZE.map((platz, index) => {
            const sparten = spartenAmPlatz(platz, trainingszeiten)
            return (
              <li key={platz.id} className="glas-karte p-6 sm:p-8 md:p-10 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-16 gap-y-6">
                <div>
                  <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">
                    {String(index + 1).padStart(2, '0')} · {platz.standort}
                  </div>
                  <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-2">{platz.name}</h2>
                  <div className="text-xs tracking-[0.1em] uppercase text-[#6b6b6b]">{platz.art}</div>
                  {platz.adresse && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-[#6b6b6b]">
                      <MapPin size={14} className="shrink-0" aria-hidden="true" />
                      <span>{platz.adresse}</span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[#6b6b6b] leading-relaxed mb-6">{platz.beschreibung}</p>
                  {platz.verweis && (
                    <Link
                      href={platz.verweis.href}
                      className="mb-6 inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]"
                    >
                      {platz.verweis.text} <ArrowRight size={12} className="shrink-0" />
                    </Link>
                  )}
                  {sparten.length > 0 && (
                    <div>
                      <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Hier trainieren</div>
                      <ul className="flex flex-wrap gap-2">
                        {sparten.map(sparte => (
                          <li key={sparte.slug}>
                            <Link
                              href={`/sparten/${sparte.slug}`}
                              className="glas-pille"
                            >
                              {sparte.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-8 max-w-xl">
                    <Karte name={platz.name} lat={platz.lat} lon={platz.lon} zoom={platz.zoom} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Hinweis auf die Trainingszeiten */}
      <div className="px-6 max-w-7xl mx-auto mt-16">
        <div className="bg-[#0a0a0a] text-[#f5f5f0] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-4xl tracking-tight mb-2">WANN WIRD WO TRAINIERT?</h2>
            <p className="text-[#6b6b6b]">Tag, Uhrzeit und Ort jeder Gruppe stehen bei den Trainingszeiten.</p>
          </div>
          <Link
            href="/trainingszeiten"
            className="shrink-0 inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white transition-colors"
          >
            Zu den Trainingszeiten <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
