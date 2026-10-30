'use client'

/**
 * Warnt vor dem Verlassen einer Seite mit ungespeicherten Änderungen: beim Schließen/Neuladen
 * (beforeunload), bei Klicks auf Links innerhalb der Verwaltung (die Next.js-Navigation löst
 * kein beforeunload aus) und bei Zurück/Vorwärts im Browser.
 */

import { useEffect, useState } from 'react'

const FRAGE = 'Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen dann verloren.'

/** Das Nötigste der Navigation API (noch nicht in den DOM-Typen von TypeScript). */
interface NavigationEreignis extends Event {
  navigationType: 'push' | 'replace' | 'reload' | 'traverse'
}
interface NavigationApi {
  addEventListener(typ: 'navigate', fn: (e: NavigationEreignis) => void): void
  removeEventListener(typ: 'navigate', fn: (e: NavigationEreignis) => void): void
}

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

    // Zurück/Vorwärts bleibt bei Next.js im selben Dokument und löst weder beforeunload noch einen
    // Klick aus. Die Navigation API (Chrome, Edge, Safari ab 26) meldet solche Schritte vorher und
    // lässt sie abbrechen – allerdings nur nach einer Eingabe auf der Seite und nur einmal pro
    // Eingabe (Schutz vor "Zurück-Fallen"). Ein zweites Zurück direkt nach "Abbrechen" geht deshalb
    // ohne Rückfrage durch. Browser ohne Navigation API warnen hier nicht.
    const navigation = (window as Window & { navigation?: NavigationApi }).navigation
    const beiNavigation = (e: NavigationEreignis) => {
      if (e.navigationType !== 'traverse' || !e.cancelable) return
      if (!window.confirm(FRAGE)) e.preventDefault()
    }

    window.addEventListener('beforeunload', vorDemVerlassen)
    // Capture-Phase: vor dem Klick-Handler von next/link
    document.addEventListener('click', beiKlick, true)
    navigation?.addEventListener('navigate', beiNavigation)
    return () => {
      window.removeEventListener('beforeunload', vorDemVerlassen)
      document.removeEventListener('click', beiKlick, true)
      navigation?.removeEventListener('navigate', beiNavigation)
    }
  }, [aktiv])
}

/**
 * Für Formulare mit unkontrollierten Feldern (defaultValue): Das <form> ruft `merken` in onChange
 * auf – React lässt die Änderungen aller Felder dorthin aufsteigen. Felder, die ihren Wert ohne
 * Eingabe ändern (z. B. "Bild entfernen"), rufen `merken` selbst auf.
 * `stand` ist der zuletzt gespeicherte Stand (z. B. geaendertAm). Ändert er sich nach dem
 * Speichern, gilt das Formular wieder als unverändert.
 */
export function useFormularGeaendert(stand: string): [geaendert: boolean, merken: () => void] {
  const [geaendertBei, setGeaendertBei] = useState<string | null>(null)
  return [geaendertBei === stand, () => setGeaendertBei(stand)]
}
