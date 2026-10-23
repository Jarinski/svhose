'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import b from './bento.module.css'
import s from './NavbarB.module.css'

// ─── Navigation von Design B (Bento) ─────────────────────────────────────────
// Weiße, abgerundete Leiste; ab 1100 px Breite abwärts als Burger-Menü.
// Wird für alle Besucher*innen mitgerendert, aber nur im Vorschau-Modus B gezeigt (app/vorschau.css).

type Ziel = { href: string; label: string; hinweis?: string }

const SPIELPLAENE: Ziel[] = [
  { href: '/fussball', label: 'Fußball', hinweis: 'Spiele von fussball.de' },
  { href: '/tischtennis', label: 'Tischtennis', hinweis: 'Spiele von click-tt' },
]

const VOR_SPIELPLAENEN: Ziel[] = [
  { href: '/news', label: 'News' },
  { href: '/sparten', label: 'Sparten' },
  { href: '/termine', label: 'Termine' },
]

const NACH_SPIELPLAENEN: Ziel[] = [
  { href: '/trainingszeiten', label: 'Training' },
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/ansprechpartner', label: 'Kontakt' },
]

/** Im Burger-Menü zusätzlich (auf dem Desktop stehen sie im Footer) */
const NUR_MOBIL: Ziel[] = [
  { href: '/downloads', label: 'Downloads' },
  { href: '/kinderschutz', label: 'Kinderschutz' },
]

function istAktiv(pfad: string, href: string): boolean {
  return pfad === href || pfad.startsWith(`${href}/`)
}

/**
 * true, wenn der Tastaturfokus den Bereich verlässt (z. B. per Tab zum nächsten Link).
 * Ohne neues Ziel (Klick ins Leere; Safari fokussiert Links beim Klicken nicht) bleibt
 * das Menü offen – Klicks außerhalb schließt der pointerdown-Handler.
 */
function fokusVerlaesst(e: FocusEvent<HTMLElement>): boolean {
  const ziel = e.relatedTarget as Node | null
  return ziel !== null && !e.currentTarget.contains(ziel)
}

export default function NavbarB() {
  const pfad = usePathname() ?? '/'
  // Menüs merken sich die Seite, auf der sie geöffnet wurden – nach einem Seitenwechsel sind sie zu.
  const [menuAuf, setMenuAuf] = useState<string | null>(null)
  const [spieleAuf, setSpieleAuf] = useState<string | null>(null)
  const menuOffen = menuAuf === pfad
  const spieleOffen = spieleAuf === pfad

  const wurzel = useRef<HTMLElement>(null)
  const burger = useRef<HTMLButtonElement>(null)
  const spieleKnopf = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const spieleId = useId()

  // Escape und Klick außerhalb schließen offene Menüs
  useEffect(() => {
    if (!menuOffen && !spieleOffen) return
    function taste(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (spieleOffen) spieleKnopf.current?.focus()
      else burger.current?.focus()
      setMenuAuf(null)
      setSpieleAuf(null)
    }
    function klick(e: PointerEvent) {
      if (wurzel.current && !wurzel.current.contains(e.target as Node)) {
        setMenuAuf(null)
        setSpieleAuf(null)
      }
    }
    document.addEventListener('keydown', taste)
    document.addEventListener('pointerdown', klick)
    return () => {
      document.removeEventListener('keydown', taste)
      document.removeEventListener('pointerdown', klick)
    }
  }, [menuOffen, spieleOffen])

  const spieleAktiv = SPIELPLAENE.some(z => istAktiv(pfad, z.href))

  function eintrag(ziel: Ziel) {
    const aktiv = istAktiv(pfad, ziel.href)
    return (
      <li key={ziel.href}>
        <Link href={ziel.href} className={s.eintrag} aria-current={aktiv ? 'page' : undefined}>
          {ziel.label}
        </Link>
      </li>
    )
  }

  function panelEintrag(ziel: Ziel, label = ziel.label) {
    const aktiv = istAktiv(pfad, ziel.href)
    return (
      <li key={ziel.href}>
        <Link
          href={ziel.href}
          className={s.panelLink}
          aria-current={aktiv ? 'page' : undefined}
          onClick={() => setMenuAuf(null)}
        >
          {label}
        </Link>
      </li>
    )
  }

  return (
    <header
      ref={wurzel}
      className={s.kopf}
      onBlur={e => {
        if (fokusVerlaesst(e)) setMenuAuf(null)
      }}
    >
      <div className={b.wrap}>
        <nav className={s.leiste} aria-label="Hauptnavigation">
          <Link href="/" className={`${b.marke} ${s.marke}`} aria-label="SV Holm-Seppensen – zur Startseite">
            {/* Wappen; lazy, weil die Leiste für normale Besucher*innen versteckt mitgerendert wird */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={44} height={44} loading="lazy" />
            <span>
              <b>SV Holm-Seppensen</b>
              <small>Sportverein e.V. · Lüneburger Heide</small>
            </span>
          </Link>

          <ul className={s.links}>
            {VOR_SPIELPLAENEN.map(eintrag)}
            <li
              onBlur={e => {
                if (fokusVerlaesst(e)) setSpieleAuf(null)
              }}
            >
              <button
                ref={spieleKnopf}
                type="button"
                className={`${s.eintrag} ${spieleAktiv ? s.aktiv : ''}`}
                aria-expanded={spieleOffen}
                aria-controls={spieleId}
                onClick={() => setSpieleAuf(spieleOffen ? null : pfad)}
              >
                Spielpläne
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <ul id={spieleId} className={s.ausklapp} hidden={!spieleOffen}>
                {SPIELPLAENE.map(ziel => (
                  <li key={ziel.href}>
                    <Link
                      href={ziel.href}
                      aria-current={istAktiv(pfad, ziel.href) ? 'page' : undefined}
                      onClick={() => setSpieleAuf(null)}
                    >
                      {ziel.label}
                      <small>{ziel.hinweis}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            {NACH_SPIELPLAENEN.map(eintrag)}
          </ul>

          <div className={s.rechts}>
            <Link href="/downloads" className={`${b.btn} ${b.btnDunkel} ${s.mitglied}`}>
              Mitglied werden
            </Link>
            <button
              ref={burger}
              type="button"
              className={`${s.iconBtn} ${s.burger}`}
              aria-expanded={menuOffen}
              aria-controls={panelId}
              aria-label={menuOffen ? 'Menü schließen' : 'Menü öffnen'}
              onClick={() => setMenuAuf(menuOffen ? null : pfad)}
            >
              {menuOffen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Menü für schmale Bildschirme */}
          <div id={panelId} className={s.panel} hidden={!menuOffen}>
            <ul>
              {VOR_SPIELPLAENEN.map(z => panelEintrag(z))}
              {NACH_SPIELPLAENEN.map(z => panelEintrag(z))}
              {NUR_MOBIL.map(z => panelEintrag(z))}
            </ul>
            <div className={s.gruppe}>Spielpläne</div>
            <ul>{SPIELPLAENE.map(z => panelEintrag(z))}</ul>
            <div className={s.panelCta}>
              <Link href="/downloads" className={`${b.btn} ${b.btnDunkel}`} onClick={() => setMenuAuf(null)}>
                Mitglied werden
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
