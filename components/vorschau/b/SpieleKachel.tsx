'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import type { SpielKarte } from './hilfen'
import b from './bento.module.css'
import s from './StartseiteB.module.css'

// Schwarze Hero-Kachel: ein Spiel bzw. Termin auf einmal, mit Pfeilen blättert man
// zurück zu den letzten Ergebnissen oder vor zu den nächsten Terminen.
// Die Karten kommen fertig aufbereitet vom Server (components/vorschau/b/hilfen.ts).

const PFEIL_LINKS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 6l-6 6 6 6" />
  </svg>
)
const PFEIL_RECHTS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

/** Ab so vielen Pixeln seitlichem Wischen wird geblättert. */
const WISCH_SCHWELLE = 40

export default function SpieleKachel({ karten, start }: { karten: SpielKarte[]; start: number }) {
  const [index, setIndex] = useState(start)
  const wischStart = useRef<{ x: number; y: number } | null>(null)
  const karte = karten[index]
  const zurueck = index > 0
  const vor = index < karten.length - 1

  const blaettern = (richtung: -1 | 1) =>
    setIndex(i => Math.min(karten.length - 1, Math.max(0, i + richtung)))

  return (
    <section
      className={`${b.karte} ${s.naechster}`}
      aria-roledescription="Karussell"
      aria-label="Spiele und Termine"
      onTouchStart={e => {
        const t = e.touches[0]
        wischStart.current = { x: t.clientX, y: t.clientY }
      }}
      onTouchEnd={e => {
        const anfang = wischStart.current
        wischStart.current = null
        if (!anfang) return
        const t = e.changedTouches[0]
        const dx = t.clientX - anfang.x
        if (Math.abs(dx) < WISCH_SCHWELLE || Math.abs(dx) < Math.abs(t.clientY - anfang.y)) return
        blaettern(dx < 0 ? 1 : -1)
      }}
    >
      <div className={s.spielKopf}>
        <span className={`${b.tag} ${s.tagDunkel}`}>
          <span className={b.emo} aria-hidden="true">{karte.emoji}</span>{' '}
          {karte.vorbei ? `Gespielt · ${karte.wann}` : karte.wann}
        </span>
        {karten.length > 1 && (
          <div className={s.spielPfeile}>
            <button type="button" onClick={() => blaettern(-1)} disabled={!zurueck} aria-label="Vorheriges Spiel">
              {PFEIL_LINKS}
            </button>
            <button type="button" onClick={() => blaettern(1)} disabled={!vor} aria-label="Nächstes Spiel">
              {PFEIL_RECHTS}
            </button>
          </div>
        )}
      </div>

      <div className={s.spielInhalt} aria-live="polite">
        <h2 className={s.naechsterTitel}>{karte.titel}</h2>
        {karte.unterzeile && (
          <div className={s.vs}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={44} height={44} />
            <span>{karte.unterzeile}</span>
          </div>
        )}
        {karte.ergebnis && (
          <p className={s.ergebnis}>
            <b>{karte.ergebnis}</b>
            {karte.ausgang && <span>{karte.ausgang}</span>}
          </p>
        )}
      </div>

      <div className={s.reihe}>
        {karte.ort ? (
          <span>
            <span className={b.emo} aria-hidden="true">📍</span> {karte.ort}
          </span>
        ) : (
          <span />
        )}
        {karte.link.extern ? (
          <a href={karte.link.href} target="_blank" rel="noopener noreferrer">
            {karte.link.text}
          </a>
        ) : (
          <Link href={karte.link.href}>{karte.link.text}</Link>
        )}
      </div>
    </section>
  )
}
