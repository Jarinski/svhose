'use client'

/**
 * Übung "Verlauf" – Nachbau der Seite Verlauf (app/verwaltung/(intern)/verlauf/page.tsx) mit den
 * Filtern "Was" und "Wer" und aufklappbaren Einträgen. Vorher/Nachher kommt aus derselben Funktion
 * wie in echt (verlauf/vergleich.ts), die Stände haben dieselbe Form wie die echten Schnappschüsse.
 * Zum Schluss wird ein alter Stand im Abschnitt "Trainingszeiten" zurückgeholt – mit denselben
 * Prüfungen und Meldungen wie lib/verwaltung/team-bearbeiten.ts. Alle Einträge sind erfunden.
 */

import { useId, useState } from 'react'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { auswahlKlasse, Badge, eingabeKlasse, Feld, Karte, knopfKlassen, LeerHinweis, Meldung } from '@/components/verwaltung/ui'
import { datumDeutsch, WOCHENTAGE, zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { geaenderteFelder } from '../../../verlauf/vergleich'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste } from '../werkzeuge'

/* ── Texte wie auf der echten Seite ────────────────────────────────────────── */

const TYP_NAMEN: Record<string, string> = {
  sparten: 'Sparten',
  mannschaften: 'Mannschaften',
  gruppen: 'Gruppen',
  personen: 'Personen',
  funktionen: 'Kontaktseite',
  trainingszeiten: 'Trainingszeiten',
  news: 'News',
  termine: 'Termine',
  downloads: 'Downloads',
  zugaenge: 'Zugänge',
  geraete: 'Anmeldungen & Geräte',
}

const QUELLEN: Record<string, string> = { verwaltung: 'Verwaltung', api: 'API', telegram: 'Telegram', system: 'System' }

const AKTIONEN: Record<string, { text: string; ton: 'neutral' | 'warnung' | 'erfolg' }> = {
  angelegt: { text: 'angelegt', ton: 'erfolg' },
  geaendert: { text: 'geändert', ton: 'neutral' },
  geloescht: { text: 'gelöscht', ton: 'warnung' },
  anmeldung: { text: 'Anmeldung', ton: 'neutral' },
  abmeldung: { text: 'Abmeldung', ton: 'neutral' },
}

const typName = (typ: string) => TYP_NAMEN[typ] ?? typ

/* ── Erfundene Einträge ────────────────────────────────────────────────────── */

interface Eintrag {
  id: number
  /** Schon lesbar, z. B. "24.10.2026, 21:37". */
  zeitpunkt: string
  zugangId: number | null
  zugangName: string | null
  quelle: string
  aktion: string
  objektTyp: string
  bezeichnung: string
  vorher?: unknown
  nachher?: unknown
}

/** Zugänge für den Filter "Wer" – nach Namen sortiert wie in echt. */
const ZUGAENGE = [
  { id: 1, name: 'Anna Beispiel' },
  { id: 2, name: 'Jonas Muster' },
  { id: 3, name: 'Mira Probe' },
  { id: 4, name: 'Tom Test' },
]

/**
 * Kalendertag vor `tage` Tagen, gezählt ab heute in deutscher Zeit. Über Kalendertage statt
 * 24-Stunden-Schritte – sonst stimmt "gestern" am Tag der Zeitumstellung nicht.
 */
function tagVor(tage: number): Date {
  const [j, m, t] = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' }).split('-').map(Number)
  return new Date(Date.UTC(j, m - 1, t - tage))
}

