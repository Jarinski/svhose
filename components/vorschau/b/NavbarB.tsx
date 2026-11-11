'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import b from './bento.module.css'
import GlasEbenen from '@/components/glas/GlasEbenen'
import { FOERDERVEREIN_MENUE } from '@/lib/foerderverein'
import { sucheOeffnen } from '@/components/suche/oeffnen'
import s from './NavbarB.module.css'

// ─── Navigation von Design B (Bento) ─────────────────────────────────────────
// Abgerundete Leiste aus Glas (components/glas) – Leiste, Aufklappmenüs und Handy-Menü sind echte
// mattierte Scheiben, weil beim Scrollen Inhalt darunter durchläuft. Ab 1240 px abwärts als Burger-Menü.

type Ziel = { href: string; label: string; hinweis?: string }
type AusklappId = 'spiele' | 'foerderverein'

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
]

const KONTAKT: Ziel = { href: '/ansprechpartner', label: 'Kontakt' }

const FOERDERVEREIN: Ziel[] = [...FOERDERVEREIN_MENUE.kinder]

/** Im Burger-Menü zusätzlich (auf dem Desktop stehen sie im Footer) */
const NUR_MOBIL: Ziel[] = [
  { href: '/sportplaetze', label: 'Sportplätze' },
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
  // Höchstens ein Aufklappmenü (Spielpläne, Förderverein) ist offen
  const [ausklappAuf, setAusklappAuf] = useState<{ pfad: string; id: AusklappId } | null>(null)
  const menuOffen = menuAuf === pfad
  const offenesAusklapp = ausklappAuf?.pfad === pfad ? ausklappAuf.id : null
  const ausklappOffen = offenesAusklapp !== null

  const wurzel = useRef<HTMLElement>(null)
  const burger = useRef<HTMLButtonElement>(null)
  const ausklappKnoepfe = useRef<Partial<Record<AusklappId, HTMLButtonElement | null>>>({})
  const panelId = useId()
  const ausklappPrefix = useId()

  // Escape und Klick außerhalb schließen offene Menüs
  useEffect(() => {
    if (!menuOffen && !ausklappOffen) return
    function taste(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (offenesAusklapp) ausklappKnoepfe.current[offenesAusklapp]?.focus()
      else burger.current?.focus()
      setMenuAuf(null)
      setAusklappAuf(null)
    }
    function klick(e: PointerEvent) {
      if (wurzel.current && !wurzel.current.contains(e.target as Node)) {
        setMenuAuf(null)
        setAusklappAuf(null)
      }
    }
    document.addEventListener('keydown', taste)
    document.addEventListener('pointerdown', klick)
    return () => {
      document.removeEventListener('keydown', taste)
      document.removeEventListener('pointerdown', klick)
    }
  }, [menuOffen, ausklappOffen, offenesAusklapp])

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

  /** Menüpunkt mit Aufklappmenü auf dem Desktop; es ist immer nur eines offen. */
  function ausklapp(id: AusklappId, label: string, ziele: Ziel[]) {
    const offen = offenesAusklapp === id
    const listeId = `${ausklappPrefix}-${id}`
    return (
      <li
        key={id}
        onBlur={e => {
          if (fokusVerlaesst(e)) setAusklappAuf(null)
        }}
      >
        <button
          ref={el => {
            ausklappKnoepfe.current[id] = el
          }}
          type="button"
          className={`${s.eintrag} ${ziele.some(z => istAktiv(pfad, z.href)) ? s.aktiv : ''}`}
          aria-expanded={offen}
          aria-controls={listeId}
          onClick={() => setAusklappAuf(offen ? null : { pfad, id })}
        >
          {label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div id={listeId} className={s.ausklapp} hidden={!offen}>
          <GlasEbenen band={8} staerke={7} unschaerfe="stark" />
          <ul>
            {ziele.map(ziel => (
              <li key={ziel.href}>
                <Link
                  href={ziel.href}
                  aria-current={istAktiv(pfad, ziel.href) ? 'page' : undefined}
                  onClick={() => setAusklappAuf(null)}
                >
                  {ziel.label}
                  {ziel.hinweis && <small>{ziel.hinweis}</small>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
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
          <GlasEbenen band={8} staerke={8} />
          <Link href="/" className={`${b.marke} ${s.marke}`} aria-label="SV Holm-Seppensen – zur Startseite">
            {/* Wappen; lazy, weil die Leiste für normale Besucher*innen versteckt mitgerendert wird */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={44} height={44} loading="lazy" />
            <span>
              <b>SV Holm-Seppensen</b>
              <small>Sportverein e.V.</small>
            </span>
          </Link>

          <ul className={s.links}>
            {VOR_SPIELPLAENEN.map(eintrag)}
            {ausklapp('spiele', 'Spielpläne', SPIELPLAENE)}
            {NACH_SPIELPLAENEN.map(eintrag)}
            {ausklapp('foerderverein', FOERDERVEREIN_MENUE.label, FOERDERVEREIN)}
            {eintrag(KONTAKT)}
          </ul>

          <div className={s.rechts}>
            {/* Suchfenster (components/suche/SuchFenster.tsx), auch mit Strg+K / ⌘+K */}
            <button
              type="button"
              className={s.iconBtn}
              aria-label="Website durchsuchen"
              aria-haspopup="dialog"
              title="Suchen (Strg+K)"
              onClick={() => {
                setMenuAuf(null)
                setAusklappAuf(null)
                sucheOeffnen()
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
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
            <GlasEbenen band={9} staerke={8} unschaerfe="stark" />
            <div className={s.panelInhalt}>
              <ul>
                {VOR_SPIELPLAENEN.map(z => panelEintrag(z))}
                {NACH_SPIELPLAENEN.map(z => panelEintrag(z))}
                {panelEintrag(KONTAKT)}
                {NUR_MOBIL.map(z => panelEintrag(z))}
              </ul>
              <div className={s.gruppe}>Spielpläne</div>
              <ul>{SPIELPLAENE.map(z => panelEintrag(z))}</ul>
              <div className={s.gruppe}>{FOERDERVEREIN_MENUE.label}</div>
              <ul>{FOERDERVEREIN.map(z => panelEintrag(z))}</ul>
              <div className={s.panelCta}>
                <Link href="/downloads" className={`${b.btn} ${b.btnDunkel}`} onClick={() => setMenuAuf(null)}>
                  Mitglied werden
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
