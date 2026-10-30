'use client'

/**
 * Übung "Spartenseite gestalten" – Nachbau der Bearbeitungsseite einer Sparte
 * (app/verwaltung/(intern)/sparten/[id]/SparteFormular.tsx) mit denselben Prüfungen und Meldungen
 * (sparten/logik.ts, sparten/aktionen.ts) und einer Vorschau der Seite der Sparte
 * (app/sparten/[slug]/page.tsx) bzw. der Übersicht aller Sparten (app/sparten/SpartenClient.tsx).
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Mail, Phone, RefreshCw, Search, UserPlus } from 'lucide-react'
import ReihenfolgeKnoepfe, { verschieben } from '@/components/verwaltung/ReihenfolgeKnoepfe'
import { Badge, eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { slugify } from '@/lib/verwaltung/text'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { CRON_SLUGS, SPARTEN_ROLLEN, STANDARD_ROLLE } from '../../../sparten/konstanten'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

/* ── Erfundene Beispieldaten ───────────────────────────────────────────────── */

interface Person {
  id: number
  name: string
  email: string | null
  telefon: string | null
}

const PERSONEN: Person[] = [
  { id: 1, name: 'Anna Beispiel', email: 'anna@example.org', telefon: '0171 2345678' },
  { id: 2, name: 'Jonas Muster', email: 'jonas@example.org', telefon: '0172 3456789' },
  { id: 3, name: 'Mira Probe', email: 'mira@example.org', telefon: '0173 4567890' },
  { id: 4, name: 'Moritz Probe', email: null, telefon: '0174 5678901' },
  { id: 5, name: 'Paul Platzhalter', email: 'paul@example.org', telefon: null },
]

/** Adressen der anderen (erfundenen) Sparten – für die Prüfung "schon vergeben". */
const ANDERE_SPARTEN = [
  { name: 'Fußball', slug: 'fussball', icon: '⚽', farbe: '#16a34a', kurz: 'Vom Minikicker bis zu den Alten Herren.', reihenfolge: 10 },
  { name: 'Judo', slug: 'judo', icon: '🥋', farbe: '#dc2626', kurz: 'Fallen lernen, fair kämpfen – für Kinder und Erwachsene.', reihenfolge: 20 },
  { name: 'Turnen', slug: 'turnen', icon: '🤸', farbe: '#7c3aed', kurz: 'Eltern-Kind-Turnen, Geräteturnen und Fitness.', reihenfolge: 40 },
]

/* ── Formularwerte, Vergleich und Prüfung wie im echten Formular ──────────── */

interface Ansprechpartner {
  personId: number
  name: string
  rolle: string
}

interface Werte {
  name: string
  icon: string
  farbe: string
  kurz: string
  beschreibung: string
  sichtbar: boolean
  reihenfolge: string
  slug: string
  ap: Ansprechpartner[]
}

const FARBE = /^#[0-9a-fA-F]{6}$/

const START: Werte = {
  name: 'Tischtennis',
  icon: '',
  farbe: '',
  kurz: '',
  beschreibung: 'Wir spielen dienstags und donnerstags in der Sporthalle – Anfänger:innen sind jederzeit willkommen.\n\nSchläger zum Ausprobieren liegen bereit.',
  sichtbar: true,
  reihenfolge: '30',
  slug: 'tischtennis',
  ap: [{ personId: 2, name: 'Jonas Muster', rolle: STANDARD_ROLLE }],
}

function werte(teil: Partial<Werte>): Werte {
  return { ...START, ...teil }
}

function gross(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function mehrzeilig(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim()
}

/** Wie vergleichsStand im echten Formular: Ränder, Umbrüche, Farbe klein, leere Rolle = Standardrolle. */
function vergleichsStand(w: Werte): string {
  return JSON.stringify([
    w.name.trim(),
    w.icon.trim(),
    w.farbe.trim().toLowerCase(),
    mehrzeilig(w.kurz),
    mehrzeilig(w.beschreibung),
    w.sichtbar,
    Number(w.reihenfolge) || 0,
    slugify(w.slug),
    w.ap.map(a => [a.personId, a.rolle.trim() || STANDARD_ROLLE]),
  ])
}

/** Wie `zahlFeld(…) ?? 0` beim echten Speichern: leer oder keine ganze Zahl ergibt 0. */
function reihenfolgeZahl(text: string): number {
  const n = Number(text)
  return text.trim() !== '' && Number.isInteger(n) ? n : 0
}

/**
 * Dieselben Prüfungen und Texte wie eingabePruefen in sparten/logik.ts. Ein ganz leerer Name kommt
 * hier nicht an – den hält wie in echt schon der Browser auf. Eine Kommazahl bei der Reihenfolge
 * meldet die echte Verwaltung nicht: Der Browser lässt sie durch, gespeichert wird dann 0.
 */
function pruefen(w: Werte, istAdmin: boolean): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!w.name.trim()) felder.name = 'Bitte einen Namen eintragen.'
  const farbe = w.farbe.trim()
  if (farbe && !FARBE.test(farbe)) felder.farbe = 'Bitte eine Farbe im Format #12ab56 eintragen – oder das Feld leer lassen.'
  if (istAdmin && !slugify(w.slug)) felder.slug = 'Bitte eine Adresse eintragen (nur Kleinbuchstaben, Ziffern und Bindestriche).'
  const ids = w.ap.map(a => a.personId)
  if (ids.some((id, i) => ids.indexOf(id) !== i)) felder.ansprechpartner = 'Jede Person kann nur einmal Ansprechpartner:in derselben Sparte sein.'
  return felder
}

