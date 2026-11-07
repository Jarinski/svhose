'use client'

/**
 * components/foerderverein/ZeitZoom.tsx
 *
 * Zeitleiste als Zahlenstrahl mit Zoom (Darstellung "zahlenstrahl", lib/seiten.ts). Die Bühne bleibt
 * beim Scrollen unter der Navigation stehen (sticky), oben liegt ein Zahlenstrahl mit allen Jahren.
 * Von Halt zu Halt fährt die "Kamera" den Strahl entlang, zoomt dabei heraus und am nächsten Jahr
 * wieder hinein: Fotos und Text wachsen aus der Markierung auf dem Strahl in die Mitte, beim
 * Weiterscrollen fliegen sie nach vorn hinaus. Ein Klick auf ein Jahr im Strahl springt dorthin,
 * ein Klick auf ein Foto öffnet die Großansicht mit allen Fotos des Halts.
 *
 * Woher die Jahre kommen – ein eigenes Feld braucht es nicht:
 * - Stationen: aus der Zeitangabe ("2013", "Oktober 2017"). "Heute" ist das laufende Jahr, Stationen
 *   ohne Jahr ("Die Idee") liegen zwischen ihren Nachbarn und tragen ihre Zeitangabe auf dem Strahl.
 * - Fotos: aus den Bildergalerien der Seite (`fotos`, auch aus ausgeblendeten), jedes beim Jahr in
 *   seiner Bildunterschrift ("2017 Bauschild", "Stadtfest 2025"). Gibt es zu dem Jahr eine Station,
 *   kommen die Fotos zu ihr (bei mehreren zur am besten passenden), sonst wird das Jahr ein eigener
 *   Halt. Fotos ohne Jahr bleiben draußen.
 *
 * Gerechnet wird direkt im Scroll-Ereignis und nur über Styles per Ref – React rendert beim Scrollen
 * nicht neu (außer beim Wechsel des aktiven Halts). Wer weniger Bewegung eingestellt hat, auf sehr
 * niedrigen Bildschirmen und bei nur einem Halt stehen die Halte einfach untereinander.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Grossansicht from '@/components/Grossansicht'
import type { AnzeigeBild } from '@/lib/seiten'
import s from './ZeitZoom.module.css'

export interface ZoomStation {
  schluessel?: string
  zeit: string
  titel: string
  text: string
  bild: AnzeigeBild | null
}

/** Foto aus einer Bildergalerie der Seite. */
export interface ZoomFoto {
  bild: AnzeigeBild | null
  unterschrift: string
}

export interface StrahlPunkt {
  /** Lage auf dem Strahl (bei geschätzten Stationen auch krumm). */
  jahr: number
  /** Beschriftung auf dem Strahl: das Jahr – oder die Zeitangabe, wenn keins drinsteht. */
  marke: string
  /** true: kein Jahr in der Zeitangabe, Lage aus den Nachbarn. */
  geschaetzt: boolean
}

interface HaltFoto {
  bild: AnzeigeBild
  /** vollständig, für Großansicht und Alternativtext */
  unterschrift: string
  /** kurz und ohne Jahr, als Schildchen auf dem Foto ("" = keins) */
  etikett: string
}

/** Ein Halt auf dem Strahl: eine Station mit ihren Fotos – oder ein Jahr, zu dem es nur Fotos gibt. */
interface Halt {
  schluessel: string
  zeit: string
  titel: string
  text: string
  fotos: HaltFoto[]
}

const JAHR = /(^|\D)(1[5-9]\d\d|20\d\d)(?!\d)/
const HEUTE = /^\s*(heute|jetzt|aktuell)(?![a-zäöüß])/i

function jahrIn(text: string): number | null {
  const treffer = JAHR.exec(text)
  return treffer ? Number(treffer[2]) : null
}

