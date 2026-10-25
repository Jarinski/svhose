'use client'

/**
 * Übung "Anmelden & Mein Zugang" – Nachbau der Einladungsseite (app/verwaltung/anmelden/ZugangEinrichten.tsx),
 * der Anmeldeseite (app/verwaltung/login/**) und von "Mein Zugang" (app/verwaltung/(intern)/geraete/**)
 * mit denselben Prüfungen und Meldungen (lib/verwaltung/anmeldung.ts, passwort.ts, codes.ts,
 * app/verwaltung/aktionen.ts). Daneben steht eine nachgebaute Authenticator-App mit Übungscodes.
 * Es gibt keine echte Anmeldung: Passwörter und Codes sind erfunden und bleiben im Browser.
 */

import { useEffect, useRef, useState } from 'react'
import { Plus, QrCode, KeyRound } from 'lucide-react'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { Badge, eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { erfolg, fehler, LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese } from '../werkzeuge'

/* ── Erfundene Übungsdaten ─────────────────────────────────────────────────── */

const BENUTZERNAME = 'anna.beispiel'
const PASSWORT = 'Ballkontakt-24'
const NEUES_PASSWORT = 'Elfmeter-Sieg-2026'
const EINLADUNG = 'H3TR-7QKM-W9ZD'
const SCHLUESSEL = 'QK4T 7MZD 2XWB PN6R J3HV E5LA YC7S UF2G'

/* ── Dieselben Regeln und Texte wie die echte Anmeldung ───────────────────── */

const GESPERRT = 'Zu viele falsche Versuche. Bitte in einer Viertelstunde erneut probieren.'
const FEHLVERSUCHE_MAX = 5
const ANMELDUNG_FALSCH =
  'Anmeldung fehlgeschlagen. Benutzername, Passwort oder App-Code stimmen nicht. Hinweis: Jeder App-Code gilt nur einmal – ggf. auf den nächsten warten.'
const EINLADUNG_UNGUELTIG = 'Dieser Einladungs-Code ist ungültig, abgelaufen oder wurde schon benutzt. Bitte beim Admin einen neuen anfordern.'
const APP_CODE_FALSCH = 'Der Code aus der App stimmt nicht. Bitte den aktuell angezeigten Code eingeben (er wechselt alle 30 Sekunden).'

/** Wie codeNormalisieren (lib/verwaltung/codes.ts): Leerzeichen, Bindestriche und Groß-/Kleinschreibung sind egal. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
function codeNormalisieren(eingabe: string): string | null {
  const roh = eingabe
    .toUpperCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (roh.length !== 12) return null
  for (let i = 0; i < roh.length; i++) if (ALPHABET.indexOf(roh[i]) < 0) return null
  return roh
}

/** Wie benutzernameNormalisieren (lib/verwaltung/anmeldung.ts). */
function benutzernameNormalisieren(eingabe: string): string | null {
  const name = eingabe.trim().toLowerCase()
  return /^[a-z0-9][a-z0-9._-]{1,39}$/.test(name) ? name : null
}

/** Wie passwortRegelVerletzt (lib/verwaltung/passwort.ts). */
function passwortRegelVerletzt(passwort: string, benutzername: string | null): string | null {
  if (passwort.length < 10) return 'Das Passwort muss mindestens 10 Zeichen lang sein.'
  if (passwort.length > 200) return 'Das Passwort ist zu lang.'
  if (benutzername && passwort.toLowerCase().includes(benutzername.toLowerCase())) return 'Das Passwort darf den Benutzernamen nicht enthalten.'
  if (/^(.)\1+$/.test(passwort)) return 'Das Passwort ist zu einfach.'
  return null
}

/* ── Übungs-Authenticator: 6 Ziffern, wechseln alle 30 Sekunden ───────────── */

const SCHRITT_MS = 30_000

/** Ein erfundener Code je 30-Sekunden-Schritt (kein echtes TOTP – nur für die Übung). */
function uebungsCode(schritt: number): string {
  let h = (schritt * 31 + 739) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return String(h % 1_000_000).padStart(6, '0')
}

/**
 * Prüft einen eingegebenen Code wie totpPruefen (lib/verwaltung/totp.ts): Leerzeichen sind egal,
 * der vorige und der nächste Code gelten auch, mit `nachSchritt` nur Codes nach dem zuletzt benutzten.
 */
function codePruefen(eingabe: string, nachSchritt: number | null = null): number | null {
  const code = eingabe.replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return null
  const jetzt = Math.floor(Date.now() / SCHRITT_MS)
  for (const schritt of [jetzt, jetzt - 1, jetzt + 1]) {
    if (nachSchritt != null && schritt <= nachSchritt) continue
    if (uebungsCode(schritt) === code) return schritt
  }
  return null
}

/** Uhrzeit, jede Sekunde neu – erst nach dem Laden im Browser, damit nichts springt. */
function useJetzt(): number | null {
  const [jetzt, setJetzt] = useState<number | null>(null)
  useEffect(() => {
    setJetzt(Date.now())
    const takt = setInterval(() => setJetzt(Date.now()), 1000)
    return () => clearInterval(takt)
  }, [])
  return jetzt
}

function Countdown({ rest }: { rest: number }) {
  const umfang = 2 * Math.PI * 8
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-[#6b6b6b]">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="-rotate-90">
        <circle cx="10" cy="10" r="8" fill="none" stroke="#0a0a0a" strokeOpacity="0.1" strokeWidth="3" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={rest <= 5 ? '#b91c1c' : '#0a0a0a'}
          strokeWidth="3"
          strokeDasharray={umfang}
          strokeDashoffset={umfang * (1 - rest / 30)}
        />
      </svg>
      <span>
        {rest}
        <span className="sr-only"> Sekunden gültig</span>
      </span>
    </span>
  )
}

interface Konto {
  aussteller: string
  benutzer?: string
}

const ANNAS_KONTO: Konto = { aussteller: 'SV Holm-Seppensen', benutzer: BENUTZERNAME }

/**
 * Nachgebaute Authenticator-App (z. B. Google Authenticator, Aegis). Mit `koppeln` gibt es
 * den Knopf „+“: QR-Code scannen oder Schlüssel eingeben.
 */
type AppModus = 'liste' | 'auswahl' | 'schluessel'

function AuthApp({ konten, koppeln }: { konten: Konto[]; koppeln?: (konto: Konto) => void }) {
  const jetzt = useJetzt()
  const [modus, setModus] = useState<AppModus>('liste')
  const [schluessel, setSchluessel] = useState('')
  const [schluesselFehler, setSchluesselFehler] = useState<string | null>(null)
  const code = jetzt == null ? null : uebungsCode(Math.floor(jetzt / SCHRITT_MS))
  const rest = jetzt == null ? 30 : 30 - Math.floor((jetzt % SCHRITT_MS) / 1000)

  // Bei jedem Wechsel verschwindet der angetippte Knopf – danach gezielt fokussieren
  const fokusNach = useRef<'auswahl' | 'schluessel' | 'liste' | 'plus' | null>(null)
  const ersteWahl = useRef<HTMLButtonElement>(null)
  const schluesselFeld = useRef<HTMLInputElement>(null)
  const kontoListe = useRef<HTMLUListElement>(null)
  const plusKnopf = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const ziel = fokusNach.current
    if (!ziel) return
    fokusNach.current = null
    const element = { auswahl: ersteWahl, schluessel: schluesselFeld, liste: kontoListe, plus: plusKnopf }[ziel].current
    ;(element ?? plusKnopf.current)?.focus()
  })

  /** Ansicht wechseln; `fokus` sagt, wohin der Fokus danach springt. */
  function wechseln(neu: AppModus, fokus: 'auswahl' | 'schluessel' | 'liste' | 'plus') {
    fokusNach.current = fokus
    setModus(neu)
  }

  function schluesselHinzufuegen(e: React.FormEvent) {
    e.preventDefault()
    if (schluessel.toUpperCase().replace(/[\s-]/g, '') !== SCHLUESSEL.replace(/\s/g, '')) {
      setSchluesselFehler('Der Schlüssel stimmt nicht. Prüf ihn noch einmal.')
      schluesselFeld.current?.focus()
      return
    }
    koppeln?.({ aussteller: 'SV Holm-Seppensen' })
    setSchluessel('')
    setSchluesselFehler(null)
    wechseln('liste', 'liste')
  }

  return (
    <figure className="mx-auto w-full max-w-[15rem]">
      <figcaption className="mb-2 text-center text-xs text-[#6b6b6b]">Dein Handy (Übung)</figcaption>
      <div className="rounded-[1.75rem] border-[6px] border-[#0a0a0a] bg-white px-3 pb-4 pt-2 shadow-sm">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#0a0a0a]/15" aria-hidden="true" />
        <div className="mb-2 flex min-h-[36px] items-center justify-between gap-2">
          <span className="text-sm font-semibold">Authenticator</span>
          {koppeln && modus === 'liste' && (
            <button
              ref={plusKnopf}
              type="button"
              onClick={() => wechseln('auswahl', 'auswahl')}
              aria-label="Konto hinzufügen"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a0a0a] text-[#f5f5f0] hover:bg-[#2a2a2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {modus === 'auswahl' && (
          <div className="space-y-2">
            <p className="text-xs text-[#6b6b6b]">Konto hinzufügen</p>
            <button
              ref={ersteWahl}
              type="button"
              onClick={() => {
                koppeln?.(ANNAS_KONTO)
                wechseln('liste', 'liste')
              }}
              className={`${knopfKlassen.sekundaer} w-full justify-start`}
            >
              <QrCode size={16} aria-hidden="true" /> QR-Code scannen
            </button>
            <button type="button" onClick={() => wechseln('schluessel', 'schluessel')} className={`${knopfKlassen.sekundaer} w-full justify-start`}>
              <KeyRound size={16} aria-hidden="true" /> Schlüssel eingeben
            </button>
            <button type="button" onClick={() => wechseln('liste', 'plus')} className={`${knopfKlassen.leise} w-full`}>
              Abbrechen
            </button>
          </div>
        )}

        {modus === 'schluessel' && (
          <form onSubmit={schluesselHinzufuegen} className="space-y-2" noValidate>
            <label htmlFor="uebung-app-schluessel" className="block text-xs font-medium">
              Schlüssel
            </label>
            <input
              ref={schluesselFeld}
              id="uebung-app-schluessel"
              value={schluessel}
              onChange={e => setSchluessel(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`${eingabeKlasse} font-mono text-sm`}
            />
            {schluesselFehler && <p className="text-xs text-red-700">{schluesselFehler}</p>}
            <button type="submit" className={`${knopfKlassen.primaer} w-full`}>
              Hinzufügen
            </button>
            <button type="button" onClick={() => wechseln('liste', 'plus')} className={`${knopfKlassen.leise} w-full`}>
              Abbrechen
            </button>
          </form>
        )}

        {modus === 'liste' &&
          (konten.length === 0 ? (
            <p className="py-6 text-center text-xs leading-relaxed text-[#6b6b6b]">Noch keine Konten. Tippe auf „+“, um ein Konto hinzuzufügen.</p>
          ) : (
            <ul ref={kontoListe} tabIndex={-1} aria-label="Konten in der App" className="focus:outline-none">
              {konten.map((k, i) => (
                <li key={i} className="border-t border-[#0a0a0a]/10 py-2.5 first:border-t-0">
                  <div className="truncate text-xs text-[#6b6b6b]">
                    {k.aussteller}
                    {k.benutzer && `: ${k.benutzer}`}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={`font-mono text-2xl tracking-[0.12em] ${rest <= 5 ? 'text-red-700' : 'text-[#0a0a0a]'}`}>
                      <span className="sr-only">Code: </span>
                      {code ? `${code.slice(0, 3)} ${code.slice(3)}` : '––– –––'}
                    </span>
                    <Countdown rest={rest} />
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </figure>
  )
}

/**
 * Am Handy steht die Übungs-App über dem Formular, weit weg vom Code-Feld. Diese Zeile zeigt
 * ihren Code dort noch einmal – nur auf schmalen Bildschirmen.
 */
function AppCodeZeile({ konten }: { konten: Konto[] }) {
  const jetzt = useJetzt()
  if (jetzt == null) return null
  const code = uebungsCode(Math.floor(jetzt / SCHRITT_MS))
  const rest = 30 - Math.floor((jetzt % SCHRITT_MS) / 1000)
  return (
    <p className="mt-2 rounded-sm bg-[#f0f0ea] px-3 py-2 text-xs leading-relaxed text-[#6b6b6b] md:hidden">
      {konten.length === 0 ? (
        'Deine Übungs-App oben hat noch kein Konto – tippe dort zuerst auf „+“.'
      ) : (
        <>
          Deine Übungs-App oben zeigt gerade{' '}
          <span className="whitespace-nowrap font-mono text-sm text-[#0a0a0a]">
            {code.slice(0, 3)} {code.slice(3)}
          </span>{' '}
          (noch {rest} s)
        </>
      )}
    </p>
  )
}

/** Formular links, Handy rechts (auf dem Handy: Handy oben). */
function MitHandy({ handy, children }: { handy: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem] md:items-start">
      <div className="min-w-0">{children}</div>
      <div className="order-first md:sticky md:top-4 md:order-none">{handy}</div>
    </div>
  )
}

/**
 * Passwortfeld der Übung: ein Textfeld mit Punkten statt type="password" – so bietet kein
 * Passwort-Manager an, das Übungspasswort für die echte Verwaltung zu speichern.
 */
function PasswortEingabe(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>) {
  return (
    <input
      {...props}
      type="text"
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      data-1p-ignore=""
      data-lpignore="true"
      className={`${eingabeKlasse} [-webkit-text-security:disc]`}
    />
  )
}

/** Nachbau der Übersicht nach der Anmeldung (app/verwaltung/(intern)/page.tsx). */
function Angemeldet() {
  // Erscheint anstelle des Formulars – der Fokus wandert mit, statt auf der Seite verloren zu gehen
  const titel = useRef<HTMLHeadingElement>(null)
  useEffect(() => titel.current?.focus(), [])
  return (
    <div className="space-y-2 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-800">Angemeldet – weiter zur Übersicht</p>
      <h3 ref={titel} tabIndex={-1} className="font-display text-4xl leading-none tracking-tight focus:outline-none md:text-5xl">
        HALLO ANNA
      </h3>
      <p className="text-sm text-[#6b6b6b]">Hier ist alles, was du bearbeiten darfst.</p>
    </div>
  )
}

/* ── Nachbau der Einladungsseite (/verwaltung/anmelden) ───────────────────── */

function EinladungKopf({ titel, titelRef }: { titel: string; titelRef?: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="mb-8">
      <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[#6b6b6b]">SV Holm-Seppensen · Vereinsverwaltung</div>
      <h3 ref={titelRef} tabIndex={-1} className="font-display text-4xl tracking-tight focus:outline-none sm:text-5xl">
        {titel}
      </h3>
    </div>
  )
}

function Schritt({ nummer, titel, children }: { nummer: number; titel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-[#0a0a0a]/10 bg-white p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0a] text-sm font-medium text-[#f5f5f0]">{nummer}</span>
        <h4 className="font-medium">{titel}</h4>
      </div>
      {children}
    </section>
  )
}

function BenutzernameSchritt() {
  return (
    <Schritt nummer={1} titel="Dein Benutzername">
      <p className="text-sm text-[#4a4a4a]">Damit meldest du dich künftig an – am besten merken:</p>
      <div className="mt-3 select-all rounded-sm border border-[#0a0a0a]/10 bg-[#f5f5f0] px-3 py-2 font-mono text-lg">{BENUTZERNAME}</div>
    </Schritt>
  )
}

/** Erfundener QR-Code (nur Muster, nicht scanbar) – mit den drei Ecken, an denen man QR-Codes erkennt. */
const QR_PFAD = (() => {
  const n = 25
  let saat = 7
  const zufall = () => {
    saat = (Math.imul(saat, 1103515245) + 12345) >>> 0
    return (saat >>> 16) & 1
  }
  const ecke = (x: number, y: number): number | null => {
    for (const [ex, ey] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]) {
      const dx = x - ex
      const dy = y - ey
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) return 0
    }
    return null
  }
  let pfad = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (ecke(x, y) ?? zufall()) pfad += `M${x} ${y}h1v1h-1z`
  return pfad
})()

/* ── Lektion 1: die Einladung öffnen ──────────────────────────────────────── */

function EinladungUebung({ geloest }: LektionProps) {
  const [eingabe, setEingabe] = useState('')
  const [fehlerText, setFehlerText] = useState<string | null>(null)
  const [bereit, setBereit] = useState(false)
  const titel = useRef<HTMLHeadingElement>(null)

  // Das Formular verschwindet – der Fokus springt auf „WILLKOMMEN, ANNA!“
  useEffect(() => {
    if (bereit) titel.current?.focus()
  }, [bereit])

  function weiter(e: React.FormEvent) {
    e.preventDefault()
    // Wie in echt: Ohne Eingabe passiert nichts
    if (!eingabe.trim()) return
    if (codeNormalisieren(eingabe) !== codeNormalisieren(EINLADUNG)) {
      setFehlerText(EINLADUNG_UNGUELTIG)
      return
    }
    setFehlerText(null)
    setBereit(true)
    geloest()
  }

  return (
    <Spielwiese>
      <div className="mx-auto max-w-lg">
        <EinladungKopf titel={bereit ? 'WILLKOMMEN, ANNA!' : 'ZUGANG EINRICHTEN'} titelRef={titel} />
        {bereit ? (
          <div className="space-y-4">
            <BenutzernameSchritt />
            <p className="text-sm text-[#6b6b6b]">Darunter folgen „Passwort festlegen“ und „Authenticator-App koppeln“ – das übst du in der nächsten Lektion.</p>
          </div>
        ) : (
          <form onSubmit={weiter} className="space-y-5">
            {fehlerText && <Meldung art="fehler">{fehlerText}</Meldung>}
            <Feld label="Einladungs-Code" htmlFor="uebung-einladung" hinweis="12 Zeichen, z. B. K7QM-9XTD-2HWP – du hast ihn zusammen mit dem QR-Code bekommen.">
              <input
                id="uebung-einladung"
                value={eingabe}
                onChange={e => setEingabe(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="XXXX-XXXX-XXXX"
                className={`${eingabeKlasse} font-mono text-xl uppercase tracking-[0.12em]`}
              />
            </Feld>
            <button type="submit" className={`${knopfKlassen.primaer} w-full py-3`}>
              Weiter
            </button>
            <p className="text-xs text-[#6b6b6b]">
              Schon eingerichtet? <span className="underline underline-offset-4">Zur Anmeldung</span>
            </p>
          </form>
        )}
      </div>
    </Spielwiese>
  )
}

/* ── Lektion 2: Passwort festlegen und App koppeln ────────────────────────── */

function EinrichtenUebung({ geloest }: LektionProps) {
  const [konten, setKonten] = useState<Konto[]>([])
  const [passwort, setPasswort] = useState('')
  const [passwortWdh, setPasswortWdh] = useState('')
  const [code, setCode] = useState('')
  const [ergebnis, setErgebnis] = useState<FormErgebnis>(LEER)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fertig, setFertig] = useState(false)
  const felder = ergebnis.felder ?? {}

  function einrichten(e: React.FormEvent) {
    e.preventDefault()
    setHinweis(null)
    // Reihenfolge wie einrichtungAbschliessen: Passwort-Regeln, Wiederholung, App-Code
    const regel = passwortRegelVerletzt(passwort, BENUTZERNAME)
    if (regel) return setErgebnis(fehler(regel, { passwort: regel }))
    if (passwort !== passwortWdh) return setErgebnis(fehler('Die beiden Passwörter stimmen nicht überein.', { passwortWdh: 'Die beiden Passwörter stimmen nicht überein.' }))
    if (konten.length === 0 || codePruefen(code) == null) {
      setErgebnis(fehler(APP_CODE_FALSCH, { totpCode: APP_CODE_FALSCH }))
      if (konten.length === 0) setHinweis('Tipp: In der App ist noch kein Konto. Tippe dort auf „+“ und scanne den QR-Code.')
      return
    }
    if (passwort !== PASSWORT) {
      setErgebnis(LEER)
      return setHinweis(`In der Übung noch nicht ganz: Nimm bitte das Übungspasswort „${PASSWORT}“ – das brauchst du gleich beim Anmelden.`)
    }
    setErgebnis(LEER)
    setFertig(true)
    geloest()
  }

  if (fertig) {
    return (
      <Spielwiese>
        <Angemeldet />
      </Spielwiese>
    )
  }

  return (
    <Spielwiese>
      <MitHandy handy={<AuthApp konten={konten} koppeln={k => setKonten(ks => ks.concat(k))} />}>
        <EinladungKopf titel="WILLKOMMEN, ANNA!" />
        <form onSubmit={einrichten} className="space-y-5">
          <BenutzernameSchritt />

          <Schritt nummer={2} titel="Passwort festlegen">
            <div className="space-y-4">
              <Feld
                label="Neues Passwort"
                htmlFor="uebung-passwort"
                hinweis="Mindestens 10 Zeichen. Ein Satz aus mehreren Wörtern ist sicher und gut zu merken."
                fehler={felder.passwort}
              >
                <PasswortEingabe id="uebung-passwort" value={passwort} onChange={e => setPasswort(e.target.value)} required minLength={10} />
              </Feld>
              <Feld label="Passwort wiederholen" htmlFor="uebung-passwort-wdh" fehler={felder.passwortWdh}>
                <PasswortEingabe id="uebung-passwort-wdh" value={passwortWdh} onChange={e => setPasswortWdh(e.target.value)} required minLength={10} />
              </Feld>
            </div>
          </Schritt>

          <Schritt nummer={3} titel="Authenticator-App koppeln">
            <p className="text-sm leading-relaxed text-[#4a4a4a]">
              Öffne eine Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator oder Aegis – kostenlos im App Store bzw. Play Store),
              tippe auf „+“ bzw. „Konto hinzufügen“ und scanne diesen QR-Code.
            </p>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                className="h-48 w-48 shrink-0 self-center border border-[#0a0a0a]/10 bg-white p-2 sm:self-auto"
                role="img"
                aria-label="QR-Code für die Authenticator-App (Übung, nicht scanbar)"
              >
                <svg viewBox="-1 -1 27 27" className="h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
                  <path d={QR_PFAD} fill="#0a0a0a" />
                </svg>
              </div>
              <div className="text-xs leading-relaxed text-[#6b6b6b]">
                Bist du gerade auf dem Handy und kannst nicht scannen? Dann in der App „Schlüssel eingeben“ wählen und diesen Schlüssel eintippen:
                <div className="mt-2 select-all break-all font-mono text-sm text-[#0a0a0a]">{SCHLUESSEL}</div>
              </div>
            </div>
            <div className="mt-5">
              <Feld label="Code aus der App" htmlFor="uebung-code-einrichten" hinweis="Zur Kontrolle: Gib die 6 Ziffern ein, die die App jetzt anzeigt." fehler={felder.totpCode}>
                <input
                  id="uebung-code-einrichten"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  placeholder="123456"
                  className={`${eingabeKlasse} max-w-[12rem] font-mono text-xl tracking-[0.3em]`}
                />
              </Feld>
              <AppCodeZeile konten={konten} />
            </div>
          </Schritt>

          <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0a0a0a]" />
            Auf diesem Gerät angemeldet bleiben (30 Tage)
          </label>
          <FormMeldung ergebnis={ergebnis} />
          {hinweis && <Meldung art="hinweis">{hinweis}</Meldung>}
          <SpeichernKnopf className="w-full py-3">Zugang einrichten und anmelden</SpeichernKnopf>
        </form>
      </MitHandy>
    </Spielwiese>
  )
}

/* ── Lektion 3: Anmelden (/verwaltung/login) ──────────────────────────────── */

function AnmeldenUebung({ geloest }: LektionProps) {
  const [benutzername, setBenutzername] = useState('')
  const [passwort, setPasswort] = useState('')
  const [code, setCode] = useState('')
  const [merken, setMerken] = useState(true)
  const [ergebnis, setErgebnis] = useState<FormErgebnis>(LEER)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehlversuche, setFehlversuche] = useState(0)
  const [angemeldet, setAngemeldet] = useState(false)

  function anmelden(e: React.FormEvent) {
    e.preventDefault()
    setHinweis(null)
    if (fehlversuche >= FEHLVERSUCHE_MAX) {
      setErgebnis(fehler(GESPERRT))
      return setHinweis('In der Übung musst du keine Viertelstunde warten: Tipp unten auf „Von vorn“.')
    }
    const name = benutzernameNormalisieren(benutzername)
    const schritt = name === BENUTZERNAME && passwort === PASSWORT ? codePruefen(code) : null
    if (schritt == null) {
      setFehlversuche(n => n + 1)
      return setErgebnis(fehler(ANMELDUNG_FALSCH))
    }
    if (merken) {
      setErgebnis(LEER)
      return setHinweis('In der Übung noch nicht ganz: Am gemeinsamen Rechner im Vereinsheim bitte den Haken bei „Auf diesem Gerät angemeldet bleiben (30 Tage)“ entfernen.')
    }
    setErgebnis(LEER)
    setAngemeldet(true)
    geloest()
  }

  if (angemeldet) {
    return (
      <Spielwiese>
        <Angemeldet />
      </Spielwiese>
    )
  }

  return (
    <Spielwiese>
      <MitHandy handy={<AuthApp konten={[ANNAS_KONTO]} />}>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/SV_Holm_Seppensen_Logo.svg" alt="" className="h-10 w-10" />
            <div className="text-[11px] uppercase leading-tight tracking-[0.2em] text-[#6b6b6b]">
              SV Holm-Seppensen
              <br />
              Vereinsverwaltung
            </div>
          </div>
          <h3 className="mb-3 font-display text-5xl tracking-tight">ANMELDEN</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#6b6b6b]">Mit Benutzername, Passwort und dem Code aus deiner Authenticator-App.</p>
          <form onSubmit={anmelden} className="space-y-5">
            <Feld label="Benutzername" htmlFor="uebung-benutzername">
              <input
                id="uebung-benutzername"
                value={benutzername}
                onChange={e => setBenutzername(e.target.value)}
                required
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className={eingabeKlasse}
              />
            </Feld>
            <Feld label="Passwort" htmlFor="uebung-passwort-login">
              <PasswortEingabe id="uebung-passwort-login" value={passwort} onChange={e => setPasswort(e.target.value)} required />
            </Feld>
            <div>
              <Feld label="Code aus der Authenticator-App" htmlFor="uebung-code-login" hinweis="6 Ziffern, wechselt alle 30 Sekunden.">
                <input
                  id="uebung-code-login"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  placeholder="123456"
                  className={`${eingabeKlasse} font-mono text-xl tracking-[0.3em]`}
                />
              </Feld>
              <AppCodeZeile konten={[ANNAS_KONTO]} />
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm">
              <input type="checkbox" checked={merken} onChange={e => setMerken(e.target.checked)} className="h-4 w-4 accent-[#0a0a0a]" />
              Auf diesem Gerät angemeldet bleiben (30 Tage)
            </label>
            <FormMeldung ergebnis={ergebnis} />
            {hinweis && <Meldung art="hinweis">{hinweis}</Meldung>}
            <SpeichernKnopf className="w-full py-3">Anmelden</SpeichernKnopf>
          </form>
          <div className="mt-8 space-y-2 text-xs leading-relaxed text-[#6b6b6b]">
            <p>
              Du hast eine Einladung bekommen? Dann scanne den QR-Code oder <span className="underline underline-offset-4">gib den Einladungs-Code hier ein</span>.
            </p>
            <p>Passwort vergessen oder Handy verloren? Ein Admin kann deinen Zugang zurücksetzen – danach richtest du ihn neu ein.</p>
          </div>
        </div>
      </MitHandy>
    </Spielwiese>
  )
}

/* ── Nachbau "Mein Zugang" (/verwaltung/geraete) ──────────────────────────── */

interface Geraet {
  id: number
  name: string
  /** Zeitpunkte als Abstand zu „jetzt“ in Minuten – so stimmen die Daten an jedem Tag. */
  angemeldetVor: number
  zuletztAktivVor: number
}

const TAG = 24 * 60
// Sortiert wie auf der echten Seite: zuletzt aktiv zuerst. Alle mit „angemeldet bleiben“ (30 Tage).
const GERAETE: Geraet[] = [
  { id: 1, name: 'Windows · Chrome', angemeldetVor: 4 * TAG - 90, zuletztAktivVor: 25 },
  { id: 2, name: 'iPhone · Safari', angemeldetVor: 13 * TAG + 200, zuletztAktivVor: 15 * 60 },
  { id: 3, name: 'Android · Chrome', angemeldetVor: TAG + 9 * 60, zuletztAktivVor: TAG + 8 * 60 + 32 },
]
const DIESES_GERAET = 1
// Eingerichtet hat Anna den Zugang auf dem iPhone – das war ihre erste Anmeldung
const EINGERICHTET_VOR = GERAETE[1].angemeldetVor

/** Zeitpunkt beim Öffnen der Lektion, auf die Minute – erst im Browser, damit Server und Browser gleich rendern. */
function useStartzeit(): number | null {
  const [start, setStart] = useState<number | null>(null)
  useEffect(() => setStart(Math.floor(Date.now() / 60_000) * 60_000), [])
  return start
}

const vor = (start: number, minuten: number) => new Date(start - minuten * 60_000).toISOString()

function ZugangKopf({ start }: { start: number | null }) {
  return (
    <div className="mb-6">
      <h3 className="font-display text-4xl leading-none tracking-tight md:text-5xl">MEIN ZUGANG</h3>
      <div className="mt-2 text-sm text-[#6b6b6b]">
        Benutzername: <span className="font-mono text-[#0a0a0a]">{BENUTZERNAME}</span>
        {start != null && <> · Passwort und App eingerichtet am {zeitpunktDeutsch(vor(start, EINGERICHTET_VOR))}</>}
      </div>
    </div>
  )
}

function HandyVerlorenKarte() {
  return (
    <Karte titel="Handy verloren oder neue App?">
      <p className="text-sm leading-relaxed text-[#4a4a4a]">
        Dann bitte einen Admin, deinen Zugang zurückzusetzen. Dabei werden alle Geräte abgemeldet, und du bekommst einen neuen Einladungs-QR-Code,
        mit dem du Passwort und Authenticator-App neu einrichtest.
      </p>
    </Karte>
  )
}

/* ── Lektion 4: ein fremdes Gerät abmelden ────────────────────────────────── */

function GeraeteUebung({ geloest }: LektionProps) {
  const [geraete, setGeraete] = useState(GERAETE)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const liste = useRef<HTMLDivElement>(null)
  const start = useStartzeit()

  function abmelden(id: number) {
    const rest = geraete.filter(g => g.id !== id)
    setGeraete(rest)
    // Der Knopf verschwindet mit dem Gerät – den Fokus nicht verlieren
    liste.current?.focus({ preventScroll: true })
    const iphoneDa = rest.some(g => g.id === 2)
    const androidDa = rest.some(g => g.id === 3)
    if (!iphoneDa) {
      setHinweis(
        androidDa
          ? 'Das war Annas eigenes iPhone – dort muss sie sich jetzt neu anmelden. Gesucht ist das Android-Gerät. Mit „Von vorn“ startest du neu.'
          : 'Das Android-Gerät ist weg – aber Annas eigenes iPhone auch. Mit „Von vorn“ startest du neu.',
      )
      return
    }
    setHinweis(null)
    if (!androidDa) geloest()
  }

  return (
    <Spielwiese>
      <ZugangKopf start={start} />
      <div ref={liste} tabIndex={-1} className="space-y-6 focus:outline-none">
        <Karte titel="Angemeldete Geräte" beschreibung="Ein Gerät, das du nicht kennst? Abmelden und das Passwort ändern.">
          <ul className="divide-y divide-[#0a0a0a]/[0.07]">
            {geraete.map(g => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    {g.name} {g.id === DIESES_GERAET && <Badge ton="erfolg">dieses Gerät</Badge>}
                  </div>
                  {start != null && (
                    <div className="text-xs text-[#6b6b6b]">
                      angemeldet am {zeitpunktDeutsch(vor(start, g.angemeldetVor))} · zuletzt aktiv {zeitpunktDeutsch(vor(start, g.zuletztAktivVor))} ·
                      gültig bis {zeitpunktDeutsch(vor(start, g.angemeldetVor - 30 * TAG))}
                    </div>
                  )}
                </div>
                {g.id !== DIESES_GERAET && (
                  <button type="button" onClick={() => abmelden(g.id)} className={knopfKlassen.sekundaer} aria-label={`${g.name} abmelden`}>
                    Abmelden
                  </button>
                )}
              </li>
            ))}
          </ul>
          {hinweis && (
            <div className="mt-3">
              <Meldung art="hinweis">{hinweis}</Meldung>
            </div>
          )}
        </Karte>
        <HandyVerlorenKarte />
      </div>
    </Spielwiese>
  )
}

/* ── Lektion 5: Passwort ändern ───────────────────────────────────────────── */

function PasswortUebung({ geloest }: LektionProps) {
  const [alt, setAlt] = useState('')
  const [code, setCode] = useState('')
  const [neu, setNeu] = useState('')
  const [neuWdh, setNeuWdh] = useState('')
  const [ergebnis, setErgebnis] = useState<FormErgebnis>(LEER)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehlversuche, setFehlversuche] = useState(0)
  const felder = ergebnis.felder ?? {}
  const start = useStartzeit()

  function aendern(e: React.FormEvent) {
    e.preventDefault()
    setHinweis(null)
    // Reihenfolge wie passwortAendern: Sperre, altes Passwort + App-Code, Regeln, Wiederholung
    if (fehlversuche >= FEHLVERSUCHE_MAX) {
      setErgebnis(fehler(GESPERRT))
      return setHinweis('In der Übung musst du keine Viertelstunde warten: Tipp unten auf „Von vorn“.')
    }
    const schritt = alt === PASSWORT ? codePruefen(code) : null
    if (schritt == null) {
      setFehlversuche(n => n + 1)
      // Bewusst eine gemeinsame Meldung – sie verrät nicht, ob das Passwort gestimmt hat.
      return setErgebnis(fehler('Aktuelles Passwort oder App-Code stimmt nicht.'))
    }
    const regel = passwortRegelVerletzt(neu, BENUTZERNAME)
    if (regel) return setErgebnis(fehler(regel, { neuesPasswort: regel }))
    if (neu !== neuWdh) {
      const text = 'Die beiden neuen Passwörter stimmen nicht überein.'
      return setErgebnis(fehler(text, { neuesPasswortWdh: text }))
    }
    if (neu !== NEUES_PASSWORT) {
      setErgebnis(LEER)
      return setHinweis(`In der Übung noch nicht ganz: Nimm als neues Passwort bitte „${NEUES_PASSWORT}“.`)
    }
    // Wie in echt: Nach dem Erfolg ist das Formular wieder leer
    setAlt('')
    setCode('')
    setNeu('')
    setNeuWdh('')
    setErgebnis(erfolg('Passwort geändert. Alle anderen Geräte wurden abgemeldet.'))
    geloest()
  }

  return (
    <Spielwiese>
      <MitHandy handy={<AuthApp konten={[ANNAS_KONTO]} />}>
        <ZugangKopf start={start} />
        <div className="space-y-6">
          <Karte titel="Passwort ändern" beschreibung="Zur Sicherheit mit dem aktuellen Passwort und einem Code aus der App. Danach werden alle anderen Geräte abgemeldet.">
            <form onSubmit={aendern} className="grid gap-4 lg:grid-cols-2">
              <Feld label="Aktuelles Passwort" htmlFor="uebung-alt" fehler={felder.altesPasswort}>
                <PasswortEingabe id="uebung-alt" value={alt} onChange={e => setAlt(e.target.value)} required />
              </Feld>
              <div>
                <Feld label="Code aus der App" htmlFor="uebung-code-aendern" fehler={felder.totpCode}>
                  <input
                    id="uebung-code-aendern"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9 ]{6,7}"
                    maxLength={7}
                    className={`${eingabeKlasse} font-mono tracking-[0.3em]`}
                  />
                </Feld>
                <AppCodeZeile konten={[ANNAS_KONTO]} />
              </div>
              <Feld label="Neues Passwort" htmlFor="uebung-neu" hinweis="Mindestens 10 Zeichen." fehler={felder.neuesPasswort}>
                <PasswortEingabe id="uebung-neu" value={neu} onChange={e => setNeu(e.target.value)} required minLength={10} />
              </Feld>
              <Feld label="Neues Passwort wiederholen" htmlFor="uebung-neu-wdh" fehler={felder.neuesPasswortWdh}>
                <PasswortEingabe id="uebung-neu-wdh" value={neuWdh} onChange={e => setNeuWdh(e.target.value)} required minLength={10} />
              </Feld>
              <div className="space-y-3 lg:col-span-2">
                <FormMeldung ergebnis={ergebnis} />
                {hinweis && <Meldung art="hinweis">{hinweis}</Meldung>}
                <SpeichernKnopf>Passwort ändern</SpeichernKnopf>
              </div>
            </form>
          </Karte>
          <HandyVerlorenKarte />
        </div>
      </MitHandy>
    </Spielwiese>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Die Einladung öffnen',
    aufgabe: (
      <>
        Ein:e Admin hat Anna Beispiel eingeladen. Ihr Einladungs-Code lautet <strong>{EINLADUNG}</strong>. Öffne die Einladung, indem du den Code
        eintippst.
      </>
    ),
    Inhalt: EinladungUebung,
    danach:
      'Am Handy scannst du stattdessen einfach den QR-Code der Einladung. Beim Code sind Groß- und Kleinschreibung und Bindestriche egal. Eine Einladung gilt 7 Tage und nur einmal.',
  },
  {
    titel: 'Passwort und App einrichten',
    aufgabe: (
      <>
        Leg für Anna das Übungspasswort <strong>{PASSWORT}</strong> fest (zweimal). Koppel dann die App: Tippe im Handy auf „+“ und scanne den
        QR-Code. Gib den Code aus der App ein und richte den Zugang ein.
      </>
    ),
    Inhalt: EinrichtenUebung,
    danach: (
      <>
        In echt denkst du dir dein eigenes Passwort aus – am besten einen Satz aus mehreren Wörtern. Wichtig: Lade die Seite nach dem Scannen nicht
        neu. Sonst erscheint ein neuer QR-Code, und der Eintrag in der App passt nicht mehr.
      </>
    ),
  },
  {
    titel: 'Am Vereinsrechner anmelden',
    aufgabe: (
      <>
        Melde dich als <strong>{BENUTZERNAME}</strong> mit dem Passwort <strong>{PASSWORT}</strong> und dem Code aus der App an. Du sitzt am
        gemeinsamen Rechner im Vereinsheim – also ohne „angemeldet bleiben“.
      </>
    ),
    Inhalt: AnmeldenUebung,
    danach:
      'Ohne Haken endet die Anmeldung, wenn du den Browser schließt – spätestens nach 12 Stunden. Melde dich am gemeinsamen Rechner am Ende trotzdem über „Abmelden“ ab. Jeder App-Code gilt nur einmal: Für ein zweites Gerät wartest du auf den nächsten.',
  },
  {
    titel: 'Ein fremdes Gerät abmelden',
    aufgabe: (
      <>
        Anna nutzt einen Windows-PC (an dem sie gerade sitzt) und ihr iPhone. In der Liste steht aber auch ein Android-Gerät, das sie nicht kennt.
        Melde es ab – mit dem Knopf „Abmelden“ in seiner Zeile unter „Angemeldete Geräte“. Achtung: „Abmelden“ unten in der Seitenleiste bzw. im
        Menü ist echt und meldet dich selbst aus der Verwaltung ab.
      </>
    ),
    Inhalt: GeraeteUebung,
    danach:
      'Das Android-Gerät ist sofort abgemeldet. Für eine neue Anmeldung bräuchte es Passwort und App-Code. Bei einem unbekannten Gerät änderst du danach auch dein Passwort – das kommt als Nächstes.',
  },
  {
    titel: 'Passwort ändern',
    aufgabe: (
      <>
        Ändere Annas Passwort von <strong>{PASSWORT}</strong> auf <strong>{NEUES_PASSWORT}</strong>. Den Code holst du dir aus der App. Neugierig?
        Probier vorher ein Passwort mit dem Benutzernamen darin aus.
      </>
    ),
    Inhalt: PasswortUebung,
    danach:
      'Alle anderen Geräte – auch Annas iPhone – sind jetzt abgemeldet. Dort meldet sie sich mit dem neuen Passwort neu an. Nur das Gerät, an dem sie gerade sitzt, bleibt angemeldet.',
  },
  {
    titel: 'Handy verloren – was tun?',
    aufgabe: 'Eine Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Annas Handy mit der Authenticator-App ist weg. Am PC ist sie noch angemeldet. Was ist der richtige Weg?"
        antworten={[
          {
            text: 'Am PC unter „Mein Zugang“ schnell ein neues Passwort festlegen.',
            erklaerung: 'Dafür braucht sie einen Code aus der App – und die ist mit dem Handy weg.',
          },
          {
            text: 'Am PC das Handy abmelden und eine:n Admin bitten, den Zugang zurückzusetzen.',
            richtig: true,
          },
          {
            text: 'Auf der Anmeldeseite selbst einen neuen Zugang anlegen.',
            erklaerung: 'Selbst registrieren geht nicht – Zugänge legt ein:e Admin an.',
          },
          {
            text: 'Die alte Einladung noch einmal öffnen und die App neu koppeln.',
            erklaerung: 'Eine Einladung gilt nur einmal und höchstens 7 Tage. Nach dem Zurücksetzen gibt es eine neue.',
          },
        ]}
      />
    ),
    danach: (
      <>
        Beim Zurücksetzen werden alle Geräte abgemeldet, das alte Passwort und die App-Kopplung gelten nicht mehr. Mit der neuen Einladung richtet
        Anna Passwort und App neu ein – der Benutzername bleibt gleich. Taucht auf dem neuen Handy (etwa über eine Cloud-Sicherung) noch der alte
        Eintrag „SV Holm-Seppensen“ auf, lösch ihn: Er gilt nicht mehr.
      </>
    ),
  },
]
