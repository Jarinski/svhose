'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { SparteUebersicht } from '@/lib/content'
import b from './bento.module.css'
import s from './SpartenBogen.module.css'

// ─── Sparten im Bogen (Design B) ─────────────────────────────────────────────
// Alle Sparten als Fotokarten auf der Innenseite eines Zylinders, die langsam vorbeiziehen.
// Die Lage der Karten rechnet CSS aus (SpartenBogen.module.css) – hier läuft nur --versatz weiter.
// Anhalten: Maus darüber, Tastaturfokus (holt die Karte in die Mitte) oder der Knopf darunter.
// Ziehen bzw. Wischen dreht den Bogen von Hand, mit etwas Schwung beim Loslassen.

/** Laufgeschwindigkeit in px pro Sekunde */
const TEMPO = 34
/** So viele Karten braucht der Bogen mindestens, damit der Sprung ans andere Ende unsichtbar bleibt */
const MINDEST_KARTEN = 14

type Karte = { sparte: SparteUebersicht | null; kopie: boolean }

const PAUSE = (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <rect x="2" y="1.5" width="2.6" height="9" rx=".8" />
    <rect x="7.4" y="1.5" width="2.6" height="9" rx=".8" />
  </svg>
)

const START = (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 1.8v8.4c0 .6.6.9 1.1.6l6.6-4.2a.7.7 0 0 0 0-1.2L4.1 1.2C3.6.9 3 1.2 3 1.8z" />
  </svg>
)

