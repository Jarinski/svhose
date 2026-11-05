'use client'

/**
 * Öffentlicher Belegungskalender für Vereinsheim und Gelände: ein Monat auf einen Blick, nur
 * Zeiten und ob regelmäßig, fest oder angefragt belegt – nie Namen oder Anlässe. Ein Tag lässt
 * sich antippen, um die Zeiten beider Orte zu sehen und ihn direkt ins Anfrageformular zu übernehmen.
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { FreiBelegt, TagesBelegung } from '@/lib/buchungen/belegung'
import { datumMitTag, MONATE, monatPlus, monatsRaster, ORT_NAMEN, tagPlus, uhrzeitAmTag, WOCHENTAGE_KURZ } from '@/lib/buchungen/zeit'
import { belegungMonatAbfragen } from './aktionen'
import { ART_FUELLUNG, ART_LEGENDE, ART_MARKE, ART_TEXT, ARTEN } from './belegungsarten'

export type KalenderOrt = keyof TagesBelegung
export type MonatsDaten = Record<string, TagesBelegung>

const KALENDER_ORTE: readonly KalenderOrt[] = ['vereinsheim', 'gelaende']
const MAX_IN_ZELLE = 3
const marke = 'text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]'
const pfeil = 'inline-flex items-center justify-center w-10 h-10 text-[#0a0a0a] hover:bg-[#0a0a0a]/[0.06] disabled:opacity-25 disabled:hover:bg-transparent'
/** Zeichenreihenfolge: Feste Belegung liegt oben. */
const EBENE: Record<FreiBelegt['art'], number> = { regel: 0, angefragt: 1, belegt: 2 }

/** Belegung als Balken über den Tag (0–24 Uhr) – für die schmalen Zellen auf dem Handy. */
function Zeitleiste({ liste, datum }: { liste: FreiBelegt[]; datum: string }) {
  const beginn = `${datum}T00:00`
  const ende = `${tagPlus(datum, 1)}T00:00`
  const minuten = (z: string) => (z <= beginn ? 0 : z >= ende ? 1440 : Number(z.slice(11, 13)) * 60 + Number(z.slice(14, 16)))
  return (
    <span className="relative block h-1.5 w-full bg-[#0a0a0a]/[0.06]" aria-hidden="true">
      {[...liste]
        .sort((a, b) => EBENE[a.art] - EBENE[b.art])
        .map(b => {
          const links = minuten(b.von) / 14.4
          // Auch eine kurze Belegung soll sichtbar bleiben.
          const breite = Math.min(Math.max((minuten(b.bis) - minuten(b.von)) / 14.4, 3), 100 - links)
          return <span key={`${b.von}-${b.art}`} className={`absolute inset-y-0 ${ART_FUELLUNG[b.art]}`} style={{ left: `${links}%`, width: `${breite}%` }} />
        })}
    </span>
  )
}

function beschreibung(liste: FreiBelegt[], datum: string): string {
  if (liste.length === 0) return 'noch nichts eingetragen'
  return liste.map(b => `${uhrzeitAmTag(b, datum)} ${ART_TEXT[b.art]}`).join(', ')
}

