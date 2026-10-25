'use client'

/**
 * Übung "Zugänge vergeben" – Nachbau des Formulars für Zugänge
 * (app/verwaltung/(intern)/zugaenge/ZugangFormular.tsx) mit denselben Prüfungen und Meldungen
 * (zugaenge/logik.ts, zugaenge/aktionen.ts), der Einladungskarte (components/verwaltung/AnmeldeCodeKarte.tsx)
 * und der unteren Kästen der Seite eines Zugangs (zugaenge/[id]/page.tsx, ZugangZuruecksetzen.tsx, ZugangStatus.tsx).
 * Der Einladungs-Code ist erfunden und lässt sich nicht verwenden.
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, KeyRound, RotateCcw, Search, X } from 'lucide-react'
import AnmeldeCodeKarte, { type AnmeldeCodeDaten } from '@/components/verwaltung/AnmeldeCodeKarte'
import { Badge, eingabeKlasse, Feld, Karte, knopfKlassen, LeerHinweis, Meldung } from '@/components/verwaltung/ui'
import { slugify, zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { BENUTZERNAME_HINWEIS, einladungsHinweis } from '../../../zugaenge/texte'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste } from '../werkzeuge'

/* ── Erfundene Beispieldaten ───────────────────────────────────────────────── */

interface Person {
  id: number
  name: string
}

const PERSONEN: Person[] = [
  { id: 1, name: 'Anna Beispiel' },
  { id: 2, name: 'Jonas Muster' },
  { id: 3, name: 'Mira Probe' },
  { id: 4, name: 'Moritz Probe' },
  { id: 5, name: 'Paul Platzhalter' },
]

/** Zugänge, die es in der Übung schon gibt – für die Prüfung auf doppelte Namen. */
const ZUGAENGE = [
  { id: 1, name: 'Anna Beispiel', benutzername: 'anna.beispiel' },
  { id: 2, name: 'Mira Probe', benutzername: 'mira.probe' },
  { id: 3, name: 'Paul Platzhalter', benutzername: 'paul.platzhalter' },
]

interface SparteMitTeams {
  id: number
  name: string
  mannschaften: { id: number; name: string }[]
  gruppen: { id: number; name: string }[]
}

const BAUM: SparteMitTeams[] = [
  { id: 1, name: 'Fußball', mannschaften: [{ id: 11, name: 'Herren' }, { id: 12, name: 'U12' }, { id: 13, name: 'U13' }], gruppen: [] },
  { id: 2, name: 'Judo', mannschaften: [], gruppen: [{ id: 21, name: 'Kinder (5–7 Jahre)' }, { id: 22, name: 'Erwachsene' }] },
  { id: 3, name: 'Tischtennis', mannschaften: [{ id: 31, name: 'Herren I' }, { id: 32, name: 'Jugend' }], gruppen: [] },
  { id: 4, name: 'Turnen', mannschaften: [], gruppen: [{ id: 41, name: 'Eltern-Kind-Turnen' }, { id: 42, name: 'Geräteturnen' }] },
]

/* ── Einladungs-Code der Übung ─────────────────────────────────────────────── */

/** Sieht aus wie ein QR-Code, ist aber nur ein Muster mit der Aufschrift "ÜBUNG" – nicht scannbar. */
function uebungsQr(saat: number): string {
  const n = 25
  let s = saat
  const zufall = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const teile: string[] = []
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7" fill="#0a0a0a"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0a0a0a"/>`
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const imFinder = (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)
      if (!imFinder && zufall() < 0.45) teile.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#0a0a0a"/>`)
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 27 27" shape-rendering="crispEdges">` +
    `<rect x="-1" y="-1" width="27" height="27" fill="#fff"/>${teile.join('')}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}` +
    `<rect x="5" y="10" width="15" height="5" fill="#fff"/>` +
    `<text x="12.5" y="13.7" font-size="3" text-anchor="middle" font-family="sans-serif" font-weight="700" fill="#0a0a0a" shape-rendering="auto">ÜBUNG</text></svg>`
  )
}

/** Ablauf eines neuen Codes (7 Tage) – lesbar wie in der echten Verwaltung. */
function inSiebenTagen(): string {
  return zeitpunktDeutsch(new Date(Date.now() + 7 * 86_400_000).toISOString())
}

/** Erfundener Code samt Anzeigetexten – der Link führt zurück zu dieser Übung. */
function uebungsCode(name: string, code: string, saat: number, laeuftAb = inSiebenTagen()): AnmeldeCodeDaten {
  return {
    name,
    code: code.replace(/-/g, ''),
    codeAnzeige: code,
    link: `${window.location.origin}/verwaltung/hilfe/zugaenge#nur-eine-uebung`,
    laeuftAbText: `gültig bis ${laeuftAb} Uhr`,
    qrSvg: uebungsQr(saat),
  }
}

/* ── Prüfungen wie in zugaenge/logik.ts ────────────────────────────────────── */

type Rolle = 'admin' | 'bereiche'

/** Vorschlag aus dem Namen wie benutzernameVorschlag(), z. B. "Anna Beispiel" → "anna.beispiel". */
function benutzernameVorschlag(name: string): string {
  const basis =
    name
      .split(/\s+/)
      .map(teil => slugify(teil))
      .filter(Boolean)
      .join('.')
      .slice(0, 36) || 'zugang'
  let vorschlag = basis.length >= 2 ? basis : `${basis}1`
  for (let i = 2; ZUGAENGE.some(z => z.benutzername === vorschlag); i++) vorschlag = `${basis}${i}`
  return vorschlag
}

