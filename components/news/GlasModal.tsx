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
  /** Läuft das Schließen schon (Ausfahren)? */
  const schliesst = useRef(false)
  /** Schon eine Seite zurückgegangen? Höchstens einmal – sonst verließe man die Startseite. */
  const zurueckGegangen = useRef(false)
  /** Steht das Fenster noch? Ereignisse eines schon entfernten Dialogs zählen nicht. */
  const aktiv = useRef(false)
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
    aktiv.current = true
    const html = document.documentElement
    const vorher = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter }
    html.style.overflow = 'hidden'
    // Platz der Scrollleiste behalten, sonst springt die Seite dahinter zur Seite
    html.style.scrollbarGutter = 'stable'
    return () => {
      aktiv.current = false
      html.style.overflow = vorher.overflow
      html.style.scrollbarGutter = vorher.gutter
    }
  }, [])

  const zurueck = useCallback(() => {
    if (zurueckGegangen.current) return
    zurueckGegangen.current = true
    if (dialog.current?.open) dialog.current.close()
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
      // Hat der Browser den Dialog selbst zugemacht (Esc ohne vorherigen Klick ins Fenster lässt sich
      // nicht abfangen), läuft kein Ausfahren mehr – dann sofort zurück
      // (Nach dem Zurück-Knopf des Browsers ist der Dialog schon weg – dann nichts tun, sonst ginge es
      // eine Seite zu weit zurück.)
      onClose={() => {
        if (aktiv.current && dialog.current?.isConnected) zurueck()
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
        <GlasEbenen band={9} staerke={10} />
        <div className={s.scroller}>
          <div className={s.leiste}>
            <button type="button" className={s.schliessen} onClick={schliessen} aria-label="Schließen">
              <GlasEbenen band={7} staerke={5} />
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
