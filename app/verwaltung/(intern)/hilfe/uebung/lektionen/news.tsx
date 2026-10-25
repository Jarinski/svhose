'use client'

/**
 * Übung "News schreiben" – Nachbau des Formulars "Neue News" bzw. "News bearbeiten"
 * (app/verwaltung/(intern)/news/NewsFormular.tsx) mit denselben Prüfungen und Meldungen
 * (lib/verwaltung/inhalte/news.ts, news/aktionen.ts) und einer Vorschau der News-Karten
 * auf /news (app/news/page.tsx, components/NewsThumbnail.tsx).
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight, ExternalLink, ImagePlus, Trash2, Undo2 } from 'lucide-react'
import MarkdownFeld from '@/components/verwaltung/inhalte/MarkdownFeld'
import Schalter from '@/components/verwaltung/inhalte/Schalter'
import { auswahlKlasse, Badge, eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { slugify, zeitpunktDeutsch } from '@/lib/verwaltung/text'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

/* ── Beispieldaten ─────────────────────────────────────────────────────────── */

/** "Gehört zu" – so sieht die Auswahl für eine Spartenleitung Fußball aus. */
const ZUORDNUNGEN = [
  {
    titel: 'Fußball',
    optionen: [
      { wert: 'sparte:1', text: 'Ganze Sparte Fußball' },
      { wert: 'mannschaft:1', text: 'Herren (Mannschaft)' },
      { wert: 'mannschaft:2', text: 'U12 (Mannschaft)' },
      { wert: 'mannschaft:3', text: 'U13 (Mannschaft)' },
    ],
  },
]
const U13 = 'mannschaft:3'
const KATEGORIEN = ['Fußball', 'Jugend', 'Verein']

const BILDER = {
  mannschaft: { datei: 'mannschaftsfoto.jpg', format: 'Querformat', verhaeltnis: '3 / 2' },
  plakat: { datei: 'plakat-sommerfest.jpg', format: 'Hochformat', verhaeltnis: '3 / 4' },
} as const
type BildSchluessel = keyof typeof BILDER

interface News {
  titel: string
  slug: string
  teaser: string
  inhalt: string
  datum: string
  kategorie: string
  zuordnung: string
  bild: BildSchluessel | null
  veroeffentlicht: boolean
}

/**
 * Heutiges Datum in deutscher Zeit (wie heuteBerlin) – Standard für neue News. Wird bei jedem
 * Aufruf neu berechnet statt einmal beim Laden: Ein Server läuft oft über Mitternacht.
 */
function heute(): string {
  const teile = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const teil = (typ: string) => teile.find(t => t.type === typ)?.value ?? ''
  return `${teil('year')}-${teil('month')}-${teil('day')}`
}

