'use client'

/**
 * Übung "Kontaktseite pflegen" – Nachbau von app/verwaltung/(intern)/kontakte/KontakteFormular.tsx
 * (drei Abschnitte, Personensuche, Reihenfolge, Speicherleiste) mit denselben Prüfungen und Meldungen
 * wie beim echten Speichern (kontakte/logik.ts, kontakte/aktionen.ts) und einer Vorschau von
 * /ansprechpartner (app/ansprechpartner/page.tsx).
 */

import { useMemo, useRef, useState } from 'react'
import { ExternalLink, Mail, Phone, Plus, RefreshCw, Search, UserPlus } from 'lucide-react'
import ReihenfolgeKnoepfe, { verschieben } from '@/components/verwaltung/ReihenfolgeKnoepfe'
import { auswahlKlasse, eingabeKlasse, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { whatsappLink } from '@/lib/whatsapp'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, Vorschau } from '../werkzeuge'

type Gruppe = 'vorstand' | 'abteilungsleitung' | 'weitere'

interface Zeile {
  schluessel: string
  id: number | null
  personId: number | null
  personName: string
  bezeichnung: string
  sparteId: number | null
}

type Zeilen = Record<Gruppe, Zeile[]>

/** zusatz: Übungshinweis, der unter der echten Meldung steht */
type Rueckmeldung = { art: 'erfolg' | 'fehler' | 'hinweis'; text: string; zusatz?: string }

const ABSCHNITTE: { gruppe: Gruppe; titel: string; beschreibung: string; beispiel: string }[] = [
  { gruppe: 'vorstand', titel: 'Vorstand', beschreibung: 'Der geschäftsführende und erweiterte Vorstand.', beispiel: 'z. B. 1. Vorsitzende:r' },
  { gruppe: 'abteilungsleitung', titel: 'Abteilungsleitung', beschreibung: 'Leitungen der Sparten – am besten mit passender Sparte.', beispiel: 'z. B. Abteilungsleitung Fußball' },
  { gruppe: 'weitere', titel: 'Weitere Ansprechpartner', beschreibung: 'Zum Beispiel Mitgliederverwaltung, Kinderschutz oder Platzwart.', beispiel: 'z. B. Mitgliederverwaltung' },
]

/** So heißen die Abschnitte auf der Website (lib/content.ts). */
const WEBSITE_TITEL: Record<Gruppe, string> = { vorstand: 'Vorstand', abteilungsleitung: 'Abteilungsleiter', weitere: 'Weitere Ansprechpartner' }

/* ── Erfundene Beispieldaten ───────────────────────────────────────────────── */

interface Person {
  id: number
  name: string
  email: string | null
  telefon: string | null
  whatsapp: string | null
  foto: string | null
}

const BEISPIELFOTO =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#c9c4b8"/><circle cx="150" cy="118" r="62" fill="#6f6b63"/><path d="M40 300c0-80 50-130 110-130s110 50 110 130z" fill="#6f6b63"/></svg>',
  )

const ANNA = 1
const BJOERN = 2
const JONAS = 3
const KAI = 4
const LEA = 5
const MIRA = 6
const SARA = 7
const TOM = 8

/*
 * Dieselben Kontaktdaten wie in der Übung "Personen & Kontaktdaten" (Stand nach deren Lektionen).
 * Festnetz aus dem Bereich 040 66969 …, den die Bundesnetzagentur für Film und Fernsehen freihält.
 */
