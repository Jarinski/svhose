'use client'

/**
 * components/foerderverein/Galerie.tsx
 *
 * Bildergalerie der Förderverein-Seiten (Baustein "galerie", lib/seiten.ts): gleich große Kacheln
 * oder ein Mosaik, in dem jedes Foto sein Format behält. Ein Klick öffnet die Großansicht zum
 * Durchblättern – mit den Pfeilen, den Pfeiltasten oder per Wischen; Esc, ✕ oder ein Klick neben das
 * Foto schließt sie. Bei vielen Fotos stehen erst die ersten zwölf da, der Rest kommt auf Knopfdruck.
 *
 * Client-Komponente, weil Großansicht und "Alle zeigen" Zustand brauchen. SeitenBausteine bindet sie
 * ein – auf der Website und in der Vorschau des Editors.
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
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

// ─── Großansicht ────────────────────────────────────────────────────────────

/** Ab so vielen Pixeln seitlich zählt eine Wischbewegung als Blättern. */
const WISCHEN_AB = 50

function Grossansicht({
  fotos,
  index,
  onIndex,
  onSchliessen,
}: {
  fotos: GalerieBild[]
  index: number
  onIndex: (index: number) => void
  onSchliessen: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  /** Steht die Großansicht gerade? Ereignisse eines schon geschlossenen Dialogs zählen nicht mehr. */
  const aktiv = useRef(false)
  const wischStart = useRef<number | null>(null)
  const anzahl = fotos.length
  const foto = fotos[index]
  const blaettern = (richtung: 1 | -1) => onIndex((index + richtung + anzahl) % anzahl)

  // Als modaler Dialog: Fokus bleibt drin, Esc schließt, die Seite dahinter scrollt nicht mit.
  // Kein close() beim Aufräumen: Der Browser beendet den modalen Zustand, sobald der Dialog aus der
  // Seite verschwindet – und ein close() hier löste ein verspätetes "close" aus, das den gleich wieder
  // geöffneten Dialog (React prüft Effekte in der Entwicklung doppelt) sofort schlösse.
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (!d.open) d.showModal()
    aktiv.current = true
    const html = document.documentElement
    const vorher = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      aktiv.current = false
      html.style.overflow = vorher
    }
  }, [])

  // Nachbarfotos vorladen, damit das Blättern nicht hakt
  useEffect(() => {
    for (const r of [1, -1]) {
      const nachbar = fotos[(index + r + anzahl) % anzahl]
      if (nachbar && nachbar !== foto) new Image().src = nachbar.bild.src
    }
  }, [fotos, foto, index, anzahl])

  function taste(e: React.KeyboardEvent) {
    if (anzahl < 2) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      blaettern(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      blaettern(-1)
    }
  }

  const pfeil =
    'absolute top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#0a0a0a]/50 text-[#f5f5f0] transition-colors hover:bg-[#f5f5f0] hover:text-[#0a0a0a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f5f0]'

  return (
    <dialog
      ref={dialog}
      aria-label="Fotos in groß"
      // Esc: sofort schließen. "close" fängt den Fall ab, dass der Browser den Dialog selbst schließt (er
      // meldet das verzögert – ist der Dialog dann schon wieder offen oder weg, war es ein altes Ereignis).
      onCancel={onSchliessen}
      onClose={() => {
        if (aktiv.current && !dialog.current?.open) onSchliessen()
      }}
      onKeyDown={taste}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-[#f5f5f0] backdrop:bg-[#0a0a0a]/95"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 md:px-6">
          <span className="text-[11px] tracking-[0.25em] uppercase text-[#f5f5f0]/60" aria-live="polite">
            {index + 1} / {anzahl}
          </span>
          <button
            type="button"
            onClick={onSchliessen}
            aria-label="Großansicht schließen"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#f5f5f0]/80 transition-colors hover:bg-[#f5f5f0]/10 hover:text-[#f5f5f0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f5f0]"
          >
            <X size={24} />
          </button>
        </div>

        <div
          className="relative min-h-0 flex-1"
          // Klick neben das Foto schließt
          onClick={e => {
            if (e.target === e.currentTarget) onSchliessen()
          }}
          onTouchStart={e => {
            wischStart.current = e.touches[0]?.clientX ?? null
          }}
          onTouchEnd={e => {
            const start = wischStart.current
            const ende = e.changedTouches[0]?.clientX
            wischStart.current = null
            if (start === null || ende === undefined || anzahl < 2) return
            if (Math.abs(ende - start) >= WISCHEN_AB) blaettern(ende < start ? 1 : -1)
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={foto.bild.src}
            src={foto.bild.src}
            alt={foto.unterschrift}
            className="absolute inset-0 m-auto h-auto w-auto max-h-full max-w-[calc(100%-2rem)] md:max-w-[calc(100%-10rem)] select-none object-contain"
            draggable={false}
          />
          {anzahl > 1 && (
            <>
              <button type="button" onClick={() => blaettern(-1)} aria-label="Vorheriges Foto" className={`${pfeil} left-2 md:left-6`}>
                <ChevronLeft size={26} />
              </button>
              <button type="button" onClick={() => blaettern(1)} aria-label="Nächstes Foto" className={`${pfeil} right-2 md:right-6`}>
                <ChevronRight size={26} />
              </button>
            </>
          )}
        </div>

        <p className="shrink-0 min-h-[3.75rem] px-6 py-4 text-center text-sm leading-relaxed text-[#f5f5f0]/80 max-w-3xl mx-auto w-full">{foto.unterschrift}</p>
      </div>
    </dialog>
  )
}
