'use client'

/**
 * Anfrage für Vereinsheim und Gelände. Zeigt beim Wählen von Tag und Ort, was dort schon belegt
 * ist (nur Zeiten), und nach dem Absenden die Buchungsnummer.
 */

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, ArrowRight, Check, Copy, Loader2 } from 'lucide-react'
import type { FreiBelegt } from '@/lib/buchungen/belegung'
import { datumMitTag, ORT_NAMEN, uhrzeitAmTag, zeitenUeberschneiden, zeitraumAus, type BuchungOrt } from '@/lib/buchungen/zeit'
import { anfrageSenden, belegungAbfragen, type AnfrageZustand } from './aktionen'
import { ART_MARKE, ART_TEXT } from './belegungsarten'
import Captcha from './Captcha'
import { SPEICHER_SCHLUESSEL } from './speicher'


const eingabe =
  'w-full bg-white border border-[#0a0a0a]/20 px-4 py-3 text-base text-[#0a0a0a] placeholder:text-[#0a0a0a]/35 focus:outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]'
const marke = 'text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]'

function Feld({ label, id, fehler, hinweis, children, className = '' }: { label: string; id: string; fehler?: string; hinweis?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      {children}
      {fehler ? <p className="mt-1.5 text-sm text-red-700">{fehler}</p> : hinweis ? <p className="mt-1.5 text-xs text-[#6b6b6b] leading-relaxed">{hinweis}</p> : null}
    </div>
  )
}

function Abschnitt({ nummer, titel, children }: { nummer: string; titel: string; children: React.ReactNode }) {
  const id = `abschnitt-${nummer}`
  return (
    <div role="group" aria-labelledby={id} className="border-t border-[#0a0a0a]/10 pt-8 grid grid-cols-1 md:grid-cols-[12rem_minmax(0,1fr)] gap-x-12 gap-y-6">
      <div>
        <span className={`${marke} block mb-2`}>{nummer}</span>
        <h2 id={id} className="font-display text-3xl tracking-tight">
          {titel}
        </h2>
      </div>
      <div className="space-y-6 min-w-0">{children}</div>
    </div>
  )
}

function Auswahl({
  name,
  wert,
  aktuell,
  setzen,
  titel,
  text,
  pflicht,
}: {
  name: string
  wert: string
  aktuell: string | null
  setzen: (w: string) => void
  titel: string
  text?: string
  pflicht?: boolean
}) {
  const an = aktuell === wert
  return (
    <label className={`flex items-start gap-3 border p-4 cursor-pointer transition-colors ${an ? 'border-[#0a0a0a] bg-white' : 'border-[#0a0a0a]/15 hover:border-[#0a0a0a]/40'}`}>
      <input type="radio" name={name} value={wert} checked={an} required={pflicht} onChange={() => setzen(wert)} className="mt-1 w-4 h-4 accent-[#0a0a0a]" />
      <span>
        <span className="block font-medium">{titel}</span>
        {text && <span className="block text-sm text-[#6b6b6b] mt-0.5 leading-relaxed">{text}</span>}
      </span>
    </label>
  )
}

function AbsendenKnopf() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
      Anfrage senden
    </button>
  )
}

