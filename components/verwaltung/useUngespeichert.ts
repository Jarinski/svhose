'use client'

/**
 * Warnt vor dem Verlassen einer Seite mit ungespeicherten Änderungen: beim Schließen/Neuladen
 * (beforeunload) und bei Klicks auf Links innerhalb der Verwaltung (die Next.js-Navigation löst
 * kein beforeunload aus).
 */

import { useEffect } from 'react'

const FRAGE = 'Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen dann verloren.'

export function useUngespeichertWarnung(aktiv: boolean): void {
  useEffect(() => {
    if (!aktiv) return

    const vorDemVerlassen = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    const beiKlick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement)) return
      if (link.target === '_blank' || link.hasAttribute('download')) return
      if (!window.confirm(FRAGE)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', vorDemVerlassen)
    // Capture-Phase: vor dem Klick-Handler von next/link
    document.addEventListener('click', beiKlick, true)
    return () => {
      window.removeEventListener('beforeunload', vorDemVerlassen)
      document.removeEventListener('click', beiKlick, true)
    }
  }, [aktiv])
}
