'use client'

/**
 * components/Grossansicht.tsx
 *
 * Großansicht für Fotos als modaler Dialog im Glas-Look der übrigen Fenster (Grossansicht.module.css):
 * Die Seite dahinter wird hell mattiert, das Foto schwebt darüber, Zähler, ✕, Pfeile und Unterschrift
 * sind kleine Glasflächen (components/glas). Blättern mit den Pfeilen, den Pfeiltasten oder per Wischen;
 * Esc, ✕ oder ein Klick neben das Foto schließt sie. Bei nur einem Foto fallen Zähler und Pfeile weg.
 *
 * Genutzt von der Förderverein-Galerie (components/foerderverein/Galerie.tsx), der Zeitleiste
 * (components/foerderverein/ZeitZoom.tsx) und den Mannschaftsfotos (components/TeamFoto.tsx).
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import GlasEbenen from '@/components/glas/GlasEbenen'
import s from './Grossansicht.module.css'

export interface GrossansichtFoto {
  bild: { src: string }
  unterschrift: string
}

/** Ab so vielen Pixeln seitlich zählt eine Wischbewegung als Blättern. */
const WISCHEN_AB = 50

/** Klickflächen neben dem Foto (data-daneben): Ein Klick dort schließt die Großansicht. */
const istDaneben = (el: EventTarget | null) => el instanceof HTMLElement && el.dataset.daneben !== undefined

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
  /** Läuft das Schließen schon (Ausblenden)? */
  const schliesst = useRef(false)
  /** Begann der Klick neben dem Foto? (Auf dem Foto drücken und daneben loslassen schließt nicht) */
  const druckDaneben = useRef(false)
  const wischStart = useRef<number | null>(null)
  const [zu, setZu] = useState(false)
  /** Schon geblättert? Dann blendet das nächste Foto nur weich auf, statt wie beim Öffnen hereinzuschweben. */
  const [geblaettert, setGeblaettert] = useState(false)
  const anzahl = fotos.length
  const foto = fotos[index]

  function blaettern(richtung: 1 | -1) {
    if (schliesst.current) return
    setGeblaettert(true)
    onIndex((index + richtung + anzahl) % anzahl)
  }

  function schliessen() {
    if (schliesst.current) return
    schliesst.current = true
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) onSchliessen()
    else setZu(true) // Ausblenden per CSS, danach onSchliessen (onAnimationEnd am Foto)
  }

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
    const vorher = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter }
    html.style.overflow = 'hidden'
    // Platz der Scrollleiste behalten, sonst springt die mattierte Seite dahinter zur Seite
    html.style.scrollbarGutter = 'stable'
    return () => {
      aktiv.current = false
      html.style.overflow = vorher.overflow
      html.style.scrollbarGutter = vorher.gutter
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

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      data-zu={zu || undefined}
      data-daneben=""
      aria-label={anzahl > 1 ? 'Fotos in groß' : 'Foto in groß'}
      onCancel={e => {
        e.preventDefault()
        schliessen()
      }}
      // Hat der Browser den Dialog selbst zugemacht (Esc lässt sich nicht immer abfangen), läuft kein
      // Ausblenden mehr – dann sofort schließen. Er meldet das verzögert: Ist der Dialog dann schon
      // wieder offen oder weg, war es ein altes Ereignis.
      onClose={() => {
        if (aktiv.current && !dialog.current?.open) onSchliessen()
      }}
      onKeyDown={taste}
      onPointerDown={e => {
        druckDaneben.current = istDaneben(e.target)
      }}
      onClick={e => {
        if (druckDaneben.current && istDaneben(e.target)) schliessen()
      }}
    >
      <div className={s.kopf} data-daneben="">
        {anzahl > 1 && (
          <span className={`${s.glas} ${s.zaehler}`} aria-live="polite">
            <GlasEbenen band={6} staerke={4} unschaerfe="leicht" />
            <span className={s.inhalt}>
              {index + 1} / {anzahl}
            </span>
          </span>
        )}
        <button type="button" onClick={schliessen} aria-label="Großansicht schließen" className={`${s.glas} ${s.knopf} ${s.schliessen}`}>
          <GlasEbenen band={7} staerke={5} unschaerfe="leicht" />
          <X size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      <div
        className={s.buehne}
        data-daneben=""
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
          className={`${s.foto} ${geblaettert ? s.wechsel : s.ankunft}`}
          draggable={false}
          onAnimationEnd={() => {
            if (zu) onSchliessen()
          }}
        />
        {anzahl > 1 && (
          <>
            <button type="button" onClick={() => blaettern(-1)} aria-label="Vorheriges Foto" className={`${s.glas} ${s.knopf} ${s.pfeil} ${s.zurueck}`}>
              <GlasEbenen band={7} staerke={5} unschaerfe="leicht" />
              <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => blaettern(1)} aria-label="Nächstes Foto" className={`${s.glas} ${s.knopf} ${s.pfeil} ${s.weiter}`}>
              <GlasEbenen band={7} staerke={5} unschaerfe="leicht" />
              <ChevronRight size={24} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className={s.fuss} data-daneben="">
        {foto.unterschrift && (
          <p className={`${s.glas} ${s.unterschrift}`}>
            <GlasEbenen band={7} staerke={5} unschaerfe="normal" />
            <span className={s.inhalt}>{foto.unterschrift}</span>
          </p>
        )}
      </div>
    </dialog>
  )
}
