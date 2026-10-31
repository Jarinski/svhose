'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import basis from './basisA.module.css'
import s from './NavbarA.module.css'
import { IconBurger, IconPfeilUnten, IconSchliessen } from './IconsA'
import { FOERDERVEREIN_MENUE } from '@/lib/foerderverein'

// ─── Navigation Design A (Matchday) ──────────────────────────────────────────
// Schwebende Glas-Leiste als Pille oben. Ab 1240 px mit Aufklappmenüs für Spielpläne
// Verein und Förderverein, darunter mit Burger-Menü. Wird immer mitgerendert, aber nur im
// Vorschau-Modus A angezeigt (app/vorschau.css) – Bilder deshalb mit loading="lazy".

type Eintrag = { href: string; label: string }
type Gruppe = { id: string; label: string; kinder: Eintrag[] }
type Punkt = Eintrag | Gruppe

const PUNKTE: Punkt[] = [
  { href: '/news', label: 'News' },
  { href: '/sparten', label: 'Sparten' },
  {
    id: 'spielplaene',
    label: 'Spielpläne',
    kinder: [
      { href: '/fussball', label: 'Fußball' },
      { href: '/tischtennis', label: 'Tischtennis' },
    ],
  },
  { href: '/termine', label: 'Termine' },
  { href: '/trainingszeiten', label: 'Training' },
  {
    id: 'verein',
    label: 'Verein',
    kinder: [
      { href: '/ueber-uns', label: 'Über uns' },
      { href: '/kinderschutz', label: 'Kinderschutz' },
      { href: '/downloads', label: 'Downloads' },
    ],
  },
  { id: 'foerderverein', label: FOERDERVEREIN_MENUE.label, kinder: [...FOERDERVEREIN_MENUE.kinder] },
  { href: '/ansprechpartner', label: 'Kontakt' },
]

const MENUE_ID = 'a-hauptmenue'

function istGruppe(punkt: Punkt): punkt is Gruppe {
  return 'kinder' in punkt
}

function istAktiv(pfad: string, href: string): boolean {
  return pfad === href || pfad.startsWith(`${href}/`)
}

