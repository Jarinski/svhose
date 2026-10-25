'use client'

/**
 * Übung "Termine eintragen" – Nachbau der Liste unter /verwaltung/termine und des Formulars
 * "Neuer Termin" bzw. "Termin bearbeiten" (app/verwaltung/(intern)/termine/TerminFormular.tsx)
 * mit denselben Prüfungen und Meldungen (lib/verwaltung/inhalte/termine.ts, termine/aktionen.ts)
 * und einer Vorschau des Terminkalenders auf /termine (app/termine/TermineClient.tsx).
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight, Clock, ImagePlus, Lock, MapPin, RefreshCw, Tag, Trash2, Undo2, X } from 'lucide-react'
import { auswahlKlasse, Badge, eingabeKlasse, Feld, Karte, knopfKlassen, LeerHinweis, Meldung } from '@/components/verwaltung/ui'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

/* ── Beispieldaten ─────────────────────────────────────────────────────────── */

type Quelle = 'manuell' | 'fussball-de' | 'click-tt'

interface Termin {
  id: number
  titel: string
  datum: string
  uhrzeit: string
  ort: string
  beschreibung: string
  bereich: string
  sparteId: number | null
  tags: string[]
  plakat: boolean
  quelle: Quelle
}

function termin(t: Partial<Termin> & { id: number; titel: string; datum: string }): Termin {
  return { uhrzeit: '', ort: '', beschreibung: '', bereich: '', sparteId: 1, tags: [], plakat: false, quelle: 'manuell', ...t }
}

/** Alle Termine der Übung liegen im nächsten Jahr – so stehen sie immer unter "Kommende Termine". */
const J = new Date().getFullYear() + 1
const VORJAHR = new Date().getFullYear() - 1

/** In der Übung bist du Spartenleitung Fußball: nur diese Sparte steht zur Wahl. */
const SPARTEN = [{ id: 1, name: 'Fußball' }]
const SPARTEN_NAMEN: Record<number, string> = { 1: 'Fußball', 2: 'Tischtennis' }
const BEREICHE = ['Gesamtverein', 'Herren', 'Jugend']
const BISHERIGE_TAGS = ['Familie', 'Kinder', 'Turnier']

const QUELLEN_NAMEN: Record<Quelle, string> = { manuell: 'Eigener Termin', 'fussball-de': 'fussball.de', 'click-tt': 'click-tt' }
const SYNC_HINWEIS = 'Wird jede Nacht von fussball.de/click-tt abgeglichen – Änderungen hier würden überschrieben.'

/** "Zuletzt gespeichert" der vorhandenen Beispieltermine */
const BEISPIEL_GESPEICHERT = '2026-10-18T17:42:00.000Z'

const SPIEL = termin({
  id: 90,
  titel: 'Herren – TSV Beispieldorf',
  datum: `${J}-03-07`,
  uhrzeit: '15:00',
  ort: 'Sportplatz Holm-Seppensen',
  beschreibung: 'Kreisliga, 18. Spieltag',
  bereich: 'Herren',
  quelle: 'fussball-de',
})
const SOMMERFEST = termin({
  id: 91,
  titel: 'Sommerfest',
  datum: `${J}-06-13`,
  uhrzeit: '14:00–18:00',
  ort: 'Sportplatz Holm-Seppensen',
  beschreibung: 'Für alle Mitglieder und Familien – mit Hüpfburg und Grillstand.',
  bereich: 'Gesamtverein',
  sparteId: null,
  tags: ['Familie', 'Kinder'],
})
const HALLENTURNIER = termin({
  id: 5,
  titel: 'Jugend-Hallenturnier',
  datum: `${J}-02-14`,
  uhrzeit: 'ganztägig',
  beschreibung: 'Turnier für die U11 bis U13 mit Mannschaften aus dem Kreis.',
  tags: ['Turnier'],
})

/* ── Dieselben Prüfungen und Texte wie beim echten Speichern ──────────────── */

const FELDER_PRUEFEN = 'Bitte die markierten Felder prüfen.'

function istDatum(wert: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false
  const d = new Date(wert + 'T12:00:00Z')
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert
}

/** Wie terminPruefen in lib/verwaltung/inhalte/termine.ts */
function terminPruefen(t: Termin): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!t.titel) felder.titel = 'Bitte einen Titel eintragen.'
  else if (t.titel.length > 200) felder.titel = 'Der Titel ist zu lang (höchstens 200 Zeichen).'
  if (!istDatum(t.datum)) felder.datum = 'Bitte ein gültiges Datum wählen.'
  return felder
}

