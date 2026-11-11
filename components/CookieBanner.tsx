'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GlasEbenen from './glas/GlasEbenen'
import b from './vorschau/b/bento.module.css'
import s from './CookieBanner.module.css'

type ConsentState = {
  essential: true       // immer aktiv, nicht abwählbar
  functional: boolean   // z.B. Formulare, Karten
  analytics: boolean    // z.B. Besucherstatistiken (derzeit kein Dienst aktiv)
}

const STORAGE_KEY = 'svhose_cookie_consent'

function leseEinwilligung(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConsentState
  } catch {
    return null
  }
}

export function useCookieConsent(): ConsentState | null {
  return leseEinwilligung()
}

/** Karten und andere externe Inhalte dürfen nur laden, wenn "Funktionale Cookies" erlaubt sind. */
export function externeInhalteErlaubt(): boolean {
  return leseEinwilligung()?.functional === true
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [functional, setFunctional] = useState(true)
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    // Automatisch anzeigen wenn noch keine Entscheidung getroffen wurde
    const stored = localStorage.getItem(STORAGE_KEY)
    let timer: ReturnType<typeof setTimeout> | null = null
    if (!stored) {
      timer = setTimeout(() => setVisible(true), 600)
    }

    // Immer auf manuelles Öffnen aus dem Footer lauschen
    function handleOpen() {
      setFunctional(true)
      setAnalytics(false)
      setShowDetails(false)
      setVisible(true)
    }
    window.addEventListener('svhose:open-cookie-settings', handleOpen)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('svhose:open-cookie-settings', handleOpen)
    }
  }, [])

  function save(consent: ConsentState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
    // Andere Komponenten über Consent-Änderung informieren
    window.dispatchEvent(new CustomEvent('svhose:consent-updated'))
    setVisible(false)
  }

  function acceptAll() {
    save({ essential: true, functional: true, analytics: true })
  }

  function acceptSelected() {
    save({ essential: true, functional, analytics })
  }

  function rejectAll() {
    save({ essential: true, functional: false, analytics: false })
  }

  if (!visible) return null

  // Hinweis als Glasscheibe wie bei iOS (components/glas), unten über der Seite schwebend
  return (
    <div className={s.huelle} role="dialog" aria-modal="true" aria-label="Cookie-Einstellungen">
      <div className={s.panel}>
        <GlasEbenen band={18} staerke={12} />
        <div className={s.inhalt}>
          <div className={s.kopf}>
            <span className={`${b.emo} ${s.keks}`} aria-hidden="true">🍪</span>
            <div>
              <h2 className={s.titel}>Datenschutz & Cookies</h2>
              <p className={s.text}>
                Wir verwenden Cookies, um diese Website zu betreiben und dein Erlebnis zu verbessern.
                Du kannst selbst entscheiden, welche Kategorien du zulässt. Essentielle Cookies sind
                immer aktiv, da sie für den Betrieb der Website notwendig sind.{' '}
                <Link href="/datenschutz" className={s.link}>
                  Mehr erfahren
                </Link>
              </p>
            </div>
          </div>

          {/* Detail-Einstellungen (aufklappbar) */}
          {showDetails && (
            <div className={s.details}>
              <div className={`${s.option} ${s.optionFest}`}>
                <div>
                  <div className={s.optionTitel}>Essentielle Cookies</div>
                  <div className={s.optionText}>
                    Notwendig für die grundlegende Funktion der Website (Session, Sicherheit). Können nicht deaktiviert werden.
                  </div>
                </div>
                {/* immer an */}
                <span className={s.schalter} aria-hidden="true" data-an="" />
              </div>

              <label className={s.option}>
                <div>
                  <div className={s.optionTitel}>Funktionale Cookies</div>
                  <div className={s.optionText}>
                    Ermöglichen erweiterte Funktionen wie Karten-Einbindungen, Kontaktformulare und externe Medieninhalte (z. B. YouTube-Videos).
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={functional}
                  aria-label="Funktionale Cookies"
                  onClick={() => setFunctional(v => !v)}
                  className={s.schalter}
                  data-an={functional || undefined}
                />
              </label>

              <label className={s.option}>
                <div>
                  <div className={s.optionTitel}>Analyse-Cookies</div>
                  <div className={s.optionText}>
                    Helfen uns zu verstehen, wie Besucher die Website nutzen (derzeit kein aktiver Dienst).
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analytics}
                  aria-label="Analyse-Cookies"
                  onClick={() => setAnalytics(v => !v)}
                  className={s.schalter}
                  data-an={analytics || undefined}
                />
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className={s.leiste}>
            <button type="button" onClick={() => setShowDetails(v => !v)} className={s.einstellungen}>
              {showDetails ? 'Einstellungen ausblenden' : 'Einstellungen anpassen'}
            </button>

            <div className={s.knoepfe}>
              <button type="button" onClick={rejectAll} className={`${s.knopf} ${s.knopfGlas}`}>
                Nur Essentielle
              </button>
              {showDetails ? (
                <button type="button" onClick={acceptSelected} className={`${s.knopf} ${s.knopfGlas}`}>
                  Auswahl speichern
                </button>
              ) : null}
              <button type="button" onClick={acceptAll} className={`${s.knopf} ${s.knopfDunkel}`}>
                Alle akzeptieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
