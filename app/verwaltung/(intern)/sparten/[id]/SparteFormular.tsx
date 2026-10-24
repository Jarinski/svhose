'use client'

import { useActionState, useEffect, useState } from 'react'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import { slugify } from '@/lib/verwaltung/text'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import PersonSuche, { type PersonKurz } from '@/components/verwaltung/PersonSuche'
import ReihenfolgeKnoepfe, { verschieben } from '@/components/verwaltung/ReihenfolgeKnoepfe'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { sparteSpeichernAktion } from '../aktionen'
import { CRON_SLUGS, SPARTEN_ROLLEN, STANDARD_ROLLE } from '../konstanten'

export interface SparteFormDaten {
  id: number
  name: string
  slug: string
  icon: string | null
  farbe: string | null
  kurzbeschreibung: string | null
  beschreibung: string | null
  fotoUrl: string | null
  sichtbar: boolean
  reihenfolge: number
  geaendertAm: string
}

export interface AnsprechpartnerZeile {
  personId: number
  name: string
  rolle: string
}

interface Props {
  sparte: SparteFormDaten
  ansprechpartner: AnsprechpartnerZeile[]
  personen: PersonKurz[]
  istAdmin: boolean
}

const FARBE = /^#[0-9a-fA-F]{6}$/

/** Erster Buchstabe groß – für Satzanfänge. */
function gross(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
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
  ap: AnsprechpartnerZeile[]
}

/** Textarea-Inhalt ohne Ränder – gespeichert steht ein Umbruch ggf. als \r\n, im Browser immer als \n. */
function mehrzeilig(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim()
}

/**
 * Vergleichbarer Stand der Eingaben – vereinheitlicht wie beim Speichern (eingabePruefen in ../logik):
 * Leerzeichen am Rand, Zeilenumbrüche, Farbe in Kleinbuchstaben, leere Rolle = Standardrolle.
 */
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

export default function SparteFormular(props: Props) {
  const [ergebnis, aktion] = useActionState(sparteSpeichernAktion, LEER)
  return (
    <form action={aktion} onReset={eingabenBehalten} className="space-y-6">
      <input type="hidden" name="id" value={props.sparte.id} />
      {/* Optimistische Sperre: Stand beim Laden. Kommt nach dem Speichern frisch vom Server. */}
      <input type="hidden" name="geaendertAm" value={props.sparte.geaendertAm} />
      {/* Nach erfolgreichem Speichern ändert sich geaendertAm → Felder starten mit dem neuen Stand. */}
      <Felder key={props.sparte.geaendertAm} {...props} ergebnis={ergebnis} />
    </form>
  )
}

