'use client'

import { Fragment, useState, type ReactNode } from 'react'
import FilterChip from '@/components/FilterChip'

export interface MannschaftEintrag {
  id: number
  /** Beschriftung in der Auswahl, z. B. "2015" oder "Damen" */
  label: string
  /** Fertig gerenderte Karte der Mannschaft */
  karte: ReactNode
}

export interface MannschaftAbschnitt {
  key: string
  title: string
  mannschaften: MannschaftEintrag[]
}

/** Erst ab so vielen Mannschaften lohnt sich eine Auswahl – bei wenigen scrollt man ohnehin nicht weit. */
const MIN_FUER_AUSWAHL = 4

/**
 * Mannschaften einer Sparte, nach Bereich gruppiert. Bei vielen Mannschaften (z. B. Fußball)
 * steht oben eine Auswahl, die nur die gewählte Mannschaft zeigt, damit man nicht bis zu ihr
 * scrollen muss.
 */
export default function MannschaftenListe({ abschnitte, farbe }: { abschnitte: MannschaftAbschnitt[]; farbe: string }) {
  const [aktiv, setAktiv] = useState<number | null>(null)
  const anzahl = abschnitte.reduce((summe, a) => summe + a.mannschaften.length, 0)
  const mitAuswahl = anzahl >= MIN_FUER_AUSWAHL
  const gewaehlt = mitAuswahl && aktiv !== null ? abschnitte.flatMap(a => a.mannschaften).find(m => m.id === aktiv) : undefined

  return (
    <>
      {mitAuswahl && (
        <div className="mt-8">
          <div className="text-[11px] tracking-[0.22em] uppercase text-[#6b6b6b] mb-3">Mannschaft wählen</div>
          <div className="space-y-3">
            <FilterChip label="Alle" active={!gewaehlt} activeColor="#0a0a0a" onClick={() => setAktiv(null)} />
            {abschnitte.map(abschnitt => (
              <div key={abschnitt.key} className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1.5">
                <div className="text-[11px] tracking-[0.18em] uppercase text-[#6b6b6b] sm:w-32 shrink-0">
                  {abschnitt.title}
                </div>
                <div className="flex flex-wrap gap-2">
                  {abschnitt.mannschaften.map(m => (
                    <FilterChip
                      key={m.id}
                      label={m.label}
                      active={gewaehlt?.id === m.id}
                      activeColor={farbe}
                      onClick={() => setAktiv(gewaehlt?.id === m.id ? null : m.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {gewaehlt ? (
        <div className="mt-8">{gewaehlt.karte}</div>
      ) : (
        <div className="mt-8 space-y-10">
          {abschnitte.map(abschnitt => (
            <div key={abschnitt.key}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm tracking-[0.18em] uppercase font-medium" style={{ color: farbe }}>
                  {abschnitt.title}
                </h3>
                <div className="flex-1 h-px" style={{ background: `${farbe}20` }} />
                <span className="text-[11px] text-[#6b6b6b] shrink-0">{abschnitt.mannschaften.length}</span>
              </div>

              <div className="space-y-3">
                {abschnitt.mannschaften.map(m => (
                  <Fragment key={m.id}>{m.karte}</Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
