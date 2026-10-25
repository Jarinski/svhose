'use client'

/**
 * Übung "Mannschaft oder Gruppe anlegen" – Nachbau der Liste (app/verwaltung/(intern)/teams/TeamListe.tsx),
 * des Formulars "Neue Mannschaft" (teams/neu/TeamAnlegenFormular.tsx) und des Abschnitts "Allgemein"
 * samt Karte "Mannschaft löschen" (teams/[art]/[id]/TeamFormular.tsx, TeamLoeschen.tsx). Prüfungen und
 * Meldungen wie beim echten Anlegen und Speichern (lib/verwaltung/team-bearbeiten.ts), dazu eine
 * Vorschau der Spartenseite (app/sparten/[slug]/page.tsx).
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Clock, Plus, Search, Trash2 } from 'lucide-react'
import { passtZurSuche, suchtext } from '@/lib/verwaltung/suche'
import FotoFeld from '@/components/verwaltung/FotoFeld'
import { auswahlKlasse, Badge, eingabeKlasse, Feld, Karte, knopfKlassen, LeerHinweis, Meldung } from '@/components/verwaltung/ui'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

const BEREICHE = ['Herren', 'Damen', 'Junioren', 'Juniorinnen', 'Senioren', 'Freizeit']
const BEREICH_TITEL: Record<string, string> = { Freizeit: 'Freizeit / Hobby' }
const FARBE = '#16a34a'

interface Team {
  id: number
  art: 'mannschaft' | 'gruppe'
  name: string
  bereich: string
  altersklasse: string
  beschreibung: string
  sichtbar: boolean
  reihenfolge: number
  zeiten: number
  /** Gespeichertes Foto – in der Übung eine Adresse, die nur in deinem Browser gilt */
  foto?: string | null
}

function team(t: Partial<Team> & Pick<Team, 'id' | 'name'>): Team {
  return { art: 'mannschaft', bereich: '', altersklasse: '', beschreibung: '', sichtbar: true, reihenfolge: 0, zeiten: 0, ...t }
}

/* Erfundene Sparte Fußball – Reihenfolge in Zehnerschritten */
const FUSSBALL: Team[] = [
  team({ id: 1, name: 'Herren', bereich: 'Herren', reihenfolge: 10, zeiten: 3 }),
  team({ id: 2, name: 'U13', bereich: 'Junioren', altersklasse: 'Jg. 2013', reihenfolge: 20, zeiten: 2 }),
  team({ id: 3, name: 'U15', bereich: 'Junioren', altersklasse: 'Jg. 2011', reihenfolge: 30, zeiten: 2 }),
  team({ id: 4, art: 'gruppe', name: 'Fußball-Minis', altersklasse: '4–6 Jahre', zeiten: 1 }),
]
const U14 = team({
  id: 5,
  name: 'U14',
  bereich: 'Junioren',
  altersklasse: 'Jg. 2012',
  beschreibung: 'Neu in dieser Saison – Interessierte sind jederzeit willkommen.',
  reihenfolge: 31,
  zeiten: 2,
})

/** Wie auf der Website: Reihenfolge, bei gleicher Zahl der Name. */
const sortieren = (teams: Team[]) => teams.slice().sort((a, b) => a.reihenfolge - b.reihenfolge || a.name.localeCompare(b.name, 'de'))

function fehlerMeldung(felder: Record<string, string>): string {
  const meldungen = Object.values(felder)
  const weitere = meldungen.length - 1
  return `Noch nicht gespeichert. ${meldungen[0]}${weitere > 0 ? ` (dazu ${weitere} weitere Stelle${weitere === 1 ? '' : 'n'}, rot markiert)` : ''}`
}

/** Gibt es in der Sparte schon eine Mannschaft mit diesem Namen (ohne Groß-/Kleinschreibung)? */
function nameVergeben(teams: Team[], name: string, ausserId: number | null): boolean {
  const gesucht = name.trim().toLowerCase()
  return teams.some(t => t.art === 'mannschaft' && t.id !== ausserId && t.name.trim().toLowerCase() === gesucht)
}

const nameVergebenMeldung = (name: string) => `In dieser Sparte gibt es schon eine Mannschaft „${name}“. Bitte einen anderen Namen wählen.`

/* ── Vorschau: die Spartenseite ───────────────────────────────────────────── */

function Abschnittskopf({ titel, anzahl }: { titel: string; anzahl: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: FARBE }} />
      <div className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: FARBE }}>
        {titel}
      </div>
      <div className="h-px flex-1" style={{ background: `${FARBE}25` }} />
      <div className="shrink-0 text-[11px] text-[#6b6b6b]">{anzahl}</div>
    </div>
  )
}

