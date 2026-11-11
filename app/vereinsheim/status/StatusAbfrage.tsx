'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { ORT_NAMEN, STATUS_ERKLAERUNG, STATUS_NAMEN, zeitraumText, type BuchungStatus } from '@/lib/buchungen/zeit'
import { standAbfragen, type StandZustand } from '../aktionen'
import { SPEICHER_SCHLUESSEL } from '../speicher'

const eingabe =
  'w-full bg-white border border-[#0a0a0a]/20 px-4 py-3 text-base text-[#0a0a0a] placeholder:text-[#0a0a0a]/35 focus:outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]'

const FARBE: Record<BuchungStatus, string> = {
  angefragt: 'bg-amber-100 text-amber-950',
  rueckfrage: 'bg-sky-100 text-sky-950',
  bestaetigt: 'bg-emerald-100 text-emerald-950',
  abgelehnt: 'bg-red-100 text-red-900',
  storniert: 'bg-[#0a0a0a]/[0.08] text-[#4a4a4a]',
}

function Knopf() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
      Abrufen
    </button>
  )
}

function geaendertText(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StatusAbfrage() {
  const [zustand, abfragen] = useActionState(standAbfragen, {} as StandZustand)
  const [vorschlag, setVorschlag] = useState<{ nummer?: string; datum?: string } | null>(null)

  // Direkt nach einer Anfrage: Nummer und Datum aus diesem Browser-Tab vorschlagen
  useEffect(() => {
    try {
      const roh = sessionStorage.getItem(SPEICHER_SCHLUESSEL)
      if (roh) setVorschlag(JSON.parse(roh))
    } catch {
      // nichts gemerkt – dann bleibt das Formular leer
    }
  }, [])

  const s = zustand.stand
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-12">
      <form key={vorschlag?.nummer ?? 'leer'} action={abfragen} onReset={e => e.preventDefault()} className="space-y-6">
        <div>
          <label htmlFor="nummer" className="block text-sm font-medium mb-2">
            Buchungsnummer
          </label>
          <input
            id="nummer"
            name="nummer"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="z. B. K7M2-Q9XD"
            defaultValue={vorschlag?.nummer ?? ''}
            className={`${eingabe} font-mono uppercase tracking-wider`}
          />
        </div>
        <div>
          <label htmlFor="datum" className="block text-sm font-medium mb-2">
            Datum der Buchung
          </label>
          <input id="datum" name="datum" type="date" required defaultValue={vorschlag?.datum ?? ''} className={eingabe} />
        </div>
        <Knopf />
        {zustand.meldung && !zustand.ok && (
          <p role="alert" className="text-sm text-red-700">
            {zustand.meldung}
          </p>
        )}
      </form>

      {s && (
        <section aria-live="polite" className="glas-karte p-8 md:p-10">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Buchung {s.nummer}</div>
          <div className={`inline-block rounded-full px-3.5 py-1.5 text-sm font-medium mb-4 ${FARBE[s.status]}`}>{STATUS_NAMEN[s.status]}</div>
          <p className="text-lg leading-relaxed mb-8">{STATUS_ERKLAERUNG[s.status]}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
            <dt className="text-[#6b6b6b]">Ort</dt>
            <dd>{ORT_NAMEN[s.ort]}</dd>
            <dt className="text-[#6b6b6b]">Wann</dt>
            <dd>{zeitraumText(s)}</dd>
            <dt className="text-[#6b6b6b]">Stand</dt>
            <dd>{geaendertText(s.geaendertAm)}</dd>
          </dl>
          {s.rueckmeldung && (
            <div className="mt-8 border-t border-[#0a0a0a]/10 pt-6">
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-2">Rückmeldung vom Verein</div>
              <p className="whitespace-pre-line leading-relaxed">{s.rueckmeldung}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
