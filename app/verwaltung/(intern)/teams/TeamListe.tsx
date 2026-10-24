'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { passtZurSuche } from '@/lib/verwaltung/suche'
import { Badge, eingabeKlasse, Karte, knopfKlassen, LeerHinweis } from '@/components/verwaltung/ui'

export interface TeamListenSparte {
  id: number
  name: string
  sichtbar: boolean
  kannAnlegen: boolean
  teams: {
    art: 'mannschaft' | 'gruppe'
    id: number
    name: string
    altersklasse: string | null
    sichtbar: boolean
    anzahlZeiten: number
    anzahlTrainer: number
    /** vorbereiteter Suchtext (Name, Sparte, Altersklasse, Trainer:innen) */
    suchtext: string
  }[]
}

export default function TeamListe({ sparten }: { sparten: TeamListenSparte[] }) {
  const [suche, setSuche] = useState('')
  const sucht = suche.trim() !== ''
  const anzahlTeams = sparten.reduce((n, s) => n + s.teams.length, 0)

  const gefiltert = sparten
    .map(s => ({ ...s, teams: s.teams.filter(t => passtZurSuche(t.suchtext, suche)) }))
    .filter(s => !sucht || s.teams.length > 0)

  return (
    <div className="space-y-6">
      {anzahlTeams > 5 && (
        <div className="relative">
          <label htmlFor="team-suche" className="sr-only">
            Mannschaft oder Gruppe suchen
          </label>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] pointer-events-none" />
          <input
            id="team-suche"
            type="search"
            value={suche}
            onChange={e => setSuche(e.target.value)}
            placeholder="Suchen: Name, Sparte, Jahrgang oder Trainer:in …"
            className={`${eingabeKlasse} pl-9 py-3`}
            autoComplete="off"
          />
        </div>
      )}

      {gefiltert.length === 0 && (
        <Karte>
          <LeerHinweis>Nichts gefunden für „{suche.trim()}“.</LeerHinweis>
        </Karte>
      )}

      {gefiltert.map(s => (
        <Karte
          key={s.id}
          titel={s.name}
          beschreibung={!s.sichtbar ? 'Diese Sparte ist auf der Website ausgeblendet.' : undefined}
        >
          {s.teams.length === 0 ? (
            <p className="text-sm text-[#6b6b6b]">Noch keine Mannschaften oder Gruppen.</p>
          ) : (
            <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07] -mx-1">
              {s.teams.map(t => (
                <li key={`${t.art}-${t.id}`}>
                  <Link href={`/verwaltung/teams/${t.art}/${t.id}`} className="flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03] min-h-[3.25rem]">
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-[#6b6b6b] ml-2">
                        {t.art === 'mannschaft' ? 'Mannschaft' : 'Gruppe'}
                        {t.altersklasse ? ` · ${t.altersklasse}` : ''}
                      </span>
                      {(!t.sichtbar || t.anzahlTrainer === 0 || t.anzahlZeiten === 0) && (
                        <span className="flex flex-wrap gap-1.5 mt-1">
                          {!t.sichtbar && <Badge>ausgeblendet</Badge>}
                          {t.anzahlTrainer === 0 && <Badge ton="warnung">kein Trainerteam</Badge>}
                          {t.anzahlZeiten === 0 && <Badge ton="warnung">keine Trainingszeit</Badge>}
                        </span>
                      )}
                    </span>
                    <span className="hidden sm:inline text-xs text-[#6b6b6b] tabular-nums">
                      {t.anzahlZeiten > 0 && `${t.anzahlZeiten} Trainingszeit${t.anzahlZeiten === 1 ? '' : 'en'}`}
                    </span>
                    <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {s.kannAnlegen && !sucht && (
            <div className="mt-4 flex gap-2">
              <Link
                href={`/verwaltung/teams/neu?art=mannschaft&sparte=${s.id}`}
                aria-label={`Neue Mannschaft in ${s.name} anlegen`}
                className={`${knopfKlassen.sekundaer} flex-1 sm:flex-none px-3`}
              >
                <Plus size={15} /> <span className="hidden sm:inline">Neue</span> Mannschaft
              </Link>
              <Link
                href={`/verwaltung/teams/neu?art=gruppe&sparte=${s.id}`}
                aria-label={`Neue Gruppe in ${s.name} anlegen`}
                className={`${knopfKlassen.sekundaer} flex-1 sm:flex-none px-3`}
              >
                <Plus size={15} /> <span className="hidden sm:inline">Neue</span> Gruppe
              </Link>
            </div>
          )}
        </Karte>
      ))}
    </div>
  )
}
