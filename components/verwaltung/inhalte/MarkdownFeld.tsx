'use client'

/**
 * Großes Textfeld für Markdown mit Umschalter "Bearbeiten | Vorschau".
 * Die Vorschau nutzt dieselbe Darstellung wie die öffentliche News-Seite (components/MarkdownText).
 * Das Textfeld bleibt in der Vorschau im Formular (nur ausgeblendet), damit es mitgeschickt wird.
 */

import { useState } from 'react'
import MarkdownText from '@/components/MarkdownText'
import { eingabeKlasse } from '@/components/verwaltung/ui'

export default function MarkdownFeld({
  id,
  name,
  standardwert,
  zeilen = 16,
}: {
  id: string
  name: string
  standardwert: string
  zeilen?: number
}) {
  const [text, setText] = useState(standardwert)
  const [vorschau, setVorschau] = useState(false)

  const reiter = (aktiv: boolean) =>
    `px-4 py-2 text-sm font-medium transition-colors ${aktiv ? 'bg-[#0a0a0a] text-[#f5f5f0]' : 'bg-white text-[#4a4a4a] hover:bg-[#0a0a0a]/[0.05]'}`

  return (
    <div>
      <div role="tablist" aria-label="Ansicht" className="inline-flex mb-2 rounded-sm border border-[#0a0a0a]/20 overflow-hidden">
        <button type="button" role="tab" aria-selected={!vorschau} className={reiter(!vorschau)} onClick={() => setVorschau(false)}>
          Bearbeiten
        </button>
        <button type="button" role="tab" aria-selected={vorschau} className={reiter(vorschau)} onClick={() => setVorschau(true)}>
          Vorschau
        </button>
      </div>

      <textarea
        id={id}
        name={name}
        rows={zeilen}
        value={text}
        onChange={e => setText(e.target.value)}
        className={`${eingabeKlasse} leading-relaxed min-h-[16rem] ${vorschau ? 'hidden' : ''}`}
      />

      {vorschau && (
        <div className="min-h-[16rem] bg-white border border-[#0a0a0a]/20 rounded-sm px-4 py-5 sm:px-6 text-[#0a0a0a] leading-relaxed">
          {text.trim() ? <MarkdownText text={text} /> : <p className="text-sm text-[#6b6b6b]">Noch kein Text.</p>}
        </div>
      )}

      <p className="mt-1.5 text-xs text-[#6b6b6b] leading-relaxed">
        So geht’s: <code className="font-mono">**fett**</code>, <code className="font-mono">*kursiv*</code>,{' '}
        <code className="font-mono">## Zwischenüberschrift</code>, Leerzeile = neuer Absatz, Links einfach einfügen.
      </p>
    </div>
  )
}
