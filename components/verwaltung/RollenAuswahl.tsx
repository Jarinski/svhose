'use client'

/**
 * Auswahl einer Rolle (z. B. "Trainer:in") aus Vorschlägen – oder frei eingetippt
 * über "Andere Rolle eintippen …". Mit `name` wird der Wert als verstecktes Feld mitgeschickt.
 */

import { useState } from 'react'
import { List } from 'lucide-react'
import { auswahlKlasse, eingabeKlasse, knopfKlassen } from './ui'

const EIGENE = '__eigene__'

export default function RollenAuswahl({
  id,
  wert,
  onChange,
  rollen,
  name,
  ungueltig,
}: {
  id: string
  wert: string
  onChange: (rolle: string) => void
  rollen: string[]
  name?: string
  ungueltig?: boolean
}) {
  const [eigene, setEigene] = useState(() => wert !== '' && rollen.indexOf(wert) < 0)

  return (
    <>
      {name && <input type="hidden" name={name} value={wert} />}
      {eigene ? (
        <div className="flex gap-2">
          <input
            id={id}
            value={wert}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            placeholder="Rolle eintippen, z. B. Teammanager:in"
            maxLength={60}
            aria-invalid={ungueltig || undefined}
            className={eingabeKlasse}
          />
          <button
            type="button"
            className={`${knopfKlassen.sekundaer} px-3`}
            title="Rolle aus der Liste wählen"
            aria-label="Rolle aus der Liste wählen"
            onClick={() => {
              setEigene(false)
              onChange(rollen[0] ?? '')
            }}
          >
            <List size={16} />
          </button>
        </div>
      ) : (
        <select
          id={id}
          value={wert}
          aria-invalid={ungueltig || undefined}
          onChange={e => {
            if (e.target.value === EIGENE) {
              setEigene(true)
              onChange('')
            } else onChange(e.target.value)
          }}
          className={auswahlKlasse}
        >
          {rollen.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
          <option value={EIGENE}>Andere Rolle eintippen …</option>
        </select>
      )}
    </>
  )
}