export default function BelegungsKalender({
  heute,
  max,
  start,
  anfragen,
}: {
  heute: string
  /** Spätester Tag, den man anfragen kann */
  max: string
  /** Vom Server mitgeliefert, damit der erste Monat ohne Laden erscheint */
  start: { monat: string; tage: MonatsDaten }
  anfragen: (datum: string, ort: KalenderOrt) => void
}) {
  const [monat, setMonat] = useState(start.monat)
  const [daten, setDaten] = useState<Record<string, MonatsDaten | null>>({ [start.monat]: start.tage })
  const [ort, setOrt] = useState<KalenderOrt>('vereinsheim')
  const [tag, setTag] = useState<string | null>(null)
  const laufend = useRef(new Set<string>())

  useEffect(() => {
    if (monat in daten || laufend.current.has(monat)) return
    laufend.current.add(monat)
    belegungMonatAbfragen(monat)
      .then(tage => setDaten(d => ({ ...d, [monat]: tage })))
      .catch(() => setDaten(d => ({ ...d, [monat]: null })))
      .finally(() => laufend.current.delete(monat))
  }, [monat, daten])

  const monatsDaten = daten[monat]
  const laedt = !(monat in daten)
  const tage = monatsRaster(monat)
  const [jahrZahl, monatZahl] = monat.split('-').map(Number)
  const wechseln = (n: number) => {
    setMonat(monatPlus(monat, n))
    setTag(null)
  }
  const tagDaten = tag ? daten[tag.slice(0, 7)]?.[tag] : undefined

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => wechseln(-1)} disabled={monat <= heute.slice(0, 7)} aria-label="Vorheriger Monat" className={pfeil}>
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-display text-3xl tracking-tight min-w-[11ch] text-center" aria-live="polite">
            {MONATE[monatZahl - 1].toUpperCase()} {jahrZahl}
          </h3>
          <button type="button" onClick={() => wechseln(1)} disabled={monat >= max.slice(0, 7)} aria-label="Nächster Monat" className={pfeil}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="inline-flex border border-[#0a0a0a]/15" role="group" aria-label="Ort">
          {KALENDER_ORTE.map(o => (
            <button
              key={o}
              type="button"
              aria-pressed={ort === o}
              onClick={() => setOrt(o)}
              className={`px-4 py-2 text-xs tracking-[0.1em] uppercase transition-colors ${ort === o ? 'bg-[#0a0a0a] text-[#f5f5f0]' : 'text-[#6b6b6b] hover:text-[#0a0a0a]'}`}
            >
              {ORT_NAMEN[o]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#0a0a0a]/10">
        <div className="grid grid-cols-7 border-b border-[#0a0a0a]/10">
          {WOCHENTAGE_KURZ.map(w => (
            <div key={w} className="px-1 md:px-2 py-2 text-[10px] md:text-[11px] tracking-[0.15em] uppercase text-[#6b6b6b] text-center md:text-left">
              {w}
            </div>
          ))}
        </div>
        {monatsDaten === null ? (
          <div className="p-8 text-sm text-center">
            Die Belegung konnte gerade nicht geladen werden.{' '}
            <button
              type="button"
              onClick={() =>
                setDaten(d => {
                  const rest = { ...d }
                  delete rest[monat]
                  return rest
                })
              }
              className="underline underline-offset-4"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-7 transition-opacity ${laedt ? 'opacity-40' : ''}`} aria-busy={laedt}>
            {tage.map((d, i) => {
              const rand = `border-[#0a0a0a]/[0.07] ${i % 7 !== 6 ? 'border-r' : ''} ${i < tage.length - 7 ? 'border-b' : ''}`
              if (d.slice(0, 7) !== monat) return <div key={d} className={`${rand} bg-[#f5f5f0]/60`} aria-hidden="true" />
              const waehlbar = d >= heute && d <= max
              const liste = (waehlbar && monatsDaten?.[d]?.[ort]) || []
              const gewaehlt = d === tag
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!waehlbar || laedt}
                  onClick={() => setTag(gewaehlt ? null : d)}
                  aria-pressed={gewaehlt}
                  aria-label={waehlbar ? `${datumMitTag(d)}, ${ORT_NAMEN[ort]}: ${beschreibung(liste, d)}` : datumMitTag(d)}
                  className={`${rand} min-h-[3.25rem] md:min-h-[6.75rem] p-1 md:p-2 flex flex-col items-stretch gap-1 text-left transition-colors ${
                    waehlbar ? 'hover:bg-[#f5f5f0]' : 'cursor-default'
                  } ${gewaehlt ? 'outline outline-2 -outline-offset-2 outline-[#0a0a0a] bg-[#f5f5f0]' : ''}`}
                >
                  <span
                    className={`self-center md:self-start inline-flex items-center justify-center w-6 h-6 text-xs tabular-nums ${
                      d === heute ? 'bg-[#0a0a0a] text-[#f5f5f0] rounded-full' : waehlbar ? 'text-[#0a0a0a]' : 'text-[#0a0a0a]/25'
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {liste.length > 0 && (
                    <>
                      <span className="md:hidden">
                        <Zeitleiste liste={liste} datum={d} />
                      </span>
                      <span className="hidden md:flex flex-col gap-0.5">
                        {liste.slice(0, MAX_IN_ZELLE).map(b => (
                          <span key={`${b.von}-${b.art}`} className={`block truncate px-1.5 py-0.5 text-[11px] tabular-nums ${ART_MARKE[b.art]}`}>
                            {uhrzeitAmTag(b, d)}
                          </span>
                        ))}
                        {liste.length > MAX_IN_ZELLE && <span className="px-1.5 text-[11px] text-[#6b6b6b]">+ {liste.length - MAX_IN_ZELLE} weitere</span>}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#6b6b6b]">
        {ARTEN.map(a => (
          <span key={a} className="inline-flex items-center gap-2">
            <span className={`w-3 h-3 shrink-0 ${ART_FUELLUNG[a]}`} aria-hidden="true" />
            {ART_LEGENDE[a]}
          </span>
        ))}
      </div>

      {tag && (
        <div className="mt-6 border border-[#0a0a0a] bg-white p-5 md:p-8" aria-live="polite">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className={`${marke} mb-2`}>Belegung am</div>
              <h3 className="font-display text-3xl tracking-tight">{datumMitTag(tag)}</h3>
            </div>
            <button type="button" onClick={() => setTag(null)} aria-label="Tag schließen" className={pfeil}>
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {KALENDER_ORTE.map(o => {
              const liste = tagDaten?.[o] ?? []
              return (
                <div key={o}>
                  <div className="font-medium mb-2">{ORT_NAMEN[o]}</div>
                  {liste.length === 0 ? (
                    <p className="text-sm text-[#6b6b6b]">Noch nichts eingetragen.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {liste.map(b => (
                        <li key={`${b.von}-${b.art}`} className="flex items-center gap-3">
                          <span className={`inline-block px-2 py-0.5 text-xs tabular-nums ${ART_MARKE[b.art]}`}>{uhrzeitAmTag(b, tag)}</span>
                          <span className="text-[#6b6b6b]">{ART_TEXT[b.art]}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => anfragen(tag, ort)}
            className="mt-8 inline-flex items-center justify-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-6 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            Diesen Tag anfragen <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