/** Datum vor `tage` Tagen, z. B. "24.10.2026" – erst beim Anzeigen berechnet. */
function datum(tage: number): string {
  return tagVor(tage).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Datum in `tage` Tagen als "YYYY-MM-DD" (so speichern Termine ihr Datum). */
function isoDatum(tage: number): string {
  return tagVor(-tage).toISOString().slice(0, 10)
}

/** Gestern als Datum, z. B. in der Aufgabe. */
function Gestern() {
  return <>{datum(1)}</>
}

// Schnappschuss einer Mannschaft wie schnappschuss() in team-bearbeiten.ts: team, trainingszeiten, trainer
interface ZeitStand {
  id: number
  wochentag: number
  beginn: string
  ende: string | null
  ort: string | null
  saison: string
  rhythmus: string
  hinweis: string | null
  reihenfolge: number
}

const U13 = {
  id: 13,
  sparteId: 1,
  name: 'U13',
  bereich: 'Junioren',
  altersklasse: 'U13',
  beschreibung: 'Wir trainieren zweimal pro Woche. Neue Kinder sind willkommen!',
  foto: 'mannschaften/u13-7c1d2e9a.webp',
  sichtbar: true,
  reihenfolge: 30,
}
// Annas neue Beschreibung von gestern Abend
const U13_NEU = { ...U13, beschreibung: 'Wir trainieren zweimal pro Woche. Probetraining jederzeit – einfach vorbeikommen!' }
const TRAINER = [
  { personId: 21, name: 'Jonas Muster', rolle: 'Trainer:in' },
  { personId: 22, name: 'Moritz Probe', rolle: 'Co-Trainer:in' },
]
const DI_VORHER: ZeitStand = { id: 41, wochentag: 2, beginn: '17:00', ende: '18:30', ort: 'Sportplatz', saison: 'ganzjährig', rhythmus: 'jede Woche', hinweis: null, reihenfolge: 0 }
const DI_JETZT: ZeitStand = { ...DI_VORHER, beginn: '18:00', ende: '19:30' }
// Bewusst eine andere Zeit als der alte Dienstag: Wer im Kasten "Vorher" die Zeile "Wochentag: 4" liest, liegt falsch.
const DO: ZeitStand = { id: 42, wochentag: 4, beginn: '16:30', ende: '18:00', ort: 'Turnhalle Grundschule', saison: 'ganzjährig', rhythmus: 'jede Woche', hinweis: null, reihenfolge: 1 }

const teamStand = (team: typeof U13, zeiten: ZeitStand[]) => ({ team, trainingszeiten: zeiten, trainer: TRAINER })

// Personen wie personSchnappschuss() in person-bearbeiten.ts
const person = (p: { id: number; name: string; email?: string; telefon?: string; foto?: string; notiz?: string }) => ({
  id: p.id,
  name: p.name,
  email: p.email ?? null,
  telefon: p.telefon ?? null,
  whatsapp: null,
  foto: p.foto ?? null,
  notiz: p.notiz ?? null,
})

const TURNEN = {
  id: 4,
  slug: 'turnen',
  name: 'Turnen',
  icon: '🤸',
  farbe: null,
  kurzbeschreibung: 'Turnen für Kinder ab 3 Jahren.',
  beschreibung: 'Vom Eltern-Kind-Turnen bis zum Geräteturnen.',
  foto: null,
  sichtbar: true,
  reihenfolge: 40,
  ansprechpartner: [{ personId: 31, name: 'Mira Probe', rolle: 'Abteilungsleitung' }],
}

/**
 * Die Einträge, neueste zuerst. Die Daten hängen vom heutigen Tag ab ("gestern", "vorgestern").
 * Der neueste ist von gestern Abend – so liegt keine Uhrzeit in der Zukunft, egal wann geübt wird.
 */
function verlaufEintraege(): Eintrag[] {
  const wer = (id: number | null) => ({ zugangId: id, zugangName: ZUGAENGE.find(z => z.id === id)?.name ?? null, quelle: 'verwaltung' })
  return [
    {
      id: 112,
      zeitpunkt: `${datum(1)}, 23:05`,
      ...wer(1),
      aktion: 'geaendert',
      objektTyp: 'mannschaften',
      bezeichnung: 'Fußball · U13',
      vorher: teamStand(U13, [DI_JETZT, DO]),
      nachher: teamStand(U13_NEU, [DI_JETZT, DO]),
    },
    { id: 111, zeitpunkt: `${datum(1)}, 22:41`, ...wer(3), aktion: 'anmeldung', objektTyp: 'geraete', bezeichnung: 'iPhone · Safari · angemeldet bleiben' },
    {
      id: 110,
      zeitpunkt: `${datum(1)}, 21:37`,
      ...wer(2),
      aktion: 'geaendert',
      objektTyp: 'mannschaften',
      bezeichnung: 'Fußball · U13',
      vorher: teamStand(U13, [DI_VORHER, DO]),
      nachher: teamStand(U13, [DI_JETZT, DO]),
    },
    {
      id: 109,
      zeitpunkt: `${datum(1)}, 19:05`,
      ...wer(3),
      aktion: 'angelegt',
      objektTyp: 'termine',
      bezeichnung: `Termin: Gürtelprüfung (${datumDeutsch(isoDatum(20))})`,
      nachher: {
        id: 311,
        titel: 'Gürtelprüfung',
        datum: isoDatum(20),
        uhrzeit: '10:00–13:00',
        ort: 'Sporthalle, Dojo',
        beschreibung: 'Bitte den Judopass mitbringen.',
        bild: null,
        bereich: 'Judo',
        tags: [],
        sparteId: 2,
        mannschaftId: null,
        quelle: 'manuell',
        externeId: null,
      },
    },
    {
      id: 108,
      zeitpunkt: `${datum(1)}, 18:20`,
      ...wer(4),
      aktion: 'geaendert',
      objektTyp: 'personen',
      bezeichnung: 'Tom Test',
      vorher: person({ id: 33, name: 'Tom Test', telefon: '0151 23456789', email: 'tom@example.org' }),
      nachher: person({ id: 33, name: 'Tom Test', telefon: '0151 98765432', email: 'tom@example.org' }),
    },
    {
      id: 107,
      zeitpunkt: `${datum(2)}, 20:11`,
      ...wer(1),
      aktion: 'geloescht',
      objektTyp: 'personen',
      bezeichnung: 'Paul Platzhalter',
      vorher: {
        ...person({
          id: 57,
          name: 'Paul Platzhalter',
          telefon: '0171 2345678',
          email: 'paul@example.org',
          foto: 'personen/paul-platzhalter-3fa9c2e1.webp',
          notiz: 'Hilft montags beim Aufbau.',
        }),
        verwendung: ['Co-Trainer:in bei U12 (Fußball)'],
      },
    },
    {
      id: 106,
      zeitpunkt: `${datum(2)}, 17:48`,
      ...wer(1),
      aktion: 'angelegt',
      objektTyp: 'personen',
      bezeichnung: 'Lena Beispiel (Trainer:in bei U12)',
      nachher: { id: 58, name: 'Lena Beispiel', telefon: '0170 1234567', email: 'lena@example.org' },
    },
    { id: 105, zeitpunkt: `${datum(3)}, 22:15`, ...wer(2), aktion: 'abmeldung', objektTyp: 'geraete', bezeichnung: 'Windows · Firefox (aus der Ferne)' },
    {
      id: 104,
      zeitpunkt: `${datum(5)}, 09:12`,
      ...wer(1),
      aktion: 'geaendert',
      objektTyp: 'zugaenge',
      bezeichnung: 'Zugang Mira Probe',
      vorher: {
        name: 'Mira Probe',
        benutzername: 'mira.probe',
        eingerichtetAm: '2026-09-02T16:12:00.000Z',
        istAdmin: false,
        aktiv: true,
        personId: 31,
        person: 'Mira Probe',
        bereiche: ['Judo · Kinder (5–7 Jahre) (Gruppe)'],
      },
      nachher: {
        name: 'Mira Probe',
        benutzername: 'mira.probe',
        eingerichtetAm: '2026-09-02T16:12:00.000Z',
        istAdmin: false,
        aktiv: true,
        personId: 31,
        person: 'Mira Probe',
        bereiche: ['Sparte Judo'],
      },
    },
    {
      // Von einem Zugang, den es nicht mehr gibt: Name bleibt, Zugang fehlt
      id: 103,
      zeitpunkt: `${datum(6)}, 19:30`,
      zugangId: null,
      zugangName: 'Frieda Früher',
      quelle: 'verwaltung',
      aktion: 'geaendert',
      objektTyp: 'sparten',
      bezeichnung: 'Sparte Turnen',
      vorher: { ...TURNEN, kurzbeschreibung: 'Turnen für Kinder ab 4 Jahren.' },
      nachher: TURNEN,
    },
    {
      id: 102,
      zeitpunkt: `${datum(8)}, 03:00`,
      zugangId: null,
      zugangName: null,
      quelle: 'system',
      aktion: 'angelegt',
      objektTyp: 'news',
      bezeichnung: 'News: Sommerfest 2026',
      nachher: {
        id: 812,
        slug: 'sommerfest-2026',
        titel: 'Sommerfest 2026',
        teaser: 'Rückblick auf ein buntes Fest auf dem Sportplatz.',
        inhalt: 'Bei bestem Wetter haben wir gemeinsam gefeiert …',
        bild: 'news/sommerfest-2026-5b2e8f10.webp',
        kategorie: 'Verein',
        datum: '2026-07-12',
        veroeffentlicht: true,
        sparteId: null,
        mannschaftId: null,
        gruppeId: null,
      },
    },
  ]
}

/* ── Nachbau der Liste ─────────────────────────────────────────────────────── */

function EintragZeile({ v }: { v: Eintrag }) {
  const felder = geaenderteFelder(v.vorher, v.nachher)
  // Beim Anlegen bzw. Löschen gibt es nur eine Seite – dann eine Spalte statt "—" überall.
  const ohneVorher = v.vorher == null
  const ohneNachher = v.nachher == null
  const aktion = AKTIONEN[v.aktion] ?? { text: v.aktion, ton: 'neutral' as const }
  const kopf = (
    <div className="grid grid-cols-1 items-baseline gap-x-3 gap-y-0.5 text-sm md:grid-cols-[9.5rem_11rem_6.5rem_minmax(0,1fr)]">
      <span className="text-xs tabular-nums text-[#6b6b6b] md:text-sm">{v.zeitpunkt}</span>
      <span className="truncate">
        {v.zugangName ?? 'System'}
        <span className="text-xs text-[#6b6b6b]"> · {QUELLEN[v.quelle] ?? v.quelle}</span>
      </span>
      <span>
        <Badge ton={aktion.ton}>{aktion.text}</Badge>
      </span>
      <span className="min-w-0">
        <span className="mr-1.5 text-xs text-[#6b6b6b]">{typName(v.objektTyp)}:</span>
        <span className="break-words">{v.bezeichnung}</span>
      </span>
    </div>
  )
  return (
    <li>
      {felder.length === 0 ? (
        <div className="px-2 py-3 pl-7">{kopf}</div>
      ) : (
        <details className="group">
          <summary className="flex cursor-pointer list-none gap-2 px-2 py-3 hover:bg-[#0a0a0a]/[0.03] [&::-webkit-details-marker]:hidden">
            <ChevronRight size={15} className="mt-0.5 shrink-0 text-[#6b6b6b] transition-transform group-open:rotate-90" aria-hidden="true" />
            <div className="min-w-0 flex-1">{kopf}</div>
          </summary>
          <div className="space-y-3 px-2 pb-4 pl-7">
            {felder.map((f, i) => (
              <div key={i} className="text-sm">
                <div className="mb-1 font-medium">{f.feld}</div>
                <div className={`grid grid-cols-1 gap-2 ${ohneVorher || ohneNachher ? '' : 'sm:grid-cols-2'}`}>
                  {!ohneVorher && (
                    <div className="min-w-0 rounded-sm border border-red-200 bg-red-50 px-3 py-2">
                      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-red-800">{ohneNachher ? 'Vor dem Löschen' : 'Vorher'}</div>
                      <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed [overflow-wrap:anywhere]">{f.vorher}</pre>
                    </div>
                  )}
                  {!ohneNachher && (
                    <div className="min-w-0 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-emerald-800">{ohneVorher ? 'Angelegt mit' : 'Nachher'}</div>
                      <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed [overflow-wrap:anywhere]">{f.nachher}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </li>
  )
}

interface Filter {
  typ: string
  zugang: string
}

const OHNE_FILTER: Filter = { typ: '', zugang: '' }

/**
 * Filter und Liste wie auf /verwaltung/verlauf. Wie in echt wirkt eine neue Auswahl erst nach
 * "Anzeigen"; `beimAnzeigen` bekommt dann den Filter (für die Prüfung der Aufgabe).
 */
function VerlaufListe({
  eintraege,
  start = OHNE_FILTER,
  beimAnzeigen,
  zusatz,
}: {
  eintraege: Eintrag[]
  start?: Filter
  beimAnzeigen?: (f: Filter) => void
  zusatz?: React.ReactNode
}) {
  const id = useId()
  const [auswahl, setAuswahl] = useState<Filter>(start)
  const [filter, setFilter] = useState<Filter>(start)
  const typen = eintraege
    .map(e => e.objektTyp)
    .filter((t, i, alle) => alle.indexOf(t) === i)
    .sort((a, b) => typName(a).localeCompare(typName(b), 'de'))
  const treffer = eintraege.filter(
    e =>
      (!filter.typ || e.objektTyp === filter.typ) &&
      (!filter.zugang || (filter.zugang === 'ohne' ? e.zugangId == null : e.zugangId === Number(filter.zugang))),
  )

  return (
    <div className="space-y-6">
      <Karte>
        <form
          onSubmit={e => {
            e.preventDefault()
            setFilter(auswahl)
            beimAnzeigen?.(auswahl)
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label htmlFor={`${id}-typ`} className="mb-1.5 block text-sm font-medium">
              Was
            </label>
            <select id={`${id}-typ`} value={auswahl.typ} onChange={e => setAuswahl({ ...auswahl, typ: e.target.value })} className={auswahlKlasse}>
              <option value="">Alles</option>
              {typen.map(t => (
                <option key={t} value={t}>
                  {typName(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor={`${id}-zugang`} className="mb-1.5 block text-sm font-medium">
              Wer
            </label>
            <select id={`${id}-zugang`} value={auswahl.zugang} onChange={e => setAuswahl({ ...auswahl, zugang: e.target.value })} className={auswahlKlasse}>
              <option value="">Alle</option>
              {ZUGAENGE.map(z => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
              <option value="ohne">System / gelöschte Zugänge</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={knopfKlassen.primaer}>
              Anzeigen
            </button>
            {(filter.typ || filter.zugang) && (
              <button
                type="button"
                onClick={() => {
                  setAuswahl(OHNE_FILTER)
                  setFilter(OHNE_FILTER)
                }}
                className={knopfKlassen.sekundaer}
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </form>
        {zusatz && <div className="mt-4">{zusatz}</div>}
      </Karte>

      <Karte titel={`${treffer.length} ${treffer.length === 1 ? 'Eintrag' : 'Einträge'}`} beschreibung="Neueste zuerst">
        {treffer.length === 0 ? (
          <LeerHinweis>Keine Einträge gefunden.</LeerHinweis>
        ) : (
          <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
            <li className="hidden grid-cols-[9.5rem_11rem_6.5rem_minmax(0,1fr)] gap-3 px-2 py-2 pl-7 text-[11px] uppercase tracking-[0.12em] text-[#6b6b6b] md:grid">
              <span>Zeitpunkt</span>
              <span>Wer · Quelle</span>
              <span>Was</span>
              <span>Bezeichnung</span>
            </li>
            {treffer.map(v => (
              <EintragZeile key={v.id} v={v} />
            ))}
          </ul>
        )}
      </Karte>
    </div>
  )
}

function VerlaufSeite({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-5">
        <h3 className="font-display text-3xl leading-none tracking-tight">VERLAUF</h3>
        <p className="mt-2 text-sm text-[#6b6b6b]">Wer hat wann was geändert? Zum Aufklappen auf einen Eintrag tippen.</p>
      </div>
      {children}
    </>
  )
}

/* ── Antworten auswählen (für "Finde heraus …") ────────────────────────────── */

interface Frage {
  frage: string
  antworten: { text: string; richtig?: boolean; erklaerung?: string }[]
}

function Antworten({ fragen, erfolg, geloest, istGeloest }: { fragen: Frage[]; erfolg: string } & LektionProps) {
  const id = useId()
  const [wahl, setWahl] = useState<(number | null)[]>(() => fragen.map(f => (istGeloest ? f.antworten.findIndex(a => a.richtig) : null)))
  const [meldung, setMeldung] = useState<{ art: 'erfolg' | 'hinweis'; text: string } | null>(null)

  function pruefen(e: React.FormEvent) {
    e.preventDefault()
    if (wahl.some(w => w == null)) {
      setMeldung({ art: 'hinweis', text: 'Wähle bei jeder Frage eine Antwort aus.' })
      return
    }
    for (let i = 0; i < fragen.length; i++) {
      const a = fragen[i].antworten[wahl[i]!]
      if (!a.richtig) {
        setMeldung({ art: 'hinweis', text: `Noch nicht ganz: ${a.erklaerung ?? 'Schau dir den Eintrag noch einmal genau an.'}` })
        return
      }
    }
    setMeldung({ art: 'erfolg', text: erfolg })
    geloest()
  }

  return (
    <form onSubmit={pruefen} noValidate className="space-y-5 rounded-sm border border-[#0a0a0a]/15 bg-white p-4 md:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b6b6b]">Deine Antwort</div>
      {fragen.map((f, i) => (
        <fieldset key={i}>
          <legend className="mb-2 text-sm font-medium">{f.frage}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {f.antworten.map((a, j) => (
              <label
                key={j}
                className={`flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 text-sm ${wahl[i] === j ? 'border-[#0a0a0a] bg-[#0a0a0a]/[0.03]' : 'border-[#0a0a0a]/15'}`}
              >
                <input
                  type="radio"
                  name={`${id}-frage-${i}`}
                  checked={wahl[i] === j}
                  onChange={() => {
                    setWahl(w => w.map((x, k) => (k === i ? j : x)))
                    setMeldung(null)
                  }}
                  className="h-5 w-5 shrink-0"
                />
                <span>{a.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {meldung && <Meldung art={meldung.art}>{meldung.text}</Meldung>}
      <button type="submit" className={knopfKlassen.primaer}>
        Antwort prüfen
      </button>
    </form>
  )
}

/* ── Lektion 1 und 3: lesen und antworten ──────────────────────────────────── */

function LesenUndAntworten({ fragen, erfolg, ...props }: { fragen: Frage[]; erfolg: string } & LektionProps) {
  const [eintraege] = useState(verlaufEintraege)
  return (
    <div className="space-y-5">
      <Spielwiese>
        <VerlaufSeite>
          <VerlaufListe eintraege={eintraege} />
        </VerlaufSeite>
      </Spielwiese>
      <Antworten {...props} fragen={fragen} erfolg={erfolg} />
    </div>
  )
}

/* ── Lektion 2: filtern ────────────────────────────────────────────────────── */

function NurPersonen({ geloest, istGeloest }: LektionProps) {
  const [eintraege] = useState(verlaufEintraege)
  const [hinweis, setHinweis] = useState<string | null>(null)
  // Schon gelöst (z. B. nach "Zurück") oder eben in diesem Durchgang gelöst
  const [geschafft, setGeschafft] = useState(istGeloest)

  function anzeigen(f: Filter) {
    // Nach dem Lösen darf frei weiter gefiltert werden – ohne Hinweise
    if (geschafft) return setHinweis(null)
    let h: string | null = null
    if (!f.typ) h = 'Wähle unter „Was“ den Bereich „Personen“ und tippe dann auf „Anzeigen“.'
    else if (f.typ !== 'personen') h = `Jetzt siehst du nur „${typName(f.typ)}“. Gesucht sind die Änderungen an Personen.`
    else if (f.zugang) h = 'Lass unter „Wer“ „Alle“ stehen – sonst fehlen die Änderungen der anderen Zugänge.'
    setHinweis(h)
    if (!h) {
      setGeschafft(true)
      geloest()
    }
  }

  return (
    <Spielwiese>
      <VerlaufSeite>
        <VerlaufListe eintraege={eintraege} beimAnzeigen={anzeigen} zusatz={hinweis && <Meldung art="hinweis">In der Übung noch nicht ganz: {hinweis}</Meldung>} />
      </VerlaufSeite>
    </Spielwiese>
  )
}

/* ── Lektion 5: alten Stand zurückholen (Abschnitt "Trainingszeiten") ─────── */

const SAISONS = ['ganzjährig', 'Sommer', 'Winter']
const RHYTHMEN = ['jede Woche', 'alle 2 Wochen']

interface Zeit {
  schluessel: number
  /** Nr. der gespeicherten Zeit – fehlt bei neuen Zeilen. */
  id: number | null
  wochentag: number
  beginn: string
  ende: string
  ort: string
  saison: string
  rhythmus: string
  hinweis: string
}

const alsZeile = (z: ZeitStand): Zeit => ({
  schluessel: z.id,
  id: z.id,
  wochentag: z.wochentag,
  beginn: z.beginn,
  ende: z.ende ?? '',
  ort: z.ort ?? '',
  saison: z.saison,
  rhythmus: z.rhythmus,
  hinweis: z.hinweis ?? '',
})

/** Dieselben Prüfungen und Texte wie beim echten Speichern (teamEingabePruefen). */
function zeitenPruefen(zeiten: Zeit[]): Record<string, string> {
  const felder: Record<string, string> = {}
  zeiten.forEach((z, i) => {
    const zeile = `Trainingszeit ${i + 1}: `
    const k = `${z.schluessel}.`
    if (z.wochentag < 1) felder[k + 'wochentag'] = `${zeile}Bitte einen Wochentag auswählen.`
    if (!z.beginn) felder[k + 'beginn'] = `${zeile}Bitte eintragen, wann das Training beginnt.`
    else if (z.ende && z.ende <= z.beginn) felder[k + 'ende'] = `${zeile}Das Ende muss nach dem Beginn liegen.`
  })
  return felder
}

function fehlerMeldung(felder: Record<string, string>): string {
  const meldungen = Object.values(felder)
  const weitere = meldungen.length - 1
  return `Noch nicht gespeichert. ${meldungen[0]}${weitere > 0 ? ` (dazu ${weitere} weitere Stelle${weitere === 1 ? '' : 'n'}, rot markiert)` : ''}`
}

const vergleich = (zeiten: Zeit[]) => JSON.stringify(zeiten.map(({ schluessel, ...rest }) => rest))

/** So landen die Zeiten im Schnappschuss: sortiert nach Tag und Beginn, leere Felder als null. */
function zeitenStand(zeiten: Zeit[]): ZeitStand[] {
  return zeiten
    .map((z, i) => ({
      id: z.id ?? 43 + i,
      wochentag: z.wochentag,
      beginn: z.beginn,
      ende: z.ende || null,
      ort: z.ort.trim() || null,
      saison: z.saison,
      rhythmus: z.rhythmus,
      hinweis: z.hinweis.trim() || null,
      reihenfolge: i,
    }))
    .sort((a, b) => a.wochentag - b.wochentag || a.beginn.localeCompare(b.beginn))
}

function AltenStandZurueck({ geloest }: LektionProps) {
  const start = [alsZeile(DI_JETZT), alsZeile(DO)]
  const [eintraege, setEintraege] = useState(verlaufEintraege)
  const [zeiten, setZeiten] = useState<Zeit[]>(start)
  const [gespeichert, setGespeichert] = useState<Zeit[]>(start)
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<{ art: 'erfolg' | 'fehler' | 'hinweis'; text: string } | null>(null)
  const [naechster, setNaechster] = useState(100)
  const geaendert = vergleich(zeiten) !== vergleich(gespeichert)

  function aendern(schluessel: number, teil: Partial<Zeit>) {
    setZeiten(zs => zs.map(z => (z.schluessel === schluessel ? { ...z, ...teil } : z)))
  }

  function hinzufuegen() {
    // Wie im echten Formular: Ort und Saison der letzten Zeile vorschlagen
    const letzte = zeiten[zeiten.length - 1]
    setZeiten(zs =>
      zs.concat({ schluessel: naechster, id: null, wochentag: 0, beginn: '', ende: '', ort: letzte?.ort ?? '', saison: letzte?.saison ?? 'ganzjährig', rhythmus: 'jede Woche', hinweis: '' }),
    )
    setNaechster(n => n + 1)
  }

  function aufgabe(zs: Zeit[]): string | null {
    const di = zs.filter(z => z.wochentag === 2)
    const donnerstag = zs.filter(z => z.wochentag === 4)
    if (zs.length !== 2 || di.length !== 1 || donnerstag.length !== 1) return 'Beide Zeiten bleiben – nur der Dienstag ändert sich.'
    const donnerstagsZeit = 'Das ist die Zeit vom Donnerstag – im roten Kasten „Vorher“ steht sie bei „Wochentag: 4“. Der Dienstag ist „Wochentag: 2“.'
    if (di[0].beginn === DO.beginn) return donnerstagsZeit
    if (di[0].beginn !== DI_VORHER.beginn)
      return 'Lies im Verlauf ab, wann das Training am Dienstag vorher begann: Eintrag von Jonas antippen, im roten Kasten „Vorher“ bei „Wochentag: 2“ unter „Beginn“.'
    if (di[0].ende === DO.ende) return donnerstagsZeit
    if (di[0].ende !== DI_VORHER.ende) return 'Auch das Ende stimmt noch nicht – lies es im roten Kasten „Vorher“ bei „Wochentag: 2“ unter „Ende“ ab.'
    if (di[0].ort.trim() !== DI_VORHER.ort || di[0].saison !== DI_VORHER.saison || di[0].rhythmus !== DI_VORHER.rhythmus)
      return 'Ort, Saison und Rhythmus am Dienstag haben sich nicht geändert – lass sie, wie sie waren.'
    if (donnerstag[0].beginn !== DO.beginn || donnerstag[0].ende !== DO.ende) return 'Der Donnerstag war richtig und bleibt, wie er ist.'
    return null
  }

  function speichern(e: React.FormEvent) {
    e.preventDefault()
    const felder = zeitenPruefen(zeiten)
    setFehler(felder)
    if (Object.keys(felder).length) {
      setMeldung({ art: 'fehler', text: fehlerMeldung(felder) })
      return
    }
    if (!geaendert) {
      setMeldung({ art: 'erfolg', text: 'Alles schon gespeichert – es gab keine Änderungen.' })
      return
    }
    const hinweis = aufgabe(zeiten)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    // Auch das Zurückholen landet im Verlauf – Annas neue Beschreibung bleibt dabei erhalten.
    const neu: Eintrag = {
      id: 200,
      zeitpunkt: zeitpunktDeutsch(new Date().toISOString()),
      zugangId: 1,
      zugangName: 'Anna Beispiel',
      quelle: 'verwaltung',
      aktion: 'geaendert',
      objektTyp: 'mannschaften',
      bezeichnung: 'Fußball · U13',
      vorher: teamStand(U13_NEU, zeitenStand(gespeichert)),
      nachher: teamStand(U13_NEU, zeitenStand(zeiten)),
    }
    setEintraege(es => [neu].concat(es))
    setGespeichert(zeiten)
    setMeldung({ art: 'erfolg', text: 'Gespeichert – ist jetzt auf der Website sichtbar.' })
    geloest()
  }

  return (
    <Spielwiese>
      <VerlaufSeite>
        <VerlaufListe eintraege={eintraege} start={{ typ: 'mannschaften', zugang: '' }} />
      </VerlaufSeite>

      <div className="mb-5 mt-10 border-t-2 border-dashed border-[#0a0a0a]/20 pt-6">
        <h3 className="font-display text-3xl leading-none tracking-tight">U13</h3>
        <p className="mt-2 text-sm text-[#6b6b6b]">Mannschaft · Sparte Fußball</p>
      </div>
      <form onSubmit={speichern} noValidate>
        <Karte titel="Trainingszeiten" beschreibung="Wann und wo trainiert wird. Auf der Website werden die Zeiten nach Wochentag sortiert.">
          {zeiten.length === 0 ? (
            <p className="mb-4 text-sm text-[#6b6b6b]">Noch keine Trainingszeit eingetragen.</p>
          ) : (
            <div className="mb-4 space-y-4">
              {zeiten.map((z, i) => {
                const k = `uebung-verlauf-zeit-${z.schluessel}`
                const fe = (feld: string) => fehler[`${z.schluessel}.${feld}`]
                return (
                  <fieldset key={z.schluessel} aria-labelledby={`${k}-titel`} className="rounded-sm border border-[#0a0a0a]/15 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 id={`${k}-titel`} className="text-sm font-semibold">
                        Trainingszeit {i + 1}
                        {z.id == null && <span className="ml-2 text-xs font-normal text-[#6b6b6b]">neu</span>}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setZeiten(zs => zs.filter(x => x.schluessel !== z.schluessel))}
                        className={`${knopfKlassen.leise} -mr-2 min-h-[44px] text-red-700 hover:text-red-800`}
                        aria-label={`Trainingszeit ${i + 1} entfernen`}
                      >
                        <Trash2 size={16} /> <span className="text-sm">Entfernen</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-12">
                      <Feld label="Wochentag" htmlFor={`${k}-tag`} fehler={fe('wochentag')} className="col-span-2 md:col-span-3">
                        <select
                          id={`${k}-tag`}
                          value={z.wochentag}
                          onChange={e => aendern(z.schluessel, { wochentag: Number(e.target.value) })}
                          aria-invalid={!!fe('wochentag') || undefined}
                          className={auswahlKlasse}
                        >
                          {z.wochentag === 0 && <option value={0}>– Tag wählen –</option>}
                          {WOCHENTAGE.map((tag, t) => (
                            <option key={tag} value={t + 1}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      </Feld>
                      <Feld label="Beginn" htmlFor={`${k}-beginn`} fehler={fe('beginn')} className="col-span-1 md:col-span-2">
                        <input
                          id={`${k}-beginn`}
                          type="time"
                          value={z.beginn}
                          onChange={e => aendern(z.schluessel, { beginn: e.target.value })}
                          aria-invalid={!!fe('beginn') || undefined}
                          className={eingabeKlasse}
                        />
                      </Feld>
                      <Feld label="Ende" htmlFor={`${k}-ende`} fehler={fe('ende')} className="col-span-1 md:col-span-2">
                        <input
                          id={`${k}-ende`}
                          type="time"
                          value={z.ende}
                          onChange={e => aendern(z.schluessel, { ende: e.target.value })}
                          aria-invalid={!!fe('ende') || undefined}
                          className={eingabeKlasse}
                        />
                      </Feld>
                      <Feld label="Ort" htmlFor={`${k}-ort`} className="col-span-2 md:col-span-5">
                        <input
                          id={`${k}-ort`}
                          value={z.ort}
                          onChange={e => aendern(z.schluessel, { ort: e.target.value })}
                          placeholder="z. B. Turnhalle …"
                          maxLength={100}
                          className={eingabeKlasse}
                          autoComplete="off"
                        />
                      </Feld>
                      <Feld label="Saison" htmlFor={`${k}-saison`} className="col-span-2 sm:col-span-1 md:col-span-3">
                        <select id={`${k}-saison`} value={z.saison} onChange={e => aendern(z.schluessel, { saison: e.target.value })} className={auswahlKlasse}>
                          {SAISONS.map(s => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </Feld>
                      <Feld label="Rhythmus" htmlFor={`${k}-rhythmus`} className="col-span-2 sm:col-span-1 md:col-span-3">
                        <select id={`${k}-rhythmus`} value={z.rhythmus} onChange={e => aendern(z.schluessel, { rhythmus: e.target.value })} className={auswahlKlasse}>
                          {RHYTHMEN.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </Feld>
                      <Feld label="Hinweis (optional)" htmlFor={`${k}-hinweis`} className="col-span-2 md:col-span-6">
                        <input
                          id={`${k}-hinweis`}
                          value={z.hinweis}
                          onChange={e => aendern(z.schluessel, { hinweis: e.target.value })}
                          placeholder="z. B. „ab Februar“ oder „nur Torhüter“"
                          maxLength={200}
                          className={eingabeKlasse}
                        />
                      </Feld>
                    </div>
                  </fieldset>
                )
              })}
            </div>
          )}
          <button type="button" onClick={hinzufuegen} className={`${knopfKlassen.sekundaer} w-full py-3 sm:w-auto`}>
            <Plus size={16} /> Trainingszeit hinzufügen
          </button>
          {/* Wie die echte Speicherleiste: Eine Erfolgsmeldung verschwindet, sobald wieder etwas geändert wird */}
          <UebungsLeiste geaendert={geaendert} meldung={meldung?.art === 'erfolg' && geaendert ? null : meldung} />
        </Karte>
      </form>
    </Spielwiese>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Wer hat das geändert?',
    aufgabe: (
      <>
        Eltern der U13 wundern sich: Das Training am Dienstag beginnt plötzlich später. Finde heraus, <strong>wer gestern (<Gestern />)</strong> die
        Trainingszeiten der U13 geändert hat – und <strong>wann das Training vorher begann</strong>. Tipp: Zeilen mit Pfeil lassen sich antippen.
      </>
    ),
    Inhalt: props => (
      <LesenUndAntworten
        {...props}
        fragen={[
          {
            frage: 'Wer hat gestern die Trainingszeiten der U13 geändert?',
            antworten: [
              {
                text: 'Anna Beispiel',
                erklaerung:
                  'Anna Beispiel hat gestern Abend nur die Beschreibung der U13 geändert – in ihrem Eintrag steht nur „team“, nicht „Trainingszeiten“. Schau dir die andere U13-Zeile von gestern an.',
              },
              { text: 'Jonas Muster', richtig: true },
              {
                text: 'Mira Probe',
                erklaerung: 'Mira Probe hat sich gestern nur angemeldet und einen Termin angelegt. Gesucht ist eine Zeile „Mannschaften: Fußball · U13“ von gestern.',
              },
            ],
          },
          {
            frage: 'Wann begann das Training am Dienstag vorher?',
            antworten: [
              {
                text: '16:30 Uhr',
                erklaerung:
                  '16:30 Uhr steht bei „Wochentag: 4“ – das ist der Donnerstag. Der Dienstag ist „Wochentag: 2“: Lies dort im roten Kasten „Vorher“ ab, was unter „Beginn“ steht.',
              },
              { text: '17:00 Uhr', richtig: true },
              { text: '18:00 Uhr', erklaerung: '18:00 Uhr ist die neue Zeit – sie steht im grünen Kasten „Nachher“. Die alte steht im roten Kasten „Vorher“.' },
            ],
          },
        ]}
        erfolg="Stimmt: Jonas Muster hat gestern um 21:37 Uhr das Dienstagstraining von 17:00–18:30 auf 18:00–19:30 Uhr verschoben."
      />
    ),
    danach:
      'Aufgeklappt zeigt ein Eintrag nur die Felder, die sich geändert haben: rot vorher, grün nachher. Bei Mannschaften steht unter „Trainingszeiten“ die ganze Liste – vergleiche sie Zeile für Zeile. Der Wochentag steht als Zahl da: 1 ist Montag, 2 Dienstag und so weiter.',
  },
  {
    titel: 'Nur Personen anzeigen',
    aufgabe: (
      <>
        Du willst nur sehen, was an <strong>Personen</strong> geändert wurde – egal von wem. Stell den Filter passend ein und tippe auf „Anzeigen“.
      </>
    ),
    Inhalt: NurPersonen,
    danach:
      'Mit „Zurücksetzen“ siehst du wieder alles. Unter „Wer“ wählst du einen bestimmten Zugang – Änderungen von Zugängen, die es nicht mehr gibt, stehen bei „System / gelöschte Zugänge“. Einen Filter nach Datum gibt es nicht; bei mehr als 50 Einträgen blätterst du mit „Ältere“.',
  },
  {
    titel: 'Was wurde gelöscht?',
    aufgabe: (
      <>
        Vorgestern wurde <strong>Paul Platzhalter</strong> aus Versehen gelöscht. Bevor ihn jemand neu anlegt: Finde heraus, welche Telefonnummer er hatte
        und wo er eingetragen war. Tipp: Mit dem Filter „Personen“ geht es schneller.
      </>
    ),
    Inhalt: props => (
      <LesenUndAntworten
        {...props}
        fragen={[
          {
            frage: 'Welche Telefonnummer hatte Paul Platzhalter?',
            antworten: [
              { text: '0171 2345678', richtig: true },
              { text: '0151 98765432', erklaerung: 'Das ist die neue Nummer von Tom Test. Gesucht ist die Zeile „gelöscht“ bei „Personen: Paul Platzhalter“.' },
              {
                text: '0170 1234567',
                erklaerung: 'Das ist die Nummer von Lena Beispiel, die neu angelegt wurde („Angelegt mit“). Pauls Daten stehen im Kasten „Vor dem Löschen“.',
              },
            ],
          },
          {
            frage: 'Wo war Paul eingetragen?',
            antworten: [
              { text: 'Trainer:in bei U13 (Fußball)', erklaerung: 'Tippe Pauls Zeile an. Wo er eingetragen war, steht ganz unten bei „verwendung“.' },
              { text: 'Co-Trainer:in bei U12 (Fußball)', richtig: true },
              { text: 'Nirgends – nur in der Personenliste', erklaerung: 'Tippe Pauls Zeile an. Wo er eingetragen war, steht ganz unten bei „verwendung“.' },
            ],
          },
        ]}
        erfolg="Stimmt. Damit legst du Paul unter „Personen“ neu an und trägst ihn im Trainerteam der U12 wieder als Co-Trainer:in ein."
      />
    ),
    danach:
      'Bei „Foto“ steht nur ein Dateiname. Das Bild selbst lässt sich aus dem Verlauf nicht zurückholen – das müsstest du noch einmal hochladen.',
  },
  {
    titel: 'Gibt es „Rückgängig“?',
    aufgabe: 'Eine kurze Frage, bevor du es selbst ausprobierst.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Jemand hat eine Trainingszeit falsch geändert. Wie holst du den alten Stand zurück?"
        antworten={[
          {
            text: 'Im Verlauf beim Eintrag auf „Wiederherstellen“ tippen',
            erklaerung: 'Einen solchen Knopf gibt es nicht. Der Verlauf zeigt den alten Stand nur an.',
          },
          { text: 'Unter „Vorher“ ablesen, an der gewohnten Stelle wieder eintragen und speichern', richtig: true },
          {
            text: 'Den Eintrag im Verlauf löschen',
            erklaerung: 'Einträge im Verlauf lassen sich weder ändern noch löschen – und die Website bliebe trotzdem, wie sie ist.',
          },
        ]}
      />
    ),
    danach:
      'Schau vorher, ob jemand dasselbe danach noch einmal geändert hat – sonst überschreibst du auch diese Änderung. Gleich probierst du es aus.',
  },
  {
    titel: 'Den alten Stand zurückholen',
    aufgabe: (
      <>
        Jonas hat sich vertan: Am <strong>Dienstag</strong> soll wieder die alte Zeit gelten. Lies im Verlauf ab, wie sie vorher war, trag sie unten
        bei der U13 ein und speichere. Du bist als Anna Beispiel angemeldet.
      </>
    ),
    Inhalt: AltenStandZurueck,
    danach:
      'Genau so geht es in echt. Auch dein Speichern kommt in den Verlauf – ganz oben, mit deinem Namen. Annas neue Beschreibung von gestern Abend bleibt dabei erhalten, weil du nur die Zeit geändert hast.',
  },
]