function TeamKarte({ t }: { t: Team }) {
  return (
    <div className="overflow-hidden border border-[#0a0a0a]/[0.08] bg-[#fafaf8]">
      <div className="flex gap-4 p-4">
        <div className="flex aspect-[16/10] w-20 shrink-0 items-center justify-center self-start overflow-hidden text-xl sm:w-32" style={{ background: `${FARBE}12` }}>
          {t.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.foto} alt={t.name} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">⚽</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <div className="text-base font-medium leading-tight">{t.name}</div>
            {t.zeiten > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px]" style={{ background: `${FARBE}18`, color: FARBE }}>
                <Clock size={8} className="shrink-0" aria-hidden="true" />
                {t.zeiten} Trainingszeit{t.zeiten !== 1 ? 'en' : ''}
              </span>
            )}
          </div>
          {t.beschreibung && <p className="whitespace-pre-line text-sm leading-relaxed text-[#6b6b6b]">{t.beschreibung}</p>}
          {(t.bereich || t.altersklasse) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[t.bereich, t.altersklasse].filter(Boolean).map(x => (
                <span key={x} className="bg-[#0a0a0a]/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b]">
                  {x}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WebsiteSparte({ teams }: { teams: Team[] }) {
  const sichtbar = sortieren(teams.filter(t => t.sichtbar))
  const mannschaften = sichtbar.filter(t => t.art === 'mannschaft')
  const gruppen = sichtbar.filter(t => t.art === 'gruppe')
  const abschnitte = [
    ...BEREICHE.map(b => ({ titel: BEREICH_TITEL[b] ?? b, teams: mannschaften.filter(m => m.bereich === b) })),
    { titel: 'Weitere Mannschaften', teams: mannschaften.filter(m => BEREICHE.indexOf(m.bereich) < 0) },
  ].filter(a => a.teams.length > 0)

  return (
    <Vorschau adresse="/sparten/fussball">
      <div className="space-y-8">
        {mannschaften.length > 0 && (
          <section>
            <Abschnittskopf titel="Mannschaften" anzahl={mannschaften.length} />
            <div className="mt-5 space-y-6">
              {abschnitte.map(a => (
                <div key={a.titel}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="text-sm font-medium uppercase tracking-[0.18em]" style={{ color: FARBE }}>
                      {a.titel}
                    </div>
                    <div className="h-px flex-1" style={{ background: `${FARBE}20` }} />
                    <span className="shrink-0 text-[11px] text-[#6b6b6b]">{a.teams.length}</span>
                  </div>
                  <div className="space-y-3">
                    {a.teams.map(t => (
                      <TeamKarte key={t.id} t={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {gruppen.length > 0 && (
          <section>
            <Abschnittskopf titel="Gruppen" anzahl={gruppen.length} />
            <div className="mt-5 space-y-3">
              {gruppen.map(t => (
                <TeamKarte key={t.id} t={t} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Vorschau>
  )
}

/* ── Lektion 2: Nachbau der Liste "Mannschaften & Gruppen" ─────────────────── */

/** Erfundene Trainerteams – die Suche findet sie wie in echt auch über deren Namen. */
const TRAINER: Record<number, string[]> = {
  1: ['Tom Beispiel'],
  2: ['Anna Beispiel', 'Björn Muster', 'Mira Probe'],
  3: ['Lukas Muster'],
  4: ['Paula Probe'],
  11: ['Karla Probe'],
  12: [],
}

const LISTE: { sparte: string; teams: (Team & { trainer: string[] })[] }[] = [
  {
    sparte: 'Fußball',
    teams: sortieren(FUSSBALL.filter(t => t.art === 'mannschaft'))
      .concat(FUSSBALL.filter(t => t.art === 'gruppe'))
      .map(t => ({ ...t, trainer: TRAINER[t.id] })),
  },
  {
    sparte: 'Turnen',
    teams: [
      team({ id: 11, art: 'gruppe', name: 'Kinderturnen 3–5 Jahre', zeiten: 1 }),
      team({ id: 12, art: 'gruppe', name: 'Eltern-Kind-Turnen', sichtbar: false }),
    ].map(t => ({ ...t, trainer: TRAINER[t.id] })),
  },
]

function KnopfFinden({ geloest, istGeloest }: LektionProps) {
  const [suche, setSuche] = useState('')
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [offen, setOffen] = useState(istGeloest)
  const sucht = suche.trim() !== ''
  // Wie teams/page.tsx: Name, Sparte, Altersklasse und die Namen aus dem Trainerteam
  const gefiltert = LISTE.map(s => ({
    ...s,
    teams: s.teams.filter(t => passtZurSuche(suchtext(t.name, s.sparte, t.altersklasse, ...t.trainer), suche)),
  })).filter(s => !sucht || s.teams.length > 0)

  function anlegen(sparte: string, art: 'mannschaft' | 'gruppe') {
    if (sparte === 'Fußball' && art === 'mannschaft') {
      setHinweis(null)
      setOffen(true)
      geloest()
    } else if (sparte !== 'Fußball') setHinweis(`Das ist die Sparte ${sparte}. Die U14 gehört zum Fußball.`)
    else setHinweis('Gruppen sind Trainings- und Kursgruppen ohne Ligabetrieb. Die U14 spielt in der Liga – also eine Mannschaft.')
  }

  return (
    <Spielwiese>
      <div className="mb-4">
        <h3 className="font-display text-3xl leading-none tracking-tight">Mannschaften &amp; Gruppen</h3>
        <p className="mt-1.5 text-sm text-[#6b6b6b]">Alles, was du bearbeiten darfst. Tippe auf einen Eintrag, um ihn zu ändern.</p>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <label htmlFor="uebung-team-suche" className="sr-only">
            Mannschaft oder Gruppe suchen
          </label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" aria-hidden="true" />
          <input
            id="uebung-team-suche"
            type="search"
            value={suche}
            onChange={e => setSuche(e.target.value)}
            placeholder="Suchen: Name, Sparte, Jahrgang oder Trainer:in …"
            className={`${eingabeKlasse} py-3 pl-9`}
            autoComplete="off"
          />
        </div>

        {gefiltert.length === 0 && (
          <Karte>
            <LeerHinweis>Nichts gefunden für „{suche.trim()}“.</LeerHinweis>
          </Karte>
        )}

        {gefiltert.map(s => (
          <Karte key={s.sparte} titel={s.sparte}>
            <ul className="-mx-1 divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
              {s.teams.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setHinweis(`Das öffnet „${t.name}“ zum Bearbeiten. Gesucht ist der Knopf zum Anlegen – unter der Liste der Sparte.`)}
                    className="flex min-h-[3.25rem] w-full items-center gap-3 px-1 py-3 text-left hover:bg-[#0a0a0a]/[0.03]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{t.name}</span>
                      <span className="ml-2 text-xs text-[#6b6b6b]">
                        {t.art === 'mannschaft' ? 'Mannschaft' : 'Gruppe'}
                        {t.altersklasse ? ` · ${t.altersklasse}` : ''}
                      </span>
                      {(!t.sichtbar || t.trainer.length === 0 || t.zeiten === 0) && (
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {!t.sichtbar && <Badge>ausgeblendet</Badge>}
                          {t.trainer.length === 0 && <Badge ton="warnung">kein Trainerteam</Badge>}
                          {t.zeiten === 0 && <Badge ton="warnung">keine Trainingszeit</Badge>}
                        </span>
                      )}
                    </span>
                    <span className="hidden text-xs tabular-nums text-[#6b6b6b] sm:inline">
                      {t.zeiten > 0 && `${t.zeiten} Trainingszeit${t.zeiten === 1 ? '' : 'en'}`}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-[#6b6b6b]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            {/* Wie in echt: Solange im Suchfeld etwas steht, sind die Knöpfe ausgeblendet */}
            {!sucht && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => anlegen(s.sparte, 'mannschaft')}
                  aria-label={`Neue Mannschaft in ${s.sparte} anlegen`}
                  className={`${knopfKlassen.sekundaer} flex-1 px-3 sm:flex-none`}
                >
                  <Plus size={15} /> <span className="hidden sm:inline">Neue</span> Mannschaft
                </button>
                <button
                  type="button"
                  onClick={() => anlegen(s.sparte, 'gruppe')}
                  aria-label={`Neue Gruppe in ${s.sparte} anlegen`}
                  className={`${knopfKlassen.sekundaer} flex-1 px-3 sm:flex-none`}
                >
                  <Plus size={15} /> <span className="hidden sm:inline">Neue</span> Gruppe
                </button>
              </div>
            )}
          </Karte>
        ))}
      </div>
      {hinweis && <p className="mt-3 text-sm text-amber-800">{hinweis}</p>}
      {offen && <p className="mt-3 text-sm text-[#4a4a4a]">Das Formular „Neue Mannschaft“ öffnet sich – die Sparte Fußball ist schon eingetragen.</p>}
    </Spielwiese>
  )
}

/* ── Lektion 3: Nachbau "Neue Mannschaft" ─────────────────────────────────── */

function MannschaftAnlegen({ geloest }: LektionProps) {
  const [name, setName] = useState('')
  const [bereich, setBereich] = useState('')
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<string | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>(FUSSBALL)
  const [neu, setNeu] = useState<Team | null>(null)

  // Dieselben Prüfungen und Texte wie teamAnlegen
  function anlegen(e: React.FormEvent) {
    e.preventDefault()
    setHinweis(null)
    const n = name.trim()
    const felder: Record<string, string> = {}
    if (!n) felder.name = 'Bitte einen Namen eintragen.'
    else if (n.length > 80) felder.name = 'Der Name ist zu lang (höchstens 80 Zeichen).'
    if (bereich && BEREICHE.indexOf(bereich) < 0) felder.bereich = 'Bitte einen Bereich aus der Liste wählen.'
    if (Object.keys(felder).length) {
      setFehler(felder)
      setMeldung(fehlerMeldung(felder))
      return
    }
    if (nameVergeben(teams, n, null)) {
      const m = nameVergebenMeldung(n)
      setFehler({ name: m })
      setMeldung(m)
      return
    }
    setFehler({})
    setMeldung(null)
    if (n.toLowerCase() !== 'u14') {
      setHinweis('Als Name bitte „U14“ eintragen.')
      return
    }
    if (bereich !== 'Junioren') {
      setHinweis('Wähle als Bereich „Junioren“ – dann steht die U14 auf der Website bei den Junioren.')
      return
    }
    // Neue Teams kommen ans Ende der Sparte: nächsthöhere Reihenfolge
    const reihenfolge = teams.filter(t => t.art === 'mannschaft').reduce((max, t) => Math.max(max, t.reihenfolge + 1), 0)
    const angelegt = team({ id: 5, name: n, bereich, reihenfolge })
    setTeams(ts => ts.concat(angelegt))
    setNeu(angelegt)
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        <div className="mb-4">
          <h3 className="font-display text-3xl leading-none tracking-tight">Neue Mannschaft</h3>
          <p className="mt-1.5 text-sm text-[#6b6b6b]">Mannschaften spielen im Ligabetrieb, z. B. im Fußball oder Tischtennis.</p>
        </div>
        <Karte>
          {/* Wie in echt ohne noValidate: Ein leerer Name stoppt schon der Browser */}
          <form onSubmit={anlegen} className="max-w-xl space-y-5">
            <p className="text-sm">
              Sparte: <span className="font-medium">Fußball</span>
            </p>
            <Feld label="Name" htmlFor="uebung-neu-name" fehler={fehler.name} hinweis="z. B. „U13“, „Herren“ oder „2. Damen“">
              <input
                id="uebung-neu-name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={80}
                aria-invalid={!!fehler.name || undefined}
                className={eingabeKlasse}
                autoComplete="off"
              />
            </Feld>
            <Feld label="Bereich" htmlFor="uebung-neu-bereich" fehler={fehler.bereich} hinweis="Optional – ordnet die Mannschaft auf der Website ein.">
              <select id="uebung-neu-bereich" value={bereich} onChange={e => setBereich(e.target.value)} className={auswahlKlasse}>
                <option value="">– kein Bereich –</option>
                {BEREICHE.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Feld>
            <p className="text-sm text-[#6b6b6b]">Trainingszeiten, Trainerteam und Foto trägst du im nächsten Schritt ein.</p>
            {meldung && <Meldung art="fehler">{meldung}</Meldung>}
            {hinweis && <Meldung art="hinweis">In der Übung noch nicht ganz: {hinweis}</Meldung>}
            <button type="submit" className={`${knopfKlassen.primaer} w-full px-6 py-3 sm:w-auto`}>
              Mannschaft anlegen
            </button>
          </form>
        </Karte>
        {neu && (
          <p className="mt-3 text-sm text-[#4a4a4a]">
            Die Seite „{neu.name}“ öffnet sich – dort trägst du Trainingszeiten, Trainerteam und Foto ein. Eine eigene Erfolgsmeldung gibt es beim Anlegen nicht.
          </p>
        )}
      </Spielwiese>
      <WebsiteSparte teams={teams} />
    </div>
  )
}

/* ── Lektionen 4 und 5: Nachbau des Abschnitts "Allgemein" ─────────────────── */

interface Allgemein {
  name: string
  bereich: string
  altersklasse: string
  beschreibung: string
  sichtbar: boolean
  reihenfolge: string
}

const alsFormular = (t: Team): Allgemein => ({
  name: t.name,
  bereich: t.bereich,
  altersklasse: t.altersklasse,
  beschreibung: t.beschreibung,
  sichtbar: t.sichtbar,
  reihenfolge: String(t.reihenfolge),
})

/** Ganzzahl wie ganzzahlWert: null bei leer, false bei ungültig. */
function ganzzahl(wert: string): number | null | false {
  if (wert === '') return null
  const n = Number(wert.trim())
  return Number.isInteger(n) ? n : false
}

/** Dieselben Prüfungen und Texte wie teamEingabePruefen (Teil Allgemein). */
function pruefen(f: Allgemein): Record<string, string> {
  const felder: Record<string, string> = {}
  const name = f.name.trim()
  if (!name) felder.name = 'Bitte einen Namen eintragen.'
  else if (name.length > 80) felder.name = 'Der Name ist zu lang (höchstens 80 Zeichen).'
  if (f.altersklasse.trim().length > 60) felder.altersklasse = 'Die Altersklasse ist zu lang (höchstens 60 Zeichen).'
  if (f.beschreibung.trim().length > 5000) felder.beschreibung = 'Die Beschreibung ist zu lang (höchstens 5000 Zeichen).'
  const r = ganzzahl(f.reihenfolge)
  if (r === false || (r !== null && (r < 0 || r > 9999))) felder.reihenfolge = 'Die Reihenfolge muss eine ganze Zahl zwischen 0 und 9999 sein.'
  return felder
}

/** Was nach dem Speichern in der Datenbank stünde. */
function alsTeam(f: Allgemein, alt: Team): Team {
  const r = ganzzahl(f.reihenfolge)
  return {
    ...alt,
    name: f.name.trim(),
    bereich: f.bereich,
    altersklasse: f.altersklasse.trim(),
    beschreibung: f.beschreibung.trim(),
    sichtbar: f.sichtbar,
    reihenfolge: typeof r === 'number' ? r : 0,
  }
}

function AllgemeinUebung({
  start,
  aufgabe,
  loeschHinweis,
  geloest,
}: {
  start: Team
  /** `roh` ist das Formular, wie es abgeschickt wurde – z. B. um eine leere Reihenfolge von 0 zu unterscheiden. */
  aufgabe: (t: Team, roh: Allgemein) => string | null
  loeschHinweis: string
} & LektionProps) {
  const [gespeichert, setGespeichert] = useState<Team>(start)
  const [f, setF] = useState<Allgemein>(() => alsFormular(start))
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<{ art: 'erfolg' | 'fehler' | 'hinweis'; text: string } | null>(null)
  // Zweite, gelbe Meldung unter der echten: was in der Übung noch fehlt
  const [zusatz, setZusatz] = useState<string | null>(null)
  const [loeschen, setLoeschen] = useState(false)
  // Wie im echten Formular zählt ein neu gewähltes oder entferntes Foto als Änderung
  const [fotoGeaendert, setFotoGeaendert] = useState(false)
  const [fotoStand, setFotoStand] = useState(0)
  const fotoAdressen = useRef<string[]>([])
  const geaendert = fotoGeaendert || JSON.stringify(f) !== JSON.stringify(alsFormular(gespeichert))
  const setze = <K extends keyof Allgemein>(feld: K, wert: Allgemein[K]) => setF(alt => ({ ...alt, [feld]: wert }))

  // Gespeicherte Übungsfotos beim Verlassen der Lektion wieder freigeben
  useEffect(() => {
    const adressen = fotoAdressen.current
    return () => adressen.forEach(a => URL.revokeObjectURL(a))
  }, [])

  function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoeschen(false)
    setZusatz(null)
    // Das Foto steckt wie in echt im Formular (Feld "foto" bzw. "fotoEntfernen")
    const daten = new FormData(e.currentTarget)
    const datei = daten.get('foto')
    const neueDatei = datei instanceof File && datei.size > 0 ? datei : null
    const fotoEntfernen = daten.get('fotoEntfernen') === '1'
    const felder = pruefen(f)
    if (Object.keys(felder).length) {
      setFehler(felder)
      setMeldung({ art: 'fehler', text: fehlerMeldung(felder) })
      return
    }
    if (nameVergeben(FUSSBALL, f.name, start.id)) {
      const m = nameVergebenMeldung(f.name.trim())
      setFehler({ name: m })
      setMeldung({ art: 'fehler', text: `Noch nicht gespeichert. ${m}` })
      return
    }
    setFehler({})
    const neu = alsTeam(f, gespeichert)
    const hinweis = aufgabe(neu, f)
    if (JSON.stringify(neu) === JSON.stringify(gespeichert) && !neueDatei && !fotoEntfernen) {
      // Echte Meldung unverändert – was in der Übung noch fehlt, steht extra darunter
      setMeldung({ art: 'erfolg', text: 'Alles schon gespeichert – es gab keine Änderungen.' })
      if (hinweis) setZusatz(`In der Übung noch nicht ganz: ${hinweis}`)
      return
    }
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    if (neueDatei) {
      neu.foto = URL.createObjectURL(neueDatei)
      fotoAdressen.current.push(neu.foto)
    } else if (fotoEntfernen) neu.foto = null
    setGespeichert(neu)
    setF(alsFormular(neu))
    // Wie nach dem Neuladen: Das Foto-Feld zeigt jetzt das gespeicherte Foto
    if (neueDatei || fotoEntfernen) setFotoStand(s => s + 1)
    setMeldung({
      art: 'erfolg',
      text: neu.sichtbar ? 'Gespeichert – ist jetzt auf der Website sichtbar.' : 'Gespeichert. Hinweis: Die Mannschaft ist zurzeit auf der Website ausgeblendet.',
    })
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        <div className="mb-4">
          <h3 className="font-display text-3xl leading-none tracking-tight">{gespeichert.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[#6b6b6b]">
            <span>Mannschaft · Sparte Fußball</span>
            {!gespeichert.sichtbar && <Badge>auf der Website ausgeblendet</Badge>}
          </div>
        </div>
        <form onSubmit={speichern} noValidate>
          <Karte titel="Allgemein">
            <div className="grid gap-5 md:grid-cols-2">
              <Feld label="Name" htmlFor="uebung-name" fehler={fehler.name} className="md:col-span-2">
                <input
                  id="uebung-name"
                  value={f.name}
                  onChange={e => setze('name', e.target.value)}
                  maxLength={80}
                  required
                  aria-invalid={!!fehler.name || undefined}
                  className={eingabeKlasse}
                />
              </Feld>
              <Feld label="Bereich" htmlFor="uebung-bereich" hinweis="Ordnet die Mannschaft auf der Website ein.">
                <select id="uebung-bereich" value={f.bereich} onChange={e => setze('bereich', e.target.value)} className={auswahlKlasse}>
                  <option value="">– kein Bereich –</option>
                  {BEREICHE.map(b => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Feld>
              <Feld label="Altersklasse / Jahrgang" htmlFor="uebung-altersklasse" fehler={fehler.altersklasse} hinweis="z. B. „Jg. 2013“ – optional">
                <input
                  id="uebung-altersklasse"
                  value={f.altersklasse}
                  onChange={e => setze('altersklasse', e.target.value)}
                  maxLength={60}
                  aria-invalid={!!fehler.altersklasse || undefined}
                  className={eingabeKlasse}
                />
              </Feld>
              <Feld label="Beschreibung" htmlFor="uebung-beschreibung" fehler={fehler.beschreibung} hinweis="Erscheint auf der Website. Optional." className="md:col-span-2">
                <textarea
                  id="uebung-beschreibung"
                  value={f.beschreibung}
                  onChange={e => setze('beschreibung', e.target.value)}
                  rows={5}
                  maxLength={5000}
                  aria-invalid={!!fehler.beschreibung || undefined}
                  className={`${eingabeKlasse} leading-relaxed`}
                />
              </Feld>
              <div className="md:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Foto</span>
                {/* Das echte Foto-Feld – das Bild bleibt nur in deinem Browser, hochgeladen wird nichts */}
                <FotoFeld key={fotoStand} aktuell={gespeichert.foto ?? null} onAenderung={setFotoGeaendert} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-[#0a0a0a]/15 p-4 hover:border-[#0a0a0a]/40 md:col-span-2">
                <input
                  type="checkbox"
                  checked={f.sichtbar}
                  onChange={e => setze('sichtbar', e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#0a0a0a]"
                />
                <span>
                  <span className="block font-medium">Auf der Website anzeigen</span>
                  <span className="mt-0.5 block text-sm text-[#6b6b6b]">Ohne Haken bleibt alles gespeichert, die Mannschaft ist aber auf der Website nicht zu sehen.</span>
                </span>
              </label>
              <Feld label="Reihenfolge (optional)" htmlFor="uebung-reihenfolge" fehler={fehler.reihenfolge} hinweis="Kleinere Zahlen stehen auf der Website weiter oben.">
                <input
                  id="uebung-reihenfolge"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={9999}
                  step={1}
                  value={f.reihenfolge}
                  onChange={e => setze('reihenfolge', e.target.value)}
                  aria-invalid={!!fehler.reihenfolge || undefined}
                  className={`${eingabeKlasse} max-w-[8rem]`}
                />
              </Feld>
            </div>
            <UebungsLeiste geaendert={geaendert} meldung={meldung} />
            {zusatz && (
              <div className="mt-3">
                <Meldung art="hinweis">{zusatz}</Meldung>
              </div>
            )}
          </Karte>
        </form>

        {/* Nachbau der Karte "Mannschaft löschen" – hier wird natürlich nichts gelöscht */}
        <Karte titel="Mannschaft löschen" className="mt-5">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-[#4a4a4a]">
              <strong className="font-medium text-[#0a0a0a]">Lieber ausblenden statt löschen:</strong> Nimm oben den Haken bei „Auf der Website
              anzeigen“ raus und speichere – dann bleiben Trainingszeiten und Trainerteam erhalten und die Mannschaft lässt sich später wieder
              einblenden.
            </p>
            <p className="text-sm leading-relaxed text-[#6b6b6b]">
              Beim Löschen verschwinden die Mannschaft und ihre Trainingszeiten endgültig. Die Personen im Trainerteam bleiben erhalten.
            </p>
            {loeschen && (
              <Meldung art="hinweis">
                In echt fragt die Verwaltung jetzt: „Mannschaft „{gespeichert.name}“ mit allen Trainingszeiten wirklich löschen? Das lässt sich nicht
                rückgängig machen.“ {loeschHinweis}
              </Meldung>
            )}
            <button type="button" onClick={() => setLoeschen(true)} className={`${knopfKlassen.gefahr} w-full py-3 sm:w-auto`}>
              <Trash2 size={15} /> Mannschaft löschen
            </button>
          </div>
        </Karte>
      </Spielwiese>
      <WebsiteSparte teams={FUSSBALL.concat(gespeichert)} />
    </div>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Mannschaft oder Gruppe?',
    aufgabe: 'Bevor du etwas anlegst, kurz überlegen: Was passt?',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Im Verein startet der neue Kurs „Yoga am Abend“. In einer Liga wird nicht gespielt. Was legst du an?"
        antworten={[
          {
            text: 'Eine Mannschaft',
            erklaerung: 'Mannschaften spielen im Ligabetrieb, z. B. im Fußball oder Tischtennis. Ein Kurs ohne Liga ist eine Gruppe.',
          },
          { text: 'Eine Gruppe', richtig: true },
          {
            text: 'Egal – das lässt sich später umstellen',
            erklaerung: 'Leider nein: Die Art lässt sich später nicht mehr ändern. Überleg also vorher kurz.',
          },
        ]}
      />
    ),
    danach:
      'Gruppen sind Trainings- und Kursgruppen ohne Ligabetrieb. Sonst funktionieren beide gleich – nur Mannschaften haben zusätzlich das Feld „Bereich“.',
  },
  {
    titel: 'Den Knopf finden',
    aufgabe: (
      <>
        Die Sparte Fußball bekommt eine neue <strong>U14</strong>, die im Ligabetrieb spielt. Tippe auf den passenden Knopf zum Anlegen. Tipp:
        Solange im Suchfeld etwas steht, sind die Knöpfe ausgeblendet.
      </>
    ),
    Inhalt: KnopfFinden,
    danach:
      'Anlegen dürfen nur die Spartenleitung (in der eigenen Sparte) und Admins. Auf dem Handy heißen die Knöpfe nur „Mannschaft“ und „Gruppe“.',
  },
  {
    titel: 'Die Mannschaft anlegen',
    aufgabe: (
      <>
        Leg die <strong>U14</strong> mit dem Bereich <strong>Junioren</strong> an. Neugierig? Probier vorher den Namen „u13“ – den gibt es schon.
      </>
    ),
    Inhalt: MannschaftAnlegen,
    danach: (
      <>
        Die U14 steht sofort auf der Website – erst einmal nur mit ihrem Namen und ganz am Ende der Junioren. Willst du sie erst fertig machen,
        blende sie so lange aus. Wie das geht, kommt in der nächsten Lektion.
      </>
    ),
  },
  {
    titel: 'Ausblenden statt löschen',
    aufgabe: (
      <>
        Der U14 fehlt gerade ein Trainer – sie pausiert bis zum Sommer. Sorg dafür, dass sie <strong>nicht mehr auf der Website</strong> steht.
        Trainingszeiten und Trainerteam sollen aber erhalten bleiben.
      </>
    ),
    Inhalt: props => (
      <AllgemeinUebung
        {...props}
        start={U14}
        loeschHinweis="Für eine Pause ist das zu viel: Die U14 und ihre Trainingszeiten wären endgültig weg. Nimm lieber oben den Haken bei „Auf der Website anzeigen“ raus und speichere."
        aufgabe={t => (t.sichtbar ? 'Die U14 steht noch auf der Website. Nimm den Haken bei „Auf der Website anzeigen“ raus.' : null)}
      />
    ),
    danach: (
      <>
        Alles bleibt gespeichert – Trainingszeiten, Trainerteam und Foto. Auf der Website ist die U14 aber weg, auch auf der Seite Trainingszeiten.
        In der Liste steht „ausgeblendet“ dabei. Zum Einblenden setzt du den Haken wieder. Löschen lässt sich dagegen nicht rückgängig machen.
      </>
    ),
  },
  {
    titel: 'Die Reihenfolge festlegen',
    aufgabe: (
      <>
        Die U14 steht bei den Junioren ganz unten, hinter der U15. Sie soll <strong>zwischen U13 (Reihenfolge 20) und U15 (Reihenfolge 30)</strong>{' '}
        stehen. Trag eine passende Zahl ein und speichere.
      </>
    ),
    Inhalt: props => (
      <AllgemeinUebung
        {...props}
        start={U14}
        loeschHinweis="Hier geht es nur um die Reihenfolge – gelöscht wird nichts."
        aufgabe={(t, roh) => {
          if (!t.sichtbar) return 'Die U14 soll sichtbar bleiben. Setz den Haken bei „Auf der Website anzeigen“ wieder.'
          if (t.bereich !== 'Junioren') return 'Lass den Bereich auf „Junioren“ – sonst steht die U14 in einem anderen Abschnitt.'
          const junioren = sortieren(FUSSBALL.concat(t).filter(x => x.bereich === 'Junioren')).map(x => x.id)
          if (junioren.join() === '2,5,3') return null
          if (roh.reihenfolge.trim() === '') return 'Ein leeres Feld zählt wie 0 – dann rutscht die U14 ganz nach oben. Nimm eine Zahl zwischen 20 und 30, z. B. 25.'
          if (junioren[0] === t.id) return `Mit ${t.reihenfolge} steht die U14 noch vor der U13 (20). Nimm eine Zahl zwischen 20 und 30, z. B. 25.`
          return `Mit ${t.reihenfolge} steht die U14 noch hinter der U15 (30). Nimm eine Zahl zwischen 20 und 30, z. B. 25.`
        }}
      />
    ),
    danach: (
      <>
        Kleinere Zahlen stehen weiter oben, bei gleicher Zahl entscheidet der Name. Nummerier am besten in Zehnerschritten (10, 20, 30 …) – dann passt
        später immer noch eine Mannschaft dazwischen. Die Zahl wirkt auch auf der Seite Trainingszeiten und in deiner Liste.
      </>
    ),
  },
  {
    titel: 'Wer darf was?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Wer darf eine Mannschaft oder Gruppe neu anlegen oder löschen?"
        antworten={[
          {
            text: 'Alle Trainer:innen der Mannschaft',
            erklaerung: 'Trainer:innen bearbeiten ihre Mannschaften und Gruppen – auch Name, Foto und „Auf der Website anzeigen“. Anlegen und löschen können sie nicht.',
          },
          {
            text: 'Alle mit einem Zugang zur Verwaltung',
            erklaerung: 'Nein – anlegen und löschen dürfen nur die Spartenleitung in ihrer Sparte und Admins.',
          },
          { text: 'Die Spartenleitung (in der eigenen Sparte) und Admins', richtig: true },
        ]}
      />
    ),
    danach:
      'Braucht ein Trainerteam eine neue Mannschaft, legt die Spartenleitung sie an. Sollen die Trainer:innen sie selbst pflegen, vergibt ein:e Admin unter „Zugänge“ das Recht dafür.',
  },
]