function Belegung({ datum, ort, wunsch }: { datum: string; ort: BuchungOrt; wunsch: { von: string; bis: string } | null }) {
  const [daten, setDaten] = useState<{ schluessel: string; liste: FreiBelegt[] | null } | null>(null)
  const schluessel = `${datum}|${ort}`
  useEffect(() => {
    let aktuell = true
    belegungAbfragen(datum, ort)
      .then(liste => aktuell && setDaten({ schluessel, liste }))
      .catch(() => aktuell && setDaten({ schluessel, liste: null }))
    return () => {
      aktuell = false
    }
  }, [datum, ort, schluessel])

  if (!daten || daten.schluessel !== schluessel) return <p className="text-sm text-[#6b6b6b]">Belegung wird geladen …</p>
  if (!daten.liste) return null
  const konflikt = !!wunsch && daten.liste.some(b => b.art !== 'angefragt' && zeitenUeberschneiden(b, wunsch))
  return (
    <div className="border border-[#0a0a0a]/10 bg-white p-4" aria-live="polite">
      <div className={`${marke} mb-3`}>
        {ORT_NAMEN[ort]} am {datumMitTag(datum)}
      </div>
      {daten.liste.length === 0 ? (
        <p className="text-sm">Noch nichts eingetragen.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {daten.liste.map(b => (
            <li key={`${b.von}-${b.art}`} className="flex items-center gap-3">
              <span className={`inline-block px-2 py-0.5 text-xs tabular-nums ${ART_MARKE[b.art]}`}>{uhrzeitAmTag(b, datum)}</span>
              <span className="text-[#6b6b6b]">{ART_TEXT[b.art]}</span>
            </li>
          ))}
        </ul>
      )}
      {konflikt && (
        <p className="mt-3 flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Deine Zeit überschneidet sich mit einer Belegung. Du kannst trotzdem anfragen – wir prüfen, ob es passt.
        </p>
      )}
    </div>
  )
}

function Erfolg({ zustand }: { zustand: AnfrageZustand }) {
  const [kopiert, setKopiert] = useState(false)
  return (
    <div className="bg-[#0a0a0a] text-[#f5f5f0] p-8 md:p-12" role="status">
      <div className="text-[11px] tracking-[0.2em] uppercase text-[#f5f5f0]/50 mb-3">Anfrage ist eingegangen</div>
      <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-8">DANKE!</h2>
      <div className="text-[11px] tracking-[0.2em] uppercase text-[#f5f5f0]/50 mb-2">Deine Buchungsnummer</div>
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <span className="font-mono text-4xl md:text-5xl tracking-wider">{zustand.nummer}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              ?.writeText(zustand.nummer ?? '')
              .then(() => setKopiert(true))
              .catch(() => {})
          }}
          className="inline-flex items-center gap-2 border border-[#f5f5f0]/30 px-4 py-2 text-xs tracking-[0.1em] uppercase hover:border-[#f5f5f0]"
        >
          {kopiert ? <Check size={14} /> : <Copy size={14} />} {kopiert ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>
      <div className="max-w-xl space-y-3 text-[#f5f5f0]/80 leading-relaxed">
        <p>
          Notier dir die Nummer. Mit ihr und dem Datum ({zustand.datum ? datumMitTag(zustand.datum) : ''}) siehst du jederzeit, ob deine Anfrage bestätigt ist.
          {zustand.mail && ' Eine Bestätigung mit der Nummer schicken wir dir auch per E-Mail.'}
        </p>
        {zustand.ueberschneidung && <p>Zu der Zeit ist schon etwas eingetragen. Wir prüfen, ob es trotzdem passt, und melden uns.</p>}
      </div>
      <Link
        href="/vereinsheim/status"
        className="mt-10 inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-6 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white"
      >
        Stand abrufen <ArrowRight size={16} />
      </Link>
    </div>
  )
}

/**
 * heute: Datum vom Server (Europe/Berlin), damit Server- und Browser-Darstellung übereinstimmen.
 * max: spätester Tag, den man anfragen kann. Datum und Ort hält Buchungsbereich, weil der Kalender sie setzt.
 */
