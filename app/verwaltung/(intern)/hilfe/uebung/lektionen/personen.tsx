'use client'

/**
 * Übung "Personen & Kontaktdaten" – Nachbau der Personenliste (app/verwaltung/(intern)/personen/PersonenListe.tsx)
 * und der Seite "Person bearbeiten" ([id]/page.tsx, [id]/PersonFormular.tsx, components/verwaltung/FotoFeld.tsx)
 * mit denselben Prüfungen und Meldungen (kontaktPruefen/personSpeichern in lib/verwaltung/person-bearbeiten.ts)
 * und einer Vorschau der Kontaktkarte im Trainerteam auf der Spartenseite (app/sparten/[slug]/page.tsx).
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, FlaskConical, ImagePlus, Mail, MessageCircle, Phone, Plus, Search, Trash2, Undo2 } from 'lucide-react'
import { eingabeKlasse, Feld, Karte, knopfKlassen, LeerHinweis, Meldung } from '@/components/verwaltung/ui'
import { emailGueltig, feldFehlerMeldung, nurZiffern, textWert } from '@/lib/verwaltung/pruefhilfen'
import { passtZurSuche, suchtext } from '@/lib/verwaltung/suche'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { whatsappLink } from '@/lib/whatsapp'
import type { Lektion, LektionProps } from '../typen'
import { Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

interface Kontaktdaten {
  name: string
  telefon: string
  email: string
  whatsapp: string
  notiz: string
}

interface Person extends Kontaktdaten {
  /** Bild-URL (im Browser) oder null */
  foto: string | null
  /** Rolle im Trainerteam der U13 – steht auf der Website unter dem Namen */
  rolle: string
  verwendung: string[]
}

interface FotoAuswahl {
  /** kaputt: Der Browser kann das Bild nicht anzeigen (z. B. HEIC vom iPhone) */
  neu: { url: string; name: string; typ: string; kaputt?: boolean } | null
  entfernen: boolean
}

type Rueckmeldung = { art: 'erfolg' | 'fehler' | 'hinweis'; text: string }

const MAX = { name: 100, email: 200, telefon: 50, notiz: 2000 }

/**
 * Nummer in nationaler Schreibweise (nur Ziffern) – damit die Übung "+49 171 …" und "0171 …"
 * als dieselbe Nummer erkennt. Nur für die Aufgabenprüfung; die echte Prüfung vergleicht reine Ziffern.
 */
const national = (nummer: string) => nurZiffern(nummer.trim().replace(/^\+/, '00')).replace(/^0049/, '0')

/*
 * Erfundene Festnetznummern aus dem Bereich 040 66969 …, den die Bundesnetzagentur für Film und
 * Fernsehen freihält – so trifft die Übung keinen echten Anschluss. Dieselben Personen haben in der
 * Übung "Kontaktseite pflegen" dieselben Kontaktdaten.
 */
const ANNA_FESTNETZ = '040 66969 456'
const JONAS_FESTNETZ = '040 66969 123'

/** Dieselben Prüfungen und Texte wie beim echten Speichern (kontaktPruefen). */
function kontaktPruefen(roh: Kontaktdaten): { daten: Kontaktdaten; felder: Record<string, string> } {
  const felder: Record<string, string> = {}
  const name = textWert(roh.name) ?? ''
  const email = textWert(roh.email)
  const telefon = textWert(roh.telefon)
  let whatsapp = textWert(roh.whatsapp)
  const notiz = textWert(roh.notiz)

  if (!name) felder.name = 'Bitte einen Namen eintragen.'
  else if (name.length > MAX.name) felder.name = `Der Name ist zu lang (höchstens ${MAX.name} Zeichen).`
  if (email && (email.length > MAX.email || !emailGueltig(email))) felder.email = 'Bitte eine gültige E-Mail-Adresse eintragen, z. B. name@beispiel.de.'
  if (telefon && (telefon.length > MAX.telefon || nurZiffern(telefon).length < 3)) {
    felder.telefon = 'Bitte eine Telefonnummer mit Ziffern eintragen, z. B. 0171 1234567.'
  }
  if (whatsapp && (whatsapp.length > MAX.telefon || nurZiffern(whatsapp).length < 3)) {
    felder.whatsapp = 'Bitte eine WhatsApp-Nummer mit Ziffern eintragen, z. B. 0171 1234567.'
  }
  // Wie in echt: WhatsApp nur speichern, wenn die Nummer wirklich vom Telefon abweicht
  if (whatsapp && telefon && nurZiffern(whatsapp) === nurZiffern(telefon)) whatsapp = null
  if (notiz && notiz.length > MAX.notiz) felder.notiz = `Die Notiz ist zu lang (höchstens ${MAX.notiz} Zeichen).`

  return { daten: { name, email: email ?? '', telefon: telefon ?? '', whatsapp: whatsapp ?? '', notiz: notiz ?? '' }, felder }
}