/** "Familie, Kinder ,, Fest" → ["Familie", "Kinder", "Fest"] (wie kommaListe) */
function kommaListe(wert: string): string[] {
  const ergebnis: string[] = []
  wert.split(',').forEach(teil => {
    const t = teil.trim()
    if (t && !ergebnis.some(e => e.toLowerCase() === t.toLowerCase())) ergebnis.push(t)
  })
  return ergebnis
}

const mehrzeilig = (wert: FormDataEntryValue | null) => (typeof wert === 'string' ? wert : '').replace(/\r\n?/g, '\n').trim()

const nachDatum = (a: Termin, b: Termin) => a.datum.localeCompare(b.datum) || a.uhrzeit.localeCompare(b.uhrzeit, 'de', { numeric: true }) || a.id - b.id

/** Etikett auf der Website: Bereich, sonst Spartenname, sonst "Allgemein" */
const etikett = (t: Termin) => t.bereich || (t.sparteId != null ? SPARTEN_NAMEN[t.sparteId] : '') || 'Allgemein'

/* ── Ein Beispiel-Plakat (gezeichnet) ─────────────────────────────────────── */

function Plakat() {
  return (
    <svg viewBox="0 0 150 200" preserveAspectRatio="xMidYMid meet" className="block h-full w-full" aria-hidden="true">
      <rect width="150" height="200" fill="#0a0a0a" />
      <circle cx="75" cy="60" r="28" fill="none" stroke="#f5f5f0" strokeWidth="6" />
      <text x="75" y="128" textAnchor="middle" fontSize="28" fill="#f5f5f0" className="font-display">
        HALLEN
      </text>
      <text x="75" y="160" textAnchor="middle" fontSize="28" fill="#f5f5f0" className="font-display">
        TURNIER
      </text>
    </svg>
  )
}

/* ── Vorschau: so erscheint der Termin auf /termine ─────────────────────────── */

