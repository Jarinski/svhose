'use client'

/**
 * Bausteine für die Lektionen im Übungsmodus. Die Formulare sehen aus wie die echten
 * (gleiche Bausteine aus components/verwaltung/ui), schicken aber nichts ab.
 */

import { useState } from 'react'
import { FlaskConical, Globe } from 'lucide-react'
import { knopfKlassen, Meldung } from '@/components/verwaltung/ui'

/** Rahmen um den Übungsbereich – macht klar, dass hier nichts gespeichert wird. */
export function Spielwiese({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-sm border-2 border-dashed border-[#0a0a0a]/20 bg-[#fafaf8] p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b6b6b]">
        <FlaskConical size={14} aria-hidden="true" /> Übungsbereich – hier wird nichts gespeichert
      </div>
      {children}
    </div>
  )
}

/** Nachgebauter Ausschnitt der Website, z. B. eine Zeile auf /trainingszeiten. */
export function Vorschau({ adresse, children }: { adresse: string; children: React.ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-sm border border-[#0a0a0a]/15 bg-white">
      <figcaption className="flex items-center gap-2 border-b border-[#0a0a0a]/10 bg-[#f0f0ea] px-3 py-2 text-xs text-[#6b6b6b]">
        <Globe size={13} aria-hidden="true" />
        <span>So sieht es auf der Website aus</span>
        <span className="ml-auto truncate font-mono">{adresse}</span>
      </figcaption>
      <div className="bg-[#f5f5f0] p-4">{children}</div>
    </figure>
  )
}

/**
 * Nachbau der Speicherleiste (components/verwaltung/SpeicherLeiste.tsx), aber im Fluss der
 * Seite statt am unteren Rand. Steht in einem <form>; der Knopf schickt es ab.
 */
export function UebungsLeiste({
  geaendert,
  meldung,
  knopfText = 'Speichern',
}: {
  geaendert: boolean
  meldung?: { art: 'erfolg' | 'fehler' | 'hinweis'; text: React.ReactNode } | null
  knopfText?: string
}) {
  // Wie in der echten Leiste: Eine Erfolgsmeldung verschwindet, sobald wieder etwas geändert wird
  const zeigen = meldung && !(meldung.art === 'erfolg' && geaendert)

  return (
    <div className="mt-5 space-y-3 border-t border-[#0a0a0a]/10 pt-3">
      {zeigen && <Meldung art={meldung.art}>{meldung.text}</Meldung>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-[10rem] flex-1 text-sm" aria-live="polite">
          {geaendert ? (
            <span className="font-medium text-amber-800">Ungespeicherte Änderungen</span>
          ) : (
            <span className="text-[#6b6b6b]">Alles gespeichert.</span>
          )}
        </p>
        <button type="submit" className={`${knopfKlassen.primaer} px-8 py-3 text-base`}>
          {knopfText}
        </button>
      </div>
    </div>
  )
}

/** Kurze Frage mit Antworten zum Antippen. Falsche Antworten zeigen ihre Erklärung. */
export function Quiz({
  frage,
  antworten,
  geloest,
  istGeloest,
}: {
  frage: React.ReactNode
  antworten: { text: React.ReactNode; richtig?: boolean; erklaerung?: React.ReactNode }[]
  geloest: () => void
  istGeloest: boolean
}) {
  const [gewaehlt, setGewaehlt] = useState<number | null>(istGeloest ? antworten.findIndex(a => a.richtig) : null)
  const auswahl = gewaehlt != null ? antworten[gewaehlt] : null

  return (
    <div className="space-y-4">
      <p className="font-medium">{frage}</p>
      <div className="grid gap-2">
        {antworten.map((a, i) => {
          const aktiv = gewaehlt === i
          const rahmen = aktiv ? (a.richtig ? 'border-emerald-500 bg-emerald-50' : 'border-amber-400 bg-amber-50') : 'border-[#0a0a0a]/15 bg-white hover:border-[#0a0a0a]/40'
          return (
            <button
              key={i}
              type="button"
              aria-pressed={aktiv}
              onClick={() => {
                setGewaehlt(i)
                if (a.richtig) geloest()
              }}
              className={`rounded-sm border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] ${rahmen}`}
            >
              {a.text}
            </button>
          )
        })}
      </div>
      {auswahl && !auswahl.richtig && <Meldung art="hinweis">{auswahl.erklaerung ?? 'Nicht ganz – versuch es noch einmal.'}</Meldung>}
    </div>
  )
}