const PERSONEN: Person[] = [
  { id: ANNA, name: 'Anna Beispiel', email: 'anna@example.org', telefon: '040 66969 456', whatsapp: '0160 1234567', foto: BEISPIELFOTO },
  { id: BJOERN, name: 'Björn Probe', email: null, telefon: '0152 1234567', whatsapp: null, foto: null },
  { id: JONAS, name: 'Jonas Muster', email: 'jonas@example.org', telefon: '0171 2345678', whatsapp: null, foto: null },
  { id: KAI, name: 'Kai Kontakt', email: 'kasse@example.org', telefon: null, whatsapp: null, foto: null },
  { id: LEA, name: 'Lea Lernmal', email: 'lea@example.org', telefon: null, whatsapp: null, foto: null },
  { id: MIRA, name: 'Mira Probe', email: 'mira@example.org', telefon: null, whatsapp: null, foto: null },
  { id: SARA, name: 'Sara Vorbild', email: 'kinderschutz@example.org', telefon: null, whatsapp: null, foto: null },
  { id: TOM, name: 'Tom Testmann', email: null, telefon: '040 66969 789', whatsapp: null, foto: null },
]

const BADMINTON = 1
const FUSSBALL = 2
const JUDO = 3
const TISCHTENNIS = 4
const VOLLEYBALL = 5
const YOGA = 6

const SPARTEN = [
  { id: BADMINTON, name: 'Badminton' },
  { id: FUSSBALL, name: 'Fußball' },
  { id: JUDO, name: 'Judo' },
  { id: TISCHTENNIS, name: 'Tischtennis' },
  { id: VOLLEYBALL, name: 'Volleyball' },
  { id: YOGA, name: 'Yoga' },
]

function zeile(id: number | null, personId: number | null, bezeichnung: string, sparteId: number | null = null): Zeile {
  const person = PERSONEN.find(p => p.id === personId)
  return { schluessel: id != null ? `f${id}` : 'neu0', id, personId, personName: person?.name ?? '', bezeichnung, sparteId }
}

const STANDARD: Zeilen = {
  vorstand: [zeile(11, ANNA, '1. Vorsitzende:r'), zeile(12, JONAS, '2. Vorsitzende:r'), zeile(13, KAI, 'Kassenwart:in')],
  abteilungsleitung: [zeile(21, BJOERN, 'Abteilungsleitung Judo', JUDO)],
  weitere: [zeile(31, SARA, 'Kinderschutz'), zeile(32, TOM, 'Platzwart'), zeile(33, LEA, 'Mitgliederverwaltung')],
}

/* ── Prüfen wie beim echten Speichern ──────────────────────────────────────── */

/** Vergleichbarer Stand – Bezeichnungen ohne Leerzeichen am Rand, so wie sie gespeichert werden. */
function vergleichsStand(zeilen: Zeilen): string {
  return JSON.stringify(ABSCHNITTE.map(({ gruppe }) => zeilen[gruppe].map(z => [z.id, z.personId, z.bezeichnung.trim(), z.sparteId])))
}

/** Dieselben Prüfungen in derselben Reihenfolge und mit denselben Texten wie funktionenAbgleichen. */
function pruefen(zeilen: Zeilen): string | null {
  let fehler: string | null = null
  ABSCHNITTE.forEach(({ gruppe, titel }) => {
    zeilen[gruppe].forEach((z, index) => {
      if (fehler) return
      if (z.personId == null) fehler = `Im Abschnitt „${titel}“ fehlt bei Zeile ${index + 1} die Person.`
      else if (!z.bezeichnung.trim()) fehler = `Im Abschnitt „${titel}“ fehlt bei Zeile ${index + 1} die Bezeichnung (z. B. „1. Vorsitzende:r“).`
    })
  })
  return fehler
}

const bisherigeFehlen = (zeilen: Zeilen, ids: number[]) =>
  ids.some(id => !ABSCHNITTE.some(({ gruppe }) => zeilen[gruppe].some(z => z.id === id)))

const neueZeilen = (zeilen: Zeilen) => ABSCHNITTE.some(({ gruppe }) => zeilen[gruppe].some(z => z.id == null))

const BISHERIGE_BLEIBEN = 'Die anderen Einträge sollen bleiben – jedes Entfernen nimmt die Person auch von der Website. Mit „Von vorn“ unten startest du die Übung neu.'
const NICHTS_NEUES = 'Füge in dieser Lektion keine neue Funktion hinzu. Nimm die neue Zeile mit dem Kreuz wieder heraus.'

