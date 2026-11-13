'use client'

import { useEffect, useId, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { externeInhalteErlaubt } from '@/components/CookieBanner'

// Offizielles Widget von fussball.de (letzte und nächste Spiele des Vereins mit Ergebnissen).
//
// fussball.de liefert dafür https://www.fussball.de/widgets.js, das nur ein iframe auf
// next.fussball.de anlegt und dessen Höhe nachführt. Das machen wir hier selbst – so läuft
// kein fremdes Skript auf der Seite und das Widget erscheint auch nach einem Seitenwechsel
// ohne Neuladen. Ergebnisse und Namen sind im Widget verschlüsselt und werden nur dort
// lesbar angezeigt; auslesen lassen sie sich nicht.
//
// Das Widget ist bei fussball.de auf www.sv-holm-seppensen.de eingerichtet und prüft die
// Herkunft: Auf anderen Adressen (localhost, Testkopie) zeigt es nichts an, deshalb steht dort
// nur der Link (siehe `verfuegbar`). Wie die Karten lädt es erst nach Einwilligung in
// „Funktionale Cookies“ oder per Klick – vorher geht keine Anfrage an fussball.de.

const WIDGET_HOST = 'https://next.fussball.de'
const VEREINSSEITE = 'https://www.fussball.de/verein/sv-holm-seppensen-niedersachsen/-/id/00ES8GN7RK00006QVV0AG08LVUPGND5I'

export default function FussballWidget({
  widgetId,
  typ = 'club-matches',
  verfuegbar,
}: {
  widgetId: string
  typ?: string
  /** false auf Adressen, für die das Widget bei fussball.de nicht eingerichtet ist */
  verfuegbar: boolean
}) {
  const [erlaubt, setErlaubt] = useState(false)
  const [geladen, setGeladen] = useState(false)
  const [hoehe, setHoehe] = useState(560)
  // fussball.de schickt seine Höhe mit window.name des iframes; das Muster "<4 Zeichen>_fussballde_widget-<id>" stammt aus widgets.js
  const name = `${useId().replace(/[^a-z0-9]/gi, '').slice(-4).padStart(4, 'x')}_fussballde_widget-${widgetId}`

  useEffect(() => {
    setErlaubt(externeInhalteErlaubt())
    function beiAenderung() {
      setErlaubt(externeInhalteErlaubt())
      setGeladen(false)
    }
    window.addEventListener('svhose:consent-updated', beiAenderung)
    return () => window.removeEventListener('svhose:consent-updated', beiAenderung)
  }, [])

  useEffect(() => {
    function beiNachricht(e: MessageEvent) {
      if (e.origin !== WIDGET_HOST) return
      const d = e.data as { type?: string; iframeName?: string; height?: number } | null
      if (d?.type === 'fussballde_widget:resize' && d.iframeName === name && typeof d.height === 'number' && d.height > 0) {
        setHoehe(Math.ceil(d.height))
      }
    }
    window.addEventListener('message', beiNachricht)
    return () => window.removeEventListener('message', beiNachricht)
  }, [name])

  const link = (
    <a
      href={VEREINSSEITE}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 underline underline-offset-2 transition-colors hover:text-[#0a0a0a]"
    >
      Alle Spiele auf fussball.de <ExternalLink size={11} aria-hidden="true" />
    </a>
  )

  if (!verfuegbar) {
    return (
      <div className="rounded-[20px] bg-[#0a0a0a]/[0.04] ring-1 ring-[#0a0a0a]/[0.06] p-6 text-center text-xs leading-relaxed text-[#6b6b6b]">
        <p className="mx-auto max-w-sm">
          Die Ergebnisse von fussball.de erscheinen hier nur auf www.sv-holm-seppensen.de.
        </p>
        <p className="mt-3">{link}</p>
      </div>
    )
  }

  return (
    <figure className="m-0">
      {erlaubt || geladen ? (
        <iframe
          src={`${WIDGET_HOST}/widget/${typ}/${widgetId}`}
          name={name}
          title="Letzte und nächste Spiele von fussball.de"
          loading="lazy"
          scrolling="no"
          className="block w-full border-0"
          style={{ height: hoehe }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] bg-[#0a0a0a]/[0.04] ring-1 ring-[#0a0a0a]/[0.06] p-8 text-center">
          <p className="max-w-sm text-xs leading-relaxed text-[#6b6b6b]">
            Ergebnisse und Spielplan kommen von fussball.de. Beim Laden wird deine IP-Adresse an den
            Betreiber DFB-Medien übertragen.
          </p>
          <button
            type="button"
            onClick={() => setGeladen(true)}
            className="border border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2 text-xs font-medium uppercase tracking-[0.1em] text-[#f5f5f0] transition-colors hover:bg-transparent hover:text-[#0a0a0a]"
          >
            Spiele laden
          </button>
        </div>
      )}
      <figcaption className="mt-2 text-xs text-[#6b6b6b]">{link}</figcaption>
    </figure>
  )
}
