'use client'

/**
 * Übung "So funktioniert die Verwaltung" – Nachbau des Formulars "Person bearbeiten"
 * (app/verwaltung/(intern)/personen/[id]/PersonFormular.tsx) mit denselben Prüfungen und Meldungen
 * (kontaktPruefen in lib/verwaltung/person-bearbeiten.ts), der Speicherleiste
 * (components/verwaltung/SpeicherLeiste.tsx), der Rückfrage beim Verlassen
 * (components/verwaltung/useUngespeichert.ts) und einer Vorschau der Zeile auf /ansprechpartner
 * (app/ansprechpartner/page.tsx).
 */

import { useEffect, useRef, useState } from 'react'
import { Mail, Phone, RotateCw } from 'lucide-react'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { erfolg, fehler, LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import { emailGueltig, feldFehlerMeldung, KONFLIKT_MELDUNG, nurZiffern, textWert } from '@/lib/verwaltung/pruefhilfen'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { whatsappLink } from '@/lib/whatsapp'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, Vorschau } from '../werkzeuge'

interface Werte {
  name: string
  telefon: string
  email: string
  whatsapp: string
  notiz: string
}

const MAX = { name: 100, email: 200, telefon: 50, notiz: 2000 }
const GESPEICHERT = 'Gespeichert – ist jetzt auf der Website sichtbar.'
// Wortlaut aus components/verwaltung/useUngespeichert.ts
const FRAGE_VERLASSEN = 'Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen dann verloren.'

/** Dieselben Prüfungen und Texte wie beim echten Speichern (kontaktPruefen), in derselben Reihenfolge. */
function pruefen(w: Werte): Record<string, string> {
  const felder: Record<string, string> = {}
  const name = textWert(w.name) ?? ''
  const email = textWert(w.email)
  const telefon = textWert(w.telefon)
  const whatsapp = textWert(w.whatsapp)
  const notiz = textWert(w.notiz)
  if (!name) felder.name = 'Bitte einen Namen eintragen.'
  else if (name.length > MAX.name) felder.name = `Der Name ist zu lang (höchstens ${MAX.name} Zeichen).`
  if (email && (email.length > MAX.email || !emailGueltig(email))) felder.email = 'Bitte eine gültige E-Mail-Adresse eintragen, z. B. name@beispiel.de.'
  if (telefon && (telefon.length > MAX.telefon || nurZiffern(telefon).length < 3)) {
    felder.telefon = 'Bitte eine Telefonnummer mit Ziffern eintragen, z. B. 0171 1234567.'
  }
  if (whatsapp && (whatsapp.length > MAX.telefon || nurZiffern(whatsapp).length < 3)) {
    felder.whatsapp = 'Bitte eine WhatsApp-Nummer mit Ziffern eintragen, z. B. 0171 1234567.'
  }
  if (notiz && notiz.length > MAX.notiz) felder.notiz = `Die Notiz ist zu lang (höchstens ${MAX.notiz} Zeichen).`
  return felder
}

/** So steht es nach dem Speichern in der Datenbank: ohne Leerzeichen am Rand, WhatsApp nur, wenn abweichend. */
function alsGespeichert(w: Werte): Werte {
  const telefon = textWert(w.telefon) ?? ''
  let whatsapp = textWert(w.whatsapp) ?? ''
  if (whatsapp && telefon && nurZiffern(whatsapp) === nurZiffern(telefon)) whatsapp = ''
  return { name: textWert(w.name) ?? '', telefon, email: textWert(w.email) ?? '', whatsapp, notiz: textWert(w.notiz) ?? '' }
}

const gleich = (a: Werte, b: Werte) => JSON.stringify(a) === JSON.stringify(b)

/* ── Nachbau der Speicherleiste ────────────────────────────────────────────── */

/**
 * Wie components/verwaltung/SpeicherLeiste.tsx, aber im Fluss des Formulars (klebt beim Scrollen
 * unten am Übungsbereich). `hinweis` ist die Rückmeldung der Übung, keine echte Meldung.
 */
