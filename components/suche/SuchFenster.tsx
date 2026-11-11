'use client'

/**
 * components/suche/SuchFenster.tsx
 *
 * Schnellsuche im Glasfenster („Liquid Glass“, components/glas) auf jeder Seite der Website.
 * Öffnet über die Lupe in der Navigation, den Suchknopf der Seitenleiste (components/suche/oeffnen.ts)
 * und die Tasten Strg+K / ⌘+K oder „/“. Die Treffer kommen beim Tippen von /api/suche, je Art
 * höchstens drei; „Alle Treffer“ führt zur Seite /suche.
 *
 * Bedienung: ↑/↓ wählt einen Treffer, Enter öffnet ihn (ohne Auswahl: alle Treffer auf /suche),
 * Esc, ✕ oder ein Klick neben das Fenster schließen. Am Handy füllt das Fenster den Bildschirm.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react'
import GlasEbenen from '@/components/glas/GlasEbenen'
import { ART_NAMEN, type SuchErgebnis } from '@/lib/suche/typen'
import { SUCHE_OEFFNEN } from './oeffnen'
import Treffer from './Treffer'
import s from './SuchFenster.module.css'

/** Wartezeit nach dem letzten Tastendruck, bevor gesucht wird */
const PAUSE_MS = 140

const HAEUFIG: { href: string; label: string }[] = [
  { href: '/trainingszeiten', label: 'Trainingszeiten' },
  { href: '/termine', label: 'Termine' },
  { href: '/downloads', label: 'Mitglied werden' },
  { href: '/vereinsheim', label: 'Vereinsheim mieten' },
  { href: '/sportplaetze', label: 'Sportplätze' },
  { href: '/ansprechpartner', label: 'Kontakt' },
]

