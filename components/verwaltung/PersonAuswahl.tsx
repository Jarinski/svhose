'use client'

/**
 * "+ Person hinzufügen": Suche über alle Personen (Liste kommt vom Server, gefiltert wird im
 * Browser) mit Anzeige, wo die Person schon vorkommt. Ist die Person nicht dabei, lässt sie sich
 * direkt neu erfassen – angelegt wird sie erst beim Speichern des umgebenden Formulars.
 */

import { useMemo, useRef, useState } from 'react'
import { Plus, Search, UserPlus, X } from 'lucide-react'
import type { AuswahlPerson } from '@/lib/verwaltung/person-bearbeiten'
import { passtZurSuche, suchNormal, suchtext } from '@/lib/verwaltung/suche'
import { eingabeKlasse, Feld, knopfKlassen, Meldung } from './ui'

export interface NeuePersonDaten {
  name: string
  telefon: string
  email: string
}

const MAX_TREFFER = 8

export default function PersonAuswahl({
  personen,
  vorhanden,
  onAuswahl,
  onNeu,
  knopfText = 'Person hinzufügen',
}: {
  personen: AuswahlPerson[]
  /** ids, die schon in der Liste stehen */
  vorhanden: number[]
  onAuswahl: (personId: number) => void
  onNeu: (person: NeuePersonDaten) => void
  knopfText?: string
}) {
  const [offen, setOffen] = useState(false)
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState<NeuePersonDaten | null>(null)
  const [neuFehler, setNeuFehler] = useState<string | null>(null)
  const knopf = useRef<HTMLButtonElement>(null)

  const vorbereitet = useMemo(() => personen.map(p => ({ person: p, text: suchtext(p.name, p.email) })), [personen])
  const eingabe = suche.trim()
  const treffer = eingabe ? vorbereitet.filter(v => passtZurSuche(v.text, eingabe)).map(v => v.person) : []
  const exakt = eingabe !== '' && personen.some(p => suchNormal(p.name.trim()) === suchNormal(eingabe))

  function schliessen() {
    setOffen(false)
    setSuche('')
    setNeu(null)
    setNeuFehler(null)
    setTimeout(() => knopf.current?.focus(), 0)
  }

  function waehlen(p: AuswahlPerson) {
    onAuswahl(p.id)
    schliessen()
  }

  function neuUebernehmen() {
    if (!neu) return
    const name = neu.name.trim()
    if (!name) {
      setNeuFehler('Bitte einen Namen eintragen.')
      return
    }
    onNeu({ name, telefon: neu.telefon.trim(), email: neu.email.trim() })
    schliessen()
  }

  // Enter darf das umgebende Formular nicht absenden.
  const enterAbfangen = (aktion: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      aktion()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      schliessen()
    }
  }

  if (!offen) {
    return (
      <button ref={knopf} type="button" className={`${knopfKlassen.sekundaer} w-full sm:w-auto py-3`} onClick={() => setOffen(true)}>
        <Plus size={16} /> {knopfText}
      </button>
    )
  }

  return (
    <div className="border border-[#0a0a0a]/20 rounded-sm bg-[#fafaf7] p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{neu ? 'Neue Person anlegen' : knopfText}</h3>
        <button type="button" className={`${knopfKlassen.leise} -mr-2`} onClick={schliessen} aria-label="Schließen">
          <X size={18} />
        </button>
      </div>

      {neu ? (
        <div className="space-y-4">
          <Feld label="Name" htmlFor="neue-person-name" fehler={neuFehler ?? undefined}>
            <input
              id="neue-person-name"
              autoFocus
              value={neu.name}
              maxLength={100}
              onChange={e => setNeu({ ...neu, name: e.target.value })}
              onKeyDown={enterAbfangen(neuUebernehmen)}
              className={eingabeKlasse}
              autoComplete="off"
            />
          </Feld>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld label="Telefon (optional)" htmlFor="neue-person-telefon">
              <input
                id="neue-person-telefon"
                type="tel"
                inputMode="tel"
                value={neu.telefon}
                maxLength={50}
                onChange={e => setNeu({ ...neu, telefon: e.target.value })}
                onKeyDown={enterAbfangen(neuUebernehmen)}
                className={eingabeKlasse}
                autoComplete="off"
              />
            </Feld>
            <Feld label="E-Mail (optional)" htmlFor="neue-person-email">
              <input
                id="neue-person-email"
                type="email"
                inputMode="email"
                value={neu.email}
                maxLength={200}
                onChange={e => setNeu({ ...neu, email: e.target.value })}
                onKeyDown={enterAbfangen(neuUebernehmen)}
                className={eingabeKlasse}
                autoComplete="off"
              />
            </Feld>
          </div>
          <Meldung art="hinweis">Diese Angaben erscheinen öffentlich auf der Website. Bitte nur mit Einverständnis der Person eintragen.</Meldung>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${knopfKlassen.primaer} w-full sm:w-auto py-3`} onClick={neuUebernehmen}>
              <UserPlus size={16} /> Hinzufügen
            </button>
            <button type="button" className={`${knopfKlassen.sekundaer} w-full sm:w-auto py-3`} onClick={() => setNeu(null)}>
              Zurück zur Suche
            </button>
          </div>
          <p className="text-xs text-[#6b6b6b]">Die Person wird erst angelegt, wenn du unten auf „Speichern“ tippst.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor="person-suche" className="sr-only">
            Name suchen
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] pointer-events-none" />
            <input
              id="person-suche"
              autoFocus
              type="search"
              value={suche}
              onChange={e => setSuche(e.target.value)}
              onKeyDown={enterAbfangen(() => {
                const frei = treffer.filter(p => vorhanden.indexOf(p.id) < 0)
                if (frei.length === 1) waehlen(frei[0])
              })}
              placeholder="Name eintippen …"
              className={`${eingabeKlasse} pl-9`}
              autoComplete="off"
            />
          </div>

          {eingabe === '' ? (
            <p className="text-sm text-[#6b6b6b]">Tippe den Namen ein. Ist die Person noch nicht erfasst, kannst du sie hier neu anlegen.</p>
          ) : (
            <ul className="divide-y divide-[#0a0a0a]/[0.07] border border-[#0a0a0a]/10 rounded-sm bg-white">
              {treffer.slice(0, MAX_TREFFER).map(p => {
                const schonDa = vorhanden.indexOf(p.id) >= 0
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={schonDa}
                      onClick={() => waehlen(p)}
                      className="w-full text-left px-3 py-3 hover:bg-[#0a0a0a]/[0.04] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:bg-[#0a0a0a]/[0.06]"
                    >
                      <span className="font-medium">{p.name}</span>
                      {schonDa && <span className="ml-2 text-xs text-[#6b6b6b]">steht schon in der Liste</span>}
                      <span className="block text-xs text-[#6b6b6b] mt-0.5">
                        {p.verwendung.length ? p.verwendung.join(' · ') : 'bisher nirgends eingetragen'}
                      </span>
                    </button>
                  </li>
                )
              })}
              {treffer.length > MAX_TREFFER && (
                <li className="px-3 py-2 text-xs text-[#6b6b6b]">… und {treffer.length - MAX_TREFFER} weitere – bitte genauer suchen.</li>
              )}
              {treffer.length === 0 && <li className="px-3 py-3 text-sm text-[#6b6b6b]">Niemand mit diesem Namen gefunden.</li>}
              {!exakt && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setNeu({ name: eingabe, telefon: '', email: '' })
                      setNeuFehler(null)
                    }}
                    className="w-full text-left px-3 py-3 font-medium hover:bg-[#0a0a0a]/[0.04] flex items-center gap-2 focus:outline-none focus-visible:bg-[#0a0a0a]/[0.06]"
                  >
                    <UserPlus size={16} className="shrink-0" /> „{eingabe}“ als neue Person anlegen
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