/** "Zuletzt gespeichert" des Beispiel-Entwurfs: gestern Abend (feste Uhrzeit, damit Server und Browser gleich rechnen) */
function gesternAbend(): string {
  const d = new Date(`${heute()}T16:20:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString()
}

/** Eine schon veröffentlichte News, damit die Vorschau nicht leer ist. */
const ANDERE_NEWS: News = {
  titel: 'Neue Trikots für die U12',
  slug: 'neue-trikots-fuer-die-u12',
  teaser: 'Dank eines Sponsors aus dem Ort laufen die Kinder ab sofort in neuen Trikots auf.',
  inhalt: '',
  datum: '2026-09-12',
  kategorie: 'Fußball',
  zuordnung: 'mannschaft:2',
  bild: null,
  veroeffentlicht: true,
}

const TITEL = 'U13 lädt zum Sommerfest'
const TEASER = 'Am Samstag feiern wir mit allen Familien auf dem Sportplatz.'
const TEXT_ANFANG = 'Die U13 lädt alle Familien zum Sommerfest ein. Los geht es am Samstag, 13. Juni, um 14 Uhr auf dem Sportplatz.\n\nDas erwartet euch:'
const TEXT_FERTIG =
  'Die U13 lädt alle Familien zum Sommerfest ein. Los geht es am **Samstag, 13. Juni**, um 14 Uhr auf dem Sportplatz.\n\nDas erwartet euch:\n\n- Hüpfburg\n- Grillstand\n- Torwandschießen'

/** Der Entwurf aus Lektion 1 – mit heutigem Datum */
const entwurf = (): News => ({
  titel: TITEL,
  slug: 'u13-laedt-zum-sommerfest',
  teaser: TEASER,
  inhalt: TEXT_ANFANG,
  datum: heute(),
  kategorie: '',
  zuordnung: U13,
  bild: null,
  veroeffentlicht: false,
})

/* ── Dieselben Prüfungen und Texte wie beim echten Speichern ──────────────── */

const FELDER_PRUEFEN = 'Bitte die markierten Felder prüfen.'
const SLUG_VERGEBEN = 'Diese Adresse ist schon an eine andere News vergeben. Bitte eine andere wählen.'
const BELEGTE_ADRESSEN = [ANDERE_NEWS.slug]

function istDatum(wert: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false
  const d = new Date(wert + 'T12:00:00Z')
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert
}

/** Wie newsPruefen in lib/verwaltung/inhalte/news.ts */
function newsPruefen(n: News): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!n.titel) felder.titel = 'Bitte eine Überschrift eintragen.'
  else if (n.titel.length > 200) felder.titel = 'Die Überschrift ist zu lang (höchstens 200 Zeichen).'
  if (!istDatum(n.datum)) felder.datum = 'Bitte ein gültiges Datum wählen.'
  if (!n.zuordnung) felder.zuordnung = 'Bitte auswählen, zu wem die News gehört.'
  return felder
}

/** Freie Adresse: basis, sonst basis-2, basis-3 … (wie freierNewsSlug) */
function freieAdresse(basis: string): string {
  const grund = basis || 'news'
  let kandidat = grund
  for (let n = 2; BELEGTE_ADRESSEN.includes(kandidat); n++) kandidat = `${grund}-${n}`
  return kandidat
}

const mehrzeilig = (wert: FormDataEntryValue | null) => (typeof wert === 'string' ? wert : '').replace(/\r\n?/g, '\n').trim()

/* ── Beispielbilder (gezeichnet statt Foto) ───────────────────────────────── */

function BeispielBild({ bild }: { bild: BildSchluessel }) {
  if (bild === 'mannschaft') {
    return (
      <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
        <rect width="300" height="200" fill="#d6d6d0" />
        <rect y="125" width="300" height="75" fill="#8c8c86" />
        <rect x="35" y="55" width="230" height="80" fill="none" stroke="#f5f5f0" strokeWidth="5" />
        {[60, 90, 120, 150, 180, 210, 240].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={i % 2 ? 92 : 98} r="10" fill="#3a3a3a" />
            <rect x={x - 11} y={i % 2 ? 104 : 110} width="22" height="44" rx="5" fill="#0a0a0a" />
          </g>
        ))}
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 150 200" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <rect width="150" height="200" fill="#0a0a0a" />
      <circle cx="75" cy="62" r="30" fill="#f5f5f0" />
      <text x="75" y="135" textAnchor="middle" fontSize="34" fill="#f5f5f0" className="font-display">
        SOMMER
      </text>
      <text x="75" y="170" textAnchor="middle" fontSize="34" fill="#f5f5f0" className="font-display">
        FEST
      </text>
    </svg>
  )
}

/**
 * Nachbau von BildFeld: In echt öffnet "Bild auswählen" die Dateiauswahl des Geräts –
 * hier tippst du auf eins der Beispielbilder.
 */
function BildAuswahl({
  aktuell,
  wert,
  aendern,
}: {
  /** gespeichertes Bild */
  aktuell: BildSchluessel | null
  wert: BildSchluessel | null
  aendern: (b: BildSchluessel | null) => void
}) {
  const [waehlen, setWaehlen] = useState(false)
  const entfernt = aktuell != null && wert == null

  return (
    <div className="space-y-3">
      {wert ? (
        <div
          className={`overflow-hidden rounded-sm border border-[#0a0a0a]/10 ${wert === 'plakat' ? 'w-full max-w-[12rem]' : 'w-full max-w-xs'}`}
          style={{ aspectRatio: BILDER[wert].verhaeltnis }}
          role="img"
          aria-label={`Vorschau des Bildes: ${BILDER[wert].datei}`}
        >
          <BeispielBild bild={wert} />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-[#0a0a0a]/20 text-sm text-[#6b6b6b]">Kein Bild</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setWaehlen(w => !w)} aria-expanded={waehlen} className={knopfKlassen.sekundaer}>
          <ImagePlus size={15} aria-hidden="true" />
          {wert ? 'Anderes Bild wählen' : 'Bild auswählen'}
        </button>
        {wert && (
          <button
            type="button"
            className={knopfKlassen.leise}
            onClick={() => {
              setWaehlen(false)
              aendern(null)
            }}
          >
            <Trash2 size={15} aria-hidden="true" /> Bild entfernen
          </button>
        )}
        {entfernt && (
          <button type="button" className={knopfKlassen.leise} onClick={() => aendern(aktuell)}>
            <Undo2 size={15} aria-hidden="true" /> Rückgängig
          </button>
        )}
      </div>

      {waehlen && (
        <div className="rounded-sm border border-[#0a0a0a]/15 bg-[#fafaf8] p-3">
          <p className="mb-2 text-xs leading-relaxed text-[#6b6b6b]">
            In echt öffnet sich jetzt die Dateiauswahl deines Handys oder Computers. In der Übung tippst du auf ein Beispielbild:
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(BILDER) as BildSchluessel[]).map(b => (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => {
                    setWaehlen(false)
                    aendern(b)
                  }}
                  className="flex w-full items-center gap-3 rounded-sm border border-[#0a0a0a]/15 bg-white p-2 text-left hover:border-[#0a0a0a]/40"
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-sm" aria-hidden="true">
                    <BeispielBild bild={b} />
                  </span>
                  <span className="min-w-0">
                    <span className="block break-all text-sm font-medium">{BILDER[b].datei}</span>
                    <span className="block text-xs text-[#6b6b6b]">Foto im {BILDER[b].format}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {wert && wert !== aktuell && <p className="text-xs text-[#6b6b6b]">Neues Bild – wird beim Speichern hochgeladen.</p>}
      {entfernt && <p className="text-xs text-[#6b6b6b]">Das Bild wird beim Speichern entfernt.</p>}
    </div>
  )
}

/* ── Vorschau: so erscheinen die News auf /news ─────────────────────────────── */

function WebsiteNews({ news }: { news: News | null }) {
  const sichtbar = [ANDERE_NEWS].concat(news?.veroeffentlicht ? [news] : []).sort((a, b) => b.datum.localeCompare(a.datum))
  return (
    <Vorschau adresse="/news">
      <div className="mb-6">
        <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-[#6b6b6b]">Aktuelles</div>
        <div className="font-display text-5xl tracking-tight">NEWS</div>
      </div>
      <div className="grid grid-cols-1 gap-px bg-[#0a0a0a]/10 sm:grid-cols-2">
        {sichtbar.map(post => (
          <div key={post.slug} className="group flex flex-col bg-[#f5f5f0] transition-all duration-300 hover:bg-[#0a0a0a] hover:text-[#f5f5f0]">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#e9e9e2]">
              {post.bild ? (
                <div className="absolute inset-0" role="img" aria-label={post.titel}>
                  <BeispielBild bild={post.bild} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/SV_Holm_Seppensen_Logo.svg" alt="" aria-hidden="true" className="h-14 w-14 object-contain opacity-20" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b] group-hover:text-[#f5f5f0]/50">
                {post.kategorie || 'News'} — {format(new Date(post.datum + 'T12:00:00'), 'd. MMMM yyyy', { locale: de })}
              </div>
              <div className="mb-4 font-display text-2xl leading-tight tracking-tight">{post.titel}</div>
              <p className="flex-1 text-sm leading-relaxed text-[#6b6b6b] group-hover:text-[#f5f5f0]/60">{post.teaser}</p>
              <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.1em] opacity-0 transition-opacity group-hover:opacity-100">
                Weiterlesen <ArrowRight size={12} aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {news && !news.veroeffentlicht && (
        <p className="mt-3 text-xs text-[#6b6b6b]">„{news.titel}“ steht hier nicht – Entwürfe erscheinen nicht auf der Website.</p>
      )}
    </Vorschau>
  )
}

/* ── Nachbau des News-Formulars ────────────────────────────────────────────── */

type Meldungsart = { art: 'erfolg' | 'fehler' | 'hinweis'; text: string }

/**
 * Formular "Neue News" (start = null) bzw. "News bearbeiten". Die Felder sind wie im echten
 * Formular ungesteuert und werden beim Speichern aus dem Formular gelesen. `aufgabe` prüft
 * danach, ob die Aufgabe erfüllt ist, und liefert sonst einen Hinweis.
 */
function NewsUebung({
  start,
  aufgabe,
  geloest,
}: {
  start: News | null
  aufgabe: (n: News, stand: { vorschauGesehen: boolean }) => string | null
} & LektionProps) {
  const [gespeichert, setGespeichert] = useState<News | null>(start)
  const [titel, setTitel] = useState(start?.titel ?? '')
  const [bild, setBild] = useState<BildSchluessel | null>(start?.bild ?? null)
  const [geaendert, setGeaendert] = useState(false)
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<Meldungsart | null>(null)
  const [vorschauGesehen, setVorschauGesehen] = useState(false)
  const [loeschHinweis, setLoeschHinweis] = useState(false)
  const [zuletzt, setZuletzt] = useState(() => (start ? gesternAbend() : ''))
  const [heuteWert] = useState(heute)
  const neu = gespeichert == null
  const merken = () => setGeaendert(true)

  function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const daten = new FormData(e.currentTarget)
    const text = (name: string) => {
      const wert = daten.get(name)
      return typeof wert === 'string' ? wert.trim() : ''
    }
    const eingabe: News = {
      titel: text('titel'),
      slug: text('slug'),
      teaser: mehrzeilig(daten.get('teaser')),
      inhalt: mehrzeilig(daten.get('inhalt')),
      datum: text('datum'),
      kategorie: text('kategorie'),
      zuordnung: text('zuordnung'),
      bild,
      veroeffentlicht: daten.get('veroeffentlicht') === '1',
    }

    const felder = newsPruefen(eingabe)
    // Adresse: neu = aus der Überschrift; beim Ändern die eingetragene (leer = neu aus der Überschrift)
    let slug = ''
    if (Object.keys(felder).length === 0) {
      if (neu) slug = freieAdresse(slugify(eingabe.titel))
      else {
        const gewuenscht = slugify(eingabe.slug)
        if (!gewuenscht) slug = freieAdresse(slugify(eingabe.titel))
        else if (gewuenscht !== gespeichert.slug && BELEGTE_ADRESSEN.includes(gewuenscht)) felder.slug = SLUG_VERGEBEN
        else slug = gewuenscht
      }
    }
    setFehler(felder)
    if (Object.keys(felder).length) {
      setMeldung({ art: 'fehler', text: FELDER_PRUEFEN })
      return
    }

    const fertig = { ...eingabe, slug }
    const hinweis = aufgabe(fertig, { vorschauGesehen })
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    setMeldung({
      art: 'erfolg',
      text: neu
        ? fertig.veroeffentlicht
          ? 'Die News ist angelegt und auf der Website zu sehen.'
          : 'Die News ist als Entwurf angelegt – noch nicht auf der Website.'
        : fertig.veroeffentlicht
          ? 'Gespeichert – die News ist auf der Website zu sehen.'
          : 'Gespeichert – als Entwurf, noch nicht auf der Website.',
    })
    setGespeichert(fertig)
    setZuletzt(new Date().toISOString())
    setGeaendert(false)
    setLoeschHinweis(false)
    geloest()
  }

  const fe = (feld: string) => fehler[feld]

  return (
    <div className="space-y-5">
      <Spielwiese>
        {/* Seitenkopf wie auf /verwaltung/news/neu bzw. /verwaltung/news/[id] */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-3xl leading-none tracking-tight">{neu ? 'NEUE NEWS' : 'NEWS BEARBEITEN'}</h3>
            <div className="mt-2 text-sm text-[#6b6b6b]">
              {neu ? (
                'Wird erst auf der Website gezeigt, wenn „Veröffentlicht“ eingeschaltet ist.'
              ) : (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {gespeichert.veroeffentlicht ? <Badge ton="erfolg">veröffentlicht</Badge> : <Badge ton="warnung">Entwurf</Badge>}
                  <span>Zuletzt gespeichert {zeitpunktDeutsch(zuletzt)}</span>
                </span>
              )}
            </div>
          </div>
          {!neu && gespeichert.veroeffentlicht && (
            <button
              type="button"
              onClick={() => document.getElementById('uebung-news-website')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={knopfKlassen.sekundaer}
            >
              Auf Website ansehen <ExternalLink size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* method="dialog": Auch vor dem fertigen Laden der Seite schickt "Speichern" nichts ab */}
        <form onSubmit={speichern} onChange={merken} method="dialog" noValidate className="space-y-5">
          <Karte titel="Text">
            <div className="space-y-5">
              <Feld label="Überschrift" htmlFor="uebung-titel" fehler={fe('titel')}>
                <input
                  id="uebung-titel"
                  name="titel"
                  maxLength={200}
                  defaultValue={start?.titel ?? ''}
                  onChange={e => setTitel(e.target.value)}
                  aria-invalid={!!fe('titel') || undefined}
                  className={`${eingabeKlasse} text-lg`}
                  autoComplete="off"
                />
              </Feld>

              {neu ? (
                <p className="-mt-2 text-xs text-[#6b6b6b]">
                  Adresse auf der Website: <span className="break-all font-mono">/news/{slugify(titel) || '…'}</span> (wird automatisch aus der
                  Überschrift erzeugt)
                </p>
              ) : (
                <Feld
                  label="Adresse auf der Website"
                  htmlFor="uebung-slug"
                  fehler={fe('slug')}
                  hinweis="Nach dem Veröffentlichen möglichst nicht mehr ändern – sonst funktionieren geteilte Links nicht mehr."
                >
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center rounded-l-sm border border-r-0 border-[#0a0a0a]/20 bg-[#f0f0ea] px-3 text-sm text-[#6b6b6b]">
                      /news/
                    </span>
                    <input
                      key={gespeichert.slug}
                      id="uebung-slug"
                      name="slug"
                      defaultValue={gespeichert.slug}
                      spellCheck={false}
                      aria-invalid={!!fe('slug') || undefined}
                      className={`${eingabeKlasse} min-w-0 rounded-l-none`}
                    />
                  </div>
                </Feld>
              )}

              <Feld label="Kurzbeschreibung (Teaser)" htmlFor="uebung-teaser" hinweis="Ein bis zwei Sätze – erscheint in der News-Übersicht und über dem Text.">
                <textarea id="uebung-teaser" name="teaser" rows={3} defaultValue={start?.teaser ?? ''} className={eingabeKlasse} />
              </Feld>

              {/* Merkt sich, ob die Vorschau des Textes einmal angesehen wurde */}
              <div
                onClick={e => {
                  const reiter = (e.target as HTMLElement).closest('[role="tab"]')
                  if (reiter?.textContent?.trim() === 'Vorschau') setVorschauGesehen(true)
                }}
              >
                <Feld label="Text" htmlFor="uebung-inhalt">
                  <MarkdownFeld id="uebung-inhalt" name="inhalt" standardwert={start?.inhalt ?? ''} zeilen={10} />
                </Feld>
              </div>
            </div>
          </Karte>

          <Karte titel="Einordnung">
            <div className="grid gap-5 sm:grid-cols-2">
              <Feld label="Datum" htmlFor="uebung-datum" fehler={fe('datum')}>
                <input
                  id="uebung-datum"
                  name="datum"
                  type="date"
                  defaultValue={start?.datum ?? heuteWert}
                  aria-invalid={!!fe('datum') || undefined}
                  className={eingabeKlasse}
                />
              </Feld>
              <Feld label="Kategorie" htmlFor="uebung-kategorie" hinweis="Zum Beispiel „Verein“ oder „Fußball“ – eintippen oder Vorschlag wählen.">
                <input
                  id="uebung-kategorie"
                  name="kategorie"
                  list="uebung-news-kategorien"
                  defaultValue={start?.kategorie ?? ''}
                  className={eingabeKlasse}
                  autoComplete="off"
                />
                <datalist id="uebung-news-kategorien">
                  {KATEGORIEN.map(k => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </Feld>
              <Feld
                label="Gehört zu"
                htmlFor="uebung-zuordnung"
                fehler={fe('zuordnung')}
                className="sm:col-span-2"
                hinweis="Bestimmt, wer die News später bearbeiten darf und wo sie zugeordnet wird."
              >
                <select id="uebung-zuordnung" name="zuordnung" defaultValue={start?.zuordnung ?? ZUORDNUNGEN[0].optionen[0].wert} className={auswahlKlasse}>
                  {ZUORDNUNGEN.map(g => (
                    <optgroup key={g.titel} label={g.titel}>
                      {g.optionen.map(o => (
                        <option key={o.wert} value={o.wert}>
                          {o.text}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Feld>
            </div>
          </Karte>

          <Karte titel="Beitragsbild" beschreibung="Optional. Wird oben in der News und in der Übersicht gezeigt.">
            <BildAuswahl
              aktuell={gespeichert?.bild ?? null}
              wert={bild}
              aendern={b => {
                setBild(b)
                merken()
              }}
            />
          </Karte>

          <Karte>
            <Schalter
              name="veroeffentlicht"
              label="Veröffentlicht"
              standard={start?.veroeffentlicht ?? false}
              hinweisAn="Die News erscheint nach dem Speichern auf der Website."
              hinweisAus="Entwurf – erscheint nicht auf der Website."
            />
          </Karte>

          <UebungsLeiste geaendert={geaendert} meldung={meldung && (meldung.art !== 'erfolg' || !geaendert) ? meldung : null} />
        </form>

        {!neu && (
          <div className="mt-6 space-y-3 border-t border-[#0a0a0a]/10 pt-6">
            {loeschHinweis && (
              <Meldung art="hinweis">
                In echt kommt jetzt die Rückfrage „Die News „{gespeichert.titel}“ wirklich löschen? Das lässt sich nicht rückgängig machen.“ In der Übung
                wird nichts gelöscht.
              </Meldung>
            )}
            <button type="button" onClick={() => setLoeschHinweis(true)} className={knopfKlassen.gefahr}>
              <Trash2 size={15} aria-hidden="true" /> News löschen
            </button>
          </div>
        )}
      </Spielwiese>
      <div id="uebung-news-website" className="scroll-mt-4">
        <WebsiteNews news={gespeichert} />
      </div>
    </div>
  )
}

/* ── Prüfungen für die Aufgaben ───────────────────────────────────────────── */

const gleich = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Ein Listenpunkt "- Hüpfburg" oder "1. Hüpfburg" am Zeilenanfang. */
const hatPunkt = (text: string, punkt: string) => new RegExp(`^\\s*(?:[-*+]|\\d+[.)])\\s+${punkt}`, 'im').test(text)

/** Steht "13. Juni" zwischen zwei Sternchen-Paaren? */
const hatFett = (text: string) => Array.from(text.matchAll(/\*\*([^*\n]+?)\*\*/g)).some(t => t[1].includes('13. Juni'))

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Einen Entwurf anlegen',
    aufgabe: (
      <>
        Schreib eine neue News mit der Überschrift <strong>{TITEL}</strong>. Als Kurzbeschreibung kommt dazu: <strong>„{TEASER}“</strong> Sie gehört
        zur <strong>U13</strong>. Speichere sie erst einmal als <strong>Entwurf</strong>.
      </>
    ),
    Inhalt: props => (
      <NewsUebung
        {...props}
        start={null}
        aufgabe={n => {
          if (!gleich(n.titel, TITEL)) return `Die Überschrift soll „${TITEL}“ heißen.`
          if (!n.teaser) return `Trag noch die Kurzbeschreibung ein: „${TEASER}“`
          if (n.zuordnung !== U13)
            return 'Bei „Gehört zu“ steht noch ein anderer Eintrag – vorausgewählt ist immer der erste der Liste. Wähl „U13 (Mannschaft)“.'
          if (n.veroeffentlicht) return 'Lass „Veröffentlicht“ noch aus – die News soll erst ein Entwurf sein.'
          return null
        }}
      />
    ),
    danach:
      'In echt landest du nach dem Speichern auf der Seite deiner News – jetzt mit dem Feld „Adresse auf der Website“. Die Adresse entsteht aus der Überschrift, aus „ä“ wird dabei „ae“. Auf der Website steht der Entwurf noch nicht.',
  },
  {
    titel: 'Den Text gestalten',
    aufgabe: (
      <>
        Mach im Text <strong>Samstag, 13. Juni</strong> fett. Schreib darunter eine Liste mit drei Punkten: <strong>Hüpfburg</strong>,{' '}
        <strong>Grillstand</strong>, <strong>Torwandschießen</strong>. Jede Zeile der Liste beginnt mit einem Minus und einem Leerzeichen, z. B.{' '}
        <code className="font-mono">- Hüpfburg</code>. Prüf das Ergebnis mit „Vorschau“ und speichere.
      </>
    ),
    Inhalt: props => (
      <NewsUebung
        {...props}
        start={entwurf()}
        aufgabe={(n, { vorschauGesehen }) => {
          if (!hatFett(n.inhalt)) return 'Setz zwei Sternchen vor und hinter das Datum: **Samstag, 13. Juni**'
          const fehlt = ['Hüpfburg', 'Grillstand', 'Torwandschießen'].filter(p => !hatPunkt(n.inhalt, p))
          if (fehlt.length)
            return `Für die Liste beginnt jede Zeile mit einem Minus und einem Leerzeichen, z. B. „- Hüpfburg“. Noch nicht als Punkt erkannt: ${fehlt.join(', ')}.`
          if (!vorschauGesehen) return 'Schau dir den Text einmal mit „Vorschau“ über dem Textfeld an – dort siehst du, ob Fettschrift und Liste klappen.'
          return null
        }}
      />
    ),
    danach:
      'Die Vorschau sieht genauso aus wie später die News auf der Website. Kommt nach einer Liste noch ein Absatz, lass davor eine Leerzeile – sonst hängt die Website ihn an den letzten Punkt.',
  },
  {
    titel: 'Mit Bild veröffentlichen',
    aufgabe: (
      <>
        Jetzt darf die News online: Trag als Kategorie <strong>Fußball</strong> ein, wähl als Beitragsbild das <strong>Mannschaftsfoto</strong> und
        schalte <strong>Veröffentlicht</strong> ein.
      </>
    ),
    Inhalt: props => (
      <NewsUebung
        {...props}
        start={{ ...entwurf(), inhalt: TEXT_FERTIG }}
        aufgabe={n => {
          if (n.kategorie !== 'Fußball') {
            // "Fussball" oder "fußball": fast richtig – aber jede Schreibweise wird ein eigener Vorschlag
            if (slugify(n.kategorie) === 'fussball')
              return `Schreib „Fußball“ genau wie der Vorschlag – mit „ß“ und großem „F“. Sonst stünde „${n.kategorie}“ beim nächsten Mal als zweiter Vorschlag neben „Fußball“.`
            return 'Trag bei „Kategorie“ „Fußball“ ein oder wähl den Vorschlag.'
          }
          if (n.bild === 'plakat')
            return 'In der Übersicht schneidet die Website das Bild auf ein Querformat zu – vom Plakat bliebe nur ein Streifen. Nimm lieber das Mannschaftsfoto.'
          if (n.bild !== 'mannschaft') return 'Wähl unter „Beitragsbild“ mit „Bild auswählen“ das Mannschaftsfoto.'
          if (!n.veroeffentlicht) return 'Schalte noch „Veröffentlicht“ ein – sonst bleibt die News ein Entwurf.'
          return null
        }}
      />
    ),
    danach:
      'Jetzt steht die News ganz oben auf der News-Seite und auch auf der Startseite. Die Vorschau unten zeigt die Karte. Oben auf der Seite der News gibt es jetzt den Knopf „Auf Website ansehen“.',
  },
  {
    titel: 'Von der Website nehmen',
    aufgabe: 'Das Sommerfest fällt wegen Regen aus. Nimm die News von der Website – aber lösch sie nicht: Sie soll als Entwurf erhalten bleiben.',
    Inhalt: props => (
      <NewsUebung
        {...props}
        start={{ ...entwurf(), inhalt: TEXT_FERTIG, kategorie: 'Fußball', bild: 'mannschaft', veroeffentlicht: true }}
        aufgabe={n => (n.veroeffentlicht ? 'Schalte „Veröffentlicht“ aus und speichere dann.' : null)}
      />
    ),
    danach:
      'Erst das Speichern nimmt die News von der Website, der Schalter allein reicht nicht. Ihr Link führt danach ins Leere. Wird das Fest nachgeholt, schaltest du sie einfach wieder ein.',
  },
  {
    titel: 'Was passiert mit der Adresse?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage={
          <>
            Die News steht unter <span className="break-all font-mono">/news/u13-laedt-zum-sommerfest</span>, der Link ist in der Eltern-Gruppe geteilt.
            Du änderst die Überschrift in „U13 lädt zum großen Sommerfest“ und speicherst. Was passiert mit der Adresse?
          </>
        }
        antworten={[
          {
            text: 'Sie passt sich automatisch an die neue Überschrift an.',
            erklaerung:
              'Die Adresse entsteht nur einmal, beim ersten Speichern. Danach bleibt sie, bis du sie im Feld „Adresse auf der Website“ selbst änderst.',
          },
          { text: 'Sie bleibt gleich – der geteilte Link funktioniert weiter.', richtig: true },
          { text: 'Die News bekommt eine zweite Adresse dazu.', erklaerung: 'Eine News hat immer genau eine Adresse – und die ändert sich nicht mit der Überschrift.' },
        ]}
      />
    ),
    danach: 'Deshalb gilt: Die Adresse nach dem Veröffentlichen nicht mehr ändern – sonst funktionieren geteilte Links nicht mehr.',
  },
]
