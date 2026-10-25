'use client'

/**
 * Übung "Downloads (PDF)" – Nachbau des Formulars "Neuer Download" bzw. "Download bearbeiten"
 * (app/verwaltung/(intern)/downloads/DownloadFormular.tsx) mit denselben Prüfungen und Meldungen
 * (lib/verwaltung/inhalte/downloads.ts, downloads/aktionen.ts, pdfSpeichern in
 * lib/verwaltung/medien-upload.ts) und einer Vorschau von /downloads (app/downloads/page.tsx)
 * und des Abschnitts "Downloads & Formulare" auf der Seite einer Sparte.
 * Statt der Dateiauswahl des Geräts gibt es Beispieldateien zum Antippen – hochgeladen wird nichts.
 */

import { useState } from 'react'
import { Download as DownloadIcon, ExternalLink, FileText, FileUp, Trash2 } from 'lucide-react'
import { auswahlKlasse, eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { slugify, zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

/* ── Beispieldaten ─────────────────────────────────────────────────────────── */

interface Download {
  id: number
  titel: string
  beschreibung: string
  kategorie: string
  datum: string
  sparteId: number | null
  /** Name der gespeicherten Datei, z. B. "aufnahmeantrag-3f9a1b2c.pdf" */
  datei: string
}

/** Eine Datei aus der (nachgebauten) Dateiauswahl des Geräts */
interface Datei {
  name: string
  art: string
  bytes: number
  /** Beginnt der Inhalt mit "%PDF-"? Das prüft der Server beim Speichern. */
  pdf: boolean
}

const SPARTEN = [
  { id: 1, name: 'Fußball' },
  { id: 2, name: 'Judo' },
  { id: 3, name: 'Tischtennis' },
]
const KATEGORIEN = ['Mitgliedschaft', 'Ordnungen']
const MB = 1024 * 1024

const AUFNAHMEANTRAG: Download = {
  id: 1,
  titel: 'Aufnahmeantrag',
  beschreibung: 'Zum Ausdrucken, Ausfüllen und Abgeben in der Geschäftsstelle.',
  kategorie: 'Mitgliedschaft',
  datum: '2024-01-15',
  sparteId: null,
  datei: 'aufnahmeantrag-3f9a1b2c.pdf',
}
const VORHANDEN: Download[] = [
  { id: 2, titel: 'SEPA-Lastschriftmandat', beschreibung: 'Für den Einzug des Mitgliedsbeitrags.', kategorie: 'Mitgliedschaft', datum: '2025-03-01', sparteId: null, datei: 'sepa-lastschriftmandat-a41c9e07.pdf' },
  { id: 3, titel: 'Beitragsordnung', beschreibung: '', kategorie: 'Ordnungen', datum: '2025-01-01', sparteId: null, datei: 'beitragsordnung-7be2d415.pdf' },
  { id: 4, titel: 'Satzung', beschreibung: '', kategorie: 'Ordnungen', datum: '2023-11-24', sparteId: null, datei: 'satzung-c08f6a3d.pdf' },
]

const PLATZORDNUNG_DATEIEN: Datei[] = [
  { name: 'platzordnung.docx', art: 'Word-Dokument', bytes: 48 * 1024, pdf: false },
  { name: 'platzordnung-scan.pdf', art: 'PDF-Dokument', bytes: 23.4 * MB, pdf: true },
  { name: 'platzordnung.pdf', art: 'PDF-Dokument', bytes: 310 * 1024, pdf: true },
]
const ANTRAG_DATEIEN: Datei[] = [
  { name: 'aufnahmeantrag-2026.docx', art: 'Word-Dokument', bytes: 52 * 1024, pdf: false },
  { name: 'aufnahmeantrag-2026.pdf', art: 'PDF-Dokument', bytes: 180 * 1024, pdf: true },
]

const groesse = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB` : `${Math.round(bytes / 1024)} KB`

/** Kennung wie beim echten Speichern (dort ein Hash des Inhalts) – hier aus dem Namen der gewählten Datei. */
function kennung(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}

/** Gespeicherter Name wie bei pdfSpeichern: <Titel>-<Kennung>.pdf */
const gespeicherterName = (titel: string, datei: Datei) => `${slugify(titel) || 'dokument'}-${kennung(datei.name)}.pdf`

/* ── Dieselben Prüfungen und Texte wie beim echten Speichern ──────────────── */

const FELDER_PRUEFEN = 'Bitte die markierten Felder prüfen.'

function istDatum(wert: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false
  const d = new Date(wert + 'T12:00:00Z')
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert
}

/** Wie downloadPruefen in lib/verwaltung/inhalte/downloads.ts */
function downloadPruefen(d: Download, neu: boolean, mitDatei: boolean): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!d.titel) felder.titel = 'Bitte einen Titel eintragen.'
  else if (d.titel.length > 200) felder.titel = 'Der Titel ist zu lang (höchstens 200 Zeichen).'
  if (d.datum && !istDatum(d.datum)) felder.datum = 'Bitte ein gültiges Datum wählen oder das Feld leer lassen.'
  if (neu && !mitDatei) felder.datei = 'Bitte eine PDF-Datei auswählen.'
  return felder
}

/** Wie pdfSpeichern: zu groß oder kein PDF-Inhalt → Meldung, sonst null */
function pdfPruefen(datei: Datei): string | null {
  if (datei.bytes > MAX_UPLOAD_BYTES) return 'Die Datei ist größer als 15 MB.'
  if (!datei.pdf) return 'Bitte eine PDF-Datei hochladen.'
  return null
}

const mehrzeilig = (wert: FormDataEntryValue | null) => (typeof wert === 'string' ? wert : '').replace(/\r\n?/g, '\n').trim()

/* ── Vorschau: so erscheint es auf /downloads und auf der Seite der Sparte ── */

/** Wie getDownloads: neuester Stand zuerst, ohne Stand ans Ende */
const nachStand = (a: Download, b: Download) =>
  a.datum !== b.datum ? (!a.datum ? 1 : !b.datum ? -1 : b.datum.localeCompare(a.datum)) : a.titel.localeCompare(b.titel, 'de')

function WebsiteDownloads({ downloads, mitSparte }: { downloads: Download[]; mitSparte: boolean }) {
  const sortiert = [...downloads].sort(nachStand)
  const kategorieVon = (d: Download) => d.kategorie || 'Sonstiges'
  const kategorien = Array.from(new Set(sortiert.map(kategorieVon)))
  const fussball = downloads.filter(d => d.sparteId === 1)
  const farbe = '#16a34a'

  return (
    <div className="space-y-5">
      <Vorschau adresse="/downloads">
        <div className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-[#6b6b6b]">Formulare &amp; Dokumente</div>
          <div className="font-display text-5xl tracking-tight">DOWNLOADS</div>
        </div>
        {kategorien.map(kategorie => (
          <div key={kategorie} className="mb-8 last:mb-0">
            <div className="mb-4 border-b border-[#0a0a0a]/10 pb-3 text-[11px] uppercase tracking-[0.2em] text-[#6b6b6b]">{kategorie}</div>
            <div className="space-y-px bg-[#0a0a0a]/10">
              {sortiert
                .filter(d => kategorieVon(d) === kategorie)
                .map(d => (
                  <div
                    key={d.id}
                    className="group flex items-center gap-4 bg-[#f5f5f0] p-5 transition-all duration-200 hover:bg-[#0a0a0a] hover:text-[#f5f5f0]"
                  >
                    <FileText size={20} className="shrink-0 text-[#6b6b6b] group-hover:text-[#f5f5f0]/60" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{d.titel}</div>
                      {d.beschreibung && <div className="mt-0.5 text-xs text-[#6b6b6b] group-hover:text-[#f5f5f0]/50">{d.beschreibung}</div>}
                    </div>
                    <DownloadIcon size={16} className="shrink-0 text-[#6b6b6b] group-hover:text-[#f5f5f0]/60" aria-hidden="true" />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </Vorschau>

      {mitSparte && (
        <Vorschau adresse="/sparten/fussball">
          {fussball.length === 0 ? (
            <p className="py-2 text-center text-sm text-[#6b6b6b]">
              Auf der Seite der Sparte Fußball gibt es noch keinen Abschnitt „Downloads &amp; Formulare“ – er erscheint mit dem ersten Download der Sparte.
            </p>
          ) : (
            <section>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: farbe }} />
                <div className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: farbe }}>
                  Downloads &amp; Formulare
                </div>
                <div className="h-px flex-1" style={{ background: `${farbe}25` }} />
                <div className="shrink-0 text-[11px] text-[#6b6b6b]">{fussball.length}</div>
              </div>
              <div className="mt-6 space-y-px bg-[#0a0a0a]/10">
                {fussball.map(d => (
                  <div key={d.id} className="group flex items-center gap-4 bg-[#f5f5f0] p-5 transition-all duration-200 hover:bg-[#0a0a0a] hover:text-[#f5f5f0]">
                    <FileText size={18} className="shrink-0 text-[#6b6b6b] group-hover:text-[#f5f5f0]/60" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{d.titel}</div>
                      {d.beschreibung && <div className="mt-0.5 text-xs text-[#6b6b6b] group-hover:text-[#f5f5f0]/50">{d.beschreibung}</div>}
                    </div>
                    <DownloadIcon size={14} className="shrink-0 text-[#6b6b6b] group-hover:text-[#f5f5f0]/60" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </Vorschau>
      )}
    </div>
  )
}

/* ── Nachbau von PdfFeld mit Beispieldateien ──────────────────────────────── */

function PdfAuswahl({
  gespeichert,
  dateien,
  gewaehlt,
  waehlen,
  fehler,
}: {
  /** Name der gespeicherten Datei; null = neuer Download */
  gespeichert: string | null
  dateien: Datei[]
  gewaehlt: Datei | null
  waehlen: (d: Datei | null) => void
  fehler?: string
}) {
  const [offen, setOffen] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [linkHinweis, setLinkHinweis] = useState(false)

  function dateiGewaehlt(d: Datei) {
    setOffen(false)
    setHinweis(null)
    // Wie im echten Formular: Größere Dateien sofort verwerfen statt beim Speichern abzubrechen
    if (d.bytes > MAX_UPLOAD_BYTES) {
      waehlen(null)
      setHinweis('Die Datei ist größer als 15 MB. Bitte eine kleinere Datei wählen.')
      return
    }
    waehlen(d)
  }

  return (
    <div className="space-y-3">
      {gespeichert && (
        <div className="space-y-1.5">
          {/* In echt ein Link auf die PDF (neuer Tab) – hier nur ein Hinweis */}
          <button
            type="button"
            onClick={() => setLinkHinweis(true)}
            className="inline-flex items-center gap-1.5 break-all text-left text-sm underline underline-offset-4 hover:text-[#4a4a4a]"
          >
            {gespeichert} <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
          </button>
          {linkHinweis && (
            <p role="status" className="text-xs text-[#6b6b6b]">
              In echt öffnet ein Klick die PDF in einem neuen Tab – so siehst du, welche Fassung gerade auf der Website steht.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOffen(o => !o)} aria-expanded={offen} className={knopfKlassen.sekundaer}>
          <FileUp size={15} aria-hidden="true" />
          {gespeichert ? 'Datei ersetzen' : 'PDF auswählen'}
        </button>
        {gewaehlt && <span className="break-all text-sm text-[#4a4a4a]">{gewaehlt.name}</span>}
      </div>

      {offen && (
        <div className="rounded-sm border border-[#0a0a0a]/15 bg-[#fafaf8] p-3">
          <p className="mb-2 text-xs leading-relaxed text-[#6b6b6b]">
            In echt öffnet sich jetzt die Dateiauswahl deines Handys oder Computers. In der Übung tippst du auf eine dieser Dateien:
          </p>
          <ul className="grid gap-2">
            {dateien.map(d => (
              <li key={d.name}>
                <button
                  type="button"
                  onClick={() => dateiGewaehlt(d)}
                  className="flex w-full items-center gap-3 rounded-sm border border-[#0a0a0a]/15 bg-white px-3 py-2.5 text-left hover:border-[#0a0a0a]/40"
                >
                  <FileText size={18} className="shrink-0 text-[#6b6b6b]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-all text-sm font-medium">{d.name}</span>
                    <span className="block text-xs text-[#6b6b6b]">
                      {d.art} · {groesse(d.bytes)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hinweis || fehler ? (
        <p className="text-sm text-red-700">{hinweis ?? fehler}</p>
      ) : (
        <p className="text-xs text-[#6b6b6b]">{gespeichert ? 'Die neue Datei ersetzt die bisherige beim Speichern.' : 'Nur PDF, höchstens 15 MB.'}</p>
      )}
    </div>
  )
}

/* ── Nachbau des Download-Formulars ────────────────────────────────────────── */

type Meldungsart = { art: 'erfolg' | 'fehler' | 'hinweis'; text: string }

/**
 * Formular "Neuer Download" (start = null) bzw. "Download bearbeiten". Die Felder sind wie im
 * echten Formular ungesteuert und werden beim Speichern aus dem Formular gelesen. `aufgabe`
 * prüft danach, ob die Aufgabe erfüllt ist (mit der gewählten Datei), und liefert sonst einen Hinweis.
 */
function DownloadUebung({
  start,
  zuletztGespeichert = '',
  dateien,
  mitSparte = false,
  aufgabe,
  geloest,
}: {
  start: Download | null
  /** "Zuletzt gespeichert" des Startstands (ISO-Zeitpunkt) */
  zuletztGespeichert?: string
  dateien: Datei[]
  mitSparte?: boolean
  aufgabe: (d: Download, datei: Datei | null) => string | null
} & LektionProps) {
  const [gespeichert, setGespeichert] = useState<Download | null>(start)
  const [datei, setDatei] = useState<Datei | null>(null)
  // Nach dem Speichern startet das Dateifeld wie im echten Formular frisch
  const [dateiFeld, setDateiFeld] = useState(0)
  const [geaendert, setGeaendert] = useState(false)
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<Meldungsart | null>(null)
  const [loeschHinweis, setLoeschHinweis] = useState(false)
  const [zuletzt, setZuletzt] = useState(zuletztGespeichert)
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
    const eingabe: Download = {
      id: gespeichert?.id ?? 10,
      titel: text('titel'),
      beschreibung: mehrzeilig(daten.get('beschreibung')),
      kategorie: text('kategorie'),
      datum: text('datum'),
      sparteId: sparte ? Number(sparte) : null,
      datei: gespeichert?.datei ?? '',
    }

    const felder = downloadPruefen(eingabe, neu, datei != null)
    if (Object.keys(felder).length) {
      setFehler(felder)
      setMeldung({ art: 'fehler', text: FELDER_PRUEFEN })
      return
    }
    // Die Datei selbst prüft erst der Server beim Speichern (Größe und PDF-Inhalt)
    const dateiFehler = datei ? pdfPruefen(datei) : null
    if (dateiFehler) {
      setFehler({ datei: dateiFehler })
      setMeldung({ art: 'fehler', text: dateiFehler })
      return
    }
    setFehler({})

    const hinweis = aufgabe(eingabe, datei)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    const fertig = datei ? { ...eingabe, datei: gespeicherterName(eingabe.titel, datei) } : eingabe
    setMeldung({ art: 'erfolg', text: neu ? 'Der Download ist angelegt und auf der Website zu sehen.' : 'Gespeichert – der Download ist auf der Website zu sehen.' })
    setGespeichert(fertig)
    setZuletzt(new Date().toISOString())
    setDatei(null)
    setDateiFeld(n => n + 1)
    setGeaendert(false)
    setLoeschHinweis(false)
    geloest()
  }

  // Auf der Website: die vorhandenen Downloads und der gerade gespeicherte Stand
  const fuerWebsite = [AUFNAHMEANTRAG, ...VORHANDEN].filter(d => d.id !== gespeichert?.id).concat(gespeichert ? [gespeichert] : [])

  return (
    <div className="space-y-5">
      <Spielwiese>
        {/* Seitenkopf wie auf /verwaltung/downloads/neu bzw. /verwaltung/downloads/[id] */}
        <div className="mb-5">
          <h3 className="font-display text-3xl leading-none tracking-tight">{neu ? 'NEUER DOWNLOAD' : 'DOWNLOAD BEARBEITEN'}</h3>
          <div className="mt-2 text-sm text-[#6b6b6b]">
            {neu ? 'Erscheint nach dem Speichern auf der Download-Seite.' : `Zuletzt gespeichert ${zeitpunktDeutsch(zuletzt)}`}
          </div>
        </div>

        {/* method="dialog": Auch vor dem fertigen Laden der Seite schickt "Speichern" nichts ab */}
        <form onSubmit={speichern} onChange={merken} method="dialog" noValidate className="space-y-5">
          <Karte titel="PDF-Datei">
            <PdfAuswahl
              key={dateiFeld}
              gespeichert={gespeichert?.datei ?? null}
              dateien={dateien}
              gewaehlt={datei}
              waehlen={d => {
                setDatei(d)
                if (d) merken()
              }}
              fehler={fe('datei')}
            />
          </Karte>

          <Karte titel="Angaben">
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
              <Feld label="Beschreibung" htmlFor="uebung-beschreibung" className="sm:col-span-2">
                <textarea id="uebung-beschreibung" name="beschreibung" rows={3} defaultValue={start?.beschreibung ?? ''} className={eingabeKlasse} />
              </Feld>
              <Feld label="Kategorie" htmlFor="uebung-kategorie" hinweis="Zum Beispiel „Mitgliedschaft“ – eintippen oder Vorschlag wählen.">
                <input
                  id="uebung-kategorie"
                  name="kategorie"
                  list="uebung-download-kategorien"
                  defaultValue={start?.kategorie ?? ''}
                  className={eingabeKlasse}
                  autoComplete="off"
                />
                <datalist id="uebung-download-kategorien">
                  {KATEGORIEN.map(k => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </Feld>
              <Feld label="Stand (Datum)" htmlFor="uebung-datum" fehler={fe('datum')} hinweis="Optional – z. B. das Datum der Fassung.">
                <input id="uebung-datum" name="datum" type="date" defaultValue={start?.datum ?? ''} aria-invalid={!!fe('datum') || undefined} className={eingabeKlasse} />
              </Feld>
              <Feld label="Sparte" htmlFor="uebung-sparte" hinweis="Optional – dann erscheint der Download auch auf der Seite der Sparte.">
                <select id="uebung-sparte" name="sparteId" defaultValue={start?.sparteId != null ? String(start.sparteId) : ''} className={auswahlKlasse}>
                  <option value="">Keine (ganzer Verein)</option>
                  {SPARTEN.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Feld>
            </div>
          </Karte>

          <UebungsLeiste geaendert={geaendert} meldung={meldung && (meldung.art !== 'erfolg' || !geaendert) ? meldung : null} />
        </form>

        {!neu && (
          <div className="mt-6 space-y-3 border-t border-[#0a0a0a]/10 pt-6">
            {loeschHinweis && (
              <Meldung art="hinweis">
                In echt kommt jetzt die Rückfrage „Den Download „{gespeichert.titel}“ wirklich löschen? Die Datei verschwindet dann auch von der Website.“ In
                der Übung wird nichts gelöscht.
              </Meldung>
            )}
            <button type="button" onClick={() => setLoeschHinweis(true)} className={knopfKlassen.gefahr}>
              <Trash2 size={15} aria-hidden="true" /> Download löschen
            </button>
          </div>
        )}
      </Spielwiese>
      <WebsiteDownloads downloads={fuerWebsite} mitSparte={mitSparte} />
    </div>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

/** Stand nach Lektion 1 – mit demselben Dateinamen, den Lektion 1 beim Speichern erzeugt */
const PLATZORDNUNG: Download = {
  id: 10,
  titel: 'Platzordnung',
  beschreibung: '',
  kategorie: '',
  datum: '',
  sparteId: null,
  datei: gespeicherterName('Platzordnung', PLATZORDNUNG_DATEIEN[2]),
}

export const lektionen: Lektion[] = [
  {
    titel: 'Nur PDF bis 15 MB',
    aufgabe: (
      <>
        Leg den Download <strong>Platzordnung</strong> an. In der Dateiauswahl liegen drei Dateien – nur eine nimmt die Verwaltung an. Probier ruhig
        aus, was bei den anderen passiert.
      </>
    ),
    Inhalt: props => (
      <DownloadUebung
        {...props}
        start={null}
        dateien={PLATZORDNUNG_DATEIEN}
        aufgabe={(d, datei) => {
          if (datei?.name !== 'platzordnung.pdf') return 'Wähl die Datei „platzordnung.pdf“.'
          if (d.titel.toLowerCase() !== 'platzordnung') return 'Trag als Titel „Platzordnung“ ein.'
          return null
        }}
      />
    ),
    danach:
      'Die Verwaltung nimmt nur PDF-Dateien bis 15 MB an. Ein Word-Dokument speicherst du vorher als PDF. Einen großen Scan speicherst du kleiner, zum Beispiel mit geringerer Bildqualität.',
  },
  {
    titel: 'Kategorie und Sparte',
    aufgabe: (
      <>
        Die Platzordnung steht noch unter „Sonstiges“. Wähl die Kategorie <strong>Ordnungen</strong>, die es schon gibt. Ordne sie außerdem der Sparte{' '}
        <strong>Fußball</strong> zu.
      </>
    ),
    Inhalt: props => (
      <DownloadUebung
        {...props}
        start={PLATZORDNUNG}
        zuletztGespeichert="2026-10-24T18:05:00.000Z"
        dateien={PLATZORDNUNG_DATEIEN}
        mitSparte
        aufgabe={d => {
          if (d.kategorie !== 'Ordnungen') {
            return d.kategorie
              ? `„${d.kategorie}“ wäre auf der Download-Seite eine eigene Gruppe. Nimm genau den Vorschlag „Ordnungen“.`
              : 'Trag bei „Kategorie“ „Ordnungen“ ein oder wähl den Vorschlag.'
          }
          if (d.sparteId !== 1) return 'Wähl bei „Sparte“ „Fußball“.'
          return null
        }}
      />
    ),
    danach:
      'Mit einer Sparte steht der Download zusätzlich auf der Seite der Sparte, im Abschnitt „Downloads & Formulare“. Auf der Download-Seite steht er weiter in seiner Kategorie.',
  },
  {
    titel: 'Neue Fassung hochladen',
    aufgabe: (
      <>
        Vom Aufnahmeantrag gibt es eine neue Fassung vom <strong>1. Oktober 2026</strong>. Ersetze die Datei durch{' '}
        <strong>aufnahmeantrag-2026.pdf</strong> und pass den Stand (Datum) an.
      </>
    ),
    Inhalt: props => (
      <DownloadUebung
        {...props}
        start={AUFNAHMEANTRAG}
        zuletztGespeichert="2025-02-03T09:12:00.000Z"
        dateien={ANTRAG_DATEIEN}
        aufgabe={(d, datei) => {
          if (datei?.name !== 'aufnahmeantrag-2026.pdf') return 'Klick auf „Datei ersetzen“ und wähl „aufnahmeantrag-2026.pdf“.'
          if (d.datum !== '2026-10-01') return 'Stell bei „Stand (Datum)“ den 1. Oktober 2026 ein.'
          return null
        }}
      />
    ),
    danach:
      'Erst beim Speichern ersetzt die neue Datei die alte. Sie bekommt einen neuen Namen – oben siehst du ihn. Auf der Download-Seite steht der Antrag jetzt ganz oben in seiner Kategorie, weil sein Stand der neueste ist.',
  },
  {
    titel: 'Und der alte Link?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Jemand hat den direkten Link auf die alte PDF des Aufnahmeantrags in eine Eltern-Gruppe geschickt. Was passiert damit, wenn du eine neue Fassung hochlädst?"
        antworten={[
          { text: 'Er zeigt automatisch die neue Fassung.', erklaerung: 'Die neue Fassung bekommt eine neue Adresse. Der alte Link zeigt nicht auf sie.' },
          { text: 'Er funktioniert nicht mehr.', richtig: true },
          { text: 'Er zeigt weiter die alte Fassung.', erklaerung: 'Die alte Datei wird beim Speichern entfernt. Der Link führt dann ins Leere.' },
        ]}
      />
    ),
    danach:
      'Die alte Datei wird beim Speichern entfernt, die neue bekommt eine neue Adresse. Teile deshalb am besten immer den Link zur Download-Seite – der bleibt gleich, egal wie oft du eine neue Fassung hochlädst.',
  },
]