/** Bildunterschrift ohne ihre Jahreszahl: "2024EWE Aktion" → "EWE Aktion", "Stadtfest 2025" → "Stadtfest". */
export function ohneJahr(text: string): string {
  return text
    .replace(JAHR, '$1 ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:,.]+|[\s\-–—:,.]+$/g, '')
}

/**
 * Wo die Stationen auf dem Strahl liegen. Ohne ein einziges Jahr wird der Strahl zur einfachen
 * Reihe (0, 1, 2 …) ohne Jahresstriche – `mitJahren` ist dann false.
 */
export function strahlPunkte(zeiten: string[], diesesJahr: number): { punkte: StrahlPunkt[]; mitJahren: boolean } {
  const roh = zeiten.map(zeit => {
    const jahr = jahrIn(zeit)
    if (jahr !== null) return { jahr: jahr as number | null, marke: String(jahr) }
    if (HEUTE.test(zeit)) return { jahr: diesesJahr as number | null, marke: zeit.trim() }
    return { jahr: null as number | null, marke: zeit.trim() }
  })
  const bekannt = roh.flatMap((r, i) => (r.jahr === null ? [] : [i]))
  if (bekannt.length === 0) {
    return { mitJahren: false, punkte: roh.map((r, i) => ({ jahr: i, marke: r.marke || String(i + 1), geschaetzt: true })) }
  }
  return {
    mitJahren: true,
    punkte: roh.map((r, i) => {
      if (r.jahr !== null) return { jahr: r.jahr, marke: r.marke, geschaetzt: false }
      const vor = bekannt.filter(j => j < i).pop()
      const nach = bekannt.filter(j => j > i)[0]
      const jahrVon = (j: number) => roh[j].jahr as number
      let jahr: number
      if (vor !== undefined && nach !== undefined) jahr = jahrVon(vor) + ((jahrVon(nach) - jahrVon(vor)) * (i - vor)) / (nach - vor)
      else if (nach !== undefined) jahr = jahrVon(nach) - (nach - i)
      else jahr = jahrVon(vor as number) + (i - (vor as number))
      return { jahr, marke: r.marke || '•', geschaetzt: true }
    }),
  }
}

/**
 * Wie viele Wörter (ab vier Buchstaben) der Bildunterschrift im Text vorkommen – verglichen über
 * den Wortanfang, damit "entsteht" auch "entstehen" trifft.
 */
function gemeinsameWoerter(unterschrift: string, text: string): number {
  const heuhaufen = text.toLowerCase()
  return (unterschrift.toLowerCase().match(/[a-zäöüß]{4,}/g) ?? []).filter(wort => heuhaufen.includes(wort.slice(0, 6))).length
}

/** Stationen und Galerie-Fotos zu Halten zusammenführen (siehe Kopf der Datei). */
export function halteBilden(eintraege: ZoomStation[], fotos: ZoomFoto[], diesesJahr: number): Halt[] {
  const { punkte, mitJahren } = strahlPunkte(
    eintraege.map(e => e.zeit),
    diesesJahr,
  )
  const halte = eintraege.map((e, i) => ({
    schluessel: e.schluessel ?? `s${i}`,
    zeit: e.zeit,
    titel: e.titel,
    text: e.text,
    fotos: e.bild ? [{ bild: e.bild, unterschrift: e.titel, etikett: '' }] : ([] as HaltFoto[]),
    jahr: punkte[i].jahr,
    genau: !punkte[i].geschaetzt,
  }))

  // Fotos je Jahr, in der Reihenfolge der Galerie
  const gruppen = new Map<number, HaltFoto[]>()
  for (const f of fotos) {
    const jahr = jahrIn(f.unterschrift)
    if (!f.bild || jahr === null) continue
    gruppen.set(jahr, [...(gruppen.get(jahr) ?? []), { bild: f.bild, unterschrift: f.unterschrift, etikett: ohneJahr(f.unterschrift) }])
  }

  for (const jahr of [...gruppen.keys()].sort((a, b) => a - b)) {
    const liste = gruppen.get(jahr) as HaltFoto[]
    const passend = halte.filter(h => h.genau && h.jahr === jahr)
    if (passend.length === 1) {
      passend[0].fotos.push(...liste)
      continue
    }
    if (passend.length > 1) {
      // Mehrere Stationen im selben Jahr: jedes Foto zu der, mit der seine Unterschrift die meisten
      // Wörter teilt ("2018 Baltic Sea Circle" → die Station über den Baltic Sea Circle); sonst zu der
      // mit den wenigsten Fotos
      for (const foto of liste) {
        let beste = passend[0]
        let besteWertung = -1
        for (const h of passend) {
          const wertung = gemeinsameWoerter(foto.etikett, `${h.titel} ${h.text}`) * 100 - h.fotos.length
          if (wertung > besteWertung) {
            beste = h
            besteWertung = wertung
          }
        }
        beste.fotos.push(foto)
      }
      continue
    }
    // eigener Halt: hinter die letzte Station, die nicht später liegt
    let stelle = halte.length
    if (mitJahren) {
      stelle = 0
      halte.forEach((h, i) => {
        if (h.jahr <= jahr) stelle = i + 1
      })
    }
    halte.splice(stelle, 0, {
      schluessel: `j${jahr}`,
      zeit: String(jahr),
      titel: liste[0].etikett,
      text: '',
      // die erste Unterschrift steht schon als Titel da
      fotos: liste.map((f, k) => (k === 0 ? { ...f, etikett: '' } : f)),
      jahr,
      genau: true,
    })
  }
  return halte.map(({ schluessel, zeit, titel, text, fotos }) => ({ schluessel, zeit, titel, text, fotos }))
}

// ─── Bewegung ───────────────────────────────────────────────────────────────

/** Anteil jedes Scroll-Schritts, in dem ein Halt ruhig stehen bleibt (vorn und hinten). */
const HALT = 0.2
/** So viele Fotos zeigt ein Halt als Collage; der Rest steht in der Großansicht. */
const FOTOS_SICHTBAR = 3

const zwischen = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x))
const glatt = (x: number) => {
  const t = zwischen(x, 0, 1)
  return t * t * (3 - 2 * t)
}

