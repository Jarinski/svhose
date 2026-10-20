'use client'

/**
 * Knöpfe "nach oben", "nach unten" und "entfernen" für Zeilen in sortierbaren Listen
 * (z. B. Ansprechpartner:innen oder Funktionen). Große Tipp-Flächen fürs Handy.
 */

import { ChevronDown, ChevronUp, X } from 'lucide-react'

const KNOPF =
  'inline-flex items-center justify-center w-10 h-10 rounded-sm border border-[#0a0a0a]/15 bg-white text-[#4a4a4a] hover:border-[#0a0a0a]/50 hover:text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]'

/** Verschiebt ein Element um eine Position (richtung -1 = nach oben, +1 = nach unten). */
export function verschieben<T>(liste: T[], index: number, richtung: -1 | 1): T[] {
  const ziel = index + richtung
  if (ziel < 0 || ziel >= liste.length) return liste
  const neu = liste.slice()
  const tmp = neu[index]
  neu[index] = neu[ziel]
  neu[ziel] = tmp
  return neu
}

export default function ReihenfolgeKnoepfe({
  index,
  anzahl,
  onVerschieben,
  onEntfernen,
  bezeichnung,
}: {
  index: number
  anzahl: number
  onVerschieben: (richtung: -1 | 1) => void
  onEntfernen: () => void
  /** Für Screenreader, z. B. der Name der Person in der Zeile. */
  bezeichnung: string
}) {
  return (
    <div className="flex gap-1 shrink-0">
      <button type="button" className={KNOPF} disabled={index === 0} onClick={() => onVerschieben(-1)} aria-label={`${bezeichnung} nach oben`} title="Nach oben">
        <ChevronUp size={16} />
      </button>
      <button
        type="button"
        className={KNOPF}
        disabled={index === anzahl - 1}
        onClick={() => onVerschieben(1)}
        aria-label={`${bezeichnung} nach unten`}
        title="Nach unten"
      >
        <ChevronDown size={16} />
      </button>
      <button
        type="button"
        className={`${KNOPF} hover:!text-red-700 hover:!border-red-300`}
        onClick={onEntfernen}
        aria-label={`${bezeichnung} entfernen`}
        title="Entfernen"
      >
        <X size={16} />
      </button>
    </div>
  )
}
