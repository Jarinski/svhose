'use client'

/**
 * components/glas/glasLinse.ts
 *
 * Linse für Glasflächen („Liquid Glass“): Am Rand einer Fläche wird der Hintergrund wie durch eine
 * gewölbte Glaskante zur Mitte hin verzogen. Dafür bekommt das Element einen SVG-Filter mit einer
 * Verschiebungskarte (feDisplacementMap), die genau auf seine Größe und Eckenrundung gezeichnet wird.
 * Das CSS bindet ihn über die Variable --linse ein: `backdrop-filter: var(--linse,) blur(…)`.
 *
 * Nur Chromium (Chrome, Edge, Android) kann SVG-Filter in backdrop-filter. Safari und Firefox – und
 * wer „Transparenz reduzieren“ eingestellt hat – bekommen das matte Glas ohne Linse.
 */

import { useEffect, useRef } from 'react'

const SVG_NS = 'http://www.w3.org/2000/svg'
let laufendeNummer = 0

function linseMoeglich(): boolean {
  return 'userAgentData' in navigator && !matchMedia('(prefers-reduced-transparency: reduce)').matches
}

/** Eckenradius in px – auch aus Prozentangaben wie 50 % beim runden Knopf */
function eckenradius(el: HTMLElement, breite: number, hoehe: number): number {
  const wert = getComputedStyle(el).borderTopLeftRadius
  const zahl = parseFloat(wert) || 0
  const px = wert.trim().endsWith('%') ? (zahl / 100) * Math.min(breite, hoehe) : zahl
  return Math.min(px, breite / 2, hoehe / 2)
}

/**
 * Zeichnet die Verschiebungskarte: Rot = waagrecht, Grün = senkrecht, 128 = keine Verschiebung.
 * Innerhalb des Rands (band px von der Kante) wird von weiter innen gelesen, an der Kante am stärksten.
 */
function verschiebungsKarte(breite: number, hoehe: number, radius: number, band: number): string {
  const leinwand = document.createElement('canvas')
  leinwand.width = breite
  leinwand.height = hoehe
  const kontext = leinwand.getContext('2d')
  if (!kontext) return ''
  const bild = kontext.createImageData(breite, hoehe)
  const d = bild.data
  const halbB = breite / 2
  const halbH = hoehe / 2

  for (let y = 0; y < hoehe; y++) {
    const py = y + 0.5 - halbH
    const qy = Math.abs(py) - (halbH - radius)
    for (let x = 0; x < breite; x++) {
      const px = x + 0.5 - halbB
      const qx = Math.abs(px) - (halbB - radius)
      // Abstand zur Kante (innen positiv) und Richtung nach außen
      let abstand: number
      let nx = 0
      let ny = 0
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy)
        abstand = radius - l
        nx = (qx / l) * Math.sign(px)
        ny = (qy / l) * Math.sign(py)
      } else if (qx > qy) {
        abstand = radius - qx
        nx = Math.sign(px)
      } else {
        abstand = radius - qy
        ny = Math.sign(py)
      }
      let staerke = 0
      if (abstand >= 0 && abstand < band) {
        const t = 1 - abstand / band
        staerke = t * t
      }
      const i = (y * breite + x) * 4
      d[i] = 128 - nx * staerke * 127
      d[i + 1] = 128 - ny * staerke * 127
      d[i + 2] = 128
      d[i + 3] = 255
    }
  }
  kontext.putImageData(bild, 0, 0)
  return leinwand.toDataURL()
}

/**
 * Hängt die Linse an das Element mit dem zurückgegebenen ref.
 * @param band Breite des gewölbten Rands in px
 * @param staerke größte Verschiebung an der Kante in px
 */
export function useGlasLinse<T extends HTMLElement>(band: number, staerke: number) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !linseMoeglich()) return

    const id = `glas-linse-${++laufendeNummer}`
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.style.position = 'absolute'
    const filter = document.createElementNS(SVG_NS, 'filter')
    filter.id = id
    filter.setAttribute('filterUnits', 'userSpaceOnUse')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    const karte = document.createElementNS(SVG_NS, 'feImage')
    karte.setAttribute('result', 'karte')
    karte.setAttribute('preserveAspectRatio', 'none')
    karte.setAttribute('x', '0')
    karte.setAttribute('y', '0')
    const verschieben = document.createElementNS(SVG_NS, 'feDisplacementMap')
    verschieben.setAttribute('in', 'SourceGraphic')
    verschieben.setAttribute('in2', 'karte')
    // Die Karte lenkt höchstens um ±0,5 aus – die Skala ist also die doppelte Verschiebung
    verschieben.setAttribute('scale', String(staerke * 2))
    verschieben.setAttribute('xChannelSelector', 'R')
    verschieben.setAttribute('yChannelSelector', 'G')
    filter.append(karte, verschieben)
    svg.append(filter)
    document.body.append(svg)

    let groesse = ''
    const zeichnen = () => {
      const breite = Math.round(el.offsetWidth)
      const hoehe = Math.round(el.offsetHeight)
      const radius = eckenradius(el, breite, hoehe)
      const neu = `${breite}x${hoehe}x${radius}`
      if (!breite || !hoehe || neu === groesse) return
      groesse = neu
      for (const knoten of [filter, karte]) {
        knoten.setAttribute('width', String(breite))
        knoten.setAttribute('height', String(hoehe))
      }
      karte.setAttribute('href', verschiebungsKarte(breite, hoehe, radius, band))
      el.style.setProperty('--linse', `url(#${id})`)
    }
    zeichnen()
    const beobachter = new ResizeObserver(zeichnen)
    beobachter.observe(el)

    return () => {
      beobachter.disconnect()
      svg.remove()
      el.style.removeProperty('--linse')
    }
  }, [band, staerke])

  return ref
}