/** Scroll-Fortschritt (0 … n−1) → Lage der Kamera, mit Halt an jeder Station. */
function treppe(r: number, n: number): number {
  const i = Math.min(Math.floor(r), n - 2)
  return i + glatt((r - i - HALT) / (1 - 2 * HALT))
}

interface Strich {
  jahr: number
  /** 1 jedes Jahr, 2 alle fünf, 3 alle zehn Jahre */
  rang: 1 | 2 | 3
  /** false, wenn auf oder dicht an dem Jahr ein Halt steht – der beschriftet es selbst */
  beschriftet: boolean
}

function striche(punkte: StrahlPunkt[], diesesJahr: number): Strich[] {
  const jahre = punkte.map(p => p.jahr)
  const letztes = Math.ceil(Math.max(...jahre))
  const von = Math.floor(Math.min(...jahre)) - 3
  // keine Jahre in der Zukunft hinter "Heute"
  const bis = Math.min(letztes + 3, Math.max(letztes, diesesJahr))
  const takt = bis - von > 300 ? 5 : 1
  const liste: Strich[] = []
  for (let jahr = Math.ceil(von / takt) * takt; jahr <= bis; jahr += takt) {
    const belegt = punkte.some(p => Math.abs(p.jahr - jahr) < 0.6)
    liste.push({ jahr, rang: jahr % 10 === 0 ? 3 : jahr % 5 === 0 ? 2 : 1, beschriftet: !belegt })
  }
  return liste
}

const RANG_ABSTAND = { 1: 1, 2: 5, 3: 10 } as const

// ─── Anzeige ────────────────────────────────────────────────────────────────

