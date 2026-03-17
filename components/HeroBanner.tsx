'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'svhose_cookie_consent'
const VIDEO_ID = 'jP51-djhOM4'

function hasFunctionalConsent(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const c = JSON.parse(raw)
    return c.functional === true
  } catch {
    return false
  }
}

export default function HeroBanner() {
  const [showVideo, setShowVideo] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setShowVideo(hasFunctionalConsent())

    function onConsentUpdate() {
      setShowVideo(hasFunctionalConsent())
      setVideoError(false)
    }

    window.addEventListener('svhose:consent-updated', onConsentUpdate)
    // Auch Tab-übergreifend reagieren
    window.addEventListener('storage', onConsentUpdate)

    return () => {
      window.removeEventListener('svhose:consent-updated', onConsentUpdate)
      window.removeEventListener('storage', onConsentUpdate)
    }
  }, [])

  // YouTube Bot-Detection erkennen: Wenn die iframe-Seite einen Login fordert,
  // wird ein postMessage-Event mit bestimmten Fehlercodes gesendet.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return
      try {
        const data = JSON.parse(e.data)
        // YouTube sendet playerError mit Code 150 oder 101 bei Bot-Detection
        if (
          data?.event === 'onError' &&
          (data?.info === 150 || data?.info === 101 || data?.info === 2)
        ) {
          setVideoError(true)
        }
      } catch {
        // kein JSON → ignorieren
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Timeout-Fallback: Falls das Video nach 8 Sekunden nicht geladen hat
  // (z.B. wegen Bot-Detection), auf den statischen Fallback wechseln.
  useEffect(() => {
    if (!showVideo || videoError) return
    const t = setTimeout(() => {
      const iframe = iframeRef.current
      if (!iframe) return
      // Prüfen ob der iframe tatsächlich Inhalt hat
      try {
        // Wenn youtube-nocookie geblockt ist, bleibt contentDocument null
        if (!iframe.contentDocument || iframe.contentDocument.title.toLowerCase().includes('sign')) {
          setVideoError(true)
        }
      } catch {
        // Cross-Origin → iframe hat geladen (normal), kein Fehler
      }
    }, 8000)
    return () => clearTimeout(t)
  }, [showVideo, videoError])

  const videoSrc = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1&origin=${
    typeof window !== 'undefined' ? window.location.origin : 'https://sv-holm-seppensen.de'
  }`

  return (
    <section className="relative min-h-[50vh] flex flex-col justify-end pb-10 pt-20 px-6 overflow-hidden bg-[#0a0a0a]">

      {/* ── VIDEO HINTERGRUND (wenn funktionale Cookies akzeptiert und kein Fehler) ── */}
      {showVideo && !videoError ? (
        <>
          <div className="absolute inset-0 z-0 overflow-hidden">
            <iframe
              ref={iframeRef}
              src={videoSrc}
              allow="autoplay; encrypted-media"
              aria-hidden="true"
              title=""
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                /* 16:9 – immer die ganze Fläche abdecken */
                width: '100vw',
                height: '56.25vw',
                minWidth: '177.78vh',
                minHeight: '100%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                border: 'none',
              }}
            />
          </div>
          {/* Dunkles Overlay für Lesbarkeit */}
          <div className="absolute inset-0 bg-[#0a0a0a]/60 z-[1]" />
        </>
      ) : (
        /* ── FALLBACK (keine Einwilligung) ── */
        <>
          {/* Grid-Muster */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(#f5f5f0 1px, transparent 1px), linear-gradient(90deg, #f5f5f0 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* Großer Hintergrundtext */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="font-display text-[20vw] text-[#f5f5f0]/[0.03] leading-none whitespace-nowrap tracking-tight">
              SPORT
            </span>
          </div>
          {/* Großes 3D-Logo im Hintergrund */}
          <div
            className="absolute pointer-events-none select-none"
            style={{
              right: '-8%',
              top: '50%',
              width: '65vw',
              maxWidth: '780px',
              transform:
                'translateY(-50%) perspective(900px) rotateY(-22deg) rotateX(8deg) rotate(-8deg)',
              opacity: 0.07,
              filter: 'blur(0.5px)',
            }}
          >
            <img
              src="/SV_Holm_Seppensen_Logo.svg"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-contain"
              style={{ filter: 'brightness(10)' }}
            />
          </div>
        </>
      )}

      {/* ── INHALT ── */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="animate-fade-up stagger-1">
          <span className="inline-block text-[10px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.3em] uppercase text-[#6b6b6b] mb-8 border border-[#f5f5f0]/20 px-3 sm:px-4 py-2 rounded-full max-w-full">
            SV Holm-Seppensen e.V. — Gegründet in der Lüneburger Heide
          </span>
        </div>
        <h1 className="font-display text-[clamp(4rem,12vw,11rem)] leading-[0.9] text-[#f5f5f0] tracking-tight animate-fade-up stagger-2">
          GEMEINSAM<br />
          <span className="text-[#f5f5f0]/30">STARK.</span>
        </h1>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-up stagger-3">
          <Link
            href="/sparten"
            className="inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white transition-colors"
          >
            Unsere Sparten <ArrowRight size={16} />
          </Link>
          <Link
            href="/downloads"
            className="inline-flex items-center gap-2 border border-[#f5f5f0]/30 text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:border-[#f5f5f0] transition-colors"
          >
            Aufnahmeantrag
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-4 sm:gap-8 max-w-sm animate-fade-up stagger-4">
          {[
            { num: '14', label: 'Sparten' },
            { num: '∞', label: 'Leidenschaft' },
            { num: '1', label: 'Team' },
          ].map(s => (
            <div key={s.label}>
              <div className="font-display text-4xl text-[#f5f5f0]">{s.num}</div>
              <div className="text-[11px] tracking-[0.15em] uppercase text-[#6b6b6b] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
