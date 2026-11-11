/**
 * components/suche/oeffnen.ts
 *
 * Öffnet das Suchfenster (components/suche/SuchFenster.tsx) von überall auf der Website – z. B. aus
 * der Navigation oder der Seitenleiste –, ohne dass diese das Fenster selbst einbinden müssen.
 */

export const SUCHE_OEFFNEN = 'svhs:suche-oeffnen'

export function sucheOeffnen(): void {
  window.dispatchEvent(new Event(SUCHE_OEFFNEN))
}

/**
 * Für Links nach /suche: Ein normaler Klick öffnet das Fenster; Klicks mit Strg/⌘/Umschalt oder der
 * mittleren Taste öffnen wie gewohnt die Seite (in neuem Tab).
 */
export function sucheStattLink(e: React.MouseEvent<HTMLAnchorElement>): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  sucheOeffnen()
}