/** Fotos und Text eines Halts – auf der Bühne und in der Liste ohne Bewegung. */
function HaltKarte({ halt, titelTag: Titel, onFoto }: { halt: Halt; titelTag: 'h2' | 'h3'; onFoto: (index: number) => void }) {
  const gezeigt = halt.fotos.slice(0, FOTOS_SICHTBAR)
  const mehr = halt.fotos.length - gezeigt.length
  return (
    <div className={`${s.karte} ${gezeigt.length ? '' : s.ohneFoto}`}>
      {gezeigt.length > 0 && (
        <div className={`${s.fotos} ${s[`fotos${gezeigt.length}`]}`}>
          {gezeigt.map((f, j) => {
            const plus = mehr > 0 && j === gezeigt.length - 1
            return (
              <button
                key={j}
                type="button"
                className={s.kachel}
                onClick={() => onFoto(j)}
                aria-label={plus ? `Alle ${halt.fotos.length} Fotos groß anzeigen` : `${f.unterschrift || halt.titel || 'Foto'} – groß anzeigen`}
              >
                {/* Bilder liegen schon verkleinert im Medienordner – normales <img> wie im übrigen Seitenaufbau */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.bild.src} alt={f.unterschrift} width={f.bild.breite || undefined} height={f.bild.hoehe || undefined} decoding="async" />
                {plus ? <span className={s.mehr}>+{mehr}</span> : f.etikett && <span className={s.etikett}>{f.etikett}</span>}
              </button>
            )
          })}
        </div>
      )}
      <div className={s.text}>
        {halt.zeit.trim() && <div className={s.zeit}>{halt.zeit}</div>}
        {halt.titel.trim() && <Titel className={s.titel}>{halt.titel}</Titel>}
        {halt.text.trim() && <p className={s.absatz}>{halt.text}</p>}
      </div>
    </div>
  )
}