export default function NavbarA() {
  const pfad = usePathname() ?? '/'
  const [menueOffen, setMenueOffen] = useState(false)
  const [offeneGruppe, setOffeneGruppe] = useState<string | null>(null)
  const kopfRef = useRef<HTMLElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)

  // Nach einem Seitenwechsel alles schließen
  const [letzterPfad, setLetzterPfad] = useState(pfad)
  if (pfad !== letzterPfad) {
    setLetzterPfad(pfad)
    setMenueOffen(false)
    setOffeneGruppe(null)
  }

  // Escape, Klick außerhalb und Fokus außerhalb schließen Menü und Aufklappmenüs
  useEffect(() => {
    if (!menueOffen && !offeneGruppe) return

    function beiTaste(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      // Fokus zurück auf den Knopf, der das Menü geöffnet hat
      const knopf = offeneGruppe ? document.getElementById(`a-knopf-${offeneGruppe}`) : burgerRef.current
      setOffeneGruppe(null)
      setMenueOffen(false)
      knopf?.focus()
    }
    function beiZeiger(e: PointerEvent) {
      if (kopfRef.current && !kopfRef.current.contains(e.target as Node)) {
        setOffeneGruppe(null)
        setMenueOffen(false)
      }
    }
    function beiFokus(e: FocusEvent) {
      const ziel = e.target as Element | null
      if (!ziel || !kopfRef.current) return
      if (!kopfRef.current.contains(ziel)) {
        setOffeneGruppe(null)
        setMenueOffen(false)
      } else if (offeneGruppe && !ziel.closest(`[data-a-gruppe="${offeneGruppe}"]`)) {
        setOffeneGruppe(null)
      }
    }

    document.addEventListener('keydown', beiTaste)
    document.addEventListener('pointerdown', beiZeiger)
    document.addEventListener('focusin', beiFokus)
    return () => {
      document.removeEventListener('keydown', beiTaste)
      document.removeEventListener('pointerdown', beiZeiger)
      document.removeEventListener('focusin', beiFokus)
    }
  }, [menueOffen, offeneGruppe])

  return (
    <header ref={kopfRef} className={s.nav}>
      <div className={s.bar}>
        <Link href="/" className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={40} height={40} loading="lazy" />
          <span>
            <b>Holm-Seppensen</b>
            <small>Sportverein e.V.</small>
          </span>
        </Link>

        {/* Große Bildschirme: Leiste mit Aufklappmenüs */}
        <nav aria-label="Hauptnavigation" className={s.desktop}>
          <ul className={s.links}>
            {PUNKTE.map(punkt =>
              istGruppe(punkt) ? (
                <li key={punkt.id} className={s.gruppe} data-a-gruppe={punkt.id}>
                  <button
                    type="button"
                    id={`a-knopf-${punkt.id}`}
                    className={`${s.link} ${punkt.kinder.some(k => istAktiv(pfad, k.href)) ? s.aktiv : ''}`}
                    aria-expanded={offeneGruppe === punkt.id}
                    aria-controls={`a-liste-${punkt.id}`}
                    onClick={() => setOffeneGruppe(offeneGruppe === punkt.id ? null : punkt.id)}
                  >
                    {punkt.label}
                    <IconPfeilUnten className={s.chevron} />
                  </button>
                  <ul id={`a-liste-${punkt.id}`} className={s.dropdown} hidden={offeneGruppe !== punkt.id}>
                    {punkt.kinder.map(kind => (
                      <li key={kind.href}>
                        <Link
                          href={kind.href}
                          className={istAktiv(pfad, kind.href) ? s.aktiv : undefined}
                          aria-current={istAktiv(pfad, kind.href) ? 'page' : undefined}
                          onClick={() => setOffeneGruppe(null)}
                        >
                          {kind.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={punkt.href}>
                  <Link
                    href={punkt.href}
                    className={`${s.link} ${istAktiv(pfad, punkt.href) ? s.aktiv : ''}`}
                    aria-current={istAktiv(pfad, punkt.href) ? 'page' : undefined}
                  >
                    {punkt.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className={s.cta}>
          <Link href="/downloads" className={`${basis.btn} ${basis.btnAccent} ${s.mitglied}`}>
            Mitglied werden
          </Link>
          <button
            ref={burgerRef}
            type="button"
            className={s.burger}
            aria-expanded={menueOffen}
            aria-controls={MENUE_ID}
            aria-label={menueOffen ? 'Menü schließen' : 'Menü öffnen'}
            onClick={() => setMenueOffen(offen => !offen)}
          >
            {menueOffen ? <IconSchliessen /> : <IconBurger />}
          </button>
        </div>
      </div>

      {/* Kleine Bildschirme: aufklappbares Menü unter der Leiste */}
      <nav id={MENUE_ID} aria-label="Hauptnavigation" className={s.panel} hidden={!menueOffen}>
        <ul className={s.panelListe}>
          {PUNKTE.map(punkt =>
            istGruppe(punkt) ? (
              <li key={punkt.id} className={s.panelGruppe}>
                <span className={s.panelTitel}>{punkt.label}</span>
                <ul>
                  {punkt.kinder.map(kind => (
                    <li key={kind.href}>
                      <Link
                        href={kind.href}
                        className={`${s.panelLink} ${istAktiv(pfad, kind.href) ? s.aktiv : ''}`}
                        aria-current={istAktiv(pfad, kind.href) ? 'page' : undefined}
                        onClick={() => setMenueOffen(false)}
                      >
                        {kind.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ) : (
              <li key={punkt.href}>
                <Link
                  href={punkt.href}
                  className={`${s.panelLink} ${istAktiv(pfad, punkt.href) ? s.aktiv : ''}`}
                  aria-current={istAktiv(pfad, punkt.href) ? 'page' : undefined}
                  onClick={() => setMenueOffen(false)}
                >
                  {punkt.label}
                </Link>
              </li>
            ),
          )}
        </ul>
        <Link
          href="/downloads"
          className={`${basis.btn} ${basis.btnAccent} ${s.panelCta}`}
          onClick={() => setMenueOffen(false)}
        >
          Mitglied werden
        </Link>
      </nav>
    </header>
  )
}