function WebsiteTermine({ termine }: { termine: Termin[] }) {
  const [aktiv, setAktiv] = useState<string[]>([])
  const alleFilter = Array.from(new Set(termine.flatMap(t => [etikett(t), ...t.tags]))).sort()
  const umschalten = (f: string) => setAktiv(a => (a.includes(f) ? a.filter(x => x !== f) : a.concat(f)))
  const passt = (t: Termin) => aktiv.length === 0 || [etikett(t), ...t.tags].some(f => aktiv.includes(f))
  const kommend = termine.filter(passt).sort(nachDatum)

  return (
    <Vorschau adresse="/termine">
      <div className="mb-6">
        <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-[#6b6b6b]">Kalender</div>
        <div className="font-display text-5xl tracking-tight">TERMINE</div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Tag size={11} className="text-[#6b6b6b]" aria-hidden="true" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#6b6b6b]">Filtern nach</span>
          {aktiv.length > 0 && (
            <button
              type="button"
              onClick={() => setAktiv([])}
              className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#6b6b6b] hover:text-[#0a0a0a]"
            >
              <X size={10} aria-hidden="true" /> Zurücksetzen
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {alleFilter.map(f => (
            <button
              key={f}
              type="button"
              aria-pressed={aktiv.includes(f)}
              onClick={() => umschalten(f)}
              className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-all duration-150 ${
                aktiv.includes(f)
                  ? 'border-[#0a0a0a] bg-[#0a0a0a] text-[#f5f5f0]'
                  : 'border-[#0a0a0a]/20 bg-transparent text-[#6b6b6b] hover:border-[#0a0a0a]/50 hover:text-[#0a0a0a]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 text-[11px] uppercase tracking-[0.2em] text-[#6b6b6b]">Kommende Termine</div>
      <div className="space-y-px bg-[#0a0a0a]/10">
        {kommend.map(t => {
          const tag = new Date(t.datum + 'T12:00:00')
          return (
            <div key={t.id} className="flex flex-col gap-4 bg-[#f5f5f0] p-6 md:flex-row md:items-center md:gap-8">
              <div className="w-20 shrink-0 bg-[#0a0a0a] p-4 text-center text-[#f5f5f0]">
                <div className="font-display text-3xl leading-none">{format(tag, 'd')}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#f5f5f0]/60">{format(tag, 'MMM', { locale: de })}</div>
                <div className="text-[10px] text-[#f5f5f0]/40">{format(tag, 'yyyy')}</div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="border border-[#0a0a0a]/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b]">{etikett(t)}</span>
                  {t.tags.map(tag => (
                    <span key={tag} className="border border-[#0a0a0a]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mb-2 text-lg font-medium">{t.titel}</div>
                {t.beschreibung && <p className="text-sm text-[#6b6b6b]">{t.beschreibung}</p>}
              </div>

              <div className="flex shrink-0 flex-col gap-2 text-xs text-[#6b6b6b]">
                <span className="flex items-center gap-1">
                  <Clock size={11} aria-hidden="true" /> {t.uhrzeit} Uhr
                </span>
                <span className="flex items-start gap-1">
                  <MapPin size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="max-w-[200px]">{t.ort}</span>
                </span>
              </div>

              {t.plakat && (
                <div className="relative block aspect-[3/4] w-40 shrink-0 overflow-hidden bg-[#e9e9e2] md:w-28" role="img" aria-label={`Bild zum Termin: ${t.titel}`}>
                  <Plakat />
                </div>
              )}
            </div>
          )
        })}
        {kommend.length === 0 && <div className="bg-[#f5f5f0] p-8 text-sm text-[#6b6b6b]">Keine kommenden Termine für die gewählten Filter.</div>}
      </div>
    </Vorschau>
  )
}

/* ── Nachbau des Termin-Formulars ──────────────────────────────────────────── */

type Meldungsart = { art: 'erfolg' | 'fehler' | 'hinweis'; text: string }

/**
 * Formular "Neuer Termin" (start = null) bzw. "Termin bearbeiten". Die Felder sind wie im echten
 * Formular ungesteuert und werden beim Speichern aus dem Formular gelesen. `aufgabe` prüft
 * danach, ob die Aufgabe erfüllt ist, und liefert sonst einen Hinweis. `andere` stehen in der
 * Vorschau mit im Kalender.
 */
function TerminUebung({
  start,
  andere,
  aufgabe,
  geloest,
}: {
  start: Termin | null
  andere: Termin[]
  aufgabe: (t: Termin) => string | null
} & LektionProps) {
  const [gespeichert, setGespeichert] = useState<Termin | null>(start)
  const [plakat, setPlakat] = useState(start?.plakat ?? false)
  const [plakatWaehlen, setPlakatWaehlen] = useState(false)
  const [geaendert, setGeaendert] = useState(false)
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<Meldungsart | null>(null)
  const [loeschHinweis, setLoeschHinweis] = useState(false)
  const [zuletzt, setZuletzt] = useState(start ? BEISPIEL_GESPEICHERT : '')
  const neu = gespeichert == null
  const merken = () => setGeaendert(true)
  const fe = (feld: string) => fehler[feld]

  function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const daten = new FormData(e.currentTarget)
    const text = (name: string) => {
      const wert = daten.get(name)
      return typeof wert === 'string' ? wert.trim() : ''
    }
    const sparte = text('sparteId')
    const eingabe: Termin = {
      id: gespeichert?.id ?? 1,
      titel: text('titel'),
      datum: text('datum'),
      uhrzeit: text('uhrzeit'),
      ort: text('ort'),
      beschreibung: mehrzeilig(daten.get('beschreibung')),
      bereich: text('bereich'),
      sparteId: sparte ? Number(sparte) : null,
      tags: kommaListe(text('tags')),
      plakat,
      quelle: 'manuell',
    }

    const felder = terminPruefen(eingabe)
    setFehler(felder)
    if (Object.keys(felder).length) {
      setMeldung({ art: 'fehler', text: FELDER_PRUEFEN })
      return
    }
    const hinweis = aufgabe(eingabe)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    setMeldung({ art: 'erfolg', text: neu ? 'Der Termin ist angelegt und auf der Website zu sehen.' : 'Gespeichert – der Termin ist auf der Website zu sehen.' })
    setGespeichert(eingabe)
    setZuletzt(new Date().toISOString())
    setGeaendert(false)
    setLoeschHinweis(false)
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        {/* Seitenkopf wie auf /verwaltung/termine/neu bzw. /verwaltung/termine/[id] */}
        <div className="mb-5">
          <h3 className="font-display text-3xl leading-none tracking-tight">{neu ? 'NEUER TERMIN' : 'TERMIN BEARBEITEN'}</h3>
          <div className="mt-2 text-sm text-[#6b6b6b]">
            {neu ? 'Erscheint nach dem Speichern im Terminkalender der Website.' : `Zuletzt gespeichert ${zeitpunktDeutsch(zuletzt)}`}
          </div>
        </div>

        {/* method="dialog": Auch vor dem fertigen Laden der Seite schickt "Speichern" nichts ab */}
        <form onSubmit={speichern} onChange={merken} method="dialog" noValidate className="space-y-5">
          <Karte titel="Termin">
            <div className="grid gap-5 sm:grid-cols-2">
              <Feld label="Titel" htmlFor="uebung-titel" fehler={fe('titel')} className="sm:col-span-2">
                <input
                  id="uebung-titel"
                  name="titel"
                  maxLength={200}
                  defaultValue={start?.titel ?? ''}
                  aria-invalid={!!fe('titel') || undefined}
                  className={`${eingabeKlasse} text-lg`}
                  autoComplete="off"
                />
              </Feld>
              <Feld label="Datum" htmlFor="uebung-datum" fehler={fe('datum')}>
                <input
                  id="uebung-datum"
                  name="datum"
                  type="date"
                  defaultValue={start?.datum ?? ''}
                  aria-invalid={!!fe('datum') || undefined}
                  className={eingabeKlasse}
                />
              </Feld>
              <Feld label="Uhrzeit" htmlFor="uebung-uhrzeit" hinweis="Zum Beispiel „18:30“, „10:00–13:00“ oder „ganztägig“.">
                <input id="uebung-uhrzeit" name="uhrzeit" defaultValue={start?.uhrzeit ?? ''} placeholder="18:30" className={eingabeKlasse} autoComplete="off" />
              </Feld>
              <Feld label="Ort" htmlFor="uebung-ort" className="sm:col-span-2">
                <input
                  id="uebung-ort"
                  name="ort"
                  defaultValue={start?.ort ?? ''}
                  placeholder="z. B. Sportplatz Holm-Seppensen"
                  className={eingabeKlasse}
                  autoComplete="off"
                />
              </Feld>
              <Feld label="Beschreibung" htmlFor="uebung-beschreibung" className="sm:col-span-2">
                <textarea id="uebung-beschreibung" name="beschreibung" rows={5} defaultValue={start?.beschreibung ?? ''} className={eingabeKlasse} />
              </Feld>
            </div>
          </Karte>

          <Karte titel="Einordnung">
            <div className="grid gap-5 sm:grid-cols-2">
              <Feld label="Sparte" htmlFor="uebung-sparte" hinweis="Bestimmt, wer den Termin später bearbeiten darf.">
                <select
                  id="uebung-sparte"
                  name="sparteId"
                  defaultValue={start?.sparteId != null ? String(start.sparteId) : String(SPARTEN[0].id)}
                  className={auswahlKlasse}
                >
                  {SPARTEN.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Feld>
              <Feld label="Bereich (Anzeige auf der Website)" htmlFor="uebung-bereich" hinweis="Zum Beispiel „Gesamtverein“ oder „Herren“. Leer = Name der Sparte.">
                <input id="uebung-bereich" name="bereich" list="uebung-termin-bereiche" defaultValue={start?.bereich ?? ''} className={eingabeKlasse} autoComplete="off" />
                <datalist id="uebung-termin-bereiche">
                  {BEREICHE.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Feld>
              <Feld
                label="Stichwörter"
                htmlFor="uebung-tags"
                className="sm:col-span-2"
                hinweis={<>Mehrere mit Komma trennen, z. B. „Familie, Kinder“. Bisher verwendet: {BISHERIGE_TAGS.join(', ')}.</>}
              >
                <input id="uebung-tags" name="tags" defaultValue={start?.tags.join(', ') ?? ''} className={eingabeKlasse} autoComplete="off" />
              </Feld>
            </div>
          </Karte>

          {/* Nachbau von BildFeld – statt der Dateiauswahl gibt es ein Beispiel-Plakat zum Antippen */}
          <Karte titel="Bild" beschreibung="Optional, zum Beispiel ein Plakat oder Foto.">
            <div className="space-y-3">
              {plakat ? (
                <div className="aspect-[3/4] w-full max-w-[12rem] overflow-hidden rounded-sm border border-[#0a0a0a]/10" role="img" aria-label="Vorschau des Bildes: plakat-hallenturnier.jpg">
                  <Plakat />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-[#0a0a0a]/20 text-sm text-[#6b6b6b]">Kein Bild</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setPlakatWaehlen(w => !w)} aria-expanded={plakatWaehlen} className={knopfKlassen.sekundaer}>
                  <ImagePlus size={15} aria-hidden="true" /> {plakat ? 'Anderes Bild wählen' : 'Bild auswählen'}
                </button>
                {plakat && (
                  <button
                    type="button"
                    className={knopfKlassen.leise}
                    onClick={() => {
                      setPlakat(false)
                      setPlakatWaehlen(false)
                      merken()
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Bild entfernen
                  </button>
                )}
                {!plakat && gespeichert?.plakat && (
                  <button
                    type="button"
                    className={knopfKlassen.leise}
                    onClick={() => {
                      setPlakat(true)
                      merken()
                    }}
                  >
                    <Undo2 size={15} aria-hidden="true" /> Rückgängig
                  </button>
                )}
              </div>
              {plakatWaehlen && (
                <div className="rounded-sm border border-[#0a0a0a]/15 bg-[#fafaf8] p-3">
                  <p className="mb-2 text-xs leading-relaxed text-[#6b6b6b]">
                    In echt öffnet sich jetzt die Dateiauswahl deines Handys oder Computers. In der Übung tippst du auf das Beispielbild:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPlakat(true)
                      setPlakatWaehlen(false)
                      merken()
                    }}
                    className="flex w-full items-center gap-3 rounded-sm border border-[#0a0a0a]/15 bg-white p-2 text-left hover:border-[#0a0a0a]/40 sm:w-auto"
                  >
                    <span className="h-12 w-9 shrink-0 overflow-hidden rounded-sm" aria-hidden="true">
                      <Plakat />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-all text-sm font-medium">plakat-hallenturnier.jpg</span>
                      <span className="block text-xs text-[#6b6b6b]">Plakat im Hochformat</span>
                    </span>
                  </button>
                </div>
              )}
              {plakat && !gespeichert?.plakat && <p className="text-xs text-[#6b6b6b]">Neues Bild – wird beim Speichern hochgeladen.</p>}
              {!plakat && gespeichert?.plakat && <p className="text-xs text-[#6b6b6b]">Das Bild wird beim Speichern entfernt.</p>}
            </div>
          </Karte>

          <UebungsLeiste geaendert={geaendert} meldung={meldung && (meldung.art !== 'erfolg' || !geaendert) ? meldung : null} />
        </form>

        {!neu && (
          <div className="mt-6 space-y-3 border-t border-[#0a0a0a]/10 pt-6">
            {loeschHinweis && (
              <Meldung art="hinweis">
                In echt kommt jetzt die Rückfrage „Den Termin „{gespeichert.titel}“ wirklich löschen? Das lässt sich nicht rückgängig machen.“ In der Übung
                wird nichts gelöscht.
              </Meldung>
            )}
            <button type="button" onClick={() => setLoeschHinweis(true)} className={knopfKlassen.gefahr}>
              <Trash2 size={15} aria-hidden="true" /> Termin löschen
            </button>
          </div>
        )}
      </Spielwiese>
      <WebsiteTermine termine={andere.concat(gespeichert ? [gespeichert] : [])} />
    </div>
  )
}

/* ── Lektion 1: die Liste unter "Termine" ─────────────────────────────────── */

/** Vor dem Hallenturnier stehen Spiele und gesperrte Termine – mit "Eigene Termine" findet man es schneller. */
const LISTE: Termin[] = [
  termin({ id: 95, titel: 'Neujahrsempfang', datum: `${J}-01-10`, uhrzeit: '11:00', ort: 'Vereinsheim', sparteId: null, bereich: 'Gesamtverein' }),
  termin({ id: 96, titel: 'U13 – JSG Beispieltal', datum: `${J}-01-23`, uhrzeit: '10:30', ort: 'Kreissporthalle', bereich: 'Jugend', quelle: 'fussball-de' }),
  termin({ id: 97, titel: 'TTC Musterhausen – SV Holm-Seppensen', datum: `${J}-01-29`, uhrzeit: '19:30', ort: 'Sporthalle Musterhausen', sparteId: 2, quelle: 'click-tt' }),
  termin({ id: 98, titel: 'Vereinsmeisterschaft Tischtennis', datum: `${J}-02-06`, uhrzeit: '10:00', ort: 'Sporthalle', sparteId: 2 }),
  termin({ id: 99, titel: 'U12 – SC Probedorf', datum: `${J}-02-13`, uhrzeit: '11:00', ort: 'Kreissporthalle', bereich: 'Jugend', quelle: 'fussball-de' }),
  HALLENTURNIER,
  SPIEL,
  termin({ id: 92, titel: 'SV Holm-Seppensen II – TTC Musterhausen', datum: `${J}-03-10`, uhrzeit: '19:30', ort: 'Sporthalle', sparteId: 2, quelle: 'click-tt' }),
  termin({ id: 93, titel: 'Jahreshauptversammlung', datum: `${J}-03-20`, uhrzeit: '19:00', ort: 'Vereinsheim', sparteId: null, bereich: 'Gesamtverein' }),
  SOMMERFEST,
  termin({ id: 94, titel: 'Saisonabschluss Fußball', datum: `${VORJAHR}-11-21`, uhrzeit: '18:00', ort: 'Vereinsheim' }),
]

const FILTER: { wert: 'alle' | Quelle; text: string }[] = [
  { wert: 'alle', text: 'Alle' },
  { wert: 'manuell', text: 'Eigene Termine' },
  { wert: 'fussball-de', text: 'fussball.de' },
  { wert: 'click-tt', text: 'click-tt' },
]
const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/** Als Spartenleitung Fußball bearbeitbar: nur eigene Termine der Sparte Fußball */
const bearbeitbar = (t: Termin) => t.quelle === 'manuell' && t.sparteId === 1

const FORMULAR_OFFEN = 'Das Formular „Termin bearbeiten“ öffnet sich – mit den Abschnitten Termin, Einordnung und Bild.'

function TermineListe({ geloest, istGeloest }: LektionProps) {
  const [quelle, setQuelle] = useState<'alle' | Quelle>('alle')
  const [vergangene, setVergangene] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [offen, setOffen] = useState(istGeloest)
  // Der Hinweis steht direkt unter dem angetippten Eintrag, damit er auch am Handy im Blick ist
  const [angetippt, setAngetippt] = useState<number | null>(istGeloest ? HALLENTURNIER.id : null)
  const heute = new Date().toISOString().slice(0, 10)

  const imZeitraum = LISTE.filter(t => vergangene || t.datum >= heute)
  const anzahl = (q: 'alle' | Quelle) => (q === 'alle' ? imZeitraum.length : imZeitraum.filter(t => t.quelle === q).length)
  const gefiltert = imZeitraum.filter(t => quelle === 'alle' || t.quelle === quelle)
  const kommende = gefiltert.filter(t => t.datum >= heute).sort(nachDatum)
  const alte = gefiltert.filter(t => t.datum < heute).sort((a, b) => b.datum.localeCompare(a.datum))

  function oeffnen(t: Termin) {
    setAngetippt(t.id)
    if (t.id === HALLENTURNIER.id) {
      setHinweis(null)
      setOffen(true)
      geloest()
    } else if (t.quelle !== 'manuell') {
      setOffen(false)
      setHinweis(`„${t.titel}“ kannst du nur ansehen (${QUELLEN_NAMEN[t.quelle]}): ${SYNC_HINWEIS}`)
    } else if (!bearbeitbar(t)) {
      // Wortlaut wie auf termine/[id]/page.tsx
      const sparte = t.sparteId != null ? SPARTEN_NAMEN[t.sparteId] : null
      setOffen(false)
      setHinweis(`„${t.titel}“ kannst du nur ansehen: Diesen Termin können nur Admins${sparte ? ` und die Verantwortlichen der Sparte ${sparte}` : ''} ändern.`)
    } else {
      setOffen(false)
      setHinweis(`Das ist „${t.titel}“ – gesucht ist das Jugend-Hallenturnier.`)
    }
  }

  const liste = (termine: Termin[]) => {
    const gruppen: { monat: string; termine: Termin[] }[] = []
    termine.forEach(t => {
      const monat = `${MONATE[Number(t.datum.slice(5, 7)) - 1]} ${t.datum.slice(0, 4)}`
      const letzte = gruppen[gruppen.length - 1]
      if (letzte && letzte.monat === monat) letzte.termine.push(t)
      else gruppen.push({ monat, termine: [t] })
    })
    return (
      <div className="space-y-6">
        {gruppen.map(g => (
          <div key={g.monat}>
            <h4 className="mb-1.5 text-xs text-[#6b6b6b]">{g.monat}</h4>
            <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
              {g.termine.map(t => {
                const tag = new Date(t.datum + 'T12:00:00Z')
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => oeffnen(t)} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-[#0a0a0a]/[0.03]">
                      <span className="w-11 shrink-0 text-center leading-tight">
                        <span className="block text-[11px] uppercase text-[#6b6b6b]">{WOCHENTAGE_KURZ[tag.getUTCDay()]}</span>
                        <span className="block font-display text-2xl tabular-nums">{t.datum.slice(8, 10)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{t.titel}</span>
                          {t.quelle !== 'manuell' && <Badge>{QUELLEN_NAMEN[t.quelle]}</Badge>}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#6b6b6b]">{[t.uhrzeit, t.ort, etikett(t)].filter(Boolean).join(' · ')}</span>
                      </span>
                      {bearbeitbar(t) ? (
                        <ChevronRight size={16} className="shrink-0 text-[#6b6b6b]" aria-hidden="true" />
                      ) : t.quelle === 'manuell' ? (
                        <Lock size={15} className="shrink-0 text-[#6b6b6b]" aria-label="Nur ansehen" />
                      ) : (
                        <RefreshCw size={15} className="shrink-0 text-[#6b6b6b]" aria-label="Wird automatisch abgeglichen" />
                      )}
                    </button>
                    {/* Sichtbare Rückmeldung; vorgelesen wird sie über die Live-Region unter der Liste */}
                    {angetippt === t.id && (hinweis || offen) && (
                      <div
                        aria-hidden="true"
                        className={`mx-1 mb-2.5 rounded-sm border px-3 py-2 text-sm leading-relaxed ${
                          hinweis ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        }`}
                      >
                        {hinweis ?? FORMULAR_OFFEN}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Spielwiese>
      <div className="mb-4">
        <h3 className="font-display text-3xl leading-none tracking-tight">TERMINE</h3>
        <div className="mt-2 text-sm text-[#6b6b6b]">Vereinstermine und Spiele, wie sie auf der Website erscheinen.</div>
      </div>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER.map(f => (
            <button
              key={f.wert}
              type="button"
              aria-pressed={f.wert === quelle}
              onClick={() => setQuelle(f.wert)}
              className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                f.wert === quelle ? 'border-[#0a0a0a] bg-[#0a0a0a] text-[#f5f5f0]' : 'border-[#0a0a0a]/20 bg-white hover:border-[#0a0a0a]/50'
              }`}
            >
              {f.text} <span className="tabular-nums opacity-60">{anzahl(f.wert)}</span>
            </button>
          ))}
          <button
            type="button"
            role="switch"
            aria-checked={vergangene}
            onClick={() => setVergangene(v => !v)}
            className="ml-auto inline-flex items-center gap-2 text-sm text-[#4a4a4a] hover:text-[#0a0a0a]"
          >
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border ${vergangene ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'border-[#0a0a0a]/40 bg-white'}`}
              aria-hidden="true"
            >
              {vergangene && '✓'}
            </span>
            auch vergangene
          </button>
        </div>

        {gefiltert.some(t => t.quelle !== 'manuell') && (
          <Meldung art="hinweis">
            <span className="inline-flex items-start gap-2">
              <RefreshCw size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Spiele von fussball.de und click-tt lassen sich hier nur ansehen: Sie werden jede Nacht automatisch abgeglichen – Änderungen hier würden
                überschrieben.
              </span>
            </span>
          </Meldung>
        )}

        <Karte titel="Kommende Termine">{kommende.length === 0 ? <LeerHinweis>Keine kommenden Termine.</LeerHinweis> : liste(kommende)}</Karte>
        {vergangene && (
          <Karte titel="Vergangene Termine">{alte.length === 0 ? <LeerHinweis>Keine vergangenen Termine.</LeerHinweis> : liste(alte)}</Karte>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {hinweis ?? (offen ? FORMULAR_OFFEN : '')}
      </p>
    </Spielwiese>
  )
}

/* ── Prüfungen für die Aufgaben ───────────────────────────────────────────── */

const mitUhr = (uhrzeit: string) => /\buhr\b/i.test(uhrzeit)
const zeitGleich = (uhrzeit: string, soll: string) => uhrzeit.replace(/\./g, ':').replace(/\s+/g, '') === soll

/** Gibt es das Wort schon in anderer Schreibweise? Dann die vorhandene zurückgeben. */
function andereSchreibweise(wert: string, vorhanden: string[]): string | null {
  const treffer = vorhanden.find(v => v.toLowerCase() === wert.toLowerCase())
  return treffer && treffer !== wert ? treffer : null
}

const TURNIER_FERTIG: Termin = {
  ...HALLENTURNIER,
  uhrzeit: '10:00',
  ort: 'Sporthalle Holm-Seppensen',
  beschreibung: 'Ganztägig: Turnier für die U11 bis U13 mit Mannschaften aus dem Kreis.',
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Den Termin finden',
    aufgabe: (
      <>
        In dieser Übung bist du Spartenleitung Fußball. Öffne das <strong>Jugend-Hallenturnier</strong> im Februar. Tipp: Mit „Eigene Termine“
        blendest du die Spiele aus.
      </>
    ),
    Inhalt: TermineListe,
    danach:
      'Kreisende Pfeile heißen: kommt automatisch von fussball.de oder click-tt. Ein Schloss heißt: Den Termin darfst du nur ansehen, etwa weil er für den ganzen Verein oder eine andere Sparte gilt.',
  },
  {
    titel: 'Einen Termin eintragen',
    aufgabe: (
      <>
        Trag den Elternabend ein: Titel <strong>Elternabend Fußball-Jugend</strong>, am <strong>12. März {J}</strong> um <strong>19:00</strong> im{' '}
        <strong>Vereinsheim</strong>. Klick dann auf „Speichern“.
      </>
    ),
    Inhalt: props => (
      <TerminUebung
        {...props}
        start={null}
        andere={[SPIEL]}
        aufgabe={t => {
          if (!t.titel.toLowerCase().includes('elternabend')) return 'Der Titel soll „Elternabend Fußball-Jugend“ heißen.'
          if (t.datum !== `${J}-03-12`) return `Der Elternabend ist am 12. März ${J}.`
          if (mitUhr(t.uhrzeit)) return 'Lass „Uhr“ bei der Uhrzeit weg – die Website schreibt es selbst dahinter. Sonst stünde dort „19:00 Uhr Uhr“.'
          if (!zeitGleich(t.uhrzeit, '19:00')) return 'Trag als Uhrzeit „19:00“ ein.'
          if (!t.ort.toLowerCase().includes('vereinsheim')) return 'Als Ort bitte „Vereinsheim“ eintragen.'
          return null
        }}
      />
    ),
    danach:
      'Pflicht sind nur Titel und Datum – Uhrzeit und Ort solltest du trotzdem immer ausfüllen. In echt landest du nach dem Speichern auf der Seite „Termin bearbeiten“. Der Termin steht sofort im Kalender.',
  },
  {
    titel: 'Uhrzeit und Ort richtig',
    aufgabe: (
      <>
        Schau in die Vorschau: Beim Hallenturnier steht „ganztägig Uhr“ und kein Ort. Der Hinweis unter „Uhrzeit“ nennt „ganztägig“ zwar als
        Beispiel, die Website hängt aber immer „Uhr“ an. Trag deshalb als Uhrzeit <strong>10:00</strong> und als Ort{' '}
        <strong>Sporthalle Holm-Seppensen</strong> ein und schreib <strong>ganztägig</strong> in die Beschreibung.
      </>
    ),
    Inhalt: props => (
      <TerminUebung
        {...props}
        start={HALLENTURNIER}
        andere={[SPIEL]}
        aufgabe={t => {
          if (mitUhr(t.uhrzeit)) return 'Lass „Uhr“ bei der Uhrzeit weg – die Website schreibt es selbst dahinter.'
          if (/ganzt/i.test(t.uhrzeit)) return '„ganztägig“ im Feld „Uhrzeit“ würde auf der Website zu „ganztägig Uhr“. Trag dort die Startzeit „10:00“ ein.'
          if (!zeitGleich(t.uhrzeit, '10:00')) return 'Trag bei „Uhrzeit“ nur die Startzeit „10:00“ ein.'
          if (!t.ort.toLowerCase().includes('sporthalle')) return 'Als Ort bitte „Sporthalle Holm-Seppensen“ eintragen.'
          if (!t.beschreibung.toLowerCase().includes('ganztägig')) return 'Schreib „ganztägig“ in die Beschreibung, z. B. „Ganztägig: Turnier für …“.'
          return null
        }}
      />
    ),
    danach:
      'Hinter der Uhrzeit steht auf der Website immer „Uhr“ – auch hinter Wörtern wie „ganztägig“. Trag im Feld deshalb eine Zeit wie „10:00“ oder „10:00–13:00“ ein, auch wenn der Hinweis darunter „ganztägig“ nennt.',
  },
  {
    titel: 'Etikett und Stichwörter',
    aufgabe: (
      <>
        Damit Familien das Turnier über die Filter finden: Setz als Bereich <strong>Jugend</strong> und als Stichwörter <strong>Turnier, Kinder</strong>{' '}
        – genau in der Schreibweise, die es schon gibt.
      </>
    ),
    Inhalt: props => (
      <TerminUebung
        {...props}
        start={TURNIER_FERTIG}
        andere={[SOMMERFEST]}
        aufgabe={t => {
          const bereichAnders = andereSchreibweise(t.bereich, BEREICHE)
          if (bereichAnders) return `Den Bereich gibt es schon als „${bereichAnders}“ – nimm genau diese Schreibweise.`
          if (t.bereich !== 'Jugend') return 'Trag bei „Bereich (Anzeige auf der Website)“ „Jugend“ ein oder wähl den Vorschlag.'
          for (const tag of t.tags) {
            const anders = andereSchreibweise(tag, BISHERIGE_TAGS)
            if (anders) return `„${tag}“ gibt es schon als „${anders}“. Nimm genau diese Schreibweise – sonst stünde der Filter auf der Website zweimal da.`
          }
          if (!t.tags.includes('Turnier') || !t.tags.includes('Kinder')) return 'Trag bei „Stichwörter“ „Turnier, Kinder“ ein – mit Komma getrennt.'
          return null
        }}
      />
    ),
    danach:
      'Aus Etikett und Stichwörtern werden auf der Website Filter-Knöpfe. Probier sie in der Vorschau aus: Bei „Turnier“ bleibt nur das Hallenturnier stehen, bei „Kinder“ auch das Sommerfest.',
  },
  {
    titel: 'Und die Spiele?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Das Heimspiel der Herren wurde bei fussball.de auf eine andere Uhrzeit verlegt. Was machst du in der Verwaltung?"
        antworten={[
          {
            text: 'Das Spiel öffnen und die Uhrzeit ändern.',
            erklaerung: 'Spiele von fussball.de und click-tt kann niemand in der Verwaltung ändern, auch Admins nicht. Sie stehen dort auf „nur ansehen“.',
          },
          { text: 'Das Spiel zusätzlich als eigenen Termin eintragen.', erklaerung: 'Dann stünde das Spiel doppelt im Kalender. Es kommt schon automatisch.' },
          { text: 'Nichts – die Änderung kommt mit dem nächtlichen Abgleich.', richtig: true },
        ]}
      />
    ),
    danach: 'Eigene Termine trägst du ein – Spiele kommen von allein. So bleibt der Kalender ohne doppelte Einträge.',
  },
]
