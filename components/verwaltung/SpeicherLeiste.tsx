'use client'

/**
 * Am unteren Bildschirmrand angeheftete Leiste mit Speichern-Knopf, Status ("Ungespeicherte
 * Änderungen") und der Rückmeldung der Server-Aktion. Muss innerhalb des <form> stehen – der
 * Knopf sendet das Formular ab.
 *
 * Fest positioniert statt "sticky": html und body haben global overflow-x: hidden (globals.css),
 * dadurch greift position: sticky nicht. Ein Platzhalter am Seitenende in Höhe der Leiste sorgt
 * dafür, dass am Ende der Seite nichts verdeckt wird.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCw } from 'lucide-react'
import type { FormErgebnis } from '@/lib/verwaltung/formular'
import { KONFLIKT_MELDUNG } from '@/lib/verwaltung/pruefhilfen'
import { FormMeldung, SpeichernKnopf } from './FormularTeile'
import { knopfKlassen } from './ui'

export default function SpeicherLeiste({
  geaendert,
  ergebnis,
  knopfText = 'Speichern',
}: {
  geaendert: boolean
  ergebnis: FormErgebnis
  knopfText?: string
}) {
  const leiste = useRef<HTMLDivElement>(null)
  const [hoehe, setHoehe] = useState(0)
  const [imBrowser, setImBrowser] = useState(false)

  useEffect(() => {
    setImBrowser(true)
    const el = leiste.current
    if (!el) return
    setHoehe(el.offsetHeight)
    if (typeof ResizeObserver === 'undefined') return
    const beobachter = new ResizeObserver(() => setHoehe(el.offsetHeight))
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [])

  // Erfolgsmeldung ausblenden, sobald wieder etwas geändert wird; Fehler bleiben stehen.
  const zeigeMeldung = !!ergebnis.meldung && (!ergebnis.ok || !geaendert)

  return (
    <>
      <div ref={leiste} className="fixed bottom-0 inset-x-0 lg:left-60 z-20 bg-[#f5f5f0]/95 backdrop-blur border-t border-[#0a0a0a]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3">
          {zeigeMeldung && (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              <FormMeldung ergebnis={ergebnis} />
              {ergebnis.meldung === KONFLIKT_MELDUNG && (
                <button type="button" className={knopfKlassen.sekundaer} onClick={() => window.location.reload()}>
                  <RotateCw size={15} /> Seite neu laden
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm" aria-live="polite">
              {geaendert ? (
                <span className="font-medium text-amber-800">Ungespeicherte Änderungen</span>
              ) : (
                <span className="text-[#6b6b6b]">Alles gespeichert.</span>
              )}
            </p>
            <SpeichernKnopf className="px-8 py-3 text-base">{knopfText}</SpeichernKnopf>
          </div>
        </div>
      </div>
      {imBrowser && createPortal(<div aria-hidden="true" style={{ height: hoehe }} />, document.body)}
    </>
  )
}
