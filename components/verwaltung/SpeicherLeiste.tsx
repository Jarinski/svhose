'use client'

/**
 * Am unteren Bildschirmrand angeheftete Leiste mit Speichern-Knopf, Status ("Ungespeicherte
 * Änderungen") und der Rückmeldung der Server-Aktion. Muss innerhalb des <form> stehen – der
 * Knopf sendet das Formular ab.
 *
 * Fest positioniert statt "sticky": So bleibt die Leiste auch über Karten unterhalb des Formulars
 * sichtbar (z. B. "Löschen"). Ein Platzhalter am Seitenende in Höhe der Leiste sorgt dafür, dass
 * am Ende der Seite nichts verdeckt wird.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCw } from 'lucide-react'
import type { FormErgebnis } from '@/lib/verwaltung/formular'
import { FormMeldung, SpeichernKnopf } from './FormularTeile'
import { knopfKlassen } from './ui'

export default function SpeicherLeiste({
  geaendert,
  ergebnis,
  knopfText = 'Speichern',
  bestaetigen,
  zusatz,
}: {
  geaendert: boolean
  ergebnis: FormErgebnis
  knopfText?: string
  /** Rückfrage vor dem Absenden, z. B. wenn sich eine Adresse ändert. */
  bestaetigen?: string
  /** Hinweis über der Statuszeile, der beim Speichern im Blick sein soll. */
  zusatz?: React.ReactNode
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
  // Konflikte (KONFLIKT_MELDUNG und die eigenen Texte z. B. der Kontaktseite) enden alle so.
  const neuLaden = !ergebnis.ok && !!ergebnis.meldung?.endsWith('Bitte Seite neu laden.')

  return (
    <>
      <div ref={leiste} className="fixed bottom-0 inset-x-0 lg:left-60 z-20 bg-[#f5f5f0]/95 backdrop-blur border-t border-[#0a0a0a]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3">
          {zeigeMeldung && (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              <FormMeldung ergebnis={ergebnis} />
              {neuLaden && (
                <button type="button" className={knopfKlassen.sekundaer} onClick={() => window.location.reload()}>
                  <RotateCw size={15} /> Seite neu laden
                </button>
              )}
            </div>
          )}
          {zusatz}
          {/* Lange Knopftexte rutschen auf schmalen Bildschirmen in eine eigene Zeile */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="flex-1 min-w-[10rem] text-sm" aria-live="polite">
              {geaendert ? (
                <span className="font-medium text-amber-800">Ungespeicherte Änderungen</span>
              ) : (
                <span className="text-[#6b6b6b]">Alles gespeichert.</span>
              )}
            </p>
            <SpeichernKnopf bestaetigen={bestaetigen} className="px-8 py-3 text-base">
              {knopfText}
            </SpeichernKnopf>
          </div>
        </div>
      </div>
      {imBrowser && createPortal(<div aria-hidden="true" style={{ height: hoehe }} />, document.body)}
    </>
  )
}