/** Was der Zugang wirklich bearbeiten darf: Teams einer ganz gewählten Sparte zählen nicht extra. */
function wirksam(rolle: Rolle, auswahl: string[]): string[] {
  const bereiche: string[] = []
  if (rolle !== 'bereiche') return bereiche
  BAUM.forEach(sp => {
    if (auswahl.indexOf(`s${sp.id}`) >= 0) {
      bereiche.push(`s${sp.id}`)
      return
    }
    sp.mannschaften.forEach(m => auswahl.indexOf(`m${m.id}`) >= 0 && bereiche.push(`m${m.id}`))
    sp.gruppen.forEach(g => auswahl.indexOf(`g${g.id}`) >= 0 && bereiche.push(`g${g.id}`))
  })
  return bereiche
}

interface Werte {
  name: string
  benutzername: string
  personId: number | null
  rolle: Rolle
  auswahl: string[]
}

function vergleichsStand(w: Werte): string {
  return JSON.stringify([w.name.trim().replace(/\s+/g, ' '), w.benutzername.trim().toLowerCase(), w.personId, w.rolle, wirksam(w.rolle, w.auswahl)])
}

/**
 * Dieselben Prüfungen in derselben Reihenfolge wie eingabePruefen: Die erste, die nicht passt,
 * liefert Meldung und Feldfehler.
 */
function pruefen(w: Werte, ausserId?: number): { meldung: string; felder: Record<string, string> } | null {
  const name = w.name.trim().replace(/\s+/g, ' ')
  if (!name) return { meldung: 'Bitte einen Namen eintragen.', felder: { name: 'Bitte einen Namen eintragen.' } }
  if (name.length > 80) return { meldung: 'Der Name ist zu lang.', felder: { name: 'Bitte höchstens 80 Zeichen.' } }
  if (ZUGAENGE.some(z => z.id !== ausserId && z.name.toLowerCase() === name.toLowerCase())) {
    return {
      meldung: 'Einen Zugang mit diesem Namen gibt es schon.',
      felder: { name: 'Diesen Namen hat schon ein anderer Zugang – bitte z. B. den Nachnamen ergänzen.' },
    }
  }
  const benutzername = w.benutzername.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9._-]{1,39}$/.test(benutzername)) {
    return {
      meldung: 'Bitte den Benutzernamen prüfen.',
      felder: { benutzername: '2 bis 40 Zeichen: nur Kleinbuchstaben (a–z), Ziffern, Punkt, Bindestrich oder Unterstrich – z. B. „anna.beispiel“.' },
    }
  }
  if (ZUGAENGE.some(z => z.id !== ausserId && z.benutzername === benutzername)) {
    return {
      meldung: 'Diesen Benutzernamen gibt es schon.',
      felder: { benutzername: 'Diesen Benutzernamen hat schon ein anderer Zugang – bitte einen anderen wählen.' },
    }
  }
  if (w.rolle === 'bereiche' && wirksam(w.rolle, w.auswahl).length === 0) {
    return {
      meldung: 'Bitte mindestens eine Sparte, Mannschaft oder Gruppe auswählen – oder „Alles (Admin)“.',
      felder: { bereiche: 'Bitte mindestens einen Bereich auswählen.' },
    }
  }
  return null
}

/* ── Kleine Bausteine ──────────────────────────────────────────────────────── */

function normalisieren(text: string) {
  return text.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

/** Nachbau der Personensuche (components/verwaltung/PersonSuche.tsx) ohne Link zum Anlegen. */
function PersonSucheUebung({ id, onWaehlen }: { id: string; onWaehlen: (p: Person) => void }) {
  const [suche, setSuche] = useState('')
  const teile = normalisieren(suche).split(/\s+/).filter(Boolean)
  const treffer =
    teile.length === 0
      ? []
      : PERSONEN.filter(p => teile.every(t => normalisieren(p.name).indexOf(t) >= 0)).sort((a, b) => a.name.localeCompare(b.name, 'de'))

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
          placeholder="Person suchen …"
          aria-label="Eigene Person suchen"
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
    </div>
  )
}

/** Rückfrage vor dem Ausführen – in echt ein Browser-Dialog mit OK und Abbrechen. */
function Rueckfrage({ text, onOk, onAbbrechen }: { text: string; onOk: () => void; onAbbrechen: () => void }) {
  const kasten = useRef<HTMLDivElement>(null)
  useEffect(() => kasten.current?.focus(), [])
  return (
    <div
      ref={kasten}
      tabIndex={-1}
      role="alertdialog"
      aria-label="Rückfrage der Verwaltung"
      className="rounded-sm border-2 border-[#0a0a0a] bg-white p-4 shadow-lg focus:outline-none"
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b6b6b]">Rückfrage der Verwaltung</div>
      <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onAbbrechen} className={knopfKlassen.sekundaer}>
          Abbrechen
        </button>
        <button type="button" onClick={onOk} className={knopfKlassen.primaer}>
          OK
        </button>
      </div>
    </div>
  )
}