export default function ZeitZoom({
  eintraege,
  fotos,
  titelTag,
  kopf,
}: {
  eintraege: ZoomStation[]
  /** Fotos aus den Bildergalerien der Seite – einsortiert nach dem Jahr in der Bildunterschrift */
  fotos: ZoomFoto[]
  /** h2 ohne Überschrift über der Zeitleiste, sonst h3 */
  titelTag: 'h2' | 'h3'
  /** Überschrift über der Zeitleiste (oder null) */
  kopf: ReactNode
}) {
  const diesesJahr = new Date().getFullYear()
  const halte = halteBilden(eintraege, fotos, diesesJahr)
  const n = halte.length
  const { punkte, mitJahren } = strahlPunkte(
    halte.map(h => h.zeit),
    diesesJahr,
  )
  const skala = mitJahren ? striche(punkte, diesesJahr) : []
  const jahreSchluessel = punkte.map(p => p.jahr).join(',')

  const [ruhig, setRuhig] = useState(false)
  const [aktiv, setAktiv] = useState(0)
  const [offen, setOffen] = useState<{ halt: number; index: number } | null>(null)

  const sektionRef = useRef<HTMLElement>(null)
  const buehneRef = useRef<HTMLDivElement>(null)
  const bereichRef = useRef<HTMLDivElement>(null)
  const skalaRef = useRef<HTMLDivElement>(null)
  const hinweisRef = useRef<HTMLDivElement>(null)
  const haltRefs = useRef<(HTMLLIElement | null)[]>([])
  const zahlRefs = useRef<(HTMLDivElement | null)[]>([])
  const markeRefs = useRef<(HTMLSpanElement | null)[]>([])
  const markeTextRefs = useRef<(HTMLSpanElement | null)[]>([])
  const strichRefs = useRef<(HTMLSpanElement | null)[]>([])
  const strichTextRefs = useRef<(HTMLSpanElement | null)[]>([])

  // Weniger Bewegung oder sehr niedriger Bildschirm (Handy quer): ohne Zoom
  useEffect(() => {
    const abfrage = window.matchMedia('(prefers-reduced-motion: reduce), (max-height: 499px)')
    const pruefen = () => setRuhig(abfrage.matches)
    pruefen()
    abfrage.addEventListener('change', pruefen)
    return () => abfrage.removeEventListener('change', pruefen)
  }, [])

  const springen = useCallback(
    (i: number) => {
      const sektion = sektionRef.current
      const buehne = buehneRef.current
      if (!sektion || !buehne || n < 2) return
      const weg = sektion.offsetHeight - buehne.offsetHeight
      // die Bühne rastet unter der Navigation ein (CSS top), nicht am Fensterrand
      const start = sektion.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(buehne).top) || 0)
      window.scrollTo({ top: start + (weg * i) / (n - 1), behavior: 'smooth' })
    },
    [n],
  )

  const zoom = !ruhig && n >= 2

  useEffect(() => {
    if (!zoom) return
    const sektion = sektionRef.current
    const buehne = buehneRef.current
    const bereich = bereichRef.current
    const skalaEl = skalaRef.current
    if (!sektion || !buehne || !bereich || !skalaEl) return

    const jahre = jahreSchluessel.split(',').map(Number)
    let breite = 0
    let oben = 0
    let strahlY = 0
    let zuletztAktiv = -1
    // halbe Breite jeder Beschriftung auf dem Strahl – daran hängt, ob sie neben den Nachbarn Platz hat
    let halbeText: number[] = []
    let halbeZahl = 14
    let bilder: HTMLImageElement[][] = []
    // wie weit jede Karte über die Bühne hinausragt (langer Text) – um so viel fährt sie im Halt nach oben
    let ueber: number[] = []

    const messen = () => {
      breite = buehne.clientWidth
      oben = parseFloat(getComputedStyle(buehne).top) || 0
      const b = bereich.getBoundingClientRect()
      const k = skalaEl.getBoundingClientRect()
      // vom Mittelpunkt der Karten bis zur Linie des Strahls
      strahlY = k.top + parseFloat(getComputedStyle(skalaEl).getPropertyValue('--linie') || '0') - (b.top + b.height / 2)
      halbeText = markeTextRefs.current.map(el => (el ? el.offsetWidth / 2 : 0))
      const zahlEl = strichTextRefs.current.find(Boolean)
      if (zahlEl) halbeZahl = zahlEl.offsetWidth / 2
      bilder = haltRefs.current.map(el => (el ? Array.from(el.querySelectorAll('img')) : []))
      ueber = haltRefs.current.map(el => {
        const karte = el?.lastElementChild as HTMLElement | null
        return karte ? Math.max(0, karte.scrollHeight - karte.clientHeight) : 0
      })
    }

    const zeichnen = () => {
      const rect = sektion.getBoundingClientRect()
      const weg = sektion.offsetHeight - buehne.offsetHeight
      const r = weg > 0 ? zwischen((oben - rect.top) / weg, 0, 1) * (n - 1) : 0
      const p = treppe(r, n)

      // Kamera: Jahr in der Mitte und Pixel pro Jahr – an den Halten nah, dazwischen weiter weg
      const i0 = Math.min(Math.floor(p), n - 2)
      const f = p - i0
      const a = jahre[i0]
      const b = jahre[i0 + 1]
      const kamera = a + (b - a) * f
      const nah = zwischen(breite * 0.2, 70, 220)
      const fern = Math.min(nah * 0.5, (breite * 0.55) / Math.max(Math.abs(b - a), 0.001))
      const z = nah * Math.pow(fern / nah, Math.sin(Math.PI * f))
      const halb = breite / 2

      strichRefs.current.forEach((el, j) => {
        const strich = skala[j]
        if (!el || !strich) return
        const x = (strich.jahr - kamera) * z
        el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
        el.style.opacity = Math.abs(x) > halb + 40 ? '0' : String(zwischen((z * (strich.rang === 1 ? 1 : 5) - 3) / 6, 0, 1))
        const text = strichTextRefs.current[j]
        if (!text) return
        let deckkraft = strich.beschriftet ? zwischen((z * RANG_ABSTAND[strich.rang] - 52) / 24, 0, 1) : 0
        // Jahreszahlen weichen den Beschriftungen der Halte
        for (let i = 0; deckkraft > 0 && i < n; i++) {
          deckkraft = Math.min(deckkraft, zwischen((Math.abs(strich.jahr - jahre[i]) * z - halbeZahl - halbeText[i] - 6) / 12, 0, 1))
        }
        text.style.opacity = String(deckkraft)
      })

      const naechster = Math.round(p)
      markeRefs.current.forEach((el, i) => {
        if (!el) return
        const x = (jahre[i] - kamera) * z
        el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
        const text = markeTextRefs.current[i]
        if (!text) return
        // Mehrere Halte im selben Jahr tragen eine Beschriftung: die des aktiven, sonst die des ersten
        const gleiche = jahre.flatMap((jahr, j) => (jahr === jahre[i] ? [j] : []))
        const traeger = gleiche.includes(naechster) ? naechster : gleiche[0]
        if (i !== traeger) {
          text.style.opacity = '0'
          return
        }
        // ausblenden, sobald sie eine andere Beschriftung berühren würde (die aktive bleibt immer)
        let platz = Infinity
        for (let j = 0; j < n; j++) {
          if (jahre[j] !== jahre[i]) platz = Math.min(platz, Math.abs(jahre[j] - jahre[i]) * z - halbeText[i] - halbeText[j] - 8)
        }
        text.style.opacity = i === naechster ? '1' : String(zwischen(platz / 16, 0, 1))
      })

      haltRefs.current.forEach((el, i) => {
        if (!el) return
        const t = p - i
        const zahl = zahlRefs.current[i]
        // Unsichtbare Halte liegen gestapelt über dem aktiven – sie dürfen keine Klicks abfangen
        el.style.pointerEvents = Math.abs(t) < 0.5 ? 'auto' : 'none'
        if (t <= -1 || t >= 1) {
          el.style.opacity = '0'
          el.style.zIndex = '1'
          if (zahl) zahl.style.opacity = '0'
          return
        }
        // Im Halt fährt eine zu hohe Karte langsam nach oben, damit der ganze Text zu lesen ist
        const von = Math.max(0, i - HALT)
        const bis = Math.min(n - 1, i + HALT)
        const fahrt = -(ueber[i] ?? 0) * zwischen((r - von) / Math.max(bis - von, 0.001), 0, 1)
        let transform: string
        let deckkraft: number
        if (t < 0) {
          // kommt: wächst aus seiner Markierung auf dem Strahl in die Mitte
          const k = glatt(-t)
          const dx = zwischen((jahre[i] - kamera) * z, -breite * 0.45, breite * 0.45) * k
          transform = `translate3d(${dx.toFixed(1)}px,${(strahlY * k + fahrt).toFixed(1)}px,0) scale(${(1 - 0.9 * k).toFixed(4)})`
          deckkraft = 1 - glatt((-t - 0.35) / 0.65)
          if (zahl) {
            zahl.style.transform = `scale(${(1 - 0.65 * k).toFixed(4)})`
            zahl.style.opacity = String(1 - k)
          }
        } else {
          // geht: fliegt nach vorn hinaus
          const k = glatt(t)
          transform = `translate3d(0,${(-bereich.clientHeight * 0.05 * k + fahrt).toFixed(1)}px,0) scale(${(1 + 0.9 * k).toFixed(4)})`
          deckkraft = 1 - glatt(t / 0.7)
          if (zahl) {
            zahl.style.transform = `scale(${(1 + 2.2 * k).toFixed(4)})`
            zahl.style.opacity = String(1 - glatt(t / 0.6))
          }
        }
        el.style.transform = transform
        el.style.opacity = deckkraft.toFixed(3)
        el.style.zIndex = t > 0 ? '3' : '2'
        // die Fotos zoomen die ganze Zeit langsam weiter hinein, jedes etwas versetzt
        const fotosHier = bilder[i] ?? []
        fotosHier.forEach((img, j) => {
          img.style.transform = `scale(${(1.04 + 0.07 * (t + 1) + 0.02 * j).toFixed(4)})`
        })
      })

      if (hinweisRef.current) hinweisRef.current.style.opacity = String(1 - zwischen(r * 4, 0, 1))
      if (naechster !== zuletztAktiv) {
        zuletztAktiv = naechster
        setAktiv(naechster)
      }
    }

    const neuMessen = () => {
      messen()
      zeichnen()
    }
    neuMessen()
    buehne.setAttribute('data-bereit', '')
    window.addEventListener('scroll', zeichnen, { passive: true })
    window.addEventListener('resize', neuMessen)
    const beobachter = new ResizeObserver(neuMessen)
    beobachter.observe(buehne)
    // Textblöcke der Karten: ändern ihre Höhe z. B., wenn die Schrift nachgeladen ist
    haltRefs.current.forEach(el => {
      const text = el?.lastElementChild?.lastElementChild
      if (text) beobachter.observe(text)
    })
    return () => {
      window.removeEventListener('scroll', zeichnen)
      window.removeEventListener('resize', neuMessen)
      beobachter.disconnect()
      buehne.removeAttribute('data-bereit')
    }
    // skala und die Halte hängen nur an den Jahren (jahreSchluessel) bzw. an n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, n, jahreSchluessel])

  const grossansicht = offen !== null && halte[offen.halt] && (
    <Grossansicht fotos={halte[offen.halt].fotos} index={offen.index} onIndex={index => setOffen({ halt: offen.halt, index })} onSchliessen={() => setOffen(null)} />
  )

  // Ohne Bewegung: die Halte untereinander, mit denselben Karten
  if (!zoom) {
    return (
      <div>
        {kopf}
        <ol className={s.liste}>
          {halte.map((h, i) => (
            <li key={h.schluessel}>
              <HaltKarte halt={h} titelTag={titelTag} onFoto={index => setOffen({ halt: i, index })} />
            </li>
          ))}
        </ol>
        {grossansicht}
      </div>
    )
  }

  return (
    <div>
      {kopf}
      <section ref={sektionRef} className={s.zoom} style={{ '--anzahl': n } as CSSProperties}>
        <div ref={buehneRef} className={s.buehne}>
          <div ref={bereichRef} className={s.bereich}>
            <ol className={s.stationen}>
              {halte.map((h, i) => (
                <li
                  key={h.schluessel}
                  ref={el => {
                    haltRefs.current[i] = el
                  }}
                  className={s.station}
                  aria-current={i === aktiv ? 'step' : undefined}
                >
                  <div
                    aria-hidden
                    ref={el => {
                      zahlRefs.current[i] = el
                    }}
                    className={`${s.zahl} ${punkte[i].marke.length > 5 ? s.zahlLang : ''} ${h.fotos.length ? s.zahlRechts : ''}`}
                  >
                    {punkte[i].marke}
                  </div>
                  <HaltKarte halt={h} titelTag={titelTag} onFoto={index => setOffen({ halt: i, index })} />
                </li>
              ))}
            </ol>
            <div ref={hinweisRef} aria-hidden className={s.hinweis}>
              Scrollen und durch die Jahre zoomen
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M6 1.5v8m0 0L2.5 6M6 9.5 9.5 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className={s.strahl}>
            <div ref={skalaRef} className={s.skala}>
              <span aria-hidden className={s.linie} />
              <span aria-hidden className={s.mitte} />
              {skala.map((strich, j) => (
                <span
                  key={strich.jahr}
                  aria-hidden
                  ref={el => {
                    strichRefs.current[j] = el
                  }}
                  className={`${s.strich} ${s[`rang${strich.rang}`]}`}
                >
                  <span
                    ref={el => {
                      strichTextRefs.current[j] = el
                    }}
                    className={s.strichText}
                  >
                    {strich.jahr}
                  </span>
                </span>
              ))}
              {punkte.map((punkt, i) => (
                <span
                  key={halte[i].schluessel}
                  ref={el => {
                    markeRefs.current[i] = el
                  }}
                  className={`${s.marke} ${i === aktiv ? s.markeAktiv : ''}`}
                >
                  <button
                    type="button"
                    className={`${s.markeKnopf} ${i === aktiv ? s.aktiv : ''}`}
                    aria-label={`${halte[i].zeit.trim() || punkt.marke}${halte[i].titel ? `: ${halte[i].titel}` : ''} – hinspringen`}
                    aria-current={i === aktiv ? 'step' : undefined}
                    onClick={() => springen(i)}
                  >
                    <span className={s.punkt} />
                    <span
                      ref={el => {
                        markeTextRefs.current[i] = el
                      }}
                      className={s.markeText}
                    >
                      {punkt.marke}
                    </span>
                  </button>
                </span>
              ))}
            </div>
            <div aria-hidden className={s.zaehler}>
              {String(aktiv + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </div>
          </div>
        </div>
      </section>
      {grossansicht}
    </div>
  )
}
