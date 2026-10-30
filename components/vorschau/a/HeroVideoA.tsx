'use client'

import { useEffect, useRef } from 'react'

// Hero-Video der Startseite A. Bei "Bewegung reduzieren" im Betriebssystem bleibt es stehen.
export default function HeroVideoA({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const abfrage = window.matchMedia('(prefers-reduced-motion: reduce)')
    function anpassen() {
      if (!video) return
      if (abfrage.matches) video.pause()
      else video.play().catch(() => {})
    }
    anpassen()
    abfrage.addEventListener('change', anpassen)
    return () => abfrage.removeEventListener('change', anpassen)
  }, [])

  return (
    <video
      ref={videoRef}
      className={className}
      src="/videos/hero.mp4"
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}