export default function AnfrageFormular({
  heute,
  max,
  datum,
  setDatum,
  ort,
  setOrt,
}: {
  heute: string
  max: string
  datum: string
  setDatum: (datum: string) => void
  ort: string | null
  setOrt: (ort: string) => void
}) {
  const [zustand, absenden] = useActionState(anfrageSenden, {} as AnfrageZustand)
  // Jede Captcha-Lösung gilt nur einmal: nach jedem nicht erfolgreichen Absenden neu rechnen
  const [captchaRunde, setCaptchaRunde] = useState(0)
  useEffect(() => {
    if (zustand.ok === false) setCaptchaRunde(r => r + 1)
  }, [zustand])
  const [art, setArt] = useState<string | null>(null)
  const [ganztaegig, setGanztaegig] = useState(false)
  const [mehrtaegig, setMehrtaegig] = useState(false)
  const [beginn, setBeginn] = useState('')
  const [ende, setEnde] = useState('')
  const [bisDatum, setBisDatum] = useState('')
  const f = zustand.felder ?? {}

  // Nummer und Datum für die Statusseite merken (nur in diesem Browser-Tab)
  useEffect(() => {
    if (!zustand.ok || !zustand.nummer) return
    try {
      sessionStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({ nummer: zustand.nummer, datum: zustand.datum }))
    } catch {
      // ohne Speicher geht es auch – dann tippt man die Nummer selbst ein
    }
    document.getElementById('anfrage')?.scrollIntoView({ behavior: 'smooth' })
  }, [zustand])

  if (zustand.ok && zustand.nummer) return <Erfolg zustand={zustand} />

  const wunschZeit = (() => {
    if (!datum) return null
    const z = zeitraumAus({ datum, beginn, ende, bisDatum: mehrtaegig ? bisDatum : null, ganztaegig })
    return 'zeitraum' in z ? z.zeitraum : null
  })()
  const naechtlich = !ganztaegig && !mehrtaegig && !!beginn && !!ende && ende <= beginn

  return (
    <form action={absenden} onReset={e => e.preventDefault()} className="space-y-12">
      {/* Lockfeld für Bots – für Menschen unsichtbar */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="webseite">Webseite (bitte leer lassen)</label>
        <input id="webseite" name="webseite" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Abschnitt nummer="01" titel="WER BUCHT?">
        <div className="grid gap-3 sm:grid-cols-2">
          <Auswahl name="art" wert="mitglied" aktuell={art} setzen={setArt} pflicht titel="Ich bin im Verein" text="Für deine Mannschaft, Sparte oder eine eigene Feier reservieren." />
          <Auswahl name="art" wert="extern" aktuell={art} setzen={setArt} titel="Ich bin nicht im Verein" text="Als Privatperson, Verein, Schule oder Firma mieten." />
        </div>
        {f.art && <p className="text-sm text-red-700">{f.art}</p>}
      </Abschnitt>

      <Abschnitt nummer="02" titel="WAS UND WANN?">
        <div className="grid gap-3 sm:grid-cols-3">
          <Auswahl name="ort" wert="vereinsheim" aktuell={ort} setzen={setOrt} titel="Vereinsheim" text="Der Gemeinschaftsraum" />
          <Auswahl name="ort" wert="gelaende" aktuell={ort} setzen={setOrt} titel="Gelände" text="Platz und Außenfläche" />
          <Auswahl name="ort" wert="beides" aktuell={ort} setzen={setOrt} titel="Beides" text="z. B. für ein Fest" />
        </div>
        {f.ort && <p className="text-sm text-red-700">{f.ort}</p>}

        <div className="grid gap-6 sm:grid-cols-2">
          <Feld label="Datum" id="datum" fehler={f.datum}>
            <input
              id="datum"
              name="datum"
              type="date"
              required
              min={heute}
              max={max}
              value={datum}
              onChange={e => setDatum(e.target.value)}
              className={eingabe}
            />
          </Feld>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input type="checkbox" name="ganztaegig" value="1" checked={ganztaegig} onChange={e => setGanztaegig(e.target.checked)} className="w-4 h-4 accent-[#0a0a0a]" />
              Ganztägig
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input type="checkbox" checked={mehrtaegig} onChange={e => setMehrtaegig(e.target.checked)} className="w-4 h-4 accent-[#0a0a0a]" />
              Über mehrere Tage
            </label>
          </div>
          {!ganztaegig && (
            <>
              <Feld label="Von" id="beginn" fehler={f.beginn}>
                <input id="beginn" name="beginn" type="time" required value={beginn} onChange={e => setBeginn(e.target.value)} className={eingabe} />
              </Feld>
              <Feld label="Bis" id="ende" fehler={f.ende} hinweis={naechtlich ? 'Endet in der Nacht zum nächsten Tag.' : undefined}>
                <input id="ende" name="ende" type="time" required value={ende} onChange={e => setEnde(e.target.value)} className={eingabe} />
              </Feld>
            </>
          )}
          {mehrtaegig && (
            <Feld label="Letzter Tag" id="bisDatum" fehler={f.bisDatum}>
              <input
                id="bisDatum"
                name="bisDatum"
                type="date"
                min={datum || heute}
                value={bisDatum}
                onChange={e => setBisDatum(e.target.value)}
                className={eingabe}
              />
            </Feld>
          )}
        </div>
        {datum && ort && datum >= heute && <Belegung datum={datum} ort={ort as BuchungOrt} wunsch={wunschZeit} />}
      </Abschnitt>

      <Abschnitt nummer="03" titel="ANLASS">
        <Feld label="Wofür?" id="titel" fehler={f.titel} hinweis="Zum Beispiel Geburtstagsfeier, Elternabend, Mannschaftsabend, Versammlung.">
          <input id="titel" name="titel" required maxLength={150} className={eingabe} />
        </Feld>
        <div className="grid gap-6 sm:grid-cols-2">
          <Feld label="Wie viele Personen ungefähr?" id="personenzahl" fehler={f.personenzahl}>
            <input id="personenzahl" name="personenzahl" type="number" min={1} max={2000} inputMode="numeric" className={eingabe} />
          </Feld>
          <Feld label={art === 'extern' ? 'Verein, Schule oder Firma (optional)' : 'Sparte oder Mannschaft (optional)'} id="bereich" fehler={f.bereich}>
            <input id="bereich" name="bereich" maxLength={150} className={eingabe} />
          </Feld>
        </div>
      </Abschnitt>

      <Abschnitt nummer="04" titel="KONTAKT">
        <div className="grid gap-6 sm:grid-cols-2">
          <Feld label="Name" id="name" fehler={f.name} className="sm:col-span-2">
            <input id="name" name="name" required maxLength={150} autoComplete="name" className={eingabe} />
          </Feld>
          <Feld label="E-Mail" id="email" fehler={f.email}>
            <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className={eingabe} />
          </Feld>
          <Feld label="Telefon (optional)" id="telefon" fehler={f.telefon}>
            <input id="telefon" name="telefon" type="tel" maxLength={50} autoComplete="tel" className={eingabe} />
          </Feld>
          <Feld label="Nachricht (optional)" id="nachricht" fehler={f.nachricht} className="sm:col-span-2" hinweis="Was wir sonst noch wissen sollten.">
            <textarea id="nachricht" name="nachricht" rows={4} maxLength={3000} className={eingabe} />
          </Feld>
        </div>
        <label className="flex items-start gap-3 cursor-pointer text-sm text-[#6b6b6b] leading-relaxed">
          <input type="checkbox" name="datenschutz" value="1" required className="mt-1 w-4 h-4 accent-[#0a0a0a] shrink-0" />
          <span>
            Ich bin einverstanden, dass der SV Holm-Seppensen meine Angaben speichert, um die Anfrage zu bearbeiten und mich dazu zu kontaktieren. Name und
            Kontaktdaten werden spätestens ein Jahr nach dem Termin gelöscht. Mehr in der{' '}
            <Link href="/datenschutz" className="text-[#0a0a0a] underline underline-offset-2" target="_blank">
              Datenschutzerklärung
            </Link>
            .
          </span>
        </label>
        {f.datenschutz && <p className="text-sm text-red-700">{f.datenschutz}</p>}
      </Abschnitt>

      <div className="border-t border-[#0a0a0a]/10 pt-8 flex flex-wrap items-center gap-6 md:pl-[15rem]">
        <AbsendenKnopf />
        <Captcha runde={captchaRunde} />
        {zustand.meldung && !zustand.ok && (
          <p role="alert" className="text-sm text-red-700 max-w-md">
            {zustand.meldung}
          </p>
        )}
      </div>
    </form>
  )
}
