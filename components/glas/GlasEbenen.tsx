'use client'

/**
 * components/glas/GlasEbenen.tsx
 *
 * Glas wie bei iOS („Liquid Glass“) als Hintergrund eines Elements – für das News-Fenster, seinen
 * ✕-Knopf und den Cookie-Hinweis. Zwei Ebenen ohne eigenen Rahmen, zusammen eine Glasscheibe:
 *   Frost  mattierte Fläche bis an den Rand; dort verbiegt eine Linse die Farben dahinter
 *          (glasLinse.ts, nur Chromium)
 *   Glanz  haarfeine Lichtkante
 *
 * Gebrauch: als erste Kinder in ein Element mit position (relative/absolute/fixed) und
 * border-radius setzen; der Inhalt danach braucht position: relative, damit er darüber liegt.
 * Das Element selbst darf kein opacity, filter, mask oder backdrop-filter haben – sonst sieht das Glas
 * nur noch dieses Element statt der Seite dahinter. Anpassen über CSS-Variablen am Element:
 *   --glas-tint       Weißanteil der Fläche (Standard rgba(255, 255, 255, .62))
 *   --glas-unschaerfe Mattierung (Standard 22px)
 *
 * Die Ebenen sind Geschwister des Inhalts (Fragment, keine Hülle): So kann ein Fenster sie beim
 * Ausblenden einzeln mit opacity animieren, ohne dem Glas den Hintergrund zu nehmen.
 */

import { useGlasLinse } from './glasLinse'
import s from './Glas.module.css'

export default function GlasEbenen({ band = 8, staerke = 8 }: { band?: number; staerke?: number }) {
  const frost = useGlasLinse<HTMLSpanElement>(band, staerke)
  return (
    <>
      <span ref={frost} className={s.frost} aria-hidden="true" />
      <span className={s.glanz} aria-hidden="true" />
    </>
  )
}
