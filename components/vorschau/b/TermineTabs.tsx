'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { TerminZeile } from './hilfen'
import b from './bento.module.css'
import s from './StartseiteB.module.css'

// Kachel "Nächste Termine" mit Filter Alle / Fußball / Tischtennis.
// Die Zeilen kommen fertig aufbereitet vom Server (components/vorschau/b/hilfen.ts).

const FILTER = [
  { wert: 'alle', label: 'Alle' },
  { wert: 'Fußball', label: 'Fußball' },
  { wert: 'Tischtennis', label: 'Tischtennis' },
] as const

type Filter = (typeof FILTER)[number]['wert']

const ANZAHL = 5

export default function TermineTabs({ termine }: { termine: TerminZeile[] }) {
  const [filter, setFilter] = useState<Filter>('alle')
  const sichtbar = termine.filter(t => filter === 'alle' || t.sportart === filter).slice(0, ANZAHL)

  return (
    <>
      <div className={s.termineKopf}>
        <h2 className={s.kachelTitel}>Nächste Termine</h2>
        <div className={s.tabs} role="group" aria-label="Termine filtern">
          {FILTER.map(f => (
            <button
              key={f.wert}
              type="button"
              className={filter === f.wert ? s.tabAktiv : undefined}
              aria-pressed={filter === f.wert}
              onClick={() => setFilter(f.wert)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className={s.terminListe}>
        {sichtbar.map(t => (
          <li key={t.id} className={`${s.termin} ${t.art === 'heim' ? s.heim : ''}`}>
            <div className={s.datum}>
              <b>{t.tag}</b>
              <small>{t.monat}</small>
            </div>
            <div className={s.terminText}>
              <h3>{t.titel}</h3>
              {t.unterzeile && <div className={s.sub}>{t.unterzeile}</div>}
            </div>
            <div className={s.zeit}>
              {t.zeit}
              {t.art === 'heim' && <span className={s.artHeim}>Heimspiel</span>}
              {t.art === 'auswaerts' && <span className={s.artAus}>Auswärts</span>}
              {!t.art && t.sportart && <span className={s.artAus}>{t.sportart}</span>}
            </div>
          </li>
        ))}
        {sichtbar.length === 0 && (
          <li className={s.leer}>
            {filter === 'alle'
              ? 'Gerade stehen keine Termine an.'
              : `Gerade stehen keine ${filter}-Termine an.`}
          </li>
        )}
      </ul>

      <div className={s.termineFuss}>
        <Link href="/termine" className={b.link}>Zum Kalender →</Link>
        {filter !== 'alle' && (
          <Link href={filter === 'Fußball' ? '/fussball' : '/tischtennis'} className={b.link}>
            Spielplan {filter} →
          </Link>
        )}
      </div>
    </>
  )
}
