'use client'

import { useEffect, useRef, useState } from 'react'
import s from './StartseiteB.module.css'

// Video der Hero-Kachel mit Knopf zum Anhalten. Bei "Bewegung reduzieren" startet es angehalten.
export default function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null)
  const [laeuft, setLaeuft] = useState(true)

  useEffect(() => {
    const v = video.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.pause()
    const an = () => setLaeuft(true)
    const aus = () => setLaeuft(false)
    v.addEventListener('play', an)
    v.addEventListener('pause', aus)
    setLaeuft(!v.paused)
    return () => {
      v.removeEventListener('play', an)
      v.removeEventListener('pause', aus)
    }
  }, [])

  function umschalten() {
    const v = video.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  return (
    <>
      <video ref={video} className={s.video} src="/videos/hero.mp4" autoPlay muted loop playsInline aria-hidden="true" />
      <button
        type="button"
        className={s.videoKnopf}
        onClick={umschalten}
        aria-label={laeuft ? 'Video anhalten' : 'Video abspielen'}
      >
        {laeuft ? (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>
    </>
  )
}