/** Kopf der Seite eines Zugangs (Seitenkopf mit Badges). */
function ZugangKopf({ name, admin, aktiv = true, eingerichtet, benutzername }: { name: string; admin: boolean; aktiv?: boolean; eingerichtet: boolean; benutzername: string }) {
  return (
    <div className="mb-5">
      <h3 className="break-words font-display text-3xl leading-none tracking-tight">{name.toUpperCase()}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6b6b6b]">
        {admin ? <Badge>Admin</Badge> : <Badge>Bestimmte Bereiche</Badge>}
        {!aktiv && <Badge ton="warnung">deaktiviert</Badge>}
        {eingerichtet ? <Badge ton="erfolg">eingerichtet am 02.09.2026, 18:12</Badge> : <Badge ton="warnung">Einrichtung ausstehend</Badge>}
        <span>
          Benutzername: <span className="font-mono text-[#0a0a0a]">{benutzername}</span>
        </span>
        <span>Zuletzt angemeldet 24.10.2026, 07:55 · angelegt 02.09.2026, 18:05</span>
      </div>
    </div>
  )
}

/* ── Nachbau der Auswahl "Darf bearbeiten" ─────────────────────────────────── */

function BereichAuswahl({ auswahl, setAuswahl, fehler }: { auswahl: string[]; setAuswahl: (a: string[]) => void; fehler?: string }) {
  const [suche, setSuche] = useState('')
  const [offen, setOffen] = useState<number[]>(() =>
    BAUM.filter(s => s.mannschaften.some(m => auswahl.indexOf(`m${m.id}`) >= 0) || s.gruppen.some(g => auswahl.indexOf(`g${g.id}`) >= 0)).map(s => s.id),
  )
  const hat = (k: string) => auswahl.indexOf(k) >= 0
  const umschalten = (k: string, an: boolean) => setAuswahl(an ? (hat(k) ? auswahl : auswahl.concat(k)) : auswahl.filter(x => x !== k))
  const s = normalisieren(suche.trim())
  const passt = (text: string) => s === '' || normalisieren(text).indexOf(s) >= 0

  const zusammenfassung: string[] = []
  BAUM.forEach(sp => {
    if (hat(`s${sp.id}`)) {
      zusammenfassung.push(`${sp.name} (ganze Sparte)`)
      return
    }
    sp.mannschaften.forEach(m => hat(`m${m.id}`) && zusammenfassung.push(`${sp.name} · ${m.name}`))
    sp.gruppen.forEach(g => hat(`g${g.id}`) && zusammenfassung.push(`${sp.name} · ${g.name}`))
  })

  return (
    <div className="space-y-3">
      <div
        className={`rounded-sm px-3 py-2.5 text-sm ${zusammenfassung.length ? 'bg-emerald-50 text-emerald-950' : 'bg-[#0a0a0a]/[0.04] text-[#6b6b6b]'}`}
        aria-live="polite"
      >
        {zusammenfassung.length ? (
          <>
            <span className="font-medium">Ausgewählt:</span> {zusammenfassung.join(', ')}
          </>
        ) : (
          'Noch nichts ausgewählt.'
        )}
      </div>
      {fehler && <p className="text-sm text-red-700">{fehler}</p>}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" aria-hidden="true" />
        <input
          type="search"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder="Sparte, Mannschaft oder Gruppe suchen …"
          aria-label="Bereiche durchsuchen"
          className={`${eingabeKlasse} pl-9`}
        />
      </div>
      <ul className="divide-y divide-[#0a0a0a]/[0.07] rounded-sm border border-[#0a0a0a]/10 bg-white">
        {BAUM.map(sp => {
          const ganz = hat(`s${sp.id}`)
          const teams: { art: 'mannschaft' | 'gruppe'; schluessel: string; name: string }[] = []
          sp.mannschaften.forEach(m => teams.push({ art: 'mannschaft', schluessel: `m${m.id}`, name: m.name }))
          sp.gruppen.forEach(g => teams.push({ art: 'gruppe', schluessel: `g${g.id}`, name: g.name }))
          const sparteTrifft = passt(sp.name)
          const teamsTreffer = teams.filter(t => sparteTrifft || passt(t.name))
          const sichtbar = sparteTrifft || teamsTreffer.length > 0
          const aufgeklappt = (s !== '' && teamsTreffer.length > 0 && !sparteTrifft) || offen.indexOf(sp.id) >= 0
          const einzeln = teams.filter(t => hat(t.schluessel)).length
          return (
            <li key={sp.id} className={sichtbar ? 'p-3' : 'hidden'}>
              <div className="flex items-center gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={ganz} onChange={e => umschalten(`s${sp.id}`, e.target.checked)} className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium">{sp.name}</span>
                    <span className="block text-xs text-[#6b6b6b]">
                      {ganz ? 'ganze Sparte – mit allen Mannschaften und Gruppen' : einzeln > 0 ? `${einzeln} einzeln ausgewählt` : 'ganze Sparte'}
                    </span>
                  </span>
                </label>
                {teams.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOffen(offen.indexOf(sp.id) >= 0 ? offen.filter(x => x !== sp.id) : offen.concat(sp.id))}
                    className={`${knopfKlassen.leise} shrink-0`}
                    aria-expanded={aufgeklappt}
                    aria-label={`${sp.name}: Mannschaften und Gruppen einzeln auswählen (${teams.length})`}
                  >
                    {aufgeklappt ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
                    <span className="hidden sm:inline">einzeln</span> ({teams.length})
                  </button>
                )}
              </div>
              {teams.length > 0 && (
                <div className={`mt-2 gap-1 pl-8 sm:grid-cols-2 ${aufgeklappt ? 'grid' : 'hidden'}`}>
                  {teams.map(t => (
                    <label
                      key={t.schluessel}
                      className={`items-center gap-2.5 py-1.5 text-sm ${sparteTrifft || passt(t.name) ? 'flex' : 'hidden'} ${ganz ? 'text-[#6b6b6b]' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={ganz || hat(t.schluessel)}
                        disabled={ganz}
                        onChange={e => umschalten(t.schluessel, e.target.checked)}
                        className="h-[18px] w-[18px] shrink-0"
                      />
                      <span>
                        {t.name}
                        {t.art === 'gruppe' && <span className="text-xs text-[#6b6b6b]"> (Gruppe)</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ── Nachbau des Formulars (Anlegen und Bearbeiten) ────────────────────────── */

interface ZugangStart {
  id: number
  name: string
  benutzername: string
  person: Person | null
  rolle: Rolle
  auswahl: string[]
}

function ZugangUebung({
  modus,
  zugang,
  aufgabe,
  geloest,
}: {
  modus: 'neu' | 'bearbeiten'
  zugang?: ZugangStart
  aufgabe: (w: Werte) => string | null
} & LektionProps) {
  const [name, setName] = useState(zugang?.name ?? '')
  const [benutzername, setBenutzername] = useState(zugang?.benutzername ?? '')
  const [vonHand, setVonHand] = useState(modus === 'bearbeiten')
  const [automatischerName, setAutomatischerName] = useState<string | null>(null)
  const [person, setPerson] = useState<Person | null>(zugang?.person ?? null)
  const [rolle, setRolle] = useState<Rolle>(zugang?.rolle ?? 'bereiche')
  const [auswahl, setAuswahl] = useState<string[]>(zugang?.auswahl ?? [])
  const [gespeichert, setGespeichert] = useState<Werte>({
    name: zugang?.name ?? '',
    benutzername: zugang?.benutzername ?? '',
    personId: zugang?.person?.id ?? null,
    rolle: zugang?.rolle ?? 'bereiche',
    auswahl: zugang?.auswahl ?? [],
  })
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<{ art: 'erfolg' | 'fehler' | 'hinweis'; text: string } | null>(null)
  const [angelegt, setAngelegt] = useState<{ name: string; benutzername: string; code: AnmeldeCodeDaten } | null>(null)
  const [knopfInfo, setKnopfInfo] = useState(false)

  const werte: Werte = { name, benutzername, personId: person?.id ?? null, rolle, auswahl }
  const geaendert = vergleichsStand(werte) !== vergleichsStand(gespeichert)

  // Beim Anlegen folgt der Benutzername dem Namen, bis er von Hand geändert wird.
  function nameAendern(neu: string) {
    setName(neu)
    if (!vonHand && modus === 'neu') setBenutzername(neu.trim() ? benutzernameVorschlag(neu) : '')
  }

  function personWaehlen(p: Person) {
    setPerson(p)
    if (name.trim() === '' || name === automatischerName) {
      nameAendern(p.name)
      setAutomatischerName(p.name)
    }
  }

  function speichern(e: React.FormEvent) {
    e.preventDefault()
    const problem = pruefen(werte, zugang?.id)
    setFehler(problem?.felder ?? {})
    if (problem) {
      setMeldung({ art: 'fehler', text: problem.meldung })
      return
    }
    if (modus === 'bearbeiten' && !geaendert) {
      setMeldung({ art: 'erfolg', text: 'Keine Änderungen – es war schon alles gespeichert.' })
      return
    }
    const hinweis = aufgabe(werte)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    const sauber = name.trim().replace(/\s+/g, ' ')
    if (modus === 'neu') {
      setAngelegt({ name: sauber, benutzername: benutzername.trim().toLowerCase(), code: uebungsCode(sauber, 'TEST-4711-QXP9', 7) })
    } else {
      setName(sauber)
      setGespeichert({ ...werte, name: sauber })
      setMeldung({ art: 'erfolg', text: 'Gespeichert. Die neuen Rechte gelten sofort auf allen Geräten.' })
    }
    geloest()
  }

  // ─── Nach dem Anlegen: Einladungs-Code anzeigen ───
  if (angelegt) {
    return (
      <Spielwiese>
        <div className="space-y-6">
          <Meldung art="erfolg">
            Zugang für {angelegt.name} angelegt. Benutzername: <strong className="font-mono">{angelegt.benutzername}</strong>
          </Meldung>
          <AnmeldeCodeKarte daten={angelegt.code} hinweis={einladungsHinweis(angelegt.name)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setKnopfInfo(true)} className={knopfKlassen.primaer}>
              Zum Zugang
            </button>
            <button type="button" onClick={() => setKnopfInfo(true)} className={knopfKlassen.sekundaer}>
              Weiteren Zugang anlegen
            </button>
            <button type="button" onClick={() => setKnopfInfo(true)} className={knopfKlassen.sekundaer}>
              Alle Zugänge
            </button>
          </div>
          {knopfInfo && (
            <p className="text-xs text-amber-800">
              In echt verschwindet der Code, sobald du die Seite verlässt. Lass sie offen, bis die Person ihn gescannt hat oder du den Link verschickt hast.
            </p>
          )}
        </div>
      </Spielwiese>
    )
  }

  return (
    <Spielwiese>
      {modus === 'neu' ? (
        <div className="mb-5">
          <h3 className="font-display text-3xl leading-none tracking-tight">NEUER ZUGANG</h3>
          <p className="mt-2 text-sm text-[#6b6b6b]">Nach dem Speichern bekommst du sofort einen Einladungs-Code (QR-Code) zum Weitergeben.</p>
        </div>
      ) : (
        <ZugangKopf name={gespeichert.name} admin={gespeichert.rolle === 'admin'} eingerichtet benutzername={gespeichert.benutzername} />
      )}
      {/* Wie in echt ohne noValidate: Leere Felder für Name und Benutzername stoppt schon der Browser */}
      <form onSubmit={speichern} className="space-y-6">
        <Karte titel="Wer?">
          <div className="space-y-5">
            <Feld label="Name" htmlFor="uebung-zugang-name" fehler={fehler.name} hinweis="So erscheint der Zugang in der Verwaltung und im Verlauf, z. B. „Anna Beispiel“.">
              <input
                id="uebung-zugang-name"
                required
                maxLength={80}
                value={name}
                onChange={e => nameAendern(e.target.value)}
                aria-invalid={!!fehler.name || undefined}
                className={eingabeKlasse}
              />
            </Feld>
            <Feld
              label="Benutzername"
              htmlFor="uebung-zugang-benutzername"
              fehler={fehler.benutzername}
              hinweis={modus === 'bearbeiten' ? `${BENUTZERNAME_HINWEIS} Bei einer Änderung bitte der Person Bescheid geben.` : BENUTZERNAME_HINWEIS}
            >
              <input
                id="uebung-zugang-benutzername"
                required
                maxLength={40}
                value={benutzername}
                onChange={e => {
                  setVonHand(true)
                  setBenutzername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                placeholder="anna.beispiel"
                aria-invalid={!!fehler.benutzername || undefined}
                className={`${eingabeKlasse} font-mono`}
              />
            </Feld>
            <div>
              <div className="mb-1.5 text-sm font-medium">
                Eigene Person <span className="font-normal text-[#6b6b6b]">(optional)</span>
              </div>
              {person ? (
                <div className="flex flex-wrap items-center gap-3 rounded-sm border border-[#0a0a0a]/15 bg-white px-3 py-2">
                  <span className="min-w-0 flex-1 font-medium">{person.name}</span>
                  <button type="button" onClick={() => setPerson(null)} className={knopfKlassen.leise}>
                    <X size={14} aria-hidden="true" /> Entfernen
                  </button>
                </div>
              ) : (
                <PersonSucheUebung id="uebung-zugang-person" onWaehlen={personWaehlen} />
              )}
              <p className="mt-1.5 text-xs leading-relaxed text-[#6b6b6b]">
                Die Person aus der Personenliste, die zu diesem Zugang gehört („das bin ich“). Dann kann sie ihre eigenen Kontaktdaten und ihr Foto selbst
                pflegen.
              </p>
            </div>
          </div>
        </Karte>

        <Karte titel="Darf bearbeiten">
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="sr-only">Rechte</legend>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 ${rolle === 'admin' ? 'border-[#0a0a0a] bg-[#0a0a0a]/[0.03]' : 'border-[#0a0a0a]/15'}`}
              >
                <input type="radio" name="uebung-zugang-rolle" checked={rolle === 'admin'} onChange={() => setRolle('admin')} className="mt-0.5 h-5 w-5" />
                <span>
                  <span className="block text-sm font-medium">Alles (Admin)</span>
                  <span className="block text-xs text-[#6b6b6b]">Alle Inhalte, Kontaktseite, Zugänge und Verlauf. Nur für den Vorstand.</span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 ${rolle === 'bereiche' ? 'border-[#0a0a0a] bg-[#0a0a0a]/[0.03]' : 'border-[#0a0a0a]/15'}`}
              >
                <input type="radio" name="uebung-zugang-rolle" checked={rolle === 'bereiche'} onChange={() => setRolle('bereiche')} className="mt-0.5 h-5 w-5" />
                <span>
                  <span className="block text-sm font-medium">Bestimmte Bereiche</span>
                  <span className="block text-xs text-[#6b6b6b]">
                    Nur ausgewählte Sparten, Mannschaften oder Gruppen – z. B. für Trainer:innen und Spartenleitungen.
                  </span>
                </span>
              </label>
            </fieldset>
            {rolle === 'bereiche' && <BereichAuswahl auswahl={auswahl} setAuswahl={setAuswahl} fehler={fehler.bereiche} />}
          </div>
        </Karte>

        {/* Wie die echte Speicherleiste: Eine Erfolgsmeldung verschwindet, sobald wieder etwas geändert wird */}
        <UebungsLeiste
          geaendert={geaendert}
          meldung={meldung?.art === 'erfolg' && geaendert ? null : meldung}
          knopfText={modus === 'neu' ? 'Zugang anlegen und Einladungs-Code erstellen' : 'Speichern'}
        />
      </form>
    </Spielwiese>
  )
}

/* ── Nachbau der unteren Kästen auf der Seite eines Zugangs ────────────────── */

interface Geraet {
  id: number
  name: string
  angemeldet: string
  aktiv: string
}

const GERAETE: Geraet[] = [
  { id: 1, name: 'iPhone · Safari', angemeldet: '02.09.2026, 18:14', aktiv: '24.10.2026, 07:55' },
  { id: 2, name: 'Windows · Firefox', angemeldet: '15.09.2026, 19:40', aktiv: '21.10.2026, 20:03' },
]

type Ort = 'zuruecksetzen' | 'geraete' | 'status' | 'loeschen'

function HandyVerloren({ geloest }: LektionProps) {
  const name = 'Jonas Muster'
  const [geraete, setGeraete] = useState<Geraet[]>(GERAETE)
  const [aktiv, setAktiv] = useState(true)
  const [eingerichtet, setEingerichtet] = useState(true)
  const [code, setCode] = useState<AnmeldeCodeDaten | null>(null)
  // Ablauf der noch offenen Einladung – wie offeneEinladung() in zugaenge/logik.ts
  const [offenBis, setOffenBis] = useState<string | null>(null)
  const [rueckfrage, setRueckfrage] = useState<{ ort: Ort; text: string; aktion: () => void } | null>(null)
  const [statusMeldung, setStatusMeldung] = useState<string | null>(null)
  // Hinweis der Übung – erscheint im Kasten, in dem gerade geklickt wurde
  const [hinweis, setHinweis] = useState<{ ort: Ort; text: string } | null>(null)

  // Wie in ZugangZuruecksetzen.tsx: ohne Einrichtung und ohne Geräte gibt es nur eine neue Einladung.
  const echtesZuruecksetzen = eingerichtet || geraete.length > 0
  const zuruecksetzenFrage = echtesZuruecksetzen
    ? `Zugang „${name}“ zurücksetzen?\n\nAlle Geräte werden sofort abgemeldet, das alte Passwort und die App-Kopplung gelten nicht mehr.`
    : offenBis
      ? `Neuen Einladungs-Code erstellen? Die bisherige Einladung (gültig bis ${offenBis} Uhr) funktioniert dann nicht mehr.`
      : null

  function zuruecksetzen() {
    const bis = inSiebenTagen()
    setGeraete([])
    setEingerichtet(false)
    setOffenBis(bis)
    setCode(uebungsCode(name, 'TEST-8Z3K-WN5R', 11, bis))
    setHinweis(null)
    geloest()
  }

  function abmelden(id: number) {
    setGeraete(gs => gs.filter(g => g.id !== id))
    setHinweis({
      ort: 'geraete',
      text:
        id === 1
          ? 'Das iPhone ist abgemeldet – gut. Aber mit dem Handy ist auch Jonas’ Authenticator-App weg: Ohne App-Code kommt er nirgends mehr rein. Was fehlt noch?'
          : 'Den Windows-PC hat Jonas gar nicht verloren. Verloren ist das iPhone – mit der Authenticator-App darauf.',
    })
  }

  const rueckfrageHier = (ort: Ort) =>
    rueckfrage?.ort === ort && (
      <Rueckfrage
        text={rueckfrage.text}
        onAbbrechen={() => setRueckfrage(null)}
        onOk={() => {
          setRueckfrage(null)
          rueckfrage.aktion()
        }}
      />
    )

  const hinweisHier = (ort: Ort) => hinweis?.ort === ort && <Meldung art="hinweis">In der Übung noch nicht ganz: {hinweis.text}</Meldung>

  return (
    <Spielwiese>
      <ZugangKopf name={name} admin={false} aktiv={aktiv} eingerichtet={eingerichtet} benutzername="jonas.muster" />
      <p className="mb-5 text-sm text-[#6b6b6b]">Weiter oben stehen die Kästen „Wer?“ und „Darf bearbeiten“ – die brauchst du hier nicht.</p>
      <div className="space-y-6">
        <Karte titel={eingerichtet ? 'Passwort & App' : 'Einladung'}>
          {code ? (
            <div className="space-y-4">
              <AnmeldeCodeKarte daten={code} hinweis={einladungsHinweis(name)} />
              <button type="button" className={knopfKlassen.leise} onClick={() => setCode(null)}>
                Code ausblenden
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-[#6b6b6b]">
                {echtesZuruecksetzen
                  ? 'Passwort vergessen, Handy mit der Authenticator-App verloren oder gewechselt? Nach dem Zurücksetzen richtet die Person beides über einen neuen Einladungs-Code neu ein.'
                  : 'Die Einladung ist verloren gegangen oder abgelaufen? Hier gibt es einen neuen Einladungs-Code.'}
                {offenBis && <> Die noch offene Einladung (gültig bis {offenBis} Uhr) wird dabei ungültig.</>}
              </p>
              {!aktiv && <Meldung art="hinweis">Der Zugang ist deaktiviert. Bitte zuerst wieder aktivieren.</Meldung>}
              {rueckfrageHier('zuruecksetzen')}
              <button
                type="button"
                className={echtesZuruecksetzen ? knopfKlassen.gefahr : knopfKlassen.primaer}
                disabled={!aktiv}
                onClick={() =>
                  zuruecksetzenFrage ? setRueckfrage({ ort: 'zuruecksetzen', text: zuruecksetzenFrage, aktion: zuruecksetzen }) : zuruecksetzen()
                }
              >
                {echtesZuruecksetzen ? <RotateCcw size={15} aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}
                {echtesZuruecksetzen ? 'Zugang zurücksetzen (Passwort & App neu einrichten)' : 'Neuen Einladungs-Code erstellen'}
              </button>
            </div>
          )}
        </Karte>

        <Karte titel="Angemeldete Geräte" beschreibung="Ein Gerät verloren oder verkauft? Hier abmelden – dort ist man dann sofort ausgeloggt.">
          {hinweis?.ort === 'geraete' && <div className="mb-4">{hinweisHier('geraete')}</div>}
          {geraete.length === 0 ? (
            <LeerHinweis>Auf keinem Gerät angemeldet.</LeerHinweis>
          ) : (
            <>
              <ul className="divide-y divide-[#0a0a0a]/[0.07]">
                {geraete.map(g => (
                  <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-[#6b6b6b]">
                        angemeldet am {g.angemeldet} · zuletzt aktiv {g.aktiv}
                      </div>
                    </div>
                    <button type="button" onClick={() => abmelden(g.id)} className={knopfKlassen.sekundaer} aria-label={`${g.name} abmelden`}>
                      Abmelden
                    </button>
                  </li>
                ))}
              </ul>
              {geraete.length > 1 && (
                <div className="mt-4 space-y-3">
                  {rueckfrageHier('geraete')}
                  <button
                    type="button"
                    className={knopfKlassen.gefahr}
                    onClick={() =>
                      setRueckfrage({
                        ort: 'geraete',
                        text: `Alle Geräte von ${name} abmelden?`,
                        aktion: () => {
                          setGeraete([])
                          setHinweis({
                            ort: 'geraete',
                            text: 'Alle Geräte sind abgemeldet. Aber Jonas’ Authenticator-App war auf dem verlorenen Handy – ohne sie kann er sich nicht wieder anmelden. Was fehlt noch?',
                          })
                        },
                      })
                    }
                  >
                    Alle Geräte abmelden
                  </button>
                </div>
              )}
            </>
          )}
        </Karte>

        <Karte
          titel={aktiv ? 'Zugang deaktivieren' : 'Zugang aktivieren'}
          beschreibung={
            aktiv
              ? 'Sperrt den Zugang sofort: alle Geräte werden abgemeldet, eine offene Einladung wird gelöscht. Rechte, Passwort und Verlauf bleiben erhalten.'
              : 'Der Zugang ist deaktiviert. Nach dem Aktivieren kann sich die Person wieder mit Benutzername, Passwort und App anmelden.'
          }
        >
          <div className="space-y-3">
            {rueckfrageHier('status')}
            <button
              type="button"
              className={aktiv ? knopfKlassen.gefahr : knopfKlassen.primaer}
              onClick={() => {
                if (!aktiv) {
                  setAktiv(true)
                  setStatusMeldung(
                    'Zugang wieder aktiviert. Die Person kann sich wieder anmelden – ist die Einrichtung noch offen, bitte einen neuen Einladungs-Code erstellen.',
                  )
                  setHinweis(code ? null : { ort: 'status', text: 'Jetzt ist Jonas wieder freigeschaltet – aber seine App ist immer noch weg. Setz den Zugang zurück.' })
                  return
                }
                setRueckfrage({
                  ort: 'status',
                  text: `Zugang „${name}“ deaktivieren? Alle Geräte werden sofort abgemeldet.`,
                  aktion: () => {
                    setAktiv(false)
                    setGeraete([])
                    setOffenBis(null)
                    setStatusMeldung('Zugang deaktiviert. Alle Geräte sind abgemeldet, eine offene Einladung ist gelöscht.')
                    setHinweis({
                      ort: 'status',
                      text: 'Jetzt ist der Zugang gesperrt – auch für Jonas selbst. Er soll aber weiterarbeiten können, nur eben mit neuem Handy. Aktiviere den Zugang wieder und setz ihn zurück.',
                    })
                  },
                })
              }}
            >
              {aktiv ? 'Zugang deaktivieren' : 'Zugang wieder aktivieren'}
            </button>
            {statusMeldung && <Meldung art="erfolg">{statusMeldung}</Meldung>}
            {hinweisHier('status')}
          </div>
        </Karte>

        <Karte titel="Zugang löschen" beschreibung="Löscht den Zugang mit allen Geräten, Passwort und App-Kopplung. Im Verlauf bleibt der Name bei früheren Änderungen stehen.">
          <div className="space-y-3">
            {rueckfrageHier('loeschen')}
            {hinweisHier('loeschen')}
            <button
              type="button"
              className={knopfKlassen.gefahr}
              onClick={() =>
                setRueckfrage({
                  ort: 'loeschen',
                  text: `Zugang „${name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`,
                  aktion: () =>
                    setHinweis({
                      ort: 'loeschen',
                      text: 'Stopp – in echt wäre der Zugang jetzt samt Rechten weg, und Jonas bräuchte einen ganz neuen. In der Übung ist nichts passiert. Es geht einfacher.',
                    }),
                })
              }
            >
              Zugang löschen
            </button>
          </div>
        </Karte>
      </div>
    </Spielwiese>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

const JONAS = PERSONEN[1]
const MIRA = PERSONEN[2]

export const lektionen: Lektion[] = [
  {
    titel: 'Einen Trainer einladen',
    aufgabe: (
      <>
        <strong>Jonas Muster</strong> trainiert die <strong>U13 (Fußball)</strong> und soll ihre Seite selbst pflegen. Leg einen Zugang für ihn an, verknüpf
        ihn unter „Eigene Person“ mit seiner Person und gib ihm Rechte <strong>nur für die U13</strong>.
      </>
    ),
    Inhalt: props => (
      <ZugangUebung
        {...props}
        modus="neu"
        aufgabe={w => {
          if (w.name.trim().replace(/\s+/g, ' ') !== 'Jonas Muster') return 'Der Zugang ist für Jonas Muster – trag seinen vollen Namen ein.'
          if (w.benutzername !== 'jonas.muster') return 'Lass den vorgeschlagenen Benutzernamen „jonas.muster“ stehen.'
          if (w.personId !== JONAS.id) return 'Such unter „Eigene Person“ nach „Jonas“ und tippe auf „Jonas Muster“ – dann pflegt er seine Kontaktdaten selbst.'
          if (w.rolle === 'admin') return 'Admin wäre zu viel: Jonas trainiert nur die U13. Wähle „Bestimmte Bereiche“.'
          const bereiche = wirksam(w.rolle, w.auswahl)
          if (bereiche.indexOf('s1') >= 0)
            return 'Mit dem Haken bei „Fußball“ dürfte Jonas die ganze Sparte bearbeiten. Nimm ihn heraus und klapp die Mannschaften rechts daneben über „einzeln“ auf (am Handy: der Pfeil mit der Zahl).'
          if (bereiche.join() !== 'm13') return 'Hak nur die U13 an – sonst nichts.'
          return null
        }}
      />
    ),
    danach:
      'In echt zeigt die Verwaltung nach dem Anlegen sofort den Einladungs-Code – als QR-Code, zum Eintippen und als Link. Er gilt 7 Tage und nur einmal – und er wird nur dieses eine Mal angezeigt. Mit ihm legt Jonas sein Passwort fest und koppelt die Authenticator-App.',
  },
  {
    titel: 'Den Code weitergeben',
    aufgabe: 'Jonas ist gerade nicht da. Wie bekommt er seinen Einladungs-Code?',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Wie gibst du Jonas den Einladungs-Code am besten weiter?"
        antworten={[
          {
            text: 'In die WhatsApp-Gruppe der Fußball-Trainer:innen posten – da liest er sicher mit',
            erklaerung: 'Lieber nicht: Wer den Code zuerst benutzt, richtet den Zugang ein. Gib ihn nur persönlich oder per Direktnachricht weiter.',
          },
          { text: 'Mit „Link kopieren“ den Link nur an ihn schicken – per Direktnachricht', richtig: true },
          {
            text: 'Morgen in der Verwaltung nachsehen und ihm den Code dann vorlesen',
            erklaerung:
              'Der Code erscheint nur ein einziges Mal. Ist er weg, öffnest du den Zugang und erstellst im Kasten „Einladung“ einen neuen – der alte gilt dann nicht mehr.',
          },
        ]}
      />
    ),
    danach:
      'Am einfachsten ist es persönlich: Jonas scannt den QR-Code mit der Handykamera direkt von deinem Bildschirm. Am PC öffnet er die Anmeldeseite, klickt unten auf „gib den Einladungs-Code hier ein“ und tippt den Code ein.',
  },
  {
    titel: 'Eine Spartenleitung',
    aufgabe: (
      <>
        <strong>Mira Probe</strong> hat bisher nur die Judo-Kindergruppe gepflegt. Ab sofort leitet sie die <strong>ganze Sparte Judo</strong>. Gib ihr die
        Rechte dafür und speichere.
      </>
    ),
    Inhalt: props => (
      <ZugangUebung
        {...props}
        modus="bearbeiten"
        zugang={{ id: 2, name: 'Mira Probe', benutzername: 'mira.probe', person: MIRA, rolle: 'bereiche', auswahl: ['g21'] }}
        aufgabe={w => {
          if (w.name.trim() !== 'Mira Probe' || w.benutzername !== 'mira.probe') return 'Name und Benutzername bleiben, wie sie sind.'
          if (w.rolle === 'admin') return 'Admin wäre zu viel – Mira soll nur Judo bearbeiten. Wähle „Bestimmte Bereiche“.'
          const bereiche = wirksam(w.rolle, w.auswahl)
          if (bereiche.indexOf('s2') < 0) return 'Setz den Haken direkt bei „Judo“ – das ist die ganze Sparte mit allen Gruppen.'
          if (bereiche.length !== 1) return 'Mira bekommt nur Judo – nimm die anderen Haken wieder heraus.'
          return null
        }}
      />
    ),
    danach:
      'Mit der ganzen Sparte darf Mira Texte, Foto und Ansprechpartner:innen der Sparte pflegen, Termine eintragen und Mannschaften und Gruppen anlegen und löschen. Die neuen Rechte gelten sofort – sie muss sich nicht neu anmelden.',
  },
  {
    titel: 'Handy verloren',
    aufgabe: (
      <>
        Jonas hat sein <strong>iPhone verloren</strong> – mit der Authenticator-App darauf. Sorg dafür, dass mit dem verlorenen Handy niemand mehr
        reinkommt und Jonas mit seinem neuen Handy wieder weiterarbeiten kann.
      </>
    ),
    Inhalt: HandyVerloren,
    danach:
      'Zurücksetzen meldet alle Geräte ab, Passwort und App-Kopplung gelten nicht mehr – und es gibt sofort einen neuen Einladungs-Code. Den gibst du Jonas wie beim ersten Mal. Rechte und Verlauf bleiben erhalten.',
  },
  {
    titel: 'Ein fremdes Gerät',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Bei Anna steht unter „Angemeldete Geräte“ ein „Android · Chrome“, das sie nicht kennt. Was tust du?"
        antworten={[
          {
            text: 'Das Gerät abmelden',
            erklaerung: 'Damit ist es nur jetzt draußen. Wer Passwort und App-Code kennt, meldet sich einfach wieder an.',
          },
          {
            text: 'Den Zugang deaktivieren',
            erklaerung: 'Das sperrt zwar sofort – aber Passwort und App bleiben gültig. Nach dem Aktivieren ginge es wieder los.',
          },
          { text: 'Den Zugang zurücksetzen und Anna den neuen Code geben', richtig: true },
        ]}
      />
    ),
    danach:
      'Ein unbekanntes Gerät heißt: Jemand Fremdes kennt Passwort und App-Code. Nur Zurücksetzen macht beides ungültig. Tipp: Richte mindestens zwei Admins ein – dann sperrt ein verlorenes Handy nicht alle aus.',
  },
]