function Leiste({
  geaendert,
  ergebnis,
  hinweis,
  neuLaden,
}: {
  geaendert: boolean
  ergebnis: FormErgebnis
  hinweis?: string | null
  neuLaden?: () => void
}) {
  // Erfolgsmeldung ausblenden, sobald wieder etwas geändert wird; Fehler bleiben stehen.
  const zeigeMeldung = !!ergebnis.meldung && (!ergebnis.ok || !geaendert)
  const konflikt = !ergebnis.ok && !!ergebnis.meldung?.endsWith('Bitte Seite neu laden.')
  return (
    <div className="sticky bottom-0 z-10 space-y-3 border-t border-[#0a0a0a]/10 bg-[#f5f5f0]/95 px-1 pb-3 pt-3 backdrop-blur">
      {zeigeMeldung && (
        <div className="space-y-2">
          <FormMeldung ergebnis={ergebnis} />
          {konflikt && (
            <button type="button" className={knopfKlassen.sekundaer} onClick={neuLaden}>
              <RotateCw size={15} /> Seite neu laden
            </button>
          )}
        </div>
      )}
      {hinweis && <Meldung art="hinweis">{hinweis}</Meldung>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-[10rem] flex-1 text-sm" aria-live="polite">
          {geaendert ? <span className="font-medium text-amber-800">Ungespeicherte Änderungen</span> : <span className="text-[#6b6b6b]">Alles gespeichert.</span>}
        </p>
        <SpeichernKnopf className="px-8 py-3 text-base">Speichern</SpeichernKnopf>
      </div>
    </div>
  )
}

/* ── Nachbau "Person bearbeiten" ───────────────────────────────────────────── */

function PersonFormular({
  titel,
  werte,
  geaendert,
  ergebnis,
  hinweis,
  verwendung,
  zuletzt,
  aendern,
  speichern,
  neuLaden,
  beimKopieren,
  titelRef,
}: {
  /** Name, wie er gespeichert ist (Seitenkopf). */
  titel: string
  werte: Werte
  geaendert: boolean
  ergebnis: FormErgebnis
  hinweis?: string | null
  /** Zeile unter "Hier eingetragen", z. B. "Kontaktseite: Jugendwartin". */
  verwendung: string
  /** "geändert am" des gespeicherten Stands (ISO). */
  zuletzt: string
  aendern: (teil: Partial<Werte>) => void
  speichern: () => void
  neuLaden?: () => void
  /** Text, der im Feld „Notiz“ kopiert oder ausgeschnitten wurde. */
  beimKopieren?: (text: string) => void
  /** Zum Fokussieren der Überschrift, z. B. nach dem Zurückkehren auf die Seite. */
  titelRef?: React.Ref<HTMLHeadingElement>
}) {
  const formular = useRef<HTMLFormElement>(null)
  const felder = ergebnis.ok ? {} : (ergebnis.felder ?? {})

  // Wie im echten Formular: zum ersten rot markierten Feld springen
  useEffect(() => {
    if (ergebnis.ok || !ergebnis.felder) return
    const erstes = formular.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (erstes) {
      erstes.scrollIntoView({ behavior: 'smooth', block: 'center' })
      erstes.focus({ preventScroll: true })
    }
  }, [ergebnis])

  const feld = (name: keyof Werte) => ({
    id: `uebung-${name}`,
    value: werte[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => aendern({ [name]: e.target.value }),
    'aria-invalid': !!felder[name] || undefined,
    className: eingabeKlasse,
  })

  // Kopieren oder Ausschneiden im Feld „Notiz“ – gemeldet wird der markierte Text
  const notizGesichert = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget
    beimKopieren?.(t.value.slice(t.selectionStart, t.selectionEnd))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 ref={titelRef} tabIndex={-1} className="font-display text-3xl leading-none tracking-tight focus:outline-none md:text-4xl">
          {titel}
        </h3>
        <div className="mt-2 text-sm text-[#6b6b6b]">Erscheint auf der Website – Änderungen sind nach dem Speichern sofort sichtbar.</div>
      </div>

      <Karte titel="Hier eingetragen">
        <ul className="-mx-1 divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
          <li>
            <span className="block px-1 py-3">{verwendung}</span>
          </li>
        </ul>
      </Karte>

      <form
        ref={formular}
        onSubmit={e => {
          e.preventDefault()
          speichern()
        }}
        noValidate
        className="space-y-6"
      >
        <Karte titel="Kontaktdaten">
          <div className="space-y-5">
            <Meldung art="hinweis">
              Name, Telefon, E-Mail, WhatsApp und Foto erscheinen auf der Website, sobald die Person in einem Trainerteam oder auf der Kontaktseite
              steht. Bitte nur mit Einverständnis der Person eintragen.
            </Meldung>
            <Feld label="Name" htmlFor="uebung-name" fehler={felder.name}>
              <input {...feld('name')} maxLength={100} autoComplete="off" />
            </Feld>
            <div className="grid gap-5 md:grid-cols-2">
              <Feld label="Telefon" htmlFor="uebung-telefon" fehler={felder.telefon} hinweis="Optional, z. B. 0171 1234567">
                <input {...feld('telefon')} type="tel" inputMode="tel" maxLength={50} autoComplete="off" />
              </Feld>
              <Feld label="E-Mail" htmlFor="uebung-email" fehler={felder.email} hinweis="Optional">
                <input {...feld('email')} type="email" inputMode="email" maxLength={200} autoComplete="off" />
              </Feld>
            </div>
            <Feld
              label="WhatsApp (nur falls abweichend)"
              htmlFor="uebung-whatsapp"
              fehler={felder.whatsapp}
              hinweis="Nur ausfüllen, wenn WhatsApp über eine andere Nummer läuft als das Telefon oben."
            >
              <input {...feld('whatsapp')} type="tel" inputMode="tel" maxLength={50} autoComplete="off" />
            </Feld>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Foto</span>
              {/* Nachbau von FotoFeld ohne Hochladen – in der Übung gibt es keine Dateien */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex aspect-[3/4] w-40 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#0a0a0a]/10 bg-[#f0f0ea]">
                  <span className="px-3 text-center text-sm text-[#6b6b6b]">Kein Foto</span>
                </div>
                <div className="min-w-0 space-y-2">
                  <button type="button" disabled className={knopfKlassen.sekundaer} title="In der Übung nicht verfügbar">
                    Foto hochladen
                  </button>
                  <p className="text-xs leading-relaxed text-[#6b6b6b]">JPG, PNG oder WebP bis 15 MB. Wird automatisch verkleinert; Standortdaten werden entfernt.</p>
                </div>
              </div>
            </div>
          </div>
        </Karte>

        <Karte titel="Interne Notiz">
          <Feld label="Notiz" htmlFor="uebung-notiz" fehler={felder.notiz} hinweis="Nur für die Verwaltung – wird nie auf der Website angezeigt.">
            <textarea
              {...feld('notiz')}
              rows={3}
              maxLength={2000}
              onCopy={notizGesichert}
              onCut={notizGesichert}
              className={`${eingabeKlasse} leading-relaxed`}
            />
          </Feld>
        </Karte>

        <Leiste geaendert={geaendert} ergebnis={ergebnis} hinweis={hinweis} neuLaden={neuLaden} />
      </form>

      <p className="text-sm text-[#6b6b6b]">Zuletzt geändert am {zeitpunktDeutsch(zuletzt)}</p>
    </div>
  )
}

/** Zustand eines Personen-Formulars: gespeicherter Stand, Eingaben, Rückmeldung. */
function usePerson(start: Werte, entwurf: Werte = start) {
  const [stand, setStand] = useState(start)
  const [werte, setWerte] = useState(entwurf)
  const [ergebnis, setErgebnis] = useState<FormErgebnis>(LEER)
  const [hinweis, setHinweis] = useState<string | null>(null)
  return {
    stand,
    werte,
    ergebnis,
    hinweis,
    geaendert: !gleich(werte, stand),
    aendern: (teil: Partial<Werte>) => setWerte(w => ({ ...w, ...teil })),
    setStand,
    setWerte,
    setErgebnis,
    setHinweis,
  }
}

/* ── Rückfrage des Browsers (statt window.confirm, damit nichts wegnavigiert) ─ */

function BrowserFrage({
  titel,
  text,
  okText = 'OK',
  ok,
  abbrechen,
}: {
  titel: string
  text: string
  okText?: string
  ok: () => void
  abbrechen: () => void
}) {
  const okKnopf = useRef<HTMLButtonElement>(null)
  const kasten = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const vorher = document.activeElement as HTMLElement | null
    okKnopf.current?.focus()
    return () => vorher?.focus?.()
  }, [])

  function tasten(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      abbrechen()
    }
    // Fokus im Dialog halten (nur zwei Knöpfe)
    if (e.key === 'Tab') {
      const knoepfe = kasten.current?.querySelectorAll<HTMLButtonElement>('button')
      if (!knoepfe || knoepfe.length < 2) return
      const erster = knoepfe[0]
      const letzter = knoepfe[knoepfe.length - 1]
      if (e.shiftKey && document.activeElement === erster) {
        e.preventDefault()
        letzter.focus()
      } else if (!e.shiftKey && document.activeElement === letzter) {
        e.preventDefault()
        erster.focus()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0a0a0a]/40 px-4 pt-16" onKeyDown={tasten}>
      <div
        ref={kasten}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="uebung-frage-titel"
        aria-describedby="uebung-frage-text"
        className="w-full max-w-md rounded-md bg-white p-5 shadow-xl"
      >
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b6b6b]">Übung · so oder ähnlich fragt der Browser</div>
        <h3 id="uebung-frage-titel" className="font-semibold">
          {titel}
        </h3>
        <p id="uebung-frage-text" className="mt-2 text-sm leading-relaxed text-[#4a4a4a]">
          {text}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button ref={okKnopf} type="button" onClick={ok} className={knopfKlassen.primaer}>
            {okText}
          </button>
          <button type="button" onClick={abbrechen} className={knopfKlassen.sekundaer}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Vorschau: die Zeile auf /ansprechpartner ─────────────────────────────── */

const WHATSAPP_PFAD =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'

function WebsiteKontakt({ person, funktion }: { person: Werte; funktion: string }) {
  const whatsapp = whatsappLink(person)
  return (
    <Vorschau adresse="/ansprechpartner">
      <div className="mb-4 text-[11px] uppercase tracking-[0.2em] text-[#6b6b6b]">Weitere Ansprechpartner</div>
      <div className="space-y-px bg-[#0a0a0a]/10">
        <div className="flex flex-col gap-6 bg-[#f5f5f0] p-6 md:flex-row md:items-center md:p-8">
          <div className="flex-1">
            <div className="text-lg font-medium">{person.name}</div>
            <div className="mt-0.5 text-sm text-[#6b6b6b]">{funktion}</div>
          </div>
          {/* Auf der Website sind das Links – hier nur Text, damit niemand aus Versehen anruft */}
          <div className="flex min-w-0 flex-col gap-2 text-sm">
            {person.email && (
              <span className="flex items-center gap-2 break-all text-[#6b6b6b]">
                <Mail size={13} className="shrink-0" /> {person.email}
              </span>
            )}
            {person.telefon && (
              <span className="flex items-center gap-2 text-[#6b6b6b]">
                <Phone size={13} className="shrink-0" /> {person.telefon}
              </span>
            )}
            {whatsapp && (
              <span className="flex items-center gap-2 text-[#6b6b6b]">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={WHATSAPP_PFAD} />
                </svg>
                WhatsApp
              </span>
            )}
          </div>
        </div>
      </div>
    </Vorschau>
  )
}

/* ── Lektion 1: die Leiste am unteren Rand ─────────────────────────────────── */

const ANNA: Werte = { name: 'Anna Beispiel', telefon: '0160 1234567', email: 'anna.beispiel@example.org', whatsapp: '', notiz: '' }

function LeisteUebung({ geloest }: LektionProps) {
  const p = usePerson(ANNA)
  const [zuletzt, setZuletzt] = useState('2026-10-12T16:04:00.000Z')

  function speichern() {
    p.setHinweis(null)
    const felder = pruefen(p.werte)
    if (Object.keys(felder).length) return p.setErgebnis(feldFehlerMeldung(felder))
    const neu = alsGespeichert(p.werte)
    const hinweis =
      neu.name !== ANNA.name
        ? 'Der Name bleibt „Anna Beispiel“.'
        : nurZiffern(neu.telefon) !== '01712345678'
          ? 'Trag bei „Telefon“ die neue Nummer 0171 2345678 ein.'
          : null
    if (hinweis) {
      p.setErgebnis(LEER)
      return p.setHinweis(`In der Übung noch nicht ganz: ${hinweis}`)
    }
    p.setStand(neu)
    p.setWerte(neu)
    p.setErgebnis(erfolg(GESPEICHERT))
    setZuletzt(new Date().toISOString())
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        <PersonFormular
          titel={p.stand.name}
          werte={p.werte}
          geaendert={p.geaendert}
          ergebnis={p.ergebnis}
          hinweis={p.hinweis}
          verwendung="Kontaktseite: Jugendwartin"
          zuletzt={zuletzt}
          aendern={p.aendern}
          speichern={speichern}
        />
      </Spielwiese>
      <WebsiteKontakt person={p.stand} funktion="Jugendwartin" />
    </div>
  )
}

/* ── Lektion 2: Rückfrage beim Verlassen ───────────────────────────────────── */

const MENUE = ['Übersicht', 'Personen', 'Hilfe'] as const
type Ort = (typeof MENUE)[number]
const ANNA_NEU: Werte = { ...ANNA, telefon: '0171 2345678' }
const ZIEL_EMAIL = 'anna@example.org'

function VerlassenUebung({ geloest }: LektionProps) {
  const p = usePerson(ANNA_NEU)
  const [zuletzt, setZuletzt] = useState('2026-10-25T08:15:00.000Z')
  const [ort, setOrt] = useState<Ort>('Personen')
  const [frage, setFrage] = useState<Ort | null>(null)
  const [gesehen, setGesehen] = useState(false)
  const [rueckmeldung, setRueckmeldung] = useState<{ art: 'erfolg' | 'hinweis'; text: string } | null>(null)
  const titel = useRef<HTMLHeadingElement>(null)
  const [titelFokus, setTitelFokus] = useState(false)

  // Nach „Zurück zu Anna Beispiel“ verschwindet der Knopf – der Fokus springt auf die Überschrift
  useEffect(() => {
    if (!titelFokus || ort !== 'Personen') return
    titel.current?.focus()
    setTitelFokus(false)
  }, [titelFokus, ort])

  function speichern() {
    p.setHinweis(null)
    const felder = pruefen(p.werte)
    if (Object.keys(felder).length) return p.setErgebnis(feldFehlerMeldung(felder))
    const neu = alsGespeichert(p.werte)
    if (neu.email.toLowerCase() !== ZIEL_EMAIL) {
      p.setErgebnis(LEER)
      return p.setHinweis(`In der Übung noch nicht ganz: Trag bei „E-Mail“ ${ZIEL_EMAIL} ein.`)
    }
    p.setStand(neu)
    p.setWerte(neu)
    p.setErgebnis(erfolg(GESPEICHERT))
    setZuletzt(new Date().toISOString())
  }

  /** Seite wechseln – wie ein Klick auf einen Link im Menü. */
  function gehen(ziel: Ort, verloren: boolean) {
    setFrage(null)
    setOrt(ziel)
    if (ziel === 'Personen') return
    const emailGespeichert = p.stand.email.toLowerCase() === ZIEL_EMAIL
    if (verloren) {
      setRueckmeldung({
        art: 'hinweis',
        text: 'Deine Änderung ist weg – du hast bei der Rückfrage „OK“ gewählt, ohne vorher zu speichern. Geh zurück zu Anna Beispiel und versuch es noch einmal.',
      })
    } else if (emailGespeichert && gesehen) {
      setRueckmeldung({ art: 'erfolg', text: 'Ohne Rückfrage hier angekommen – alles war gespeichert, nichts ging verloren.' })
      geloest()
    } else if (emailGespeichert) {
      setRueckmeldung({
        art: 'hinweis',
        text: 'Gespeichert und gegangen – prima. Probier aber auch die Rückfrage aus: Geh zurück, ändere etwas und tippe dann ohne Speichern im Übungsmenü auf „Übersicht“.',
      })
    } else {
      setRueckmeldung({ art: 'hinweis', text: `Die neue E-Mail-Adresse ${ZIEL_EMAIL} ist noch nicht gespeichert. Geh zurück zu Anna Beispiel.` })
    }
  }

  function menueKlick(ziel: Ort) {
    if (ziel === ort) return
    if (ort === 'Personen' && p.geaendert) {
      setGesehen(true)
      setFrage(ziel)
      return
    }
    gehen(ziel, false)
  }

  function zurueck() {
    // Neu geöffnet: Das Formular zeigt den gespeicherten Stand
    p.setWerte(p.stand)
    p.setErgebnis(LEER)
    p.setHinweis(null)
    setRueckmeldung(null)
    setOrt('Personen')
  }

  return (
    <Spielwiese>
      <div className="grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)] md:items-start">
        {/* Nachbau der Seitenleiste (components/verwaltung/Navigation.tsx) – mit eigenem Rahmen, damit
            niemand sie mit dem echten Menü daneben verwechselt */}
        <nav aria-label="Übungsmenü" className="rounded-sm border border-[#0a0a0a]/15 bg-white p-2">
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6b6b6b]">Übungsmenü</div>
          <ul className="flex flex-wrap gap-1 md:block md:space-y-0.5">
            {MENUE.map(punkt => (
              <li key={punkt}>
                <button
                  type="button"
                  onClick={() => (punkt === 'Personen' && ort !== 'Personen' ? zurueck() : menueKlick(punkt))}
                  aria-current={ort === punkt ? 'page' : undefined}
                  className={`block w-full rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                    ort === punkt ? 'bg-[#0a0a0a] text-[#f5f5f0]' : 'text-[#4a4a4a] hover:bg-[#0a0a0a]/[0.06]'
                  }`}
                >
                  {punkt}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {ort === 'Personen' ? (
            <PersonFormular
              titel={p.stand.name}
              werte={p.werte}
              geaendert={p.geaendert}
              ergebnis={p.ergebnis}
              hinweis={p.hinweis}
              verwendung="Kontaktseite: Jugendwartin"
              zuletzt={zuletzt}
              aendern={p.aendern}
              speichern={speichern}
              titelRef={titel}
            />
          ) : (
            <div className="space-y-4">
              <h3 className="font-display text-3xl leading-none tracking-tight md:text-4xl">{ort === 'Übersicht' ? 'ÜBERSICHT' : 'HILFE'}</h3>
              <p className="text-sm text-[#6b6b6b]">Du hast die Seite „Anna Beispiel“ verlassen und bist jetzt hier.</p>
              {rueckmeldung && <Meldung art={rueckmeldung.art}>{rueckmeldung.text}</Meldung>}
              <button
                type="button"
                onClick={() => {
                  zurueck()
                  setTitelFokus(true)
                }}
                className={knopfKlassen.sekundaer}
              >
                Zurück zu Anna Beispiel
              </button>
            </div>
          )}
        </div>
      </div>

      {frage && (
        <BrowserFrage
          // Wie window.confirm: Im Kopf steht die Adresse der Seite, kein eigener Titel
          titel={`${window.location.host} meldet`}
          text={FRAGE_VERLASSEN}
          ok={() => gehen(frage, true)}
          abbrechen={() => setFrage(null)}
        />
      )}
    </Spielwiese>
  )
}

/* ── Lektion 3: wenn zwei gleichzeitig bearbeiten ─────────────────────────── */

const JONAS: Werte = { name: 'Jonas Muster', telefon: '0151 1234567', email: 'jonas@example.org', whatsapp: '', notiz: '' }
// Miras Stand: Sie hat währenddessen die Telefonnummer geändert
const JONAS_MIRA: Werte = { ...JONAS, telefon: '0152 7654321' }
const ENTWURF = 'Hat den Hallenschlüssel Nr. 12. Trainerlizenz C gültig bis 2028. Übernimmt ab Januar dienstags zusätzlich die U12.'
/** Steckt (fast) die ganze Notiz im Text? Ein einzelnes kopiertes Wort zählt nicht. */
const enthaeltNotiz = (text: string) => {
  const t = text.toLowerCase()
  return t.includes('hallenschlüssel') && t.includes('lizenz')
}
const EINFUEGEN = 'Strg+V, am Mac Cmd+V, am Handy lange tippen → „Einfügen“'

function KonfliktUebung({ geloest }: LektionProps) {
  const p = usePerson(JONAS, { ...JONAS, notiz: ENTWURF })
  const [zuletzt, setZuletzt] = useState('2026-10-20T15:30:00.000Z')
  const [neuGeladen, setNeuGeladen] = useState(false)
  const [kopiert, setKopiert] = useState(false)
  const [frage, setFrage] = useState(false)
  const [hinweis, setHinweis] = useState<{ art: 'erfolg' | 'hinweis'; text: string } | null>(null)
  const hinweisRef = useRef<HTMLDivElement>(null)

  // Nach dem "Neuladen" steht man wie in echt wieder oben – mit dem Hinweis im Blick
  useEffect(() => {
    if (!hinweis) return
    hinweisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    hinweisRef.current?.focus({ preventScroll: true })
  }, [hinweis])

  function speichern() {
    p.setHinweis(null)
    // Wie beim echten Speichern: Erst der Stand, dann die Felder
    if (!neuGeladen) return p.setErgebnis(fehler(KONFLIKT_MELDUNG))
    const felder = pruefen(p.werte)
    if (Object.keys(felder).length) return p.setErgebnis(feldFehlerMeldung(felder))
    const neu = alsGespeichert(p.werte)
    const aufgabe =
      nurZiffern(neu.telefon) !== nurZiffern(JONAS_MIRA.telefon)
        ? 'Die Telefonnummer hat Mira gerade geändert – lass sie so stehen.'
        : !enthaeltNotiz(neu.notiz)
          ? kopiert
            ? `Deine Notiz fehlt noch. Füge den kopierten Text ins Feld „Notiz“ ein (${EINFUEGEN}) und speichere.`
            : 'Deine Notiz fehlt noch. Hast du sie vorher kopiert? Dann füge sie ins Feld „Notiz“ ein und speichere. Sonst tipp unten auf „Von vorn“ und kopiere sie diesmal, bevor du die Seite neu lädst.'
          : null
    if (aufgabe) {
      p.setErgebnis(LEER)
      return p.setHinweis(`In der Übung noch nicht ganz: ${aufgabe}`)
    }
    p.setStand(neu)
    p.setWerte(neu)
    p.setErgebnis(erfolg(GESPEICHERT))
    setHinweis(null)
    setZuletzt(new Date().toISOString())
    geloest()
  }

  function neuLaden() {
    setFrage(false)
    p.setStand(JONAS_MIRA)
    p.setWerte(JONAS_MIRA)
    p.setErgebnis(LEER)
    p.setHinweis(null)
    setNeuGeladen(true)
    setZuletzt(new Date(Date.now() - 3 * 60_000).toISOString())
    setHinweis(
      kopiert
        ? {
            art: 'erfolg',
            text: `Die Seite zeigt jetzt Miras Stand – mit ihrer neuen Telefonnummer. Gut, dass du deinen Text gesichert hast: Füge ihn wieder ins Feld „Notiz“ ein (${EINFUEGEN}) und speichere.`,
          }
        : {
            art: 'hinweis',
            text: 'Die Seite zeigt jetzt Miras Stand – mit ihrer neuen Telefonnummer, aber ohne deine Notiz. Hast du den Text vorher kopiert? Dann füge ihn ins Feld „Notiz“ ein und speichere. Sonst tipp unten auf „Von vorn“ und sichere ihn diesmal vor dem Neuladen: im Feld alles markieren (Strg+A, am Mac Cmd+A) und kopieren (Strg+C bzw. Cmd+C), am Handy lange tippen → „Alles auswählen“ → „Kopieren“.',
          },
    )
  }

  return (
    <Spielwiese>
      <div className="space-y-4">
        {hinweis && (
          <div ref={hinweisRef} tabIndex={-1} className="focus:outline-none">
            <Meldung art={hinweis.art}>{hinweis.text}</Meldung>
          </div>
        )}
        <PersonFormular
          titel={p.stand.name}
          werte={p.werte}
          geaendert={p.geaendert}
          ergebnis={p.ergebnis}
          hinweis={p.hinweis}
          verwendung="Trainer:in bei U13 (Fußball)"
          zuletzt={zuletzt}
          aendern={p.aendern}
          speichern={speichern}
          neuLaden={() => (p.geaendert ? setFrage(true) : neuLaden())}
          beimKopieren={text => enthaeltNotiz(text) && setKopiert(true)}
        />
      </div>
      {frage && (
        <BrowserFrage
          titel="Website neu laden?"
          text="Möglicherweise werden die vorgenommenen Änderungen nicht gespeichert."
          okText="Neu laden"
          ok={neuLaden}
          abbrechen={() => setFrage(false)}
        />
      )}
    </Spielwiese>
  )
}

/* ── Lektion 5: zwei Fragen hintereinander ─────────────────────────────────── */

type Frage = Omit<React.ComponentProps<typeof Quiz>, 'geloest' | 'istGeloest'>

function Fragen({ fragen, geloest, istGeloest }: { fragen: Frage[] } & LektionProps) {
  const [richtig, setRichtig] = useState<boolean[]>(() => fragen.map(() => istGeloest))
  const alleRichtig = richtig.every(Boolean)

  // Gelöst, sobald jede Frage einmal richtig beantwortet ist
  useEffect(() => {
    if (alleRichtig && !istGeloest) geloest()
  }, [alleRichtig, istGeloest, geloest])

  return (
    <div className="space-y-8">
      {fragen.map((f, i) => (
        <Quiz key={i} {...f} istGeloest={istGeloest} geloest={() => setRichtig(alt => alt.map((x, j) => (j === i ? true : x)))} />
      ))}
    </div>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Die Leiste am unteren Rand',
    aufgabe: (
      <>
        Anna Beispiel hat eine neue Handynummer. Trag bei „Telefon“ <strong>0171 2345678</strong> ein. Schau dabei auf die Leiste unter dem
        Formular – und speichere dann.
      </>
    ),
    Inhalt: LeisteUebung,
    danach: (
      <>
        Sobald du tippst, springt die Leiste auf „Ungespeicherte Änderungen“. Nach dem Speichern steht dort wieder „Alles gespeichert.“ – und die
        neue Nummer sofort auf der Website. In echt klebt die Leiste immer am unteren Bildschirmrand.
      </>
    ),
  },
  {
    titel: 'Erst speichern, dann gehen',
    aufgabe: (
      <>
        Ändere Annas E-Mail-Adresse in <strong>anna@example.org</strong>. Tippe dann – ohne zu speichern – im Kasten „Übungsmenü“ (neben dem
        Formular, am Handy darüber) auf „Übersicht“ und lies die Rückfrage. Wähle „Abbrechen“, um auf der Seite zu bleiben. Speichere und geh erst
        danach zur Übersicht.
      </>
    ),
    Inhalt: VerlassenUebung,
    danach:
      'Diese Rückfrage kommt, wenn du mit ungespeicherten Änderungen auf einen Link tippst, etwa im Menü. Beim Schließen oder Neuladen des Tabs fragt der Browser mit eigenen Worten nach, bei „Zurück“ nur manche Browser. Verlass dich nicht darauf: erst speichern, dann gehen. „Abbrechen“ heißt: bleiben.',
  },
  {
    titel: 'Zwei gleichzeitig',
    aufgabe: (
      <>
        Du hast für Jonas Muster gerade eine längere interne Notiz geschrieben (sie steht schon im Feld). Speichere sie. Was du nicht weißt:
        Mira Probe hat Jonas eben auch bearbeitet. Sichere deinen Text (kopieren), bevor du die Seite neu lädst.
      </>
    ),
    Inhalt: KonfliktUebung,
    danach:
      'So geht nichts verloren und nichts wird überschrieben: Miras neue Telefonnummer ist geblieben, deine Notiz ist dazugekommen. In echt lädt „Seite neu laden“ die ganze Seite neu – alles, was du nicht kopiert hast, ist dann weg.',
  },
  {
    titel: 'Gespeichert heißt …',
    aufgabe: 'Eine kurze Frage.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Du hast auf „Speichern“ getippt, und die Leiste zeigt „Alles gespeichert.“. Was heißt das für die Website?"
        antworten={[
          {
            text: 'Der Vorstand prüft die Änderung und gibt sie dann für die Website frei.',
            erklaerung: 'Eine Freigabe gibt es nicht. Gespeichert heißt: sofort live – du bist selbst verantwortlich.',
          },
          {
            text: 'Sie steht sofort auf der Website – nur News brauchen zusätzlich „Veröffentlicht“.',
            richtig: true,
          },
          {
            text: 'Die Website übernimmt alle Änderungen über Nacht, meist bis zum Morgen.',
            erklaerung: 'Es gibt keine Wartezeit. Die Website liest bei jedem Aufruf frisch aus der Verwaltung.',
          },
          {
            text: 'Online geht sie erst, wenn ich zusätzlich auf „Veröffentlichen“ tippe.',
            erklaerung: 'So etwas gibt es nur bei News (als Schalter „Veröffentlicht“). Alles andere ist mit dem Speichern sofort online.',
          },
        ]}
      />
    ),
    danach: (
      <>
        Nur News erscheinen erst, wenn der Schalter „Veröffentlicht“ an ist. Tipp: Lass die Website in einem zweiten Tab offen und lade sie nach dem
        Speichern neu – dann siehst du sofort, wie es aussieht.
      </>
    ),
  },
  {
    titel: 'Rechte und Verlauf',
    aufgabe: 'Zwei Fragen zum Schluss.',
    Inhalt: props => (
      <Fragen
        {...props}
        fragen={[
          {
            frage: 'Du bist Trainerin der U12. Im Menü fehlt dir der Punkt „Termine“, den du gern nutzen würdest. Was tust du?',
            antworten: [
              {
                text: 'Die Seite neu laden, dann taucht der Punkt auf.',
                erklaerung: 'Das Menü zeigt genau das, was dein Zugang bearbeiten darf. Neu laden ändert daran nichts.',
              },
              {
                text: 'Mir selbst unter „Zugänge“ einen zweiten Zugang anlegen.',
                erklaerung: 'Zugänge und Rechte vergeben nur Admins – den Menüpunkt „Zugänge“ siehst du gar nicht. Frag eine:n Admin.',
              },
              { text: 'Eine:n Admin fragen – die Rechte werden unter „Zugänge“ vergeben.', richtig: true },
            ],
          },
          {
            frage: 'Du hast aus Versehen eine falsche Telefonnummer gespeichert und die alte nicht mehr im Kopf. Was hilft?',
            antworten: [
              {
                text: 'Unten in der Speicherleiste auf „Rückgängig“ tippen.',
                erklaerung: 'Einen Knopf zum Rückgängigmachen gibt es nicht. Ein:e Admin findet den alten Stand im Verlauf.',
              },
              {
                text: 'Eine:n Admin fragen – der alte Stand steht im Verlauf.',
                richtig: true,
              },
              {
                text: 'Nichts – nach dem Speichern ist die alte Nummer weg.',
                erklaerung: 'Doch, sie ist noch da: Bei jeder Änderung wird festgehalten, wer was wann geändert hat – mit dem Stand vorher und nachher.',
              },
            ],
          },
        ]}
      />
    ),
    danach: 'Deine eigenen letzten Änderungen siehst du jederzeit auf der Übersicht unter „Zuletzt geändert“.',
  },
]
