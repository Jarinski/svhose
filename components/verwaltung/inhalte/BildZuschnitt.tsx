'use client'

/**
 * Dialog zum Zuschneiden eines Bildes auf ein festes Seitenverhältnis (z. B. das der News-Vorschau).
 * Der Rahmen hat das Seitenverhältnis; das Bild lässt sich darin verschieben (Ziehen, Pfeiltasten)
 * und vergrößern (Regler, Mausrad, + / –). Gerechnet wird in Bildpunkten des Originals: `mitte` ist
 * der Punkt in der Rahmenmitte, `zoom` 1 bedeutet "Bild füllt den Rahmen gerade aus". So bleibt der
 * Ausschnitt auch bei geänderter Rahmengröße (Handy drehen) derselbe. Das Ergebnis entsteht im
 * Browser auf einem Canvas – der Server bekommt nur die fertig zugeschnittene Datei.
 *
 * Mit `onAusschnitt` statt `onUebernehmen` wird nichts zugeschnitten: Der Dialog meldet nur den
 * gewählten Ausschnitt (lib/bild-ausschnitt.ts), das Bild selbst bleibt ganz (z. B. Mannschaftsfotos,
 * die in der Großansicht vollständig zu sehen sein sollen).
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Minus, Plus } from 'lucide-react'
import { knopfKlassen } from '@/components/verwaltung/ui'
import type { Ausschnitt } from '@/lib/bild-ausschnitt'

const MAX_ZOOM = 4
/** Wie MAX_KANTE in lib/verwaltung/medien-upload.ts: Der Server verkleinert größere Bilder ohnehin. */
const MAX_BREITE = 1600
const TASTEN_RICHTUNG: Partial<Record<string, [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

interface Punkt {
  x: number
  y: number
}
interface Groesse {
  b: number
  h: number
}

/** Anzeigepixel je Bildpunkt. */
function massstab(bild: Groesse, rahmen: Groesse, zoom: number): number {
  return Math.max(rahmen.b / bild.b, rahmen.h / bild.h) * zoom
}

/** Hält den Ausschnitt innerhalb des Bildes. */
function klemmen(mitte: Punkt, bild: Groesse, rahmen: Groesse, zoom: number): Punkt {
  const s = massstab(bild, rahmen, zoom)
  const halbB = rahmen.b / s / 2
  const halbH = rahmen.h / s / 2
  return {
    x: Math.min(Math.max(mitte.x, halbB), bild.b - halbB),
    y: Math.min(Math.max(mitte.y, halbH), bild.h - halbH),
  }
}

/** WebP (klein), wo der Browser es erzeugen kann – sonst JPEG. */
function alsBlob(leinwand: HTMLCanvasElement): Promise<Blob | null> {
  const als = (typ: string) => new Promise<Blob | null>(fertig => leinwand.toBlob(fertig, typ, 0.92))
  return als('image/webp').then(b => (b && b.type === 'image/webp' ? b : als('image/jpeg')))
}

export default function BildZuschnitt({
  quelle,
  verhaeltnis,
  onUebernehmen,
  onAusschnitt,
  start,
  hinweis = 'Der Rahmen zeigt, was in der News-Übersicht zu sehen ist.',
  onOriginal,
  onAbbrechen,
}: {
  /** Adresse des Bildes (gespeichertes Bild oder lokale Vorschau-Adresse) */
  quelle: string
  /** Breite / Höhe */
  verhaeltnis: number
  /** Liefert das fertig zugeschnittene Bild als Datei. */
  onUebernehmen?: (datei: File) => void
  /** Liefert nur den gewählten Ausschnitt – das Bild bleibt unverändert. */
  onAusschnitt?: (ausschnitt: Ausschnitt) => void
  /** Bisheriger Ausschnitt, mit dem der Dialog startet (sonst: ganzes Bild, mittig) */
  start?: Ausschnitt | null
  /** Erklärung unter der Überschrift: wo der Ausschnitt zu sehen ist */
  hinweis?: string
  /** Nur beim frisch gewählten Bild: ohne Zuschnitt weiterverwenden */
  onOriginal?: () => void
  onAbbrechen: () => void
}) {
  const rahmenRef = useRef<HTMLDivElement>(null)
  const ziehen = useRef<{ x: number; y: number; mitte: Punkt } | null>(null)
  const [bild, setBild] = useState<HTMLImageElement | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [rahmen, setRahmen] = useState<Groesse>({ b: 0, h: 0 })
  const [mitte, setMitte] = useState<Punkt>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [arbeitet, setArbeitet] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const b = img.naturalWidth
      const h = img.naturalHeight
      if (start) {
        // Breite des Ausschnitts bei zoom 1 (Bild füllt den Rahmen gerade aus) ÷ gespeicherte Breite
        const breiteBeiEins = Math.min(b, h * verhaeltnis)
        setZoom(Math.min(MAX_ZOOM, Math.max(1, breiteBeiEins / (start.b * b))))
        setMitte({ x: (start.x + start.b / 2) * b, y: (start.y + start.h / 2) * h })
      } else {
        setMitte({ x: b / 2, y: h / 2 })
      }
      setBild(img)
    }
    img.onerror = () => setFehler('Dieses Bild lässt sich hier nicht anzeigen.')
    img.src = quelle
    return () => {
      img.onload = null
      img.onerror = null
    }
    // Startwert nur beim Öffnen übernehmen – nicht bei jedem Neuzeichnen der Eltern-Komponente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quelle])

  useLayoutEffect(() => {
    const el = rahmenRef.current
    if (!el) return
    const messen = () => setRahmen({ b: el.clientWidth, h: el.clientHeight })
    messen()
    const beobachter = new ResizeObserver(messen)
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [])

  // Seite dahinter nicht scrollen, Fokus in den Dialog und danach zurück zum Auslöser
  useEffect(() => {
    const vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    rahmenRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      vorher?.focus()
    }
  }, [])

  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onAbbrechen()
    }
    document.addEventListener('keydown', beiTaste)
    return () => document.removeEventListener('keydown', beiTaste)
  }, [onAbbrechen])

  const groesse: Groesse | null = bild ? { b: bild.naturalWidth, h: bild.naturalHeight } : null
  const bereit = groesse != null && rahmen.b > 0
  const s = bereit ? massstab(groesse, rahmen, zoom) : 1
  const m = bereit ? klemmen(mitte, groesse, rahmen, zoom) : mitte

  function zoomSetzen(neu: number) {
    const z = Math.min(MAX_ZOOM, Math.max(1, neu))
    setZoom(z)
    if (bereit) setMitte(klemmen(m, groesse, rahmen, z))
  }

  function ziehenStart(e: React.PointerEvent<HTMLDivElement>) {
    if (!bereit) return
    e.currentTarget.setPointerCapture(e.pointerId)
    ziehen.current = { x: e.clientX, y: e.clientY, mitte: m }
  }

  function ziehenWeiter(e: React.PointerEvent<HTMLDivElement>) {
    const start = ziehen.current
    if (!start || !bereit) return
    setMitte(klemmen({ x: start.mitte.x - (e.clientX - start.x) / s, y: start.mitte.y - (e.clientY - start.y) / s }, groesse, rahmen, zoom))
  }

  function taste(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!bereit) return
    const richtung = TASTEN_RICHTUNG[e.key]
    if (richtung) {
      e.preventDefault()
      const schritt = rahmen.b / s / 20
      setMitte(klemmen({ x: m.x + richtung[0] * schritt, y: m.y + richtung[1] * schritt }, groesse, rahmen, zoom))
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoomSetzen(zoom * 1.1)
    } else if (e.key === '-') {
      e.preventDefault()
      zoomSetzen(zoom / 1.1)
    }
  }

  async function uebernehmen() {
    if (!bild || !bereit) return
    const sichtB = rahmen.b / s
    const sichtH = rahmen.h / s
    if (onAusschnitt) {
      const links = Math.max(0, Math.min(m.x - sichtB / 2, groesse.b - sichtB))
      const oben = Math.max(0, Math.min(m.y - sichtH / 2, groesse.h - sichtH))
      onAusschnitt({
        x: links / groesse.b,
        y: oben / groesse.h,
        b: Math.min(1, sichtB / groesse.b),
        h: Math.min(1, sichtH / groesse.h),
      })
      return
    }
    if (!onUebernehmen) return
    setArbeitet(true)
    const breite = Math.max(1, Math.round(Math.min(sichtB, MAX_BREITE)))
    const hoehe = Math.max(1, Math.round(breite / verhaeltnis))
    const leinwand = document.createElement('canvas')
    leinwand.width = breite
    leinwand.height = hoehe
    const ctx = leinwand.getContext('2d')
    if (!ctx) {
      setArbeitet(false)
      setFehler('Der Zuschnitt ist in diesem Browser nicht möglich.')
      return
    }
    // Weißer Grund, falls das Bild durchsichtige Stellen hat (JPEG kennt keine Transparenz)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, breite, hoehe)
    ctx.imageSmoothingQuality = 'high'
    const links = Math.max(0, Math.min(m.x - sichtB / 2, groesse.b - sichtB))
    const oben = Math.max(0, Math.min(m.y - sichtH / 2, groesse.h - sichtH))
    ctx.drawImage(bild, links, oben, sichtB, sichtH, 0, 0, breite, hoehe)
    const blob = await alsBlob(leinwand)
    if (!blob) {
      setArbeitet(false)
      setFehler('Der Zuschnitt konnte nicht erstellt werden.')
      return
    }
    onUebernehmen(new File([blob], blob.type === 'image/webp' ? 'zuschnitt.webp' : 'zuschnitt.jpg', { type: blob.type }))
  }

  return createPortal(
    // onChange stoppen: Der Regler gehört nicht zum Formular und soll es nicht als "geändert" markieren
    // (React lässt Ereignisse auch durch Portale zum <form> aufsteigen).
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0a0a0a]/60 sm:items-center sm:p-4" onChange={e => e.stopPropagation()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zuschnitt-titel"
        className="max-h-full w-full space-y-4 overflow-y-auto bg-white p-5 sm:max-w-2xl sm:rounded-sm"
      >
        <div>
          <h2 id="zuschnitt-titel" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a0a0a]">
            {onAusschnitt ? 'Ausschnitt wählen' : 'Bild zuschneiden'}
          </h2>
          <p className="mt-1 text-sm text-[#6b6b6b]">
            Verschieb das Bild im Rahmen und vergrößere es mit dem Regler. {hinweis}
          </p>
        </div>

        <div
          ref={rahmenRef}
          tabIndex={0}
          role="group"
          aria-label="Bildausschnitt – mit den Pfeiltasten verschieben, mit Plus und Minus vergrößern"
          className="relative w-full cursor-grab touch-none select-none overflow-hidden bg-[#e9e9e2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] active:cursor-grabbing"
          style={{ aspectRatio: verhaeltnis }}
          onPointerDown={ziehenStart}
          onPointerMove={ziehenWeiter}
          onPointerUp={() => (ziehen.current = null)}
          onPointerCancel={() => (ziehen.current = null)}
          onWheel={e => zoomSetzen(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))}
          onKeyDown={taste}
        >
          {bereit && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quelle}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ width: groesse.b * s, height: groesse.h * s, left: rahmen.b / 2 - m.x * s, top: rahmen.h / 2 - m.y * s }}
            />
          )}
          {bereit && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {[100 / 3, 200 / 3].map(p => (
                <span key={p}>
                  <span className="absolute inset-y-0 w-px bg-white/60 shadow-[0_0_2px_rgba(0,0,0,0.6)]" style={{ left: `${p}%` }} />
                  <span className="absolute inset-x-0 h-px bg-white/60 shadow-[0_0_2px_rgba(0,0,0,0.6)]" style={{ top: `${p}%` }} />
                </span>
              ))}
            </div>
          )}
          {!bereit && (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-[#6b6b6b]">
              {fehler ?? 'Bild wird geladen …'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className={knopfKlassen.leise} aria-label="Verkleinern" disabled={!bereit || zoom <= 1} onClick={() => zoomSetzen(zoom - 0.25)}>
            <Minus size={16} />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!bereit}
            aria-label="Vergrößerung"
            onChange={e => zoomSetzen(Number(e.target.value))}
            className="h-8 min-w-0 flex-1 accent-[#0a0a0a]"
          />
          <button type="button" className={knopfKlassen.leise} aria-label="Vergrößern" disabled={!bereit || zoom >= MAX_ZOOM} onClick={() => zoomSetzen(zoom + 0.25)}>
            <Plus size={16} />
          </button>
        </div>

        {fehler && bereit && <p className="text-sm text-red-700">{fehler}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={knopfKlassen.primaer} disabled={!bereit || arbeitet} onClick={uebernehmen}>
            <Check size={15} /> {onAusschnitt ? 'Ausschnitt übernehmen' : 'Zuschnitt übernehmen'}
          </button>
          <button type="button" className={knopfKlassen.sekundaer} onClick={onAbbrechen}>
            Abbrechen
          </button>
          {onOriginal && (
            <button type="button" className={`${knopfKlassen.leise} sm:ml-auto`} onClick={onOriginal}>
              Ohne Zuschneiden verwenden
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
