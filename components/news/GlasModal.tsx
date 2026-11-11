'use client'

/**
 * components/news/GlasModal.tsx
 *
 * Fenster mit Glaseffekt („Liquid Glass“, components/glas) für News, die auf der Startseite
 * angeklickt werden (app/(start)/@modal/(.)news/[slug]). Am Rechner schwebt es mittig, am Handy
 * fährt es als Vollbild von unten herein. Der ✕-Knopf ist eine kleine Glaskugel, unter der der
 * Beitrag beim Scrollen durchzieht.
 *
 * Schließen mit ✕, Esc, Klick neben das Fenster oder dem Zurück-Knopf des Browsers – das Fenster hat
 * eine eigene Adresse (/news/…), Schließen heißt deshalb immer „eine Seite zurück“.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import GlasEbenen from '@/components/glas/GlasEbenen'
import { NEWS_MODAL_TITEL } from './titelId'
import s from './NewsModal.module.css'

export default function GlasModal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  /** Läuft das Schließen schon? Verhindert doppeltes Zurückgehen. */
  const schliesst = useRef(false)
  /** Begann der Klick auf dem Hintergrund? (Text markieren und daneben loslassen schließt nicht) */
  const druckAufHintergrund = useRef(false)
  const [zu, setZu] = useState(false)

  // Als modaler Dialog: Fokus bleibt drin, die Seite dahinter ist gesperrt und scrollt nicht mit.
  // Kein close() beim Aufräumen (siehe components/Grossansicht.tsx): Verschwindet der Dialog aus der
  // Seite, endet der modale Zustand von selbst.
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (!d.open) d.showModal()
    const html = document.documentElement
    const vorher = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter }
    html.style.overflow = 'hidden'
    // Platz der Scrollleiste behalten, sonst springt die Seite dahinter zur Seite
    html.style.scrollbarGutter = 'stable'
    return () => {
      html.style.overflow = vorher.overflow
      html.style.scrollbarGutter = vorher.gutter
    }
  }, [])

  const zurueck = useCallback(() => {
    dialog.current?.close()
    router.back()
  }, [router])

  const schliessen = useCallback(() => {
    if (schliesst.current) return
    schliesst.current = true
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) zurueck()
    else setZu(true) // Ausfahren per CSS, danach zurück (onAnimationEnd)
  }, [zurueck])

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      data-zu={zu || undefined}
      aria-labelledby={NEWS_MODAL_TITEL}
      onCancel={e => {
        e.preventDefault()
        schliessen()
      }}
      // Hat der Browser den Dialog selbst geschlossen (z. B. zweimal Esc), trotzdem zurückgehen
      onClose={() => {
        if (!schliesst.current) {
          schliesst.current = true
          router.back()
        }
      }}
      onPointerDown={e => {
        druckAufHintergrund.current = e.target === e.currentTarget
      }}
      onClick={e => {
        if (druckAufHintergrund.current && e.target === e.currentTarget) schliessen()
      }}
    >
      <div
        ref={panel}
        className={s.panel}
        onAnimationEnd={e => {
          if (zu && e.target === panel.current) zurueck()
        }}
      >
        <GlasEbenen band={22} staerke={16} />
        <div className={s.scroller}>
          <div className={s.leiste}>
            <button type="button" className={s.schliessen} onClick={schliessen} aria-label="Schließen">
              <GlasEbenen band={14} staerke={7} />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </dialog>
  )
}
