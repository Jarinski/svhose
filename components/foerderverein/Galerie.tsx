'use client'

/**
 * components/foerderverein/Galerie.tsx
 *
 * Bildergalerie der Förderverein-Seiten (Baustein "galerie", lib/seiten.ts): gleich große Kacheln
 * oder ein Mosaik, in dem jedes Foto sein Format behält. Ein Klick öffnet die Großansicht zum
 * Durchblättern – mit den Pfeilen, den Pfeiltasten oder per Wischen; Esc, ✕ oder ein Klick neben das
 * Foto schließt sie (components/Grossansicht.tsx). Bei vielen Fotos stehen erst die ersten zwölf da, der Rest kommt auf Knopfdruck.
 *
 * Client-Komponente, weil Großansicht und "Alle zeigen" Zustand brauchen. SeitenBausteine bindet sie
 * ein – auf der Website und in der Vorschau des Editors.
 */

import { useState } from 'react'
import Grossansicht from '@/components/Grossansicht'
import type { AnzeigeBild, GalerieDarstellung } from '@/lib/seiten'

export interface GalerieBild {
  bild: AnzeigeBild
  unterschrift: string
}

/** So viele Fotos stehen zuerst da; bis zu vier mehr werden gleich mit gezeigt (ein Knopf für 1–4 Fotos lohnt nicht). */
const ERST_ZEIGEN = 12

export default function Galerie({ fotos, darstellung }: { fotos: GalerieBild[]; darstellung: GalerieDarstellung }) {
  const [offen, setOffen] = useState<number | null>(null)
  const [alle, setAlle] = useState(false)
  const gekuerzt = !alle && fotos.length > ERST_ZEIGEN + 4
  const gezeigt = gekuerzt ? fotos.slice(0, ERST_ZEIGEN) : fotos

  const beschriftung = (f: GalerieBild, i: number) => `${f.unterschrift || `Foto ${i + 1} von ${fotos.length}`} – groß anzeigen`

  return (
    <>
      {darstellung === 'mosaik' ? (
        <ul className="columns-2 md:columns-3 gap-2 md:gap-3">
          {gezeigt.map((f, i) => (
            <li key={i} className="mb-2 md:mb-3 break-inside-avoid">
              <button type="button" onClick={() => setOffen(i)} aria-label={beschriftung(f, i)} className="group block w-full overflow-hidden bg-[#0a0a0a]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2">
                {/* Bilder liegen schon verkleinert im Medienordner – normales <img> wie im übrigen Seitenaufbau */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.bild.src}
                  alt={f.unterschrift}
                  width={f.bild.breite || undefined}
                  height={f.bild.hoehe || undefined}
                  loading="lazy"
                  className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </button>
              {f.unterschrift && <p className="mt-2 text-xs text-[#6b6b6b] leading-relaxed">{f.unterschrift}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
          {gezeigt.map((f, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setOffen(i)}
                aria-label={beschriftung(f, i)}
                className="group relative block w-full aspect-[4/3] overflow-hidden bg-[#0a0a0a]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.bild.src} alt={f.unterschrift} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                {f.unterschrift && (
                  // Unterschrift beim Darüberfahren; auf dem Handy erst in der Großansicht
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden md:block bg-gradient-to-t from-[#0a0a0a]/80 to-transparent px-3 pb-2.5 pt-8 text-left text-xs leading-snug text-[#f5f5f0] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {f.unterschrift}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {gekuerzt && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setAlle(true)}
            className="inline-flex items-center gap-2 border border-[#0a0a0a]/20 px-6 py-3 text-xs tracking-[0.15em] uppercase transition-colors hover:bg-[#0a0a0a] hover:text-[#f5f5f0]"
          >
            Alle {fotos.length} Fotos zeigen
          </button>
        </div>
      )}

      {offen !== null && fotos[offen] && <Grossansicht fotos={fotos} index={offen} onIndex={setOffen} onSchliessen={() => setOffen(null)} />}
    </>
  )
}