function istEingabefeld(ziel: EventTarget | null): boolean {
  const el = ziel as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

function suchSeite(q: string, art?: string): string {
  const p = new URLSearchParams({ q })
  if (art) p.set('art', art)
  return `/suche?${p}`
}

export default function SuchFenster() {
  const [offen, setOffen] = useState(false)
  const pfad = usePathname()

  // Öffnen: Ereignis von Lupe/Seitenleiste und Tastenkürzel
  useEffect(() => {
    const oeffnen = () => setOffen(true)
    function taste(e: KeyboardEvent) {
      const strgK = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey
      const schraegstrich = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !istEingabefeld(e.target)
      if (!strgK && !schraegstrich) return
      e.preventDefault()
      oeffnen()
    }
    window.addEventListener(SUCHE_OEFFNEN, oeffnen)
    document.addEventListener('keydown', taste)
    return () => {
      window.removeEventListener(SUCHE_OEFFNEN, oeffnen)
      document.removeEventListener('keydown', taste)
    }
  }, [])

  // Nach einem Seitenwechsel (z. B. über „Häufig gesucht“) ist das Fenster zu
  const [offenAuf, setOffenAuf] = useState(pfad)
  if (offenAuf !== pfad) {
    setOffenAuf(pfad)
    if (offen) setOffen(false)
  }

  return offen ? <Fenster onZu={() => setOffen(false)} /> : null
}

function Fenster({ onZu }: { onZu: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const feld = useRef<HTMLInputElement>(null)
  const liste = useRef<HTMLUListElement>(null)
  /** Begann der Klick auf dem Hintergrund? (Text markieren und daneben loslassen schließt nicht) */
  const druckAufHintergrund = useRef(false)
  const schliesst = useRef(false)
  const [zu, setZu] = useState(false)

  const [eingabe, setEingabe] = useState('')
  const [ergebnis, setErgebnis] = useState<SuchErgebnis | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(false)
  const [aktiv, setAktiv] = useState(-1)
  const listenId = useId()
  const titelId = useId()

  const suchbegriff = eingabe.trim()
  const sucht = suchbegriff.length >= 2
  // Bis die neuen Treffer da sind, bleiben die alten stehen – die Liste springt so nicht hin und her
  const zeigen = sucht ? ergebnis : null

  // Als modaler Dialog: Fokus bleibt drin, die Seite dahinter scrollt nicht mit (wie das News-Fenster)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    const vorherFokus = document.activeElement as HTMLElement | null
    if (!d.open) d.showModal()
    feld.current?.focus()
    const html = document.documentElement
    const vorher = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter }
    html.style.overflow = 'hidden'
    html.style.scrollbarGutter = 'stable'
    return () => {
      html.style.overflow = vorher.overflow
      html.style.scrollbarGutter = vorher.gutter
      // Fokus zurück an die Lupe bzw. den Knopf, der das Fenster geöffnet hat
      if (vorherFokus?.isConnected) vorherFokus.focus({ preventScroll: true })
    }
  }, [])

  // Suchen beim Tippen – kurze Pause abwarten, veraltete Anfragen abbrechen
  useEffect(() => {
    if (suchbegriff.length < 2) return
    const abbruch = new AbortController()
    const zeit = setTimeout(async () => {
      setLaedt(true)
      try {
        const antwort = await fetch(`/api/suche?${new URLSearchParams({ q: suchbegriff, n: '24', je: '3' })}`, { signal: abbruch.signal })
        if (!antwort.ok) throw new Error(String(antwort.status))
        setErgebnis(await antwort.json())
        setFehler(false)
        setAktiv(-1)
      } catch {
        if (!abbruch.signal.aborted) setFehler(true)
      } finally {
        if (!abbruch.signal.aborted) setLaedt(false)
      }
    }, PAUSE_MS)
    return () => {
      clearTimeout(zeit)
      abbruch.abort()
    }
  }, [suchbegriff])

  const schliessen = useCallback(() => {
    if (schliesst.current) return
    schliesst.current = true
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) onZu()
    else setZu(true) // Ausblenden per CSS, danach zu (onAnimationEnd)
  }, [onZu])

  const treffer = zeigen?.treffer ?? []
  const gesamt = zeigen ? Object.values(zeigen.proArt).reduce((a, b) => a + b, 0) : 0

  // Gewählten Treffer sichtbar halten
  useEffect(() => {
    if (aktiv < 0) return
    liste.current?.querySelector<HTMLElement>(`[data-nr="${aktiv}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [aktiv])

  function taste(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && treffer.length > 0) {
      e.preventDefault()
      setAktiv(a => (a + 1) % treffer.length)
    } else if (e.key === 'ArrowUp' && treffer.length > 0) {
      e.preventDefault()
      setAktiv(a => (a <= 0 ? treffer.length - 1 : a - 1))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      const t = treffer[aktiv]
      if (t) {
        // Wie ein Klick auf den Link – inklusive Sprung zur Fundstelle
        liste.current?.querySelector<HTMLAnchorElement>(`[data-nr="${aktiv}"] a`)?.click()
      } else if (suchbegriff) {
        window.location.assign(suchSeite(suchbegriff))
      }
    }
  }

  // Treffer kommen nach Art sortiert (je Art höchstens drei) – Überschrift vor jeder neuen Art
  let vorige: string | null = null

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      data-zu={zu || undefined}
      aria-labelledby={titelId}
      onCancel={e => {
        e.preventDefault()
        schliessen()
      }}
      // Hat der Browser den Dialog selbst geschlossen, ist er zu
      onClose={() => onZu()}
      onPointerDown={e => {
        druckAufHintergrund.current = e.target === e.currentTarget
      }}
      onClick={e => {
        if (druckAufHintergrund.current && e.target === e.currentTarget) schliessen()
      }}
    >
      <div
        ref={panel}
        className={s.panel}
        onAnimationEnd={e => {
          if (zu && e.target === panel.current) onZu()
        }}
      >
        <GlasEbenen band={9} staerke={10} unschaerfe="stark" />

        <h2 id={titelId} className="sr-only">Website durchsuchen</h2>

        <form
          className={s.kopf}
          role="search"
          action="/suche"
          onSubmit={e => {
            e.preventDefault()
            if (suchbegriff) window.location.assign(suchSeite(suchbegriff))
          }}
        >
          <svg className={s.lupe} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={feld}
            className={s.eingabe}
            // text statt search: Esc soll das Fenster schließen, nicht nur das Feld leeren
            type="text"
            inputMode="search"
            name="q"
            value={eingabe}
            onChange={e => setEingabe(e.target.value)}
            onKeyDown={taste}
            placeholder="Website durchsuchen …"
            aria-label="Suchbegriff"
            role="combobox"
            aria-expanded={treffer.length > 0}
            aria-controls={listenId}
            aria-autocomplete="list"
            aria-activedescendant={aktiv >= 0 ? `${listenId}-${aktiv}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={120}
          />
          {laedt && <span className={s.laden} aria-hidden="true" />}
          {eingabe && (
            <button
              type="button"
              className={s.leeren}
              onClick={() => {
                setEingabe('')
                setErgebnis(null)
                setAktiv(-1)
                feld.current?.focus()
              }}
            >
              Leeren
            </button>
          )}
          <button type="button" className={s.schliessen} onClick={schliessen} aria-label="Suche schließen">
            <GlasEbenen band={7} staerke={5} unschaerfe="leicht" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </form>

        <div className={s.koerper}>
          {!sucht && (
            <div className={s.leer}>
              <div className={s.gruppe}>Häufig gesucht</div>
              <ul className={s.chips}>
                {HAEUFIG.map(z => (
                  <li key={z.href}>
                    <Link href={z.href} className={s.chip} onClick={() => onZu()}>
                      {z.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className={s.tipp}>
                Durchsucht News, Sparten, Mannschaften, Trainingszeiten, Termine, Kontakte, Downloads und alle Seiten.
              </p>
            </div>
          )}

          {sucht && (
            <>
              <p className={s.status} aria-live="polite">
                {fehler
                  ? 'Die Suche ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.'
                  : !zeigen
                    ? 'Suche läuft …'
                    : gesamt === 0
                    ? `Keine Treffer für „${zeigen.eingabe}“.`
                    : zeigen.korrektur
                      ? `Keine Treffer für „${zeigen.eingabe}“ – Treffer für „${zeigen.korrektur}“:`
                      : zeigen.teilweise
                        ? 'Keine Seite enthält alle Wörter – Treffer mit einem Teil davon:'
                        : `${gesamt} Treffer`}
              </p>

              <ul ref={liste} id={listenId} role="listbox" aria-label="Treffer" className={s.liste}>
                {zeigen && treffer.map((t, i) => {
                  const neueArt = t.art !== vorige
                  vorige = t.art
                  const anzahl = zeigen.proArt[t.art] ?? 0
                  return (
                    <Fragment key={t.id}>
                      {neueArt && (
                        <li role="presentation" className={s.gruppe}>
                          <span>{ART_NAMEN[t.art].mehrere}</span>
                          {anzahl > 3 && (
                            <a href={suchSeite(zeigen.eingabe, t.art)} tabIndex={-1}>
                              Alle {anzahl}
                            </a>
                          )}
                        </li>
                      )}
                      <li
                        id={`${listenId}-${i}`}
                        role="option"
                        aria-selected={i === aktiv}
                        data-nr={i}
                        onMouseMove={() => aktiv !== i && setAktiv(i)}
                      >
                        <Treffer treffer={t} kompakt tabIndex={-1} />
                      </li>
                    </Fragment>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {zeigen && gesamt > 0 && (
          <div className={s.fuss}>
            <a href={suchSeite(zeigen.eingabe)} className={s.alle}>
              Alle {gesamt} Treffer anzeigen
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <span className={s.tasten} aria-hidden="true">
              <kbd>↑</kbd>
              <kbd>↓</kbd> auswählen <kbd>↵</kbd> öffnen <kbd>esc</kbd> schließen
            </span>
          </div>
        )}
      </div>
    </dialog>
  )
}