const kontakt = (p: Kontaktdaten): Kontaktdaten => ({ name: p.name, telefon: p.telefon, email: p.email, whatsapp: p.whatsapp, notiz: p.notiz })

/** Ein schlichtes Porträt zum Ausprobieren, falls kein eigenes Bild zur Hand ist. */
const BEISPIELBILD =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#d9d6cc"/><circle cx="150" cy="150" r="72" fill="#7d7a72"/><path d="M24 400c0-96 56-156 126-156s126 60 126 156z" fill="#7d7a72"/></svg>',
  )

/* ── Vorschau: die Kontaktkarte im Trainerteam auf der Spartenseite ─────────── */

const FUSSBALL = '#059669'

function initialenWebsite(name: string) {
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

function WebsiteKarte({ person }: { person: Person }) {
  const [bildKaputt, setBildKaputt] = useState(false)
  const name = person.name || 'Kontakt'
  const waHref = whatsappLink(person)
  return (
    <Vorschau adresse="/sparten/fussball">
      <div className="border border-[#0a0a0a]/[0.08] bg-[#fafaf8]">
        <div className="px-4 py-3 font-medium leading-tight">U13</div>
        <div className="border-t border-[#0a0a0a]/[0.06] px-4 pb-4 pt-4">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: FUSSBALL }}>
            Trainer &amp; Ansprechpartner
          </div>
          <div className="flex max-w-sm items-start gap-2.5 border border-[#0a0a0a]/[0.06] bg-white p-3">
            {person.foto && !bildKaputt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.foto} alt={name} onError={() => setBildKaputt(true)} className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-[4.5rem] w-[4.5rem] shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: FUSSBALL }}
              >
                {initialenWebsite(name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 text-sm font-medium leading-tight">{name}</div>
              <div className="mb-2 text-[11px] leading-snug text-[#6b6b6b]">{person.rolle}</div>
              <div className="space-y-0.5">
                {person.email && (
                  <span className="flex min-w-0 items-center gap-1 text-[11px] text-[#6b6b6b]">
                    <Mail size={9} className="shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate leading-tight">{person.email}</span>
                  </span>
                )}
                {person.telefon && (
                  <span className="flex items-center gap-1 text-[11px] text-[#6b6b6b]">
                    <Phone size={9} className="shrink-0" aria-hidden="true" />
                    {person.telefon}
                  </span>
                )}
                {waHref && (
                  <span className="flex items-center gap-1 text-[11px] text-[#16a34a]" title={waHref}>
                    <MessageCircle size={9} className="shrink-0" aria-hidden="true" />
                    WhatsApp
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#6b6b6b]">
            {waHref ? `Der WhatsApp-Link führt zu ${waHref.replace('https://', '')}.` : 'Kein WhatsApp-Link – es gibt keine Handy- oder WhatsApp-Nummer.'}
          </p>
        </div>
      </div>
    </Vorschau>
  )
}

/* ── Nachbau des Foto-Felds (components/verwaltung/FotoFeld.tsx) ───────────── */

function FotoFeld({
  aktuell,
  auswahl,
  setAuswahl,
  fehler,
  beispielbild,
  neueUrl,
}: {
  aktuell: string | null
  auswahl: FotoAuswahl
  setAuswahl: React.Dispatch<React.SetStateAction<FotoAuswahl>>
  fehler?: string
  /** Knopf "Beispielbild nehmen" für alle, die gerade kein eigenes Bild zur Hand haben */
  beispielbild: boolean
  /** Meldet neue Objekt-URLs, damit sie am Ende der Lektion wieder freigegeben werden. */
  neueUrl: (url: string) => void
}) {
  const eingabe = useRef<HTMLInputElement>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const { neu, entfernen } = auswahl
  const vorschauKaputt = !!neu?.kaputt

  function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0]
    setHinweis(null)
    if (!datei) {
      setAuswahl({ neu: null, entfernen })
      return
    }
    if (datei.size > MAX_UPLOAD_BYTES) {
      e.target.value = ''
      setAuswahl({ neu: null, entfernen })
      setHinweis('Das Bild ist größer als 15 MB. Bitte ein kleineres Bild wählen.')
      return
    }
    // Das Bild bleibt im Browser – es wird nur für die Vorschau angezeigt
    const url = URL.createObjectURL(datei)
    neueUrl(url)
    setAuswahl({ neu: { url, name: datei.name, typ: datei.type }, entfernen: false })
  }

  // Merken, dass der Browser das Bild nicht anzeigen kann – beim Speichern kommt dann dieselbe Meldung wie in echt
  function bildKaputt(url: string) {
    setAuswahl(a => (a.neu && a.neu.url === url ? { ...a, neu: { ...a.neu, kaputt: true } } : a))
  }

  function auswahlZuruecknehmen() {
    if (eingabe.current) eingabe.current.value = ''
    setAuswahl({ neu: null, entfernen })
  }

  const bild = neu ? neu.url : entfernen ? null : aktuell

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex aspect-[3/4] w-40 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#0a0a0a]/10 bg-[#f0f0ea]">
        {bild && !(neu && vorschauKaputt) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bild} alt="Vorschau" className="h-full w-full object-cover" onError={() => neu && bildKaputt(neu.url)} />
        ) : (
          <span className="px-3 text-center text-sm text-[#6b6b6b]">
            {neu ? `Vorschau nicht möglich – „${neu.name}“ wird beim Speichern umgewandelt.` : entfernen ? 'Foto wird entfernt' : 'Kein Foto'}
          </span>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className={`${knopfKlassen.sekundaer} cursor-pointer focus-within:ring-2 focus-within:ring-[#0a0a0a]`}>
            <ImagePlus size={16} aria-hidden="true" />
            {bild || neu ? 'Anderes Foto wählen' : 'Foto hochladen'}
            <input ref={eingabe} type="file" accept="image/*" className="sr-only" onChange={dateiGewaehlt} />
          </label>
          {neu && (
            <button type="button" className={knopfKlassen.leise} onClick={auswahlZuruecknehmen}>
              <Undo2 size={15} aria-hidden="true" /> Auswahl zurücknehmen
            </button>
          )}
          {!neu && aktuell && !entfernen && (
            <button type="button" className={knopfKlassen.leise} onClick={() => setAuswahl({ neu: null, entfernen: true })}>
              <Trash2 size={15} aria-hidden="true" /> Foto entfernen
            </button>
          )}
          {!neu && entfernen && (
            <button type="button" className={knopfKlassen.leise} onClick={() => setAuswahl({ neu: null, entfernen: false })}>
              <Undo2 size={15} aria-hidden="true" /> Doch behalten
            </button>
          )}
        </div>
        {neu && <p className="text-sm text-[#0a0a0a]">Neues Foto ausgewählt – wird beim Speichern hochgeladen.</p>}
        {entfernen && !neu && <p className="text-sm text-[#0a0a0a]">Das Foto wird beim Speichern entfernt.</p>}
        {fehler || hinweis ? (
          <p className="text-sm text-red-700">{fehler ?? hinweis}</p>
        ) : (
          <p className="text-xs leading-relaxed text-[#6b6b6b]">JPG, PNG oder WebP bis 15 MB. Wird automatisch verkleinert; Standortdaten werden entfernt.</p>
        )}
        {beispielbild && (!neu || vorschauKaputt) && (
          <button
            type="button"
            className={`${knopfKlassen.leise} -ml-2 underline underline-offset-4`}
            onClick={() => {
              if (eingabe.current) eingabe.current.value = ''
              setHinweis(null)
              setAuswahl({ neu: { url: BEISPIELBILD, name: 'beispielbild.svg', typ: 'image/svg+xml' }, entfernen: false })
            }}
          >
            <FlaskConical size={14} aria-hidden="true" /> Kein Bild zur Hand? Beispielbild nehmen
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Nachbau der Seite "Person bearbeiten" ─────────────────────────────────── */

/**
 * Seite einer Person mit Formular. Nach erfolgreichem Speichern baut die Übung die Seite mit dem
 * neuen Stand neu auf – wie in echt, wo die Seite frisch vom Server kommt.
 */
function PersonSeite({
  person,
  meldung,
  setMeldung,
  aufgabe,
  beispielbild,
  neueUrl,
  gespeichert,
}: {
  person: Person
  meldung: Rueckmeldung | null
  setMeldung: (m: Rueckmeldung) => void
  aufgabe: (eingabe: Kontaktdaten, ergebnis: Person) => string | null
  beispielbild: boolean
  neueUrl: (url: string) => void
  gespeichert: (p: Person) => void
}) {
  const start = kontakt(person)
  const [werte, setWerte] = useState<Kontaktdaten>(start)
  const [foto, setFoto] = useState<FotoAuswahl>({ neu: null, entfernen: false })
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [fokus, setFokus] = useState(0)
  const formular = useRef<HTMLFormElement>(null)
  const geaendert = foto.neu !== null || foto.entfernen || JSON.stringify(werte) !== JSON.stringify(start)

  // Wie in echt: nach einem Fehler zum ersten rot markierten Feld springen
  useEffect(() => {
    if (!fokus) return
    const erstes = formular.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (erstes) {
      erstes.scrollIntoView({ behavior: 'smooth', block: 'center' })
      erstes.focus({ preventScroll: true })
    }
  }, [fokus])

  function speichern(e: React.FormEvent) {
    e.preventDefault()
    const { daten, felder } = kontaktPruefen(werte)
    if (Object.keys(felder).length) {
      setFehler(felder)
      setMeldung({ art: 'fehler', text: feldFehlerMeldung(felder).meldung ?? '' })
      setFokus(n => n + 1)
      return
    }
    // Wie beim echten Hochladen (bildSpeichern): erst der Dateityp, dann ob sich das Bild lesen lässt
    if (foto.neu && !foto.neu.typ.startsWith('image/')) {
      const text = 'Bitte eine Bilddatei (JPG, PNG oder WebP) hochladen.'
      setFehler({ foto: text })
      setMeldung({ art: 'fehler', text })
      return
    }
    if (foto.neu?.kaputt) {
      const text = 'Das Bild konnte nicht gelesen werden. Bitte ein anderes Format versuchen.'
      setFehler({ foto: text })
      setMeldung({ art: 'fehler', text })
      return
    }
    setFehler({})
    const ergebnis: Person = { ...person, ...daten, foto: foto.neu ? foto.neu.url : foto.entfernen ? null : person.foto }
    const hinweis = aufgabe(werte, ergebnis)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    setMeldung({ art: 'erfolg', text: 'Gespeichert – ist jetzt auf der Website sichtbar.' })
    gespeichert(ergebnis)
  }

  const feld = (name: keyof Kontaktdaten) => ({
    id: `uebung-person-${name}`,
    value: werte[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setWerte(alt => ({ ...alt, [name]: e.target.value })),
    'aria-invalid': !!fehler[name] || undefined,
    className: eingabeKlasse,
  })

  // Erfolgsmeldung ausblenden, sobald wieder etwas geändert wird – wie die echte Speicherleiste
  const zeigen = meldung && (meldung.art !== 'erfolg' || !geaendert) ? meldung : null

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#6b6b6b]">
          <ArrowLeft size={14} aria-hidden="true" /> Alle Personen
        </span>
        <h3 className="font-display text-3xl leading-none tracking-tight md:text-4xl">{person.name}</h3>
        <div className="mt-2 text-sm text-[#6b6b6b]">Erscheint auf der Website – Änderungen sind nach dem Speichern sofort sichtbar.</div>
      </div>

      <Karte titel="Hier eingetragen">
        <ul className="-mx-1 divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
          {person.verwendung.map(v => (
            <li key={v} className="px-1 py-3">
              {v}
            </li>
          ))}
        </ul>
      </Karte>

      <form ref={formular} onSubmit={speichern} className="space-y-6" noValidate>
        <Karte titel="Kontaktdaten">
          <div className="space-y-5">
            <Meldung art="hinweis">
              Name, Telefon, E-Mail, WhatsApp und Foto erscheinen auf der Website, sobald die Person in einem Trainerteam oder auf der Kontaktseite
              steht. Bitte nur mit Einverständnis der Person eintragen.
            </Meldung>
            <Feld label="Name" htmlFor="uebung-person-name" fehler={fehler.name}>
              <input {...feld('name')} required maxLength={100} autoComplete="off" />
            </Feld>
            <div className="grid gap-5 md:grid-cols-2">
              <Feld label="Telefon" htmlFor="uebung-person-telefon" fehler={fehler.telefon} hinweis="Optional, z. B. 0171 1234567">
                <input {...feld('telefon')} type="tel" inputMode="tel" maxLength={50} autoComplete="off" />
              </Feld>
              <Feld label="E-Mail" htmlFor="uebung-person-email" fehler={fehler.email} hinweis="Optional">
                <input {...feld('email')} type="email" inputMode="email" maxLength={200} autoComplete="off" />
              </Feld>
            </div>
            <Feld
              label="WhatsApp (nur falls abweichend)"
              htmlFor="uebung-person-whatsapp"
              fehler={fehler.whatsapp}
              hinweis="Nur ausfüllen, wenn WhatsApp über eine andere Nummer läuft als das Telefon oben."
            >
              <input {...feld('whatsapp')} type="tel" inputMode="tel" maxLength={50} autoComplete="off" />
            </Feld>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Foto</span>
              <FotoFeld aktuell={person.foto} auswahl={foto} setAuswahl={setFoto} fehler={fehler.foto} beispielbild={beispielbild} neueUrl={neueUrl} />
            </div>
          </div>
        </Karte>

        <Karte titel="Interne Notiz">
          <Feld label="Notiz" htmlFor="uebung-person-notiz" fehler={fehler.notiz} hinweis="Nur für die Verwaltung – wird nie auf der Website angezeigt.">
            <textarea {...feld('notiz')} rows={3} maxLength={2000} className={`${eingabeKlasse} leading-relaxed`} />
          </Feld>
        </Karte>

        <UebungsLeiste geaendert={geaendert} meldung={zeigen} />
      </form>
    </div>
  )
}

/** Eine Lektion mit der Seite einer Person und der Vorschau ihrer Kontaktkarte darunter. */
function PersonUebung({
  start,
  aufgabe,
  beispielbild = false,
  geloest,
}: {
  start: Person
  aufgabe: (eingabe: Kontaktdaten, ergebnis: Person) => string | null
  beispielbild?: boolean
} & LektionProps) {
  const [person, setPerson] = useState(start)
  const [stand, setStand] = useState(0)
  const [meldung, setMeldung] = useState<Rueckmeldung | null>(null)
  const urls = useRef<string[]>([])

  // Ausgewählte Bilder am Ende der Lektion wieder freigeben
  useEffect(() => {
    const liste = urls.current
    return () => liste.forEach(u => URL.revokeObjectURL(u))
  }, [])

  return (
    <div className="space-y-5">
      <Spielwiese>
        <PersonSeite
          key={stand}
          person={person}
          meldung={meldung}
          setMeldung={setMeldung}
          aufgabe={aufgabe}
          beispielbild={beispielbild}
          neueUrl={u => urls.current.push(u)}
          gespeichert={p => {
            setPerson(p)
            setStand(s => s + 1)
            geloest()
          }}
        />
      </Spielwiese>
      {/* key: bei einem neuen Foto die Karte neu aufbauen, damit ein früherer Ladefehler nicht hängen bleibt */}
      <WebsiteKarte key={person.foto ?? 'ohne'} person={person} />
    </div>
  )
}

/* ── Lektion 1: die Person finden ──────────────────────────────────────────── */

const LISTE = [
  { name: 'Anna Beispiel', verwendung: ['Trainer:in bei U13 (Fußball)'], kontakt: `${ANNA_FESTNETZ} · anna@example.org` },
  { name: 'Björn Probe', verwendung: ['Trainer:in bei Kinder / Anfänger (5–7 Jahre) (Judo)'], kontakt: '0152 1234567' },
  { name: 'Jonas Muster', verwendung: ['Co-Trainer:in bei U13 (Fußball)'], kontakt: `${JONAS_FESTNETZ} · jonas.alt@example.org` },
  { name: 'Lea Lernmal', verwendung: ['Trainer:in bei U12 (Fußball)'], kontakt: 'lea@example.org' },
  { name: 'Mira Probe', verwendung: ['Trainer:in bei U12 (Fußball)', 'Betreuer:in bei U13 (Fußball)'], kontakt: 'mira@example.org' },
].map(p => ({ ...p, suchtext: suchtext(p.name, p.kontakt, ...p.verwendung) }))

function initialen(name: string) {
  const teile = name.trim().split(/\s+/)
  return ((teile[0]?.[0] ?? '') + (teile.length > 1 ? teile[teile.length - 1][0] : '')).toUpperCase()
}

function PersonFinden({ geloest, istGeloest }: LektionProps) {
  const [suche, setSuche] = useState('')
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [offen, setOffen] = useState(istGeloest)
  const treffer = LISTE.filter(p => passtZurSuche(p.suchtext, suche))

  return (
    <Spielwiese>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl leading-none tracking-tight md:text-4xl">PERSONEN</h3>
          <div className="mt-2 text-sm text-[#6b6b6b]">
            Die Personen deiner Mannschaften und Gruppen. Kontaktdaten änderst du hier – für alle Stellen auf einmal.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHinweis('Die Person gibt es schon – erst suchen, dann anlegen. Sonst steht sie am Ende doppelt in der Verwaltung.')}
          className={knopfKlassen.primaer}
        >
          <Plus size={16} aria-hidden="true" /> Neue Person
        </button>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <label htmlFor="uebung-personen-suche" className="sr-only">
            Person suchen
          </label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" aria-hidden="true" />
          <input
            id="uebung-personen-suche"
            type="search"
            value={suche}
            onChange={e => {
              setSuche(e.target.value)
              setHinweis(null)
            }}
            placeholder="Suchen: Name, Telefon, E-Mail oder Mannschaft …"
            className={`${eingabeKlasse} py-3 pl-9`}
            autoComplete="off"
          />
        </div>
        <Karte>
          {treffer.length === 0 ? (
            <LeerHinweis>{`Niemand gefunden für „${suche.trim()}“.`}</LeerHinweis>
          ) : (
            <ul className="-my-2 divide-y divide-[#0a0a0a]/[0.07]">
              {treffer.map(p => (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => {
                      if (p.name === 'Jonas Muster') {
                        setHinweis(null)
                        setOffen(true)
                        geloest()
                      } else {
                        setOffen(false)
                        setHinweis(`Das ist ${p.name} – ${p.verwendung.join(' und ')}. Gesucht ist die Co-Trainer:in der U13.`)
                      }
                    }}
                    className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-[#0a0a0a]/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#0a0a0a]/10 bg-[#f0f0ea]">
                      <span className="text-xs font-semibold text-[#4a4a4a]">{initialen(p.name)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="mt-0.5 block break-words text-xs text-[#6b6b6b]">{p.verwendung.join(' · ')}</span>
                      {p.kontakt && <span className="mt-0.5 block truncate text-xs text-[#6b6b6b]">{p.kontakt}</span>}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-[#6b6b6b]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Karte>
        <p className="text-xs text-[#6b6b6b]">
          {treffer.length} von {LISTE.length} Personen
        </p>
      </div>
      {hinweis && (
        <p className="mt-3 text-sm text-amber-800" role="status">
          {hinweis}
        </p>
      )}
      {offen && (
        <p className="mt-3 text-sm text-[#4a4a4a]">Die Seite „Jonas Muster“ öffnet sich – mit den Abschnitten Hier eingetragen, Kontaktdaten und Interne Notiz.</p>
      )}
    </Spielwiese>
  )
}

/* ── Lektion 6: Was ist öffentlich? ────────────────────────────────────────── */

const ANGABEN = [
  { schluessel: 'name', text: 'Name', oeffentlich: true },
  { schluessel: 'telefon', text: 'Telefon', oeffentlich: true },
  { schluessel: 'notiz', text: 'Interne Notiz', oeffentlich: false },
  { schluessel: 'email', text: 'E-Mail', oeffentlich: true },
  { schluessel: 'foto', text: 'Foto', oeffentlich: true },
  { schluessel: 'whatsapp', text: 'WhatsApp-Nummer (im WhatsApp-Link)', oeffentlich: true },
]

function OeffentlichQuiz({ geloest, istGeloest }: LektionProps) {
  const [gewaehlt, setGewaehlt] = useState<string[]>(istGeloest ? ANGABEN.filter(a => a.oeffentlich).map(a => a.schluessel) : [])
  const [rueckmeldung, setRueckmeldung] = useState<string | null>(null)

  function pruefen() {
    if (gewaehlt.length === 0) {
      setRueckmeldung('Kreuz zuerst an, was du für öffentlich hältst.')
      return
    }
    if (gewaehlt.indexOf('notiz') >= 0) {
      setRueckmeldung('Die interne Notiz ist nur für die Verwaltung – sie erscheint nie auf der Website.')
      return
    }
    // Nur die Anzahl nennen, damit noch etwas zum Überlegen bleibt
    const fehlen = ANGABEN.filter(a => a.oeffentlich && gewaehlt.indexOf(a.schluessel) < 0).length
    if (fehlen) {
      setRueckmeldung(
        `Nicht ganz: ${fehlen === 1 ? 'Eine weitere Angabe steht' : `${fehlen} weitere Angaben stehen`} auf der Website. Einen Schalter zum Verstecken gibt es nicht.`,
      )
      return
    }
    setRueckmeldung(null)
    geloest()
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-4">
        <legend className="font-medium">Jonas steht im Trainerteam der U13. Was davon kann jede:r auf der Website sehen? Kreuz alles an, was öffentlich ist.</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ANGABEN.map(a => {
            const an = gewaehlt.indexOf(a.schluessel) >= 0
            return (
              <label
                key={a.schluessel}
                className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-[#0a0a0a] ${
                  an ? 'border-[#0a0a0a]/60 bg-white' : 'border-[#0a0a0a]/15 bg-white hover:border-[#0a0a0a]/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={an}
                  onChange={e => {
                    const anhaken = e.target.checked
                    setRueckmeldung(null)
                    setGewaehlt(g => (anhaken ? g.concat(a.schluessel) : g.filter(x => x !== a.schluessel)))
                  }}
                  className="h-5 w-5 shrink-0 accent-[#0a0a0a]"
                />
                {a.text}
              </label>
            )
          })}
        </div>
      </fieldset>
      <button type="button" onClick={pruefen} className={knopfKlassen.primaer}>
        Antwort prüfen
      </button>
      {rueckmeldung && <Meldung art="hinweis">{rueckmeldung}</Meldung>}
    </div>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

const JONAS: Person = {
  name: 'Jonas Muster',
  telefon: JONAS_FESTNETZ,
  email: 'jonas.alt@example.org',
  whatsapp: '',
  notiz: 'Trainerschein C bis 2027',
  foto: null,
  rolle: 'Co-Trainer:in',
  verwendung: ['Co-Trainer:in bei U13 (Fußball)'],
}

const ANNA: Person = {
  name: 'Anna Beispiel',
  telefon: ANNA_FESTNETZ,
  email: 'anna@example.org',
  whatsapp: '',
  notiz: '',
  foto: null,
  rolle: 'Trainer:in',
  verwendung: ['Trainer:in bei U13 (Fußball)'],
}

const MIRA: Person = {
  name: 'Mira Probe',
  telefon: '',
  email: 'mira@example.org',
  whatsapp: '',
  notiz: '',
  foto: null,
  rolle: 'Betreuer:in',
  verwendung: ['Trainer:in bei U12 (Fußball)', 'Betreuer:in bei U13 (Fußball)'],
}

export const lektionen: Lektion[] = [
  {
    titel: 'Die Person finden',
    aufgabe: 'Öffne die Person, die bei der U13 Co-Trainer:in ist. Tipp: Das Suchfeld findet auch Mannschaften – probier „U13“.',
    Inhalt: PersonFinden,
    danach:
      'In der echten Verwaltung findest du alle Personen, die du bearbeiten darfst, im Menü „Personen“. Unter jedem Namen steht, wo die Person eingetragen ist.',
  },
  {
    titel: 'Neue Handynummer',
    aufgabe: (
      <>
        Jonas hat eine neue Handynummer: <strong>0171 2345678</strong>. Und seine E-Mail-Adresse ist jetzt <strong>jonas@example.org</strong>. Trag
        beides ein und speichere.
      </>
    ),
    Inhalt: props => (
      <PersonUebung
        {...props}
        start={JONAS}
        aufgabe={(_, p) => {
          if (p.name !== 'Jonas Muster') return 'Der Name bleibt „Jonas Muster“.'
          if (national(p.telefon) !== '01712345678') return 'Als Telefon bitte die neue Handynummer 0171 2345678 eintragen.'
          if (p.email.toLowerCase() !== 'jonas@example.org') return 'Als E-Mail bitte jonas@example.org eintragen.'
          return null
        }}
      />
    ),
    danach:
      'In echt gilt die Änderung sofort überall, wo Jonas eingetragen ist – zum Beispiel im Trainerteam auf der Spartenseite. Auf /trainingszeiten steht seine Nummer nur, wenn er die erste Person im Trainerteam mit Telefon ist; bei der U13 ist das Anna. Weil 0171 … eine Handynummer ist, zeigt die Website jetzt auch einen WhatsApp-Link.',
  },
  {
    titel: 'WhatsApp über eine andere Nummer',
    aufgabe: (
      <>
        Bei Anna steht nur ihre Festnetznummer – deshalb gibt es auf der Website keinen WhatsApp-Link. Per WhatsApp erreicht man sie unter{' '}
        <strong>0160 1234567</strong>. Trag die Nummer ins passende Feld ein; das Telefon bleibt.
      </>
    ),
    Inhalt: props => (
      <PersonUebung
        {...props}
        start={ANNA}
        aufgabe={(e, p) => {
          if (national(e.whatsapp) !== '01601234567') {
            if (national(e.telefon) === '01601234567') return `Das Telefon bleibt ${ANNA_FESTNETZ} – die Handynummer gehört ins Feld „WhatsApp (nur falls abweichend)“.`
            return 'Trag bei „WhatsApp (nur falls abweichend)“ die Nummer 0160 1234567 ein.'
          }
          if (national(p.telefon) !== national(ANNA_FESTNETZ)) return `Das Telefon bleibt ${ANNA_FESTNETZ}.`
          if (p.name !== 'Anna Beispiel') return 'Der Name bleibt „Anna Beispiel“.'
          return null
        }}
      />
    ),
    danach:
      'Eine eigene WhatsApp-Nummer hat immer Vorrang. Ist dort nichts eingetragen, bekommt nur eine Handynummer (015…, 016…, 017…) einen WhatsApp-Link – Festnetznummern nie.',
  },
  {
    titel: 'Dieselbe Nummer?',
    aufgabe: (
      <>
        Jonas fragt, ob seine Handynummer <strong>0171 2345678</strong> auch bei WhatsApp stehen muss. Probier es aus: Trag sie zusätzlich bei
        „WhatsApp (nur falls abweichend)“ ein, speichere und schau, was danach im Feld steht.
      </>
    ),
    Inhalt: props => (
      <PersonUebung
        {...props}
        start={{ ...JONAS, telefon: '0171 2345678', email: 'jonas@example.org' }}
        aufgabe={e => {
          if (national(e.telefon) !== '01712345678') return 'Das Telefon bleibt 0171 2345678.'
          // Die echte Regel vergleicht reine Ziffern: "+49 171 …" gilt dort als andere Nummer und würde gespeichert
          if (nurZiffern(e.whatsapp) !== nurZiffern(e.telefon)) {
            if (national(e.whatsapp) === national(e.telefon)) {
              return 'Schreib die Nummer genau wie beim Telefon: 0171 2345678. Mit +49 vorne vergleicht die Verwaltung andere Ziffern und würde sie zusätzlich speichern.'
            }
            return 'Trag bei WhatsApp genau dieselbe Nummer ein wie bei Telefon: 0171 2345678.'
          }
          return null
        }}
      />
    ),
    danach:
      'Das WhatsApp-Feld ist wieder leer: Dieselbe Nummer wird nicht doppelt gespeichert. Das ist in Ordnung – eine Handynummer bekommt den WhatsApp-Link trotzdem, siehe Vorschau.',
  },
  {
    titel: 'Ein Foto auswählen',
    aufgabe: (
      <>
        Mira hat dir ein Porträtfoto geschickt. Wähle unter „Foto“ ein Bild aus – irgendeins von deinem Gerät. Es bleibt in deinem Browser und wird
        nicht hochgeladen. Kein Bild zur Hand? Nimm das Beispielbild. Dann speichern.
      </>
    ),
    Inhalt: props => (
      <PersonUebung
        {...props}
        start={MIRA}
        beispielbild
        aufgabe={(_, p) => {
          if (!p.foto) return 'Wähle zuerst ein Foto aus: Tippe auf „Foto hochladen“ – oder auf „Beispielbild nehmen“.'
          return null
        }}
      />
    ),
    danach: (
      <>
        Auf der Website wird das Foto rund zugeschnitten – ein Porträt mit dem Gesicht in der Mitte passt am besten. Mit „Foto entfernen“ nimmst du
        es wieder heraus, „Doch behalten“ macht das rückgängig. Ohne Foto stehen dort die Initialen.
      </>
    ),
  },
  {
    titel: 'Was ist öffentlich?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: OeffentlichQuiz,
    danach:
      'Name, Foto, E-Mail, Telefon und WhatsApp-Nummer stehen auf der Website, sobald die Person in einem Trainerteam, bei den Ansprechpartner:innen oder auf der Kontaktseite steht. Trag deshalb nur ein, was öffentlich sein darf – und nur mit Einverständnis der Person.',
  },
]
