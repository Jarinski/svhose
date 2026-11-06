'use client'

/**
 * components/Grossansicht.tsx
 *
 * Großansicht für Fotos als modaler Dialog: Blättern mit den Pfeilen, den Pfeiltasten oder per Wischen;
 * Esc, ✕ oder ein Klick neben das Foto schließt sie. Bei nur einem Foto fallen Zähler und Pfeile weg.
 *
 * Genutzt von der Förderverein-Galerie (components/foerderverein/Galerie.tsx) und den Mannschaftsfotos
 * (components/TeamFoto.tsx).
 */

import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface GrossansichtFoto {
  bild: { src: string }
  unterschrift: string
}

/** Ab so vielen Pixeln seitlich zählt eine Wischbewegung als Blättern. */
const WISCHEN_AB = 50

export default function Grossansicht({
  fotos,
  index,
  onIndex,
  onSchliessen,
}: {
  fotos: GrossansichtFoto[]
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
      aria-label={anzahl > 1 ? 'Fotos in groß' : 'Foto in groß'}
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
            {anzahl > 1 && `${index + 1} / ${anzahl}`}
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