export default function SpartenBogen({ sparten }: { sparten: SparteUebersicht[] }) {
  const buehneRef = useRef<HTMLUListElement>(null)
  const angehaltenRef = useRef(false)
  const [angehalten, setAngehalten] = useState(false)

  // Sparten plus Karte "Alle Sparten"; bei wenigen Sparten mehrfach, die Kopien nur zum Ansehen
  const satz: (SparteUebersicht | null)[] = [...sparten, null]
  const kopien = Math.max(1, Math.ceil(MINDEST_KARTEN / satz.length))
  const karten: Karte[] = Array.from({ length: kopien }, (_, k) => satz.map(sparte => ({ sparte, kopie: k > 0 }))).flat()
  const anzahl = karten.length

  // Wer weniger Bewegung möchte, sieht den Bogen zunächst stehend
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      angehaltenRef.current = true
      setAngehalten(true)
    }
  }, [])

  useEffect(() => {
    const buehne = buehneRef.current
    if (!buehne) return
    const wenigBewegung = window.matchMedia('(prefers-reduced-motion: reduce)')

    let slot = 0
    let start = 0
    let umfang = 0
    let versatz = 0
    // zuletzt in --versatz geschriebener Wert (0 = Vorgabe aus dem CSS)
    let geschrieben = 0
    let tempo = 0
    let maus = false
    let fokusZiel: number | null = null
    let ziehen: { id: number; start: number; basis: number; x: number; t: number; v: number; bewegt: boolean } | null =
      null
    let klickSperren = false
    let sichtbar = false
    let bild = 0
    let zuletzt = 0

    const messen = () => {
      const stil = getComputedStyle(buehne)
      const neu = parseFloat(stil.getPropertyValue('--karte-b')) + parseFloat(stil.getPropertyValue('--luecke'))
      if (!(neu > 0)) return
      // Bei anderer Kartengröße (Fensterbreite) an derselben Karte bleiben
      if (slot > 0) versatz *= neu / slot
      slot = neu
      start = parseFloat(stil.getPropertyValue('--start')) || 0
      umfang = slot * anzahl
    }
    const falten = (wert: number) => ((wert % umfang) + umfang) % umfang

    const schritt = (zeit: number) => {
      bild = 0
      const dt = zuletzt ? Math.min(0.05, (zeit - zuletzt) / 1000) : 0
      zuletzt = zeit
      if (!ziehen?.bewegt && umfang > 0) {
        if (fokusZiel !== null) {
          // kürzester Weg zur Karte mit dem Fokus
          let weg = falten(fokusZiel - versatz)
          if (weg > umfang / 2) weg -= umfang
          versatz += wenigBewegung.matches ? weg : weg * Math.min(1, dt * 7)
          tempo = 0
        } else {
          const soll = maus || angehaltenRef.current ? 0 : TEMPO
          // Schwung vom Wischen klingt langsam aus, Anhalten und Anlaufen geht weich
          const rate = Math.abs(tempo) > TEMPO * 1.5 ? 1.4 : 3
          tempo += (soll - tempo) * Math.min(1, dt * rate)
          if (wenigBewegung.matches && soll === 0) tempo = 0
          versatz += tempo * dt
        }
      }
      if (umfang > 0) {
        versatz = falten(versatz)
        if (Math.abs(versatz - geschrieben) > 0.01) {
          geschrieben = versatz
          buehne.style.setProperty('--versatz', versatz.toFixed(2))
        }
      }
      if (sichtbar) bild = requestAnimationFrame(schritt)
    }
    const starten = () => {
      if (bild || !sichtbar) return
      zuletzt = 0
      bild = requestAnimationFrame(schritt)
    }

    // ── Ziehen und Wischen ──
    const runter = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return
      ziehen = { id: e.pointerId, start: e.clientX, basis: versatz, x: e.clientX, t: e.timeStamp, v: 0, bewegt: false }
    }
    const bewegen = (e: PointerEvent) => {
      if (!ziehen || e.pointerId !== ziehen.id) return
      const dx = e.clientX - ziehen.start
      if (!ziehen.bewegt) {
        if (Math.abs(dx) < 6) return
        ziehen.bewegt = true
        ziehen.basis = versatz + dx
        fokusZiel = null
        buehne.setPointerCapture(e.pointerId)
        buehne.dataset.ziehen = ''
      }
      const dt = Math.max(8, e.timeStamp - ziehen.t) / 1000
      ziehen.v = ziehen.v * 0.6 + ((ziehen.x - e.clientX) / dt) * 0.4
      ziehen.x = e.clientX
      ziehen.t = e.timeStamp
      versatz = ziehen.basis - dx
      starten()
    }
    const loslassen = (e: PointerEvent) => {
      if (!ziehen || e.pointerId !== ziehen.id) return
      if (ziehen.bewegt) {
        // Wer kurz innehält, bevor er loslässt, bekommt keinen Schwung mit
        const ruhig = e.timeStamp - ziehen.t > 90
        tempo = ruhig || e.type === 'pointercancel' ? 0 : Math.max(-2400, Math.min(2400, ziehen.v))
        delete buehne.dataset.ziehen
        if (e.type === 'pointerup') {
          // Der Klick nach dem Ziehen öffnet keine Sparte
          klickSperren = true
          setTimeout(() => (klickSperren = false), 0)
        }
      }
      ziehen = null
    }
    const klick = (e: MouseEvent) => {
      if (!klickSperren) return
      e.preventDefault()
      e.stopPropagation()
      klickSperren = false
    }

    // ── Anhalten mit der Maus, Tastaturfokus holt die Karte in die Mitte ──
    const rein = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') maus = true
    }
    const raus = () => {
      maus = false
    }
    const fokusRein = (e: FocusEvent) => {
      const ziel = e.target as HTMLElement
      if (!ziel.matches(':focus-visible')) return
      const i = Number(ziel.closest('li')?.dataset.i)
      if (!Number.isFinite(i)) return
      fokusZiel = (i - start) * slot
      starten()
    }
    const fokusRaus = (e: FocusEvent) => {
      if (!buehne.contains(e.relatedTarget as Node | null)) fokusZiel = null
    }

    messen()
    const groesse = new ResizeObserver(messen)
    groesse.observe(buehne)
    const sicht = new IntersectionObserver(([eintrag]) => {
      sichtbar = eintrag.isIntersecting
      if (sichtbar) starten()
      else if (bild) {
        cancelAnimationFrame(bild)
        bild = 0
      }
    })
    sicht.observe(buehne)

    buehne.addEventListener('pointerdown', runter)
    buehne.addEventListener('pointermove', bewegen)
    buehne.addEventListener('pointerup', loslassen)
    buehne.addEventListener('pointercancel', loslassen)
    buehne.addEventListener('click', klick, true)
    buehne.addEventListener('pointerenter', rein)
    buehne.addEventListener('pointerleave', raus)
    buehne.addEventListener('focusin', fokusRein)
    buehne.addEventListener('focusout', fokusRaus)
    return () => {
      groesse.disconnect()
      sicht.disconnect()
      cancelAnimationFrame(bild)
      buehne.removeEventListener('pointerdown', runter)
      buehne.removeEventListener('pointermove', bewegen)
      buehne.removeEventListener('pointerup', loslassen)
      buehne.removeEventListener('pointercancel', loslassen)
      buehne.removeEventListener('click', klick, true)
      buehne.removeEventListener('pointerenter', rein)
      buehne.removeEventListener('pointerleave', raus)
      buehne.removeEventListener('focusin', fokusRein)
      buehne.removeEventListener('focusout', fokusRaus)
    }
  }, [anzahl])

  function umschalten() {
    angehaltenRef.current = !angehaltenRef.current
    setAngehalten(angehaltenRef.current)
  }

  return (
    <>
      {/* Rahmen mit Luft oben und unten, damit die Schatten weich auslaufen statt abgeschnitten zu werden */}
      <div className={s.rahmen}>
        <ul
          ref={buehneRef}
          id="b-sparten-bogen"
          className={s.buehne}
          role="list"
          style={{ '--anzahl': anzahl } as CSSProperties}
        >
          {karten.map(({ sparte, kopie }, i) => (
            <li
              key={`${sparte?.slug ?? 'alle'}-${i}`}
              data-i={i}
              className={sparte ? s.karte : `${s.karte} ${s.alle}`}
              style={{ '--i': i } as CSSProperties}
              aria-hidden={kopie || undefined}
            >
              {sparte ? (
                <Link href={`/sparten/${sparte.slug}`} className={s.link} draggable={false} tabIndex={kopie ? -1 : undefined}>
                  {sparte.bild ? (
                    <Image
                      src={sparte.bild}
                      alt=""
                      fill
                      draggable={false}
                      sizes="(max-width: 720px) 200px, (max-width: 1100px) 250px, 290px"
                    />
                  ) : (
                    // Ohne Foto: Vereinswappen als Platzhalter
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={s.platzhalter} src="/SV_Holm_Seppensen_Logo.svg" alt="" draggable={false} />
                  )}
                  <div className={s.schild}>
                    <span className={s.ico} aria-hidden="true">
                      {sparte.icon ? <i className={b.emo}>{sparte.icon}</i> : <span className={s.initiale}>{sparte.name.charAt(0)}</span>}
                    </span>
                    <h3>{sparte.name}</h3>
                  </div>
                </Link>
              ) : (
                <Link href="/sparten" className={s.link} draggable={false} tabIndex={kopie ? -1 : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={52} height={52} draggable={false} />
                  <h3>
                    Alle Sparten
                    <br />
                    im Überblick
                  </h3>
                  <span className={`${b.link} ${s.weiter}`}>Ansehen →</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className={s.pause} aria-controls="b-sparten-bogen" onClick={umschalten}>
        {angehalten ? START : PAUSE}
        {angehalten ? 'Weiterlaufen' : 'Anhalten'}
      </button>
    </>
  )
}
