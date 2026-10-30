'use client'

/**
 * Der Übungsmodus einer Anleitung: Lektion für Lektion eine kleine Aufgabe in einem
 * nachgebauten Formular. "Weiter" geht, sobald die Aufgabe gelöst ist; überspringen ist erlaubt.
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CircleCheck, PartyPopper, RotateCcw } from 'lucide-react'
import { knopfKlassen } from '@/components/verwaltung/ui'
import { erledigtMerken } from './fortschritt'
import { UEBUNGEN } from './register'

export default function Tutorial({
  slug,
  ziel,
  anleitung,
  naechste,
}: {
  slug: string
  ziel?: { href: string; text: string }
  anleitung: string
  naechste?: { href: string; titel: string }
}) {
  const lektionen = UEBUNGEN[slug] ?? []
  const [nr, setNr] = useState(0)
  const [geloest, setGeloest] = useState<boolean[]>(() => lektionen.map(() => false))
  // Zähler für "Von vorn": ein neuer key baut die Übung mit ihrem Startzustand neu auf
  const [durchgang, setDurchgang] = useState(0)
  const ueberschrift = useRef<HTMLHeadingElement>(null)
  const ersterAufruf = useRef(true)
  const fertig = nr >= lektionen.length

  // Nach "Weiter"/"Zurück" den Fokus auf die neue Überschrift – fürs Vorlesen und Tastatur
  useEffect(() => {
    if (ersterAufruf.current) {
      ersterAufruf.current = false
      return
    }
    ueberschrift.current?.focus()
  }, [nr])

  const anzahlGeloest = geloest.filter(Boolean).length
  const alleGeloest = lektionen.length > 0 && anzahlGeloest === lektionen.length

  // Der Haken auf der Kachel gibt es nur, wenn wirklich alle Lektionen gelöst sind
  useEffect(() => {
    if (fertig && alleGeloest) erledigtMerken(slug)
  }, [fertig, alleGeloest, slug])

  if (lektionen.length === 0) return null

  if (fertig) {
    return (
      <div className="rounded-sm border border-[#0a0a0a]/10 bg-white p-6 md:p-8 text-center space-y-4">
        <PartyPopper size={36} className="mx-auto text-[#0a0a0a]" aria-hidden="true" />
        <h2 ref={ueberschrift} tabIndex={-1} className="font-display text-3xl md:text-4xl tracking-tight leading-none focus:outline-none">
          {alleGeloest ? 'Geschafft!' : 'Fast geschafft!'}
        </h2>
        <p className="mx-auto max-w-md text-[15px] leading-relaxed text-[#4a4a4a]">
          {alleGeloest
            ? `Du hast alle ${lektionen.length} Lektionen gelöst.`
            : `Du hast ${anzahlGeloest} von ${lektionen.length} Lektionen gelöst – die übersprungenen kannst du jederzeit nachholen.`}{' '}
          In der echten Verwaltung geht es genauso – nur dass dort gespeichert wird und die Änderung sofort auf der Website steht.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {!alleGeloest && (
            <button type="button" onClick={() => setNr(geloest.findIndex(g => !g))} className={knopfKlassen.sekundaer}>
              Übersprungene nachholen
            </button>
          )}
          {ziel && (
            <Link href={ziel.href} className={knopfKlassen.primaer}>
              {ziel.text} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
          {naechste && (
            <Link href={naechste.href} className={knopfKlassen.sekundaer}>
              Nächste Übung: {naechste.titel}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <Link href={anleitung} className="inline-flex items-center gap-1.5 underline underline-offset-4 text-[#4a4a4a] hover:text-[#0a0a0a]">
            <BookOpen size={14} aria-hidden="true" /> Ausführlich nachlesen
          </Link>
          <button
            type="button"
            onClick={() => {
              setGeloest(lektionen.map(() => false))
              setNr(0)
            }}
            className="inline-flex items-center gap-1.5 underline underline-offset-4 text-[#4a4a4a] hover:text-[#0a0a0a]"
          >
            <RotateCcw size={14} aria-hidden="true" /> Noch einmal üben
          </button>
        </div>
      </div>
    )
  }

  const lektion = lektionen[nr]
  const Inhalt = lektion.Inhalt
  const istGeloest = geloest[nr]

  return (
    <div className="space-y-5">
      {/* Fortschritt: ein Balken je Lektion, antippen springt dorthin */}
      <div>
        <div className="mb-2 text-xs text-[#6b6b6b]">
          Lektion {nr + 1} von {lektionen.length}
        </div>
        <ol className="flex gap-1.5">
          {lektionen.map((l, i) => (
            <li key={i} className="flex-1">
              <button
                type="button"
                onClick={() => setNr(i)}
                aria-label={`Lektion ${i + 1}: ${l.titel}${geloest[i] ? ' (gelöst)' : ''}`}
                aria-current={i === nr ? 'step' : undefined}
                className={`block h-2 w-full rounded-full transition-colors ${
                  geloest[i] ? 'bg-emerald-600' : i === nr ? 'bg-[#0a0a0a]' : 'bg-[#0a0a0a]/15 hover:bg-[#0a0a0a]/30'
                }`}
              />
            </li>
          ))}
        </ol>
      </div>

      <h2 ref={ueberschrift} tabIndex={-1} className="font-display text-3xl md:text-4xl tracking-tight leading-none focus:outline-none">
        {lektion.titel}
      </h2>

      <div className="rounded-sm bg-[#0a0a0a] px-4 py-3 text-[#f5f5f0]">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#f5f5f0]/60">Deine Aufgabe</div>
        <div className="text-[15px] leading-relaxed">{lektion.aufgabe}</div>
      </div>

      <Inhalt
        key={`${nr}-${durchgang}`}
        istGeloest={istGeloest}
        geloest={() => setGeloest(g => g.map((x, i) => (i === nr ? true : x)))}
      />

      {istGeloest && (
        <div role="status" className="flex gap-3 rounded-sm border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-relaxed">
          <CircleCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <strong className="font-semibold text-emerald-900">Richtig gemacht!</strong> {lektion.danach}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0a0a0a]/10 pt-4">
        {nr > 0 ? (
          <button type="button" onClick={() => setNr(nr - 1)} className={knopfKlassen.sekundaer}>
            <ArrowLeft size={15} aria-hidden="true" /> Zurück
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => {
              setDurchgang(d => d + 1)
              setGeloest(g => g.map((x, i) => (i === nr ? false : x)))
            }}
            className="text-sm text-[#6b6b6b] underline underline-offset-4 hover:text-[#0a0a0a]"
          >
            Von vorn
          </button>
          {!istGeloest && (
            <button type="button" onClick={() => setNr(nr + 1)} className="text-sm text-[#6b6b6b] underline underline-offset-4 hover:text-[#0a0a0a]">
              Überspringen
            </button>
          )}
          <button type="button" disabled={!istGeloest} onClick={() => setNr(nr + 1)} className={knopfKlassen.primaer}>
            {nr + 1 === lektionen.length ? 'Abschließen' : 'Weiter'} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
