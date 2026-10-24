'use client'

/**
 * Suchfeld zum Auswählen einer vorhandenen Person: Namen tippen, Treffer antippen.
 * Enter übernimmt den ersten Treffer (ohne das Formular abzuschicken).
 * Fehlt die Person, führt ein Link zum Anlegen (neuer Tab); "Liste aktualisieren" holt danach
 * die neue Person dazu, ohne dass ungespeicherte Eingaben verloren gehen.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, UserPlus } from 'lucide-react'
import { eingabeKlasse } from './ui'

export interface PersonKurz {
  id: number
  name: string
}

/** Kleinbuchstaben, Umlaute ausgeschrieben, Akzente entfernt – für tolerante Suche. */
function normalisieren(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

export default function PersonSuche({
  personen,
  ausschliessen = [],
  onWaehlen,
  placeholder = 'Namen eingeben …',
  autoFocus = false,
  neuLink = true,
  id,
}: {
  personen: PersonKurz[]
  /** Personen, die schon gewählt sind und nicht noch einmal angeboten werden. */
  ausschliessen?: number[]
  onWaehlen: (person: PersonKurz) => void
  placeholder?: string
  autoFocus?: boolean
  /** Link "Neue Person anlegen" anzeigen. */
  neuLink?: boolean
  id?: string
}) {
  const router = useRouter()
  const [suche, setSuche] = useState('')

  const treffer = useMemo(() => {
    const teile = normalisieren(suche).split(/\s+/).filter(Boolean)
    if (teile.length === 0) return []
    return personen
      .filter(p => ausschliessen.indexOf(p.id) < 0)
      .filter(p => {
        const name = normalisieren(p.name)
        return teile.every(t => name.indexOf(t) >= 0)
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .slice(0, 8)
  }, [suche, personen, ausschliessen])

  // Gleichnamige Personen unterscheidbar machen
  const doppelt = (name: string) => personen.filter(p => p.name === name).length > 1

  function waehlen(p: PersonKurz) {
    onWaehlen(p)
    setSuche('')
  }

  return (
    <div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] pointer-events-none" />
        <input
          id={id}
          type="search"
          value={suche}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          onChange={e => setSuche(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (treffer[0]) waehlen(treffer[0])
            } else if (e.key === 'Escape') {
              setSuche('')
            }
          }}
          className={`${eingabeKlasse} pl-9`}
        />
      </div>
      {suche.trim() !== '' && (
        <ul className="mt-1 border border-[#0a0a0a]/15 rounded-sm bg-white divide-y divide-[#0a0a0a]/[0.07] max-h-72 overflow-y-auto">
          {treffer.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-[#6b6b6b]">Keine passende Person gefunden.</li>
          ) : (
            treffer.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => waehlen(p)}
                  className="w-full text-left px-3 py-2.5 text-[15px] hover:bg-[#0a0a0a]/[0.05] focus:bg-[#0a0a0a]/[0.05] focus:outline-none"
                >
                  {p.name}
                  {doppelt(p.name) && <span className="ml-2 text-xs text-[#6b6b6b]">Nr. {p.id}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {neuLink && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b6b6b]">
          <a
            href="/verwaltung/personen/neu"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#0a0a0a]"
          >
            <UserPlus size={13} /> Person fehlt? Neue Person anlegen ↗
          </a>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#0a0a0a]"
            title="Neu angelegte Personen in die Suche übernehmen – deine Eingaben hier bleiben erhalten."
          >
            <RefreshCw size={12} /> Liste aktualisieren
          </button>
        </div>
      )}
    </div>
  )
}
