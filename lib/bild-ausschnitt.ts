/**
 * lib/bild-ausschnitt.ts
 *
 * Gespeicherter Bildausschnitt: Welcher Teil eines Fotos in einem Rahmen mit festem Seitenverhältnis
 * zu sehen ist (z. B. das Mannschaftsfoto auf der Spartenseite). Das Foto selbst bleibt unverändert,
 * die Großansicht zeigt weiter das ganze Bild.
 *
 * Gespeichert als JSON-Text mit Anteilen des Originalbildes (0 … 1): x/y = linke obere Ecke,
 * b/h = Breite/Höhe des Ausschnitts. So passt der Ausschnitt zu jeder Bildgröße – auch nachdem der
 * Server das Bild verkleinert hat.
 */

import type { CSSProperties } from 'react'

export interface Ausschnitt {
  x: number
  y: number
  b: number
  h: number
}

/** Seitenverhältnis (Breite / Höhe) des Teamfotos auf den Karten der Spartenseite. */
export const TEAM_FOTO_VERHAELTNIS = 16 / 10

/** Seitenverhältnis des Gruppenfotos oben auf der Vorstandsseite des Fördervereins. */
export const VORSTAND_FOTO_VERHAELTNIS = 2 / 1

function anteil(wert: unknown): number | null {
  return typeof wert === 'number' && Number.isFinite(wert) && wert >= 0 && wert <= 1 ? wert : null
}

/** Prüft einen Ausschnitt (Objekt oder JSON-Text). Ungültiges oder leeres ergibt null. */
export function ausschnittLesen(roh: unknown): Ausschnitt | null {
  let o: unknown = roh
  if (typeof roh === 'string') {
    if (!roh.trim()) return null
    try {
      o = JSON.parse(roh)
    } catch {
      return null
    }
  }
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const x = anteil(r.x)
  const y = anteil(r.y)
  const b = anteil(r.b)
  const h = anteil(r.h)
  if (x == null || y == null || b == null || h == null || b < 0.01 || h < 0.01) return null
  // Kleine Rundungsfehler zulassen, aber nie über den Bildrand hinaus
  if (x + b > 1.001 || y + h > 1.001) return null
  return { x, y, b, h }
}

/** Auf vier Nachkommastellen gerundet als JSON-Text für die Datenbank. */
export function ausschnittText(a: Ausschnitt | null): string | null {
  if (!a) return null
  const r = (n: number) => Math.round(n * 10000) / 10000
  return JSON.stringify({ x: r(a.x), y: r(a.y), b: r(a.b), h: r(a.h) })
}

/**
 * Stil für ein <img> in einem Rahmen mit `position: relative; overflow: hidden`, der genau den
 * Ausschnitt zeigt. Der Rahmen muss das Seitenverhältnis des Ausschnitts haben.
 */
export function ausschnittStil(a: Ausschnitt): CSSProperties {
  return {
    position: 'absolute',
    maxWidth: 'none',
    width: `${100 / a.b}%`,
    height: `${100 / a.h}%`,
    left: `${(-a.x / a.b) * 100}%`,
    top: `${(-a.y / a.h) * 100}%`,
  }
}