function Felder({ sparte, ansprechpartner, personen, istAdmin, ergebnis }: Props & { ergebnis: FormErgebnis }) {
  const f = ergebnis.felder ?? {}
  const [name, setName] = useState(sparte.name)
  const [icon, setIcon] = useState(sparte.icon ?? '')
  const [farbe, setFarbe] = useState(sparte.farbe ?? '')
  const [kurz, setKurz] = useState(sparte.kurzbeschreibung ?? '')
  const [beschreibung, setBeschreibung] = useState(sparte.beschreibung ?? '')
  const [sichtbar, setSichtbar] = useState(sparte.sichtbar)
  const [reihenfolge, setReihenfolge] = useState(String(sparte.reihenfolge))
  const [slug, setSlug] = useState(sparte.slug)
  const [ap, setAp] = useState<AnsprechpartnerZeile[]>(ansprechpartner)
  const [vorschau, setVorschau] = useState<string | null>(null)
  const [fotoEntfernen, setFotoEntfernen] = useState(false)
  const [fotoHinweis, setFotoHinweis] = useState<string | null>(null)

  // Vorschau-URL des gewählten Fotos wieder freigeben
  useEffect(() => () => {
    if (vorschau) URL.revokeObjectURL(vorschau)
  }, [vorschau])

  // Vergleich mit dem Stand beim Laden – nach dem Speichern starten die Felder ohnehin neu (key).
  const geaendert =
    vorschau !== null ||
    fotoEntfernen ||
    vergleichsStand({ name, icon, farbe, kurz, beschreibung, sichtbar, reihenfolge, slug, ap }) !==
      vergleichsStand({
        name: sparte.name,
        icon: sparte.icon ?? '',
        farbe: sparte.farbe ?? '',
        kurz: sparte.kurzbeschreibung ?? '',
        beschreibung: sparte.beschreibung ?? '',
        sichtbar: sparte.sichtbar,
        reihenfolge: String(sparte.reihenfolge),
        slug: sparte.slug,
        ap: ansprechpartner,
      })
  useUngespeichertWarnung(geaendert)

  const slugNeu = slugify(slug)
  const slugGeaendert = istAdmin && slugNeu !== sparte.slug
  const cronAlt = CRON_SLUGS[sparte.slug] as string | undefined
  const cronNeu = CRON_SLUGS[slugNeu]

  let rueckfrage: string | undefined
  if (slugGeaendert) {
    rueckfrage = `Die Adresse der Sparte ändert sich von /sparten/${sparte.slug} zu /sparten/${slugNeu || '…'}. Alte Links funktionieren dann nicht mehr.`
    if (cronAlt) rueckfrage += `\n\nACHTUNG: ${gross(cronAlt)} findet diese Sparte nur über die Adresse „${sparte.slug}“ und funktioniert danach nicht mehr!`
    rueckfrage += '\n\nTrotzdem speichern?'
  }

  const fotoAnzeige = vorschau ?? (fotoEntfernen ? null : sparte.fotoUrl)

  return (
    <>
      <Karte titel="Allgemein">
        <div className="space-y-5">
          <Feld label="Name" htmlFor="name" fehler={f.name}>
            <input id="name" name="name" required value={name} onChange={e => setName(e.target.value)} className={eingabeKlasse} />
          </Feld>
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Icon" htmlFor="icon" hinweis="Ein Emoji, z. B. ⚽ oder 🏓 – am Handy über die Emoji-Tastatur.">
              <input id="icon" name="icon" value={icon} onChange={e => setIcon(e.target.value)} maxLength={16} placeholder="⚽" className={`${eingabeKlasse} text-xl`} />
            </Feld>
            <Feld label="Farbe" htmlFor="farbe" fehler={f.farbe} hinweis="Akzentfarbe der Sparte. Leer lassen für keine Farbe.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Farbe auswählen"
                  value={FARBE.test(farbe) ? farbe.toLowerCase() : '#000000'}
                  onChange={e => setFarbe(e.target.value)}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-sm border border-[#0a0a0a]/20 bg-white p-1"
                />
                <input
                  id="farbe"
                  name="farbe"
                  value={farbe}
                  onChange={e => setFarbe(e.target.value.trim())}
                  placeholder="#0369a1"
                  maxLength={7}
                  spellCheck={false}
                  className={`${eingabeKlasse} font-mono`}
                />
                {farbe && (
                  <button type="button" onClick={() => setFarbe('')} className={knopfKlassen.leise}>
                    Keine
                  </button>
                )}
              </div>
            </Feld>
          </div>
          <Feld label="Kurzbeschreibung" htmlFor="kurzbeschreibung" hinweis="Ein bis zwei Sätze für die Übersicht aller Sparten.">
            <textarea id="kurzbeschreibung" name="kurzbeschreibung" rows={2} value={kurz} onChange={e => setKurz(e.target.value)} className={eingabeKlasse} />
          </Feld>
          <Feld label="Ausführliche Beschreibung" htmlFor="beschreibung" hinweis="Steht oben auf der Seite der Sparte. Absätze mit einer Leerzeile trennen.">
            <textarea id="beschreibung" name="beschreibung" rows={8} value={beschreibung} onChange={e => setBeschreibung(e.target.value)} className={eingabeKlasse} />
          </Feld>
        </div>
      </Karte>

      <Karte titel="Foto">
        <div className="space-y-4">
          {fotoAnzeige ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoAnzeige} alt="Foto der Sparte" className="max-h-56 w-auto rounded-sm border border-[#0a0a0a]/10" />
          ) : (
            <p className="text-sm text-[#6b6b6b]">{sparte.fotoUrl && fotoEntfernen ? 'Das Foto wird beim Speichern entfernt.' : 'Noch kein Foto.'}</p>
          )}
          <Feld
            label={sparte.fotoUrl ? 'Neues Foto hochladen' : 'Foto hochladen'}
            htmlFor="foto"
            fehler={fotoHinweis ?? f.foto}
            hinweis="JPG, PNG oder WebP bis 15 MB. Wird automatisch verkleinert."
          >
            <input
              id="foto"
              name="foto"
              type="file"
              accept="image/*"
              onChange={e => {
                const datei = e.target.files?.[0]
                setFotoHinweis(null)
                // Zu große Dateien gar nicht erst absenden – der Server nimmt nur bis 16 MB an.
                if (datei && datei.size > MAX_UPLOAD_BYTES) {
                  e.target.value = ''
                  setVorschau(null)
                  setFotoHinweis('Das Bild ist größer als 15 MB. Bitte ein kleineres Bild wählen.')
                  return
                }
                setVorschau(datei ? URL.createObjectURL(datei) : null)
                if (datei) setFotoEntfernen(false)
              }}
              className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-[#0a0a0a]/20 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </Feld>
          {sparte.fotoUrl && !vorschau && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="fotoEntfernen" checked={fotoEntfernen} onChange={e => setFotoEntfernen(e.target.checked)} className="w-4 h-4" />
              Foto entfernen
            </label>
          )}
        </div>
      </Karte>

      <Karte titel="Anzeige auf der Website">
        <div className="space-y-5">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="sichtbar" checked={sichtbar} onChange={e => setSichtbar(e.target.checked)} className="mt-0.5 w-5 h-5" />
            <span>
              <span className="block font-medium text-sm">Auf der Website anzeigen</span>
              <span className="block text-xs text-[#6b6b6b]">Ausgeblendete Sparten erscheinen nirgends auf der Website – auch ihre Seite ist dann nicht erreichbar.</span>
            </span>
          </label>
          <Feld label="Reihenfolge" htmlFor="reihenfolge" fehler={f.reihenfolge} hinweis="Kleinere Zahlen stehen in Übersichten weiter vorne." className="max-w-[12rem]">
            <input id="reihenfolge" name="reihenfolge" type="number" inputMode="numeric" step={1} value={reihenfolge} onChange={e => setReihenfolge(e.target.value)} className={eingabeKlasse} />
          </Feld>
        </div>
      </Karte>

      <Karte
        titel="Ansprechpartner:innen"
        beschreibung="Erscheinen auf der Seite der Sparte – mit Foto, Telefon und E-Mail aus den Personendaten."
      >
        <datalist id="sparten-rollen">
          {SPARTEN_ROLLEN.map(r => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <input type="hidden" name="ansprechpartner" value={JSON.stringify(ap.map(a => ({ personId: a.personId, rolle: a.rolle })))} />
        {f.ansprechpartner && (
          <div className="mb-4">
            <Meldung art="fehler">{f.ansprechpartner}</Meldung>
          </div>
        )}
        {ap.length === 0 ? (
          <p className="text-sm text-[#6b6b6b] pb-2">Noch niemand eingetragen.</p>
        ) : (
          <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
            {ap.map((a, i) => (
              <li key={a.personId} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="sm:w-56 min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  <a href={`/verwaltung/personen/${a.personId}`} className="text-xs text-[#6b6b6b] underline underline-offset-2 hover:text-[#0a0a0a]">
                    Kontaktdaten bearbeiten
                  </a>
                </div>
                <div className="flex items-center gap-2 sm:flex-1">
                  <input
                    list="sparten-rollen"
                    value={a.rolle}
                    onChange={e => setAp(ap.map((x, j) => (j === i ? { ...x, rolle: e.target.value } : x)))}
                    placeholder={STANDARD_ROLLE}
                    aria-label={`Rolle von ${a.name}`}
                    className={`${eingabeKlasse} flex-1 min-w-0`}
                  />
                  <ReihenfolgeKnoepfe
                    index={i}
                    anzahl={ap.length}
                    bezeichnung={a.name}
                    onVerschieben={r => setAp(verschieben(ap, i, r))}
                    onEntfernen={() => setAp(ap.filter((_, j) => j !== i))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <label htmlFor="ap-suche" className="block text-sm font-medium mb-1.5">
            Person hinzufügen
          </label>
          <PersonSuche
            id="ap-suche"
            personen={personen}
            ausschliessen={ap.map(a => a.personId)}
            onWaehlen={p => setAp(ap.concat({ personId: p.id, name: p.name, rolle: STANDARD_ROLLE }))}
          />
        </div>
      </Karte>

      {istAdmin && (
        <Karte titel="Adresse auf der Website" beschreibung="Nur für Admins. Normalerweise nie ändern.">
          <div className="space-y-4">
            <Feld label="Adresse (Slug)" htmlFor="slug" fehler={f.slug} hinweis="Nur Kleinbuchstaben, Ziffern und Bindestriche – Umlaute werden automatisch umgeschrieben.">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[#6b6b6b] shrink-0">/sparten/</span>
                <input id="slug" name="slug" value={slug} onChange={e => setSlug(e.target.value)} spellCheck={false} autoCapitalize="none" className={`${eingabeKlasse} font-mono`} />
              </div>
            </Feld>
            {cronAlt && (
              <Meldung art="fehler">
                <strong>Bitte nicht ändern:</strong> {gross(cronAlt)} findet diese Sparte über die Adresse „{sparte.slug}“. Mit einer anderen Adresse werden keine Spiele mehr
                übernommen.
              </Meldung>
            )}
            {slugGeaendert && (
              <Meldung art="hinweis">
                Die Adresse ändert sich zu <strong>/sparten/{slugNeu || '…'}</strong>. Alte Links, Lesezeichen und QR-Codes auf /sparten/{sparte.slug} funktionieren
                danach nicht mehr.
                {cronNeu && <> Außerdem nutzt dann {cronNeu} diese Sparte.</>}
              </Meldung>
            )}
          </div>
        </Karte>
      )}

      <SpeicherLeiste geaendert={geaendert} ergebnis={ergebnis} bestaetigen={rueckfrage} />
    </>
  )
}
