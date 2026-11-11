'use client'

/**
 * components/glas/GlasEbenen.tsx
 *
 * Glas wie bei iOS („Liquid Glass“) als Hintergrund eines Elements – für das News-Fenster, seinen
 * ✕-Knopf und den Cookie-Hinweis. Drei Ebenen ohne eigenen Rahmen, alles zusammen wirkt wie eine
 * einzige Glasscheibe:
 *   Kante  klares Glas, am Rand wie durch eine Linse verzogen (glasLinse.ts, nur Chromium)
 *   Frost  mattierte Fläche; läuft zum Rand hin weich aus, damit die klare Kante durchscheint
 *   Glanz  feine Lichtkante
 *
 * Gebrauch: als erste Kinder in ein Element mit position (relative/absolute/fixed) und
 * border-radius setzen; der Inhalt danach braucht position: relative, damit er darüber liegt.
 * Das Element selbst darf kein opacity, filter, mask oder backdrop-filter haben – sonst sieht das Glas
 * nur noch dieses Element statt der Seite dahinter. Anpassen über CSS-Variablen am Element:
 *   --glas-tint       Weißanteil der Fläche (Standard rgba(255, 255, 255, .62))
 *   --glas-unschaerfe Mattierung (Standard 22px)
 *   --glas-klar       wie breit die klare Kante ausläuft (Standard 10px)
 *   --glas-r          Eckenradius des Elements, damit die Mattierung rund ausläuft (Standard 30px)
 *
 * Die Ebenen sind Geschwister des Inhalts (Fragment, keine Hülle): So kann ein Fenster sie beim
 * Ausblenden einzeln mit opacity animieren, ohne dem Glas den Hintergrund zu nehmen.
 */

import { useGlasLinse } from './glasLinse'
import s from './Glas.module.css'

export default function GlasEbenen({ band = 16, staerke = 14 }: { band?: number; staerke?: number }) {
  const kante = useGlasLinse<HTMLSpanElement>(band, staerke)
  return (
    <>
      <span ref={kante} className={s.kante} aria-hidden="true" />
      <span className={s.frost} aria-hidden="true" />
      <span className={s.glanz} aria-hidden="true" />
    </>
  )
}