/** Gespeicherter Stand: so vereinheitlicht, wie ihn die Verwaltung nach dem Speichern zeigt. */
function vereinheitlichen(w: Werte): Werte {
  return {
    name: w.name.trim(),
    icon: w.icon.trim(),
    farbe: w.farbe.trim().toLowerCase(),
    kurz: mehrzeilig(w.kurz),
    beschreibung: mehrzeilig(w.beschreibung),
    sichtbar: w.sichtbar,
    reihenfolge: String(reihenfolgeZahl(w.reihenfolge)),
    slug: slugify(w.slug),
    ap: w.ap.map(a => ({ ...a, rolle: a.rolle.trim() || STANDARD_ROLLE })),
  }
}

/* ── Nachbau der Personensuche (components/verwaltung/PersonSuche.tsx) ─────── */

function normalisieren(text: string): string {
  return text.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

function PersonSucheUebung({ id, ausschliessen, onWaehlen }: { id: string; ausschliessen: number[]; onWaehlen: (p: Person) => void }) {
  const [suche, setSuche] = useState('')
  const [info, setInfo] = useState(false)
  const teile = normalisieren(suche).split(/\s+/).filter(Boolean)
  const treffer =
    teile.length === 0
      ? []
      : PERSONEN.filter(p => ausschliessen.indexOf(p.id) < 0 && teile.every(t => normalisieren(p.name).indexOf(t) >= 0)).sort((a, b) =>
          a.name.localeCompare(b.name, 'de'),
        )

  function waehlen(p: Person) {
    onWaehlen(p)
    setSuche('')
  }

  return (
    <div>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={suche}
          autoComplete="off"
          placeholder="Namen eingeben …"
          onChange={e => setSuche(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (treffer[0]) waehlen(treffer[0])
            } else if (e.key === 'Escape') setSuche('')
          }}
          className={`${eingabeKlasse} pl-9`}
        />
      </div>
      {suche.trim() !== '' && (
        <ul className="mt-1 max-h-72 divide-y divide-[#0a0a0a]/[0.07] overflow-y-auto rounded-sm border border-[#0a0a0a]/15 bg-white">
          {treffer.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-[#6b6b6b]">Keine passende Person gefunden.</li>
          ) : (
            treffer.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => waehlen(p)}
                  className="w-full px-3 py-2.5 text-left text-[15px] hover:bg-[#0a0a0a]/[0.05] focus:bg-[#0a0a0a]/[0.05] focus:outline-none"
                >
                  {p.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b6b6b]">
        <button type="button" onClick={() => setInfo(true)} className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#0a0a0a]">
          <UserPlus size={13} aria-hidden="true" /> Person fehlt? Neue Person anlegen ↗
        </button>
        <button type="button" onClick={() => setInfo(true)} className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#0a0a0a]">
          <RefreshCw size={12} aria-hidden="true" /> Liste aktualisieren
        </button>
      </div>
      {info && (
        <p className="mt-2 text-xs text-amber-800">
          In echt öffnet „Neue Person anlegen“ einen neuen Tab; danach holt „Liste aktualisieren“ die neue Person in die Suche. In der Übung sind schon alle
          Personen da.
        </p>
      )}
    </div>
  )
}

/* ── Vorschau: Seite der Sparte und Übersicht aller Sparten ───────────────── */

function initialen(name: string) {
  return (
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

function Abschnittskopf({ titel, farbe, anzahl }: { titel: string; farbe: string; anzahl: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: farbe }} />
      <div className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: farbe }}>
        {titel}
      </div>
      <div className="h-px flex-1" style={{ background: `${farbe}25` }} />
      <div className="shrink-0 text-[11px] text-[#6b6b6b]">{anzahl}</div>
    </div>
  )
}

function WebsiteSparte({ w, foto }: { w: Werte; foto: string | null }) {
  const farbe = w.farbe || '#0a0a0a'
  const kontakte = w.ap.map(a => ({ ...a, person: PERSONEN.find(p => p.id === a.personId) }))
  return (
    <Vorschau adresse={`/sparten/${w.slug}`}>
      <div className="pl-4" style={{ borderLeft: `3px solid ${farbe}` }}>
        {w.icon && <div className="mb-3 text-4xl leading-none">{w.icon}</div>}
        <div className="break-words font-display text-4xl leading-none tracking-tight sm:text-5xl">{w.name.toUpperCase()}</div>
        {w.kurz && <p className="mt-3 text-base font-light leading-relaxed text-[#6b6b6b]">{w.kurz}</p>}
      </div>
      <div className="my-5 h-px bg-[#0a0a0a]/10" />
      {w.beschreibung && <p className="mb-6 whitespace-pre-line text-sm leading-[1.8] text-[#4a4a4a]">{w.beschreibung}</p>}
      {foto && (
        <div className="mb-6 aspect-[21/9] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt={`${w.name} – Teamfoto`} className="h-full w-full object-cover" />
        </div>
      )}
      {kontakte.length > 0 ? (
        <section>
          <Abschnittskopf titel="ANSPRECHPARTNER" farbe={farbe} anzahl={kontakte.length} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {kontakte.map(k => (
              <div key={k.personId} className="flex min-w-0 flex-col bg-white p-5">
                <div
                  className="mb-4 flex h-16 w-16 select-none items-center justify-center rounded-full text-lg font-semibold text-white"
                  style={{ background: farbe }}
                  aria-hidden="true"
                >
                  {initialen(k.name)}
                </div>
                <div className="mb-0.5 text-base font-medium leading-tight">{k.name}</div>
                <div className="mb-4 text-xs leading-snug text-[#6b6b6b]">{k.rolle}</div>
                <div className="mt-auto min-w-0 space-y-2">
                  {k.person?.email && (
                    <span className="flex min-w-0 items-center gap-2 text-xs text-[#6b6b6b]">
                      <Mail size={11} className="shrink-0" aria-hidden="true" />
                      <span className="min-w-0 truncate leading-tight">{k.person.email}</span>
                    </span>
                  )}
                  {k.person?.telefon && (
                    <span className="flex items-center gap-2 text-xs text-[#6b6b6b]">
                      <Phone size={11} className="shrink-0" aria-hidden="true" />
                      {k.person.telefon}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="border border-[#0a0a0a]/10 bg-white p-4 text-sm leading-relaxed text-[#4a4a4a]">
          Du möchtest mitmachen oder hast Fragen zum Angebot? Unsere Ansprechpartner:innen im Verein helfen dir gern weiter.
        </div>
      )}
    </Vorschau>
  )
}

function WebsiteUebersicht({ w }: { w: Werte }) {
  const eigene = { name: w.name, slug: w.slug, icon: w.icon, farbe: w.farbe, kurz: w.kurz, reihenfolge: reihenfolgeZahl(w.reihenfolge) }
  const sparten = ANDERE_SPARTEN.concat(w.sichtbar ? [eigene] : []).sort((a, b) => a.reihenfolge - b.reihenfolge || a.name.localeCompare(b.name, 'de'))
  return (
    <div className="space-y-2">
      <Vorschau adresse="/sparten">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sparten.map(s => {
            const farbe = s.farbe || '#0a0a0a'
            const istEigene = s.slug === w.slug
            return (
              <div
                key={s.slug}
                className={`relative flex min-h-[170px] flex-col overflow-hidden border bg-[#fafaf8] p-5 ${istEigene ? 'border-[#0a0a0a]/40' : 'border-[#0a0a0a]/10'}`}
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: farbe, opacity: 0.75 }} />
                <div className="flex items-start justify-between gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center text-3xl" style={{ background: `${farbe}14` }} aria-hidden="true">
                    {s.icon}
                  </div>
                  <ArrowRight size={18} className="mt-1 text-[#6b6b6b]" aria-hidden="true" />
                </div>
                <div className="mt-5 flex-1">
                  <div className="font-display text-3xl leading-none tracking-tight">{s.name}</div>
                  {s.kurz && <p className="mt-3 text-sm leading-relaxed text-[#6b6b6b]">{s.kurz}</p>}
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]" style={{ color: farbe }}>
                  Mehr erfahren <ArrowRight size={12} aria-hidden="true" />
                </div>
              </div>
            )
          })}
        </div>
      </Vorschau>
      {/* Die Zahlen sehen Besucher:innen nicht – sie stehen nur hier als Übungshilfe */}
      <p className="text-xs leading-relaxed text-[#6b6b6b]">
        Nur in der Übung zu sehen, nicht auf der Website: Reihenfolge {sparten.map(s => `${s.name} ${s.reihenfolge}`).join(' · ')}
      </p>
    </div>
  )
}

/* ── Nachbau der Bearbeitungsseite der Sparte ─────────────────────────────── */

type KartenArt = 'allgemein' | 'foto' | 'anzeige' | 'ansprechpartner' | 'adresse'

/**
 * Formular einer Sparte, beschränkt auf die Kästen, um die es in der Lektion geht. `aufgabe`
 * prüft nach den echten Prüfungen, ob die Aufgabe erfüllt ist, und liefert sonst einen Hinweis.
 */
function SparteUebung({
  start,
  karten,
  istAdmin = false,
  vorschau = 'seite',
  aufgabe,
  geloest,
}: {
  start: Werte
  karten: KartenArt[]
  istAdmin?: boolean
  vorschau?: 'seite' | 'uebersicht'
  /** Bekommt den Stand, wie er gespeichert würde, und die Eingaben, wie sie im Formular stehen. */
  aufgabe: (w: Werte, eingabe: Werte) => string | null
} & LektionProps) {
  const [w, setW] = useState<Werte>(start)
  const [gespeichert, setGespeichert] = useState<Werte>(start)
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<{ art: 'erfolg' | 'fehler' | 'hinweis'; text: string } | null>(null)
  const [rueckfrageOffen, setRueckfrageOffen] = useState(false)
  const [foto, setFoto] = useState<string | null>(null)
  const [fotoNeu, setFotoNeu] = useState<string | null>(null)
  const [fotoEntfernen, setFotoEntfernen] = useState(false)
  const [fotoHinweis, setFotoHinweis] = useState<string | null>(null)
  const [dateiFeld, setDateiFeld] = useState(0)
  const [kontaktInfo, setKontaktInfo] = useState(false)
  const urls = useRef<string[]>([])
  const frage = useRef<HTMLDivElement>(null)

  // Vorschau-Bilder beim Verlassen der Lektion wieder freigeben
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), [])
  useEffect(() => {
    if (rueckfrageOffen) frage.current?.focus()
  }, [rueckfrageOffen])

  const zeigt = (k: KartenArt) => karten.indexOf(k) >= 0
  // In echt ist die Rückfrage ein Browser-Dialog: Solange sie offen ist, ändert niemand etwas.
  const aendern = (teil: Partial<Werte>) => {
    setRueckfrageOffen(false)
    setW(x => ({ ...x, ...teil }))
  }
  const geaendert = fotoNeu !== null || fotoEntfernen || vergleichsStand(w) !== vergleichsStand(gespeichert)

  // Rückfrage wie im echten Formular, wenn ein:e Admin die Adresse ändert
  const slugNeu = slugify(w.slug)
  const slugGeaendert = istAdmin && slugNeu !== gespeichert.slug
  const cronAlt = CRON_SLUGS[gespeichert.slug] as string | undefined
  const cronNeu = CRON_SLUGS[slugNeu]
  let rueckfrage: string | null = null
  if (slugGeaendert) {
    rueckfrage = `Die Adresse der Sparte ändert sich von /sparten/${gespeichert.slug} zu /sparten/${slugNeu || '…'}. Alte Links funktionieren dann nicht mehr.`
    if (cronAlt) rueckfrage += `\n\nACHTUNG: ${gross(cronAlt)} findet diese Sparte nur über die Adresse „${gespeichert.slug}“ und funktioniert danach nicht mehr!`
    rueckfrage += '\n\nTrotzdem speichern?'
  }

  function speichern(e: React.FormEvent) {
    e.preventDefault()
    if (rueckfrage) {
      setRueckfrageOffen(true)
      return
    }
    ausfuehren()
  }

  function ausfuehren() {
    setRueckfrageOffen(false)
    const felder = pruefen(w, istAdmin)
    setFehler(felder)
    if (Object.keys(felder).length) {
      setMeldung({ art: 'fehler', text: 'Bitte die markierten Angaben prüfen.' })
      return
    }
    const neu = vereinheitlichen(w)
    if (!istAdmin) neu.slug = gespeichert.slug
    if (neu.slug !== gespeichert.slug && ANDERE_SPARTEN.some(s => s.slug === neu.slug)) {
      setFehler({ slug: 'Diese Adresse ist schon vergeben.' })
      setMeldung({ art: 'fehler', text: 'Diese Adresse hat schon eine andere Sparte.' })
      return
    }
    if (!geaendert) {
      setMeldung({ art: 'erfolg', text: 'Keine Änderungen – es war schon alles gespeichert.' })
      return
    }
    const hinweis = aufgabe(neu, w)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    setW(neu)
    setGespeichert(neu)
    setFoto(fotoNeu ?? (fotoEntfernen ? null : foto))
    setFotoNeu(null)
    setFotoEntfernen(false)
    setDateiFeld(n => n + 1)
    setMeldung({ art: 'erfolg', text: 'Gespeichert. Die Änderungen sind sofort auf der Website zu sehen.' })
    geloest()
  }

  const fotoAnzeige = fotoNeu ?? (fotoEntfernen ? null : foto)

  return (
    <div className="space-y-5">
      <Spielwiese>
        <div className="mb-4">
          <h3 className="font-display text-3xl leading-none tracking-tight">{gespeichert.name.toUpperCase()}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6b6b6b]">
            <span>Sparte</span>
            {!gespeichert.sichtbar && <Badge ton="warnung">auf der Website ausgeblendet</Badge>}
          </div>
        </div>
        {/* Wie in echt ohne noValidate: Einen leeren Namen stoppt schon der Browser */}
        <form onSubmit={speichern} className="space-y-6">
          {zeigt('allgemein') && (
            <Karte titel="Allgemein">
              <div className="space-y-5">
                <Feld label="Name" htmlFor="uebung-sparte-name" fehler={fehler.name}>
                  <input
                    id="uebung-sparte-name"
                    required
                    value={w.name}
                    onChange={e => aendern({ name: e.target.value })}
                    aria-invalid={!!fehler.name || undefined}
                    className={eingabeKlasse}
                  />
                </Feld>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Feld label="Icon" htmlFor="uebung-sparte-icon" hinweis="Ein Emoji, z. B. ⚽ oder 🏓 – am Handy über die Emoji-Tastatur.">
                    <input
                      id="uebung-sparte-icon"
                      value={w.icon}
                      onChange={e => aendern({ icon: e.target.value })}
                      maxLength={16}
                      placeholder="⚽"
                      className={`${eingabeKlasse} text-xl`}
                    />
                  </Feld>
                  <Feld label="Farbe" htmlFor="uebung-sparte-farbe" fehler={fehler.farbe} hinweis="Akzentfarbe der Sparte. Leer lassen für keine Farbe.">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Farbe auswählen"
                        value={FARBE.test(w.farbe) ? w.farbe.toLowerCase() : '#000000'}
                        onChange={e => aendern({ farbe: e.target.value })}
                        className="h-11 w-14 shrink-0 cursor-pointer rounded-sm border border-[#0a0a0a]/20 bg-white p-1"
                      />
                      <input
                        id="uebung-sparte-farbe"
                        value={w.farbe}
                        onChange={e => aendern({ farbe: e.target.value.trim() })}
                        placeholder="#0369a1"
                        maxLength={7}
                        spellCheck={false}
                        aria-invalid={!!fehler.farbe || undefined}
                        className={`${eingabeKlasse} min-w-0 font-mono`}
                      />
                      {w.farbe && (
                        <button type="button" onClick={() => aendern({ farbe: '' })} className={knopfKlassen.leise}>
                          Keine
                        </button>
                      )}
                    </div>
                  </Feld>
                </div>
                <Feld label="Kurzbeschreibung" htmlFor="uebung-sparte-kurz" hinweis="Ein bis zwei Sätze für die Übersicht aller Sparten.">
                  <textarea id="uebung-sparte-kurz" rows={2} value={w.kurz} onChange={e => aendern({ kurz: e.target.value })} className={eingabeKlasse} />
                </Feld>
                <Feld
                  label="Ausführliche Beschreibung"
                  htmlFor="uebung-sparte-beschreibung"
                  hinweis="Steht oben auf der Seite der Sparte. Absätze mit einer Leerzeile trennen."
                >
                  <textarea
                    id="uebung-sparte-beschreibung"
                    rows={5}
                    value={w.beschreibung}
                    onChange={e => aendern({ beschreibung: e.target.value })}
                    className={eingabeKlasse}
                  />
                </Feld>
              </div>
            </Karte>
          )}

          {zeigt('foto') && (
            <Karte titel="Foto">
              <div className="space-y-4">
                {fotoAnzeige ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoAnzeige} alt="Foto der Sparte" className="max-h-56 w-auto max-w-full rounded-sm border border-[#0a0a0a]/10" />
                ) : (
                  <p className="text-sm text-[#6b6b6b]">{foto && fotoEntfernen ? 'Das Foto wird beim Speichern entfernt.' : 'Noch kein Foto.'}</p>
                )}
                <Feld
                  label={foto ? 'Neues Foto hochladen' : 'Foto hochladen'}
                  htmlFor="uebung-sparte-foto"
                  fehler={fotoHinweis ?? undefined}
                  hinweis="JPG, PNG oder WebP bis 15 MB. Wird automatisch verkleinert. In der Übung bleibt das Bild auf deinem Gerät."
                >
                  <input
                    key={dateiFeld}
                    id="uebung-sparte-foto"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const datei = e.target.files?.[0]
                      setFotoHinweis(null)
                      if (datei && datei.size > MAX_UPLOAD_BYTES) {
                        e.target.value = ''
                        setFotoNeu(null)
                        setFotoHinweis('Das Bild ist größer als 15 MB. Bitte ein kleineres Bild wählen.')
                        return
                      }
                      if (!datei) {
                        setFotoNeu(null)
                        return
                      }
                      const url = URL.createObjectURL(datei)
                      urls.current.push(url)
                      setFotoNeu(url)
                      setFotoEntfernen(false)
                    }}
                    className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-[#0a0a0a]/20 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
                  />
                </Feld>
                {foto && !fotoNeu && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={fotoEntfernen} onChange={e => setFotoEntfernen(e.target.checked)} className="h-4 w-4" />
                    Foto entfernen
                  </label>
                )}
              </div>
            </Karte>
          )}

          {zeigt('anzeige') && (
            <Karte titel="Anzeige auf der Website">
              <div className="space-y-5">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={w.sichtbar} onChange={e => aendern({ sichtbar: e.target.checked })} className="mt-0.5 h-5 w-5" />
                  <span>
                    <span className="block text-sm font-medium">Auf der Website anzeigen</span>
                    <span className="block text-xs text-[#6b6b6b]">
                      Ausgeblendete Sparten erscheinen nirgends auf der Website – auch ihre Seite ist dann nicht erreichbar.
                    </span>
                  </span>
                </label>
                <Feld
                  label="Reihenfolge"
                  htmlFor="uebung-sparte-reihenfolge"
                  fehler={fehler.reihenfolge}
                  hinweis="Kleinere Zahlen stehen in Übersichten weiter vorne."
                  className="max-w-[12rem]"
                >
                  <input
                    id="uebung-sparte-reihenfolge"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    value={w.reihenfolge}
                    onChange={e => aendern({ reihenfolge: e.target.value })}
                    aria-invalid={!!fehler.reihenfolge || undefined}
                    className={eingabeKlasse}
                  />
                </Feld>
              </div>
            </Karte>
          )}

          {zeigt('ansprechpartner') && (
            <Karte titel="Ansprechpartner:innen" beschreibung="Erscheinen auf der Seite der Sparte – mit Foto, Telefon und E-Mail aus den Personendaten.">
              <datalist id="uebung-sparten-rollen">
                {SPARTEN_ROLLEN.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              {fehler.ansprechpartner && (
                <div className="mb-4">
                  <Meldung art="fehler">{fehler.ansprechpartner}</Meldung>
                </div>
              )}
              {w.ap.length === 0 ? (
                <p className="pb-2 text-sm text-[#6b6b6b]">Noch niemand eingetragen.</p>
              ) : (
                <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
                  {w.ap.map((a, i) => (
                    <li key={a.personId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
                      <div className="min-w-0 sm:w-56">
                        <div className="truncate font-medium">{a.name}</div>
                        <button
                          type="button"
                          onClick={() => setKontaktInfo(true)}
                          className="text-xs text-[#6b6b6b] underline underline-offset-2 hover:text-[#0a0a0a]"
                        >
                          Kontaktdaten bearbeiten
                        </button>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-1">
                        <input
                          list="uebung-sparten-rollen"
                          value={a.rolle}
                          onChange={e => aendern({ ap: w.ap.map((x, j) => (j === i ? { ...x, rolle: e.target.value } : x)) })}
                          placeholder={STANDARD_ROLLE}
                          aria-label={`Rolle von ${a.name}`}
                          className={`${eingabeKlasse} min-w-0 flex-1`}
                        />
                        <ReihenfolgeKnoepfe
                          index={i}
                          anzahl={w.ap.length}
                          bezeichnung={a.name}
                          onVerschieben={r => aendern({ ap: verschieben(w.ap, i, r) })}
                          onEntfernen={() => aendern({ ap: w.ap.filter((_, j) => j !== i) })}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {kontaktInfo && (
                <p className="mt-3 text-xs text-amber-800">
                  In echt führt „Kontaktdaten bearbeiten“ zur Seite der Person. Telefon und E-Mail änderst du dort – sie gelten dann überall, wo die Person
                  vorkommt.
                </p>
              )}
              <div className="mt-4">
                <label htmlFor="uebung-sparte-ap-suche" className="mb-1.5 block text-sm font-medium">
                  Person hinzufügen
                </label>
                <PersonSucheUebung
                  id="uebung-sparte-ap-suche"
                  ausschliessen={w.ap.map(a => a.personId)}
                  onWaehlen={p => aendern({ ap: w.ap.concat({ personId: p.id, name: p.name, rolle: STANDARD_ROLLE }) })}
                />
              </div>
            </Karte>
          )}

          {zeigt('adresse') && istAdmin && (
            <Karte titel="Adresse auf der Website" beschreibung="Nur für Admins. Normalerweise nie ändern.">
              <div className="space-y-4">
                <Feld
                  label="Adresse (Slug)"
                  htmlFor="uebung-sparte-slug"
                  fehler={fehler.slug}
                  hinweis="Nur Kleinbuchstaben, Ziffern und Bindestriche – Umlaute werden automatisch umgeschrieben."
                >
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 text-sm text-[#6b6b6b]">/sparten/</span>
                    <input
                      id="uebung-sparte-slug"
                      value={w.slug}
                      onChange={e => aendern({ slug: e.target.value })}
                      spellCheck={false}
                      autoCapitalize="none"
                      aria-invalid={!!fehler.slug || undefined}
                      className={`${eingabeKlasse} min-w-0 font-mono`}
                    />
                  </div>
                </Feld>
                {cronAlt && (
                  <Meldung art="fehler">
                    <strong>Bitte nicht ändern:</strong> {gross(cronAlt)} findet diese Sparte über die Adresse „{gespeichert.slug}“. Mit einer anderen Adresse
                    werden keine Spiele mehr übernommen.
                  </Meldung>
                )}
                {slugGeaendert && (
                  <Meldung art="hinweis">
                    Die Adresse ändert sich zu <strong>/sparten/{slugNeu || '…'}</strong>. Alte Links, Lesezeichen und QR-Codes auf /sparten/{gespeichert.slug}{' '}
                    funktionieren danach nicht mehr.
                    {cronNeu && <> Außerdem nutzt dann {cronNeu} diese Sparte.</>}
                  </Meldung>
                )}
              </div>
            </Karte>
          )}

          {rueckfrageOffen && rueckfrage && (
            <div
              ref={frage}
              tabIndex={-1}
              role="alertdialog"
              aria-label="Rückfrage vor dem Speichern"
              className="rounded-sm border-2 border-[#0a0a0a] bg-white p-4 shadow-lg focus:outline-none"
            >
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b6b6b]">Rückfrage der Verwaltung</div>
              <p className="whitespace-pre-line text-sm leading-relaxed">{rueckfrage}</p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setRueckfrageOffen(false)} className={knopfKlassen.sekundaer}>
                  Abbrechen
                </button>
                <button type="button" onClick={ausfuehren} className={knopfKlassen.primaer}>
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Wie die echte Speicherleiste: Eine Erfolgsmeldung verschwindet, sobald wieder etwas geändert wird */}
          <UebungsLeiste geaendert={geaendert} meldung={meldung?.art === 'erfolg' && geaendert ? null : meldung} />
        </form>
      </Spielwiese>
      {vorschau === 'uebersicht' ? <WebsiteUebersicht w={gespeichert} /> : <WebsiteSparte w={gespeichert} foto={foto} />}
    </div>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

const KURZ = 'Tischtennis für alle ab 8 Jahren.'

export const lektionen: Lektion[] = [
  {
    titel: 'Icon und Kurzbeschreibung',
    aufgabe: (
      <>
        Gib der Sparte Tischtennis das Icon <strong>🏓</strong>, trag als Kurzbeschreibung <strong>„{KURZ}“</strong> ein und speichere. Tipp: Am
        PC öffnet Windows-Taste + Punkt die Emoji-Auswahl – oder du kopierst das 🏓 von hier.
      </>
    ),
    Inhalt: props => (
      <SparteUebung
        {...props}
        start={START}
        karten={['allgemein', 'foto']}
        aufgabe={w => {
          if (w.name !== 'Tischtennis') return 'Der Name bleibt „Tischtennis“.'
          if (w.icon !== '🏓') return 'Trag im Feld „Icon“ das Emoji 🏓 ein.'
          if (w.kurz.toLowerCase().indexOf('ab 8 jahren') < 0) return `Trag als Kurzbeschreibung „${KURZ}“ ein.`
          return null
        }}
      />
    ),
    danach:
      'Icon, Name und Kurzbeschreibung stehen oben auf der Seite der Sparte und in der Übersicht aller Sparten. Die ausführliche Beschreibung und das Foto folgen darunter.',
  },
  {
    titel: 'Eine Farbe für die Sparte',
    aufgabe: (
      <>
        Tischtennis bekommt ein kräftiges Blau als Akzentfarbe. Trag als Farbe den Code <strong>#0369a1</strong> ein und speichere. Probier ruhig
        vorher aus, was passiert, wenn du die Raute (#) weglässt.
      </>
    ),
    Inhalt: props => (
      <SparteUebung
        {...props}
        start={werte({ icon: '🏓', kurz: KURZ })}
        karten={['allgemein']}
        aufgabe={w => (w.farbe !== '#0369a1' ? 'Als Farbe bitte #0369a1 eintragen – mit der Raute vorne.' : null)}
      />
    ),
    danach:
      'Die Farbe erscheint auf der Website als Strich neben dem Namen und in den Überschriften der Seite. „Keine“ entfernt sie wieder – dann wird Schwarz verwendet.',
  },
  {
    titel: 'Ansprechpartner:innen',
    aufgabe: (
      <>
        <strong>Mira Probe</strong> übernimmt die Abteilungsleitung. Füge sie hinzu, gib ihr die Rolle <strong>„Abteilungsleitung“</strong> und
        schieb sie nach oben – vor Jonas Muster.
      </>
    ),
    Inhalt: props => (
      <SparteUebung
        {...props}
        start={werte({ icon: '🏓', kurz: KURZ, farbe: '#0369a1' })}
        karten={['ansprechpartner']}
        aufgabe={w => {
          const mira = w.ap.find(a => a.name === 'Mira Probe')
          if (!mira) return 'Such unter „Person hinzufügen“ nach „Mira“ und tippe auf „Mira Probe“.'
          if (!w.ap.some(a => a.name === 'Jonas Muster')) return 'Jonas Muster soll bleiben. Mit „Von vorn“ unten startest du die Übung neu.'
          if (w.ap.length !== 2) return 'Nur Mira Probe kommt dazu – entferne die andere Person wieder (Kreuz neben dem Namen).'
          if (mira.rolle !== 'Abteilungsleitung') return 'Trag bei Mira Probe als Rolle „Abteilungsleitung“ ein – das Feld schlägt es dir auch vor.'
          if (w.ap[0].name !== 'Mira Probe') return 'Mira Probe soll oben stehen. Tippe neben ihr auf den Pfeil nach oben.'
          return null
        }}
      />
    ),
    danach:
      'In dieser Reihenfolge stehen die Personen auch auf der Website. Telefon und E-Mail kommen aus den Personendaten – „Kontaktdaten bearbeiten“ unter dem Namen führt dorthin.',
  },
  {
    titel: 'Reihenfolge in der Übersicht',
    aufgabe: (
      <>
        In der Übersicht aller Sparten soll Tischtennis <strong>vor Judo</strong> stehen. Judo hat die Reihenfolge 20. Trag bei Tischtennis eine
        kleinere ganze Zahl ein, z. B. <strong>15</strong>, und speichere.
      </>
    ),
    Inhalt: props => (
      <SparteUebung
        {...props}
        start={werte({ icon: '🏓', kurz: KURZ, farbe: '#0369a1' })}
        karten={['anzeige']}
        vorschau="uebersicht"
        aufgabe={(w, eingabe) => {
          if (!w.sichtbar) return 'Die Sparte soll auf der Website bleiben – setz den Haken bei „Auf der Website anzeigen“ wieder.'
          // In echt käme hier "Gespeichert." – und die Sparte stünde mit 0 ganz vorne
          if (!Number.isInteger(Number(eingabe.reihenfolge)) || eingabe.reihenfolge.trim() === '')
            return 'Trag eine ganze Zahl ein, z. B. 15. Ein leeres Feld oder eine Kommazahl wie 15,5 speichert die Verwaltung ohne Meldung als 0 – dann stünde Tischtennis sogar vor Fußball.'
          if (Number(w.reihenfolge) >= 20) return 'Die Zahl muss kleiner als 20 sein – dann steht Tischtennis vor Judo.'
          return null
        }}
      />
    ),
    danach:
      'Kleinere Zahlen stehen weiter vorne. Vergib am besten Zehnerschritte (10, 20, 30 …) – dann kannst du später etwas dazwischen schieben. Nimm nur ganze Zahlen: Ein leeres Feld oder eine Kommazahl wird ohne Meldung als 0 gespeichert. Die Reihenfolge der Mannschaften stellst du bei jeder Mannschaft selbst ein.',
  },
  {
    titel: 'Umbenennen – die Adresse bleibt',
    aufgabe: (
      <>
        Diesmal bist du als <strong>Admin</strong> angemeldet und siehst zusätzlich den Kasten „Adresse auf der Website“. Die Sparte heißt ab jetzt{' '}
        <strong>„Tischtennis &amp; Padel“</strong>. Ändere den Namen – die Adresse lässt du, wie sie ist.
      </>
    ),
    Inhalt: props => (
      <SparteUebung
        {...props}
        istAdmin
        start={werte({ icon: '🏓', kurz: KURZ, farbe: '#0369a1' })}
        karten={['allgemein', 'adresse']}
        aufgabe={w => {
          if (w.slug !== 'tischtennis')
            return 'Die Adresse soll bleiben. Trag wieder „tischtennis“ ein – sonst findet click-tt die Sparte nicht mehr und es werden keine Spiele mehr übernommen.'
          if (w.name !== 'Tischtennis & Padel') return 'Der neue Name ist „Tischtennis & Padel“.'
          return null
        }}
      />
    ),
    danach:
      'Der neue Name steht sofort überall auf der Website, die Adresse /sparten/tischtennis bleibt gleich. Adressen ändern nur Admins – und bei Fußball und Tischtennis am besten nie.',
  },
  {
    titel: 'Sommerpause',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Die Tischtennis-Sparte macht drei Monate Pause und soll so lange nicht auf der Website stehen. Was tust du?"
        antworten={[
          { text: 'Den Haken bei „Auf der Website anzeigen“ herausnehmen und speichern', richtig: true },
          {
            text: 'Die Sparte löschen und nach der Pause neu anlegen',
            erklaerung: 'Löschen lässt sich nicht rückgängig machen – und nur Admins dürfen es. Ausblenden kannst du jederzeit wieder aufheben.',
          },
          {
            text: 'Die Kurzbeschreibung leeren',
            erklaerung: 'Dann steht die Sparte weiter auf der Website, nur ohne Text. Zum Verstecken gibt es den Haken „Auf der Website anzeigen“.',
          },
        ]}
      />
    ),
    danach:
      'Ohne Haken verschwinden die Seite der Sparte, ihr Eintrag in den Übersichten und ihre Mannschaften, Gruppen und Trainingszeiten. News, Termine und Downloads bleiben sichtbar. Gespeichert bleibt alles – mit dem Haken ist es sofort wieder da.',
  },
]
