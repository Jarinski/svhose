'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type ConsentState = {
  essential: true       // immer aktiv, nicht abwählbar
  functional: boolean   // z.B. Formulare, Karten
  analytics: boolean    // z.B. Besucherstatistiken (derzeit kein Dienst aktiv)
}

const STORAGE_KEY = 'svhose_cookie_consent'

export function useCookieConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConsentState
  } catch {
    return null
  }
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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[10000] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Cookie-Einstellungen"
    >
      <div className="max-w-3xl mx-auto bg-[#0a0a0a] text-[#f5f5f0] rounded-2xl shadow-2xl border border-[#f5f5f0]/10 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#f5f5f0]/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl select-none" aria-hidden="true">🍪</span>
            <div>
              <h2 className="font-display text-2xl tracking-wider">DATENSCHUTZ & COOKIES</h2>
              <p className="text-[#6b6b6b] text-sm mt-1 leading-relaxed">
                Wir verwenden Cookies, um diese Website zu betreiben und dein Erlebnis zu verbessern.
                Du kannst selbst entscheiden, welche Kategorien du zulässt. Essentielle Cookies sind
                immer aktiv, da sie für den Betrieb der Website notwendig sind.{' '}
                <Link href="/datenschutz" className="underline underline-offset-2 hover:text-[#f5f5f0] transition-colors text-[#8b8b8b]">
                  Mehr erfahren
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Detail-Einstellungen (aufklappbar) */}
        {showDetails && (
          <div className="px-6 py-4 space-y-3 border-b border-[#f5f5f0]/10">
            {/* Essentielle Cookies */}
            <label className="flex items-center justify-between gap-4 cursor-not-allowed">
              <div>
                <div className="text-sm font-medium text-[#f5f5f0]">Essentielle Cookies</div>
                <div className="text-xs text-[#6b6b6b] mt-0.5">
                  Notwendig für die grundlegende Funktion der Website (Session, Sicherheit). Können nicht deaktiviert werden.
                </div>
              </div>
              {/* Toggle – immer an */}
              <div className="flex-shrink-0">
                <div className="w-10 h-6 bg-[#f5f5f0] rounded-full flex items-center justify-end px-1 opacity-60">
                  <div className="w-4 h-4 bg-[#0a0a0a] rounded-full" />
                </div>
              </div>
            </label>

            {/* Funktionale Cookies */}
            <label className="flex items-center justify-between gap-4 cursor-pointer group">
              <div>
                <div className="text-sm font-medium text-[#f5f5f0] group-hover:text-white transition-colors">
                  Funktionale Cookies
                </div>
                <div className="text-xs text-[#6b6b6b] mt-0.5">
                  Ermöglichen erweiterte Funktionen wie Karten-Einbindungen und Kontaktformulare.
                </div>
              </div>
              <button
                role="switch"
                aria-checked={functional}
                onClick={() => setFunctional(v => !v)}
                className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                  functional ? 'bg-[#f5f5f0] justify-end' : 'bg-[#2a2a2a] justify-start'
                }`}
              >
                <div className={`w-4 h-4 rounded-full transition-colors duration-200 ${
                  functional ? 'bg-[#0a0a0a]' : 'bg-[#6b6b6b]'
                }`} />
              </button>
            </label>

            {/* Analyse-Cookies */}
            <label className="flex items-center justify-between gap-4 cursor-pointer group">
              <div>
                <div className="text-sm font-medium text-[#f5f5f0] group-hover:text-white transition-colors">
                  Analyse-Cookies
                </div>
                <div className="text-xs text-[#6b6b6b] mt-0.5">
                  Helfen uns zu verstehen, wie Besucher die Website nutzen (derzeit kein aktiver Dienst).
                </div>
              </div>
              <button
                role="switch"
                aria-checked={analytics}
                onClick={() => setAnalytics(v => !v)}
                className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                  analytics ? 'bg-[#f5f5f0] justify-end' : 'bg-[#2a2a2a] justify-start'
                }`}
              >
                <div className={`w-4 h-4 rounded-full transition-colors duration-200 ${
                  analytics ? 'bg-[#0a0a0a]' : 'bg-[#6b6b6b]'
                }`} />
              </button>
            </label>
          </div>
        )}

        {/* Buttons */}
        <div className="px-6 py-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <button
            onClick={() => setShowDetails(v => !v)}
            className="text-xs text-[#6b6b6b] hover:text-[#f5f5f0] transition-colors underline underline-offset-2 text-left sm:text-center"
          >
            {showDetails ? 'Einstellungen ausblenden' : 'Einstellungen anpassen'}
          </button>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={rejectAll}
              className="px-4 py-2 text-xs border border-[#f5f5f0]/20 text-[#6b6b6b] hover:text-[#f5f5f0] hover:border-[#f5f5f0]/40 rounded-lg transition-colors"
            >
              Nur Essentielle
            </button>
            {showDetails ? (
              <button
                onClick={acceptSelected}
                className="px-4 py-2 text-xs bg-[#f5f5f0]/10 text-[#f5f5f0] hover:bg-[#f5f5f0]/20 border border-[#f5f5f0]/20 rounded-lg transition-colors"
              >
                Auswahl speichern
              </button>
            ) : null}
            <button
              onClick={acceptAll}
              className="px-5 py-2 text-xs font-medium bg-[#f5f5f0] text-[#0a0a0a] hover:bg-white rounded-lg transition-colors"
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