/* ── Vorschau: Ausschnitt von /ansprechpartner ─────────────────────────────── */

const WHATSAPP_PFAD =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'

function WebsiteKontakt({ zeilen }: { zeilen: Zeilen }) {
  const gruppen = ABSCHNITTE.map(({ gruppe }) => ({
    gruppe,
    mitglieder: zeilen[gruppe].filter(z => z.personId != null),
  })).filter(g => g.mitglieder.length > 0)

  return (
    <Vorschau adresse="/ansprechpartner">
      <div className="mb-6">
        <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-[#6b6b6b]">Wir helfen dir</div>
        <div className="font-display text-5xl tracking-tight">KONTAKT</div>
      </div>
      <div className="mb-8 bg-[#0a0a0a] px-5 py-4 text-[#f5f5f0]">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b6b6b]">Allgemeiner Kontakt</div>
        <p className="mt-2 text-xs leading-relaxed text-[#f5f5f0]/70">Telefon, WhatsApp und E-Mail des Vereins – fest eingebaut, in der Verwaltung nicht änderbar.</p>
      </div>
      {gruppen.map(({ gruppe, mitglieder }) => (
        <div key={gruppe} className="mb-8 last:mb-0">
          <div className="mb-4 text-[11px] uppercase tracking-[0.2em] text-[#6b6b6b]">{WEBSITE_TITEL[gruppe]}</div>
          <div className="space-y-px bg-[#0a0a0a]/10">
            {mitglieder.map(z => {
              const p = PERSONEN.find(x => x.id === z.personId)
              if (!p) return null
              const whatsapp = whatsappLink(p)
              return (
                <div key={z.schluessel} className="flex flex-col gap-4 bg-[#f5f5f0] p-5 md:flex-row md:items-center md:gap-6">
                  {p.foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto} alt={p.name} width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-full object-cover grayscale" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-medium">{p.name}</div>
                    <div className="mt-0.5 text-sm text-[#6b6b6b]">{z.bezeichnung.trim()}</div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 text-sm text-[#6b6b6b]">
                    {p.email && (
                      <span className="flex items-center gap-2 break-all">
                        <Mail size={13} className="shrink-0" aria-hidden="true" /> {p.email}
                      </span>
                    )}
                    {p.telefon && (
                      <span className="flex items-center gap-2">
                        <Phone size={13} className="shrink-0" aria-hidden="true" /> {p.telefon}
                      </span>
                    )}
                    {whatsapp && (
                      <span className="flex items-center gap-2" title={whatsapp}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d={WHATSAPP_PFAD} />
                        </svg>
                        WhatsApp
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </Vorschau>
  )
}

/* ── Nachbau der Personensuche (components/verwaltung/PersonSuche.tsx) ─────── */

/** Kleinbuchstaben, Umlaute ausgeschrieben, Akzente entfernt – wie in der echten Suche. */
function normalisieren(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

function PersonSuche({ id, autoFocus, onWaehlen }: { id: string; autoFocus: boolean; onWaehlen: (p: Person) => void }) {
  const [suche, setSuche] = useState('')
  const [hinweis, setHinweis] = useState<string | null>(null)

  const treffer = useMemo(() => {
    const teile = normalisieren(suche).split(/\s+/).filter(Boolean)
    if (teile.length === 0) return []
    return PERSONEN.filter(p => teile.every(t => normalisieren(p.name).indexOf(t) >= 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .slice(0, 8)
  }, [suche])

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
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Namen eingeben …"
          onChange={e => setSuche(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (treffer[0]) waehlen(treffer[0])
            } else if (e.key === 'Escape') {
              setSuche('')
            }
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
      {/* In echt: neuer Tab zum Anlegen bzw. Liste neu laden – in der Übung nur ein Hinweis */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b6b6b]">
        <button
          type="button"
          onClick={() => setHinweis('In echt öffnet sich hier ein neuer Tab zum Anlegen. Danach tippst du auf „Liste aktualisieren“.')}
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#0a0a0a]"
        >
          <UserPlus size={13} aria-hidden="true" /> Person fehlt? Neue Person anlegen ↗
        </button>
        <button
          type="button"
          onClick={() => setHinweis('In echt holt das neu angelegte Personen in die Suche – deine Eingaben hier bleiben erhalten.')}
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#0a0a0a]"
        >
          <RefreshCw size={12} aria-hidden="true" /> Liste aktualisieren
        </button>
      </div>
      {hinweis && <p className="mt-1.5 text-xs text-amber-800">{hinweis}</p>}
    </div>
  )
}

/* ── Nachbau des Formulars "Kontaktseite" ──────────────────────────────────── */

function Editor({
  anfang,
  gespeichert,
  meldung,
  speichern,
}: {
  /** Zeilen beim Öffnen (können ungespeicherte Änderungen enthalten) */
  anfang: Zeilen
  /** Gespeicherter Stand – zum Vergleich für "Ungespeicherte Änderungen" */
  gespeichert: Zeilen
  meldung: Rueckmeldung | null
  speichern: (zeilen: Zeilen) => void
}) {
  const [zeilen, setZeilen] = useState<Zeilen>(anfang)
  const [suchOffen, setSuchOffen] = useState<string | null>(null)
  const zaehler = useRef(0)

  function liste(g: Gruppe, neu: Zeile[]) {
    setZeilen({ ...zeilen, [g]: neu })
  }
  function aendern(g: Gruppe, i: number, aenderung: Partial<Zeile>) {
    liste(
      g,
      zeilen[g].map((z, j) => (j === i ? { ...z, ...aenderung } : z)),
    )
  }
  function hinzufuegen(g: Gruppe) {
    zaehler.current += 1
    const schluessel = `neu${zaehler.current}`
    liste(g, zeilen[g].concat({ schluessel, id: null, personId: null, personName: '', bezeichnung: '', sparteId: null }))
    setSuchOffen(schluessel)
  }

  const geaendert = vergleichsStand(zeilen) !== vergleichsStand(gespeichert)
  const ohnePerson = ABSCHNITTE.reduce((n, a) => n + zeilen[a.gruppe].filter(z => z.personId == null).length, 0)
  // Erfolgsmeldung ausblenden, sobald wieder etwas geändert wird – wie die echte Speicherleiste
  const zeigen = meldung && (meldung.art !== 'erfolg' || !geaendert) ? meldung : null

  return (
    // Bewusst ohne noValidate: Wie in echt meldet der Browser eine leere Bezeichnung selbst.
    <form
      onSubmit={e => {
        e.preventDefault()
        speichern(zeilen)
      }}
    >
      <div className="space-y-6">
        {ABSCHNITTE.map(({ gruppe, titel, beschreibung, beispiel }) => (
          <Karte key={gruppe} titel={titel} beschreibung={beschreibung}>
            {zeilen[gruppe].length === 0 ? (
              <p className="pb-3 text-sm text-[#6b6b6b]">Noch keine Einträge – dieser Abschnitt erscheint dann nicht auf der Website.</p>
            ) : (
              <ol className="space-y-3">
                {zeilen[gruppe].map((z, i) => {
                  const sucheZeigen = z.personId == null || suchOffen === z.schluessel
                  return (
                    <li key={z.schluessel} className="rounded-sm border border-[#0a0a0a]/10 bg-[#fafaf7] p-3 sm:p-4">
                      {/* Anders als in echt dürfen die Knöpfe am Handy unter die Person rutschen – im Übungsrahmen wird es sonst zu eng */}
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-0 grow basis-56">
                          {sucheZeigen ? (
                            <div>
                              <label htmlFor={`uebung-${z.schluessel}-person`} className="mb-1.5 block text-sm font-medium">
                                Person
                              </label>
                              <PersonSuche
                                id={`uebung-${z.schluessel}-person`}
                                autoFocus={suchOffen === z.schluessel}
                                onWaehlen={p => {
                                  aendern(gruppe, i, { personId: p.id, personName: p.name })
                                  setSuchOffen(null)
                                }}
                              />
                              {z.personId != null && (
                                <button type="button" className={`${knopfKlassen.leise} mt-1`} onClick={() => setSuchOffen(null)}>
                                  Abbrechen – {z.personName} behalten
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="mb-1.5 text-sm font-medium">Person</div>
                              <div className="flex min-h-[2.75rem] flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="text-[15px] font-medium">{z.personName}</span>
                                <button
                                  type="button"
                                  className="text-xs text-[#6b6b6b] underline underline-offset-2 hover:text-[#0a0a0a]"
                                  onClick={() => setSuchOffen(z.schluessel)}
                                  aria-label={`Person ändern (${[z.personName, z.bezeichnung.trim()].filter(Boolean).join(', ')})`}
                                >
                                  Person ändern
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="ml-auto">
                          <ReihenfolgeKnoepfe
                            index={i}
                            anzahl={zeilen[gruppe].length}
                            bezeichnung={z.bezeichnung || z.personName || 'Neue Funktion'}
                            onVerschieben={r => liste(gruppe, verschieben(zeilen[gruppe], i, r))}
                            onEntfernen={() => liste(gruppe, zeilen[gruppe].filter((_, j) => j !== i))}
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`uebung-${z.schluessel}-bez`} className="mb-1.5 block text-sm font-medium">
                            Bezeichnung
                          </label>
                          <input
                            id={`uebung-${z.schluessel}-bez`}
                            required
                            value={z.bezeichnung}
                            placeholder={beispiel}
                            onChange={e => aendern(gruppe, i, { bezeichnung: e.target.value })}
                            className={eingabeKlasse}
                          />
                        </div>
                        <div>
                          <label htmlFor={`uebung-${z.schluessel}-sparte`} className="mb-1.5 block text-sm font-medium">
                            Sparte <span className="font-normal text-[#6b6b6b]">(optional)</span>
                          </label>
                          <select
                            id={`uebung-${z.schluessel}-sparte`}
                            value={z.sparteId ?? ''}
                            onChange={e => aendern(gruppe, i, { sparteId: e.target.value ? Number(e.target.value) : null })}
                            className={auswahlKlasse}
                          >
                            <option value="">– keine –</option>
                            {SPARTEN.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            <button type="button" className={`${knopfKlassen.sekundaer} mt-4`} onClick={() => hinzufuegen(gruppe)}>
              <Plus size={15} aria-hidden="true" /> Funktion hinzufügen
            </button>
          </Karte>
        ))}

        {/* Nachbau der Speicherleiste – mit Hinweis über der Statuszeile wie in echt */}
        <div className="space-y-3 border-t border-[#0a0a0a]/10 pt-3">
          {zeigen && <Meldung art={zeigen.art}>{zeigen.text}</Meldung>}
          {zeigen?.zusatz && <Meldung art="hinweis">In der Übung noch nicht ganz: {zeigen.zusatz}</Meldung>}
          {ohnePerson > 0 && (
            <Meldung art="hinweis">
              {ohnePerson === 1 ? 'Bei einer Funktion fehlt noch die Person.' : `Bei ${ohnePerson} Funktionen fehlt noch die Person.`} Bitte auswählen oder die
              Zeile entfernen.
            </Meldung>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-[10rem] flex-1 text-sm" aria-live="polite">
              {geaendert ? <span className="font-medium text-amber-800">Ungespeicherte Änderungen</span> : <span className="text-[#6b6b6b]">Alles gespeichert.</span>}
            </p>
            <button type="submit" className={`${knopfKlassen.primaer} px-8 py-3 text-base`}>
              Kontaktseite speichern
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

/**
 * Eine Lektion mit der Seite "Kontaktseite" und der Vorschau von /ansprechpartner darunter.
 * `anfang` darf ungespeicherte Zeilen enthalten; gespeichert ist dann `gespeichertStart`.
 */
function KontaktUebung({
  anfang,
  gespeichertStart,
  aufgabe,
  geloest,
  istGeloest,
}: {
  anfang: Zeilen
  gespeichertStart?: Zeilen
  aufgabe: (zeilen: Zeilen) => string | null
} & LektionProps) {
  const [gespeichert, setGespeichert] = useState<Zeilen>(gespeichertStart ?? anfang)
  const [stand, setStand] = useState(0)
  const [meldung, setMeldung] = useState<Rueckmeldung | null>(null)
  const naechsteId = useRef(100)
  const vorschau = useRef<HTMLDivElement>(null)

  function speichern(zeilen: Zeilen) {
    const fehler = pruefen(zeilen)
    if (fehler) {
      setMeldung({ art: 'fehler', text: fehler })
      return
    }
    if (vergleichsStand(zeilen) === vergleichsStand(gespeichert)) {
      // Echte Meldung – und solange die Aufgabe offen ist, darunter ein Tipp, wie es weitergeht
      const offen = istGeloest ? null : aufgabe(zeilen)
      setMeldung({ art: 'erfolg', text: 'Keine Änderungen – es war schon alles gespeichert.', ...(offen ? { zusatz: offen } : {}) })
      return
    }
    const hinweis = aufgabe(zeilen)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    // Wie nach dem echten Speichern: neue Zeilen haben jetzt eine id, Bezeichnungen sind getrimmt
    const neu = { ...zeilen }
    ABSCHNITTE.forEach(({ gruppe }) => {
      neu[gruppe] = zeilen[gruppe].map(z => {
        const id = z.id ?? naechsteId.current++
        return { ...z, id, schluessel: `f${id}`, bezeichnung: z.bezeichnung.trim() }
      })
    })
    setGespeichert(neu)
    setStand(s => s + 1)
    setMeldung({ art: 'erfolg', text: 'Gespeichert. Die Kontaktseite ist sofort aktuell.' })
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-3xl leading-none tracking-tight md:text-4xl">KONTAKTSEITE</h3>
            <div className="mt-2 text-sm text-[#6b6b6b]">Wer steht auf der Seite „Kontakt“? Telefon, E-Mail und Foto kommen aus den Personendaten.</div>
          </div>
          {/* In echt öffnet sich die Website in einem neuen Tab – hier springt der Knopf zur Vorschau */}
          <button
            type="button"
            className={knopfKlassen.sekundaer}
            onClick={() => {
              vorschau.current?.focus({ preventScroll: true })
              vorschau.current?.scrollIntoView({ block: 'start' })
            }}
          >
            <ExternalLink size={15} aria-hidden="true" /> Kontaktseite ansehen ↗
          </button>
        </div>
        <Editor key={stand} anfang={stand === 0 ? anfang : gespeichert} gespeichert={gespeichert} meldung={meldung} speichern={speichern} />
      </Spielwiese>
      <div ref={vorschau} tabIndex={-1} className="focus:outline-none">
        <WebsiteKontakt zeilen={gespeichert} />
      </div>
    </div>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

const MIT_TISCHTENNIS: Zeilen = {
  ...STANDARD,
  abteilungsleitung: STANDARD.abteilungsleitung.concat(zeile(22, LEA, 'Abteilungsleitung Tischtennis', TISCHTENNIS)),
}

const BISHER = [11, 12, 13, 21, 31, 32, 33]

export const lektionen: Lektion[] = [
  {
    titel: 'Eine Funktion hinzufügen',
    aufgabe: (
      <>
        Lea Lernmal leitet ab sofort die Sparte Tischtennis. Füge bei <strong>Abteilungsleitung</strong> eine Funktion hinzu: Person{' '}
        <strong>Lea Lernmal</strong>, Bezeichnung <strong>Abteilungsleitung Tischtennis</strong>, Sparte <strong>Tischtennis</strong>. Dann
        speichern.
      </>
    ),
    Inhalt: props => (
      <KontaktUebung
        {...props}
        anfang={STANDARD}
        aufgabe={z => {
          const neu = z.abteilungsleitung.filter(x => x.id == null)
          if (neu.length === 0) {
            if (z.vorstand.concat(z.weitere).some(x => x.id == null)) {
              return 'Die neue Funktion gehört in den Abschnitt „Abteilungsleitung“. Nimm die Zeile mit dem Kreuz heraus und füge sie dort hinzu.'
            }
            return 'Tippe im Abschnitt „Abteilungsleitung“ auf „Funktion hinzufügen“.'
          }
          if (neu.length > 1) return 'Füge nur eine neue Funktion hinzu – die zweite neue Zeile kannst du mit dem Kreuz entfernen.'
          if (neu[0].personId !== LEA) return 'Wähle als Person Lea Lernmal.'
          if (neu[0].bezeichnung.trim().toLowerCase() !== 'abteilungsleitung tischtennis') return 'Als Bezeichnung bitte „Abteilungsleitung Tischtennis“ eintragen.'
          if (neu[0].sparteId !== TISCHTENNIS) return 'Wähle bei „Sparte (optional)“ die Sparte Tischtennis.'
          if (bisherigeFehlen(z, BISHER)) return BISHERIGE_BLEIBEN
          return null
        }}
      />
    ),
    danach: (
      <>
        Lea steht jetzt zweimal auf der Kontaktseite – jeweils mit der passenden Bezeichnung. Die Sparte ist nur ein Vermerk für die Verwaltung: Auf
        der Website und auf der Spartenseite ändert sie nichts. Die Ansprechpartner:innen der Sparte pflegst du getrennt unter „Sparten“.
      </>
    ),
  },
  {
    titel: 'Die Nachfolge eintragen',
    aufgabe: (
      <>
        Björn Probe gibt die Abteilungsleitung Judo an <strong>Mira Probe</strong> ab. Tausche in dieser Zeile die Person aus – Bezeichnung und
        Sparte bleiben.
      </>
    ),
    Inhalt: props => (
      <KontaktUebung
        {...props}
        anfang={MIT_TISCHTENNIS}
        aufgabe={z => {
          const judo = z.abteilungsleitung.find(x => x.bezeichnung.trim() === 'Abteilungsleitung Judo')
          if (!judo) return 'Die Zeile „Abteilungsleitung Judo“ soll bleiben – tausche dort nur die Person aus.'
          if (judo.personId === BJOERN) return 'Tippe neben „Björn Probe“ auf „Person ändern“ und such Mira Probe.'
          if (judo.personId !== MIRA) return 'Die Nachfolgerin ist Mira Probe.'
          if (judo.sparteId !== JUDO) return 'Die Sparte bleibt Judo.'
          if (z.abteilungsleitung.some(x => x.personId === BJOERN)) return 'Björn Probe soll nicht mehr bei der Abteilungsleitung stehen.'
          if (!z.abteilungsleitung.some(x => x.personId === LEA)) return 'Die Abteilungsleitung Tischtennis (Lea Lernmal) soll bleiben.'
          if (neueZeilen(z)) return NICHTS_NEUES
          if (bisherigeFehlen(z, [11, 12, 13, 21, 22, 31, 32, 33])) return BISHERIGE_BLEIBEN
          return null
        }}
      />
    ),
    danach: (
      <>
        Mit „Person ändern“ bleibt die Bezeichnung erhalten – praktisch bei jeder Nachfolge. Björn selbst bleibt unter „Personen“ erhalten. Denk
        daran: Die Ansprechpartner:innen auf der Spartenseite Judo passt du getrennt unter „Sparten“ an.
      </>
    ),
  },
  {
    titel: 'Aufräumen und sortieren',
    aufgabe: (
      <>
        Bei <strong>Weitere Ansprechpartner</strong>: Tom Testmann ist nicht mehr Platzwart – entferne die Zeile. Und die{' '}
        <strong>Mitgliederverwaltung</strong> soll ganz oben stehen.
      </>
    ),
    Inhalt: props => (
      <KontaktUebung
        {...props}
        anfang={STANDARD}
        aufgabe={z => {
          const w = z.weitere
          if (w.some(x => x.personId === TOM)) return 'Tom Testmann steht noch da. Tippe in seiner Zeile auf das Kreuz (Entfernen).'
          if (!w.some(x => x.bezeichnung.trim() === 'Mitgliederverwaltung')) return 'Die Mitgliederverwaltung soll bleiben. Mit „Von vorn“ unten startest du neu.'
          if (!w.some(x => x.personId === SARA)) return 'Der Kinderschutz (Sara Vorbild) soll bleiben. Mit „Von vorn“ unten startest du neu.'
          if (w[0].bezeichnung.trim() !== 'Mitgliederverwaltung') return 'Die Mitgliederverwaltung steht noch nicht ganz oben. Schieb sie mit dem Pfeil nach oben.'
          if (neueZeilen(z)) return NICHTS_NEUES
          if (bisherigeFehlen(z, [11, 12, 13, 21, 31, 33])) return BISHERIGE_BLEIBEN
          return null
        }}
      />
    ),
    danach:
      'So stehen die Einträge jetzt auch auf der Website. Tom ist nur von der Kontaktseite verschwunden – als Person bleibt er unter „Personen“ erhalten. Die Pfeile verschieben übrigens nur innerhalb eines Abschnitts.',
  },
  {
    titel: 'Da fehlt noch wer',
    aufgabe: (
      <>
        Du hast beim Vorstand schon „Jugendwart:in“ eingetragen, aber noch keine Person gewählt. Tippe zuerst auf{' '}
        <strong>Kontaktseite speichern</strong> und lies die Meldung. Wähle dann <strong>Jonas Muster</strong> als Person und speichere noch einmal.
      </>
    ),
    Inhalt: props => (
      <KontaktUebung
        {...props}
        anfang={{ ...STANDARD, vorstand: STANDARD.vorstand.concat({ ...zeile(null, null, 'Jugendwart:in'), schluessel: 'offen1' }) }}
        gespeichertStart={STANDARD}
        aufgabe={z => {
          const jugend = z.vorstand.find(x => x.bezeichnung.trim().toLowerCase() === 'jugendwart:in')
          if (!jugend) return 'Die Zeile „Jugendwart:in“ beim Vorstand soll bleiben – sie braucht nur noch eine Person. Mit „Von vorn“ unten holst du sie zurück.'
          if (jugend.personId !== JONAS) return 'Als Jugendwart:in bitte Jonas Muster wählen.'
          if (bisherigeFehlen(z, BISHER)) return BISHERIGE_BLEIBEN
          return null
        }}
      />
    ),
    danach:
      'Gespeichert wird immer die ganze Seite – und erst, wenn jede Zeile eine Person und eine Bezeichnung hat. Die Meldung nennt dir Abschnitt und Zeile. Jonas hat jetzt zwei Funktionen; das ist in Ordnung.',
  },
  {
    titel: 'Neue Telefonnummer?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Lea Lernmal hat eine neue Telefonnummer. Wo änderst du sie, damit sie auf der Kontaktseite stimmt?"
        antworten={[
          { text: 'Unter „Personen“ bei Lea Lernmal', richtig: true },
          {
            text: 'Hier auf der Kontaktseite in Leas Zeile',
            erklaerung: 'Auf der Kontaktseite gibt es kein Feld für das Telefon: Telefon, E-Mail und Foto kommen aus den Personendaten.',
          },
          {
            text: 'Gar nicht – das kann nur die technische Betreuung',
            erklaerung: 'Fest eingebaut ist nur der Kasten „Allgemeiner Kontakt“. Leas Nummer änderst du selbst unter „Personen“.',
          },
        ]}
      />
    ),
    danach: 'Die neue Nummer gilt dann überall, wo Lea vorkommt – auf der Kontaktseite und zum Beispiel auch im Trainerteam auf der Spartenseite.',
  },
]
