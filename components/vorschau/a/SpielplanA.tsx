'use client'

import Link from 'next/link'
import { useState } from 'react'
import basis from './basisA.module.css'
import s from './SpielplanA.module.css'
import { IconBall, IconTischtennis } from './IconsA'
import type { SpielKarteA } from './hilfenA'

// ─── Spielplan der Startseite A ──────────────────────────────────────────────
// Horizontale Kartenreihe mit Filtern. Die Karten kommen fertig formatiert vom Server.

type Filter = 'alle' | 'fussball' | 'tischtennis' | 'heim'

const FILTER: { id: Filter; label: string; leer: string; link: { href: string; label: string } }[] = [
  { id: 'alle', label: 'Alle', leer: 'Gerade stehen keine Spiele und Termine an.', link: { href: '/termine', label: 'Zum Kalender' } },
  { id: 'fussball', label: 'Fußball', leer: 'Gerade sind keine Fußballspiele angesetzt.', link: { href: '/fussball', label: 'Fußball-Spielplan' } },
  { id: 'tischtennis', label: 'Tischtennis', leer: 'Gerade sind keine Tischtennisspiele angesetzt.', link: { href: '/tischtennis', label: 'Tischtennis-Spielplan' } },
  { id: 'heim', label: 'Nur Heimspiele', leer: 'In nächster Zeit stehen keine Heimspiele an.', link: { href: '/termine', label: 'Zum Kalender' } },
]

function passt(karte: SpielKarteA, filter: Filter): boolean {
  if (filter === 'alle') return true
  if (filter === 'heim') return karte.art === 'heim'
  return karte.sport === filter
}

function SportIcon({ sport }: { sport: SpielKarteA['sport'] }) {
  if (sport === 'fussball') return <IconBall className={basis.icon} />
  if (sport === 'tischtennis') return <IconTischtennis className={basis.icon} />
  return null
}

export default function SpielplanA({ karten }: { karten: SpielKarteA[] }) {
  const [filter, setFilter] = useState<Filter>('alle')
  const sichtbar = karten.filter(k => passt(k, filter))
  const aktiv = FILTER.find(f => f.id === filter) ?? FILTER[0]

  return (
    <div>
      <div className={s.chips} role="group" aria-label="Spiele filtern">
        {FILTER.map(f => (
          <button
            key={f.id}
            type="button"
            className={`${s.chip} ${filter === f.id ? s.chipAktiv : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.id === 'fussball' && <IconBall className={basis.icon} />}
            {f.id === 'tischtennis' && <IconTischtennis className={basis.icon} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Ansage für Screenreader, wenn sich die Auswahl ändert */}
      <p className={basis.unsichtbar} aria-live="polite">
        {sichtbar.length === 1 ? '1 Eintrag' : `${sichtbar.length} Einträge`} angezeigt
      </p>

      {sichtbar.length > 0 ? (
        // key: Bei jedem Filterwechsel eine neue Liste, damit die Reihe wieder beim ersten
        // Termin beginnt (sonst rastet scroll-snap auf der zuletzt eingerasteten Karte ein)
        <ul key={filter} className={s.rail}>
          {sichtbar.map(karte => (
            <li key={karte.id} className={s.zelle}>
              <Link href={karte.href} className={`${s.game} ${karte.heute ? s.heute : ''}`}>
                <div className={s.gameTop}>
                  <span className={s.sport}>
                    <SportIcon sport={karte.sport} />
                    {karte.sportName && <span className={basis.unsichtbar}>{karte.sportName}: </span>}
                    <span className={s.kopf}>{karte.sparte}</span>
                  </span>
                  <span className={`${s.pill} ${karte.art === 'heim' ? s.pillHeim : ''}`}>
                    {karte.art === 'heim' ? 'Heim' : karte.art === 'auswaerts' ? 'Auswärts' : 'Termin'}
                  </span>
                </div>
                {/* Liga in eigener Zeile, damit lange Namen ("Kreisfreundschaftsspiele") nicht gekürzt werden */}
                {karte.liga && <p className={s.liga}>{karte.liga}</p>}
                <div className={s.gameDate}>
                  <b>{karte.datum}</b>
                  {karte.uhrzeit && <span>{karte.uhrzeit}</span>}
                </div>
                <h3 className={s.titel}>
                  {karte.vorzeile && <small>{karte.vorzeile}</small>}
                  {karte.titel}
                </h3>
                <div className={s.gameFoot}>
                  <span>{karte.ort}</span>
                  <span className={s.wann}>{karte.wann}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.leer}>
          <p>{aktiv.leer}</p>
          <Link href={aktiv.link.href} className={basis.more}>
            {aktiv.link.label} →
          </Link>
        </div>
      )}
    </div>
  )
}
