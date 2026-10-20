'use client'

/**
 * Formular "Mannschaft/Gruppe bearbeiten": Allgemein, Trainingszeiten, Trainerteam – mit EINEM
 * Speichern-Knopf (unten angeheftet). Alle Angaben gehen als JSON im Feld "daten" an die
 * Server-Aktion, dazu das Foto als Datei. Nach erfolgreichem Speichern lädt die Seite den neuen
 * Stand vom Server und das Formular startet frisch (key = Stand).
 */

import { useEffect, useRef, useState } from 'react'
import { useFormState } from 'react-dom'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import type { AuswahlPerson } from '@/lib/verwaltung/person-bearbeiten'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import type { TeamArt, TeamEingabe } from '@/lib/verwaltung/team-bearbeiten'
import { WOCHENTAGE } from '@/lib/verwaltung/text'
import FotoFeld from '@/components/verwaltung/FotoFeld'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import PersonAuswahl, { type NeuePersonDaten } from '@/components/verwaltung/PersonAuswahl'
import RollenAuswahl from '@/components/verwaltung/RollenAuswahl'
import { Badge, auswahlKlasse, eingabeKlasse, Feld, Karte, knopfKlassen } from '@/components/verwaltung/ui'
import { useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { teamSpeichernAktion } from '../../aktionen'

// ─── Typen ──────────────────────────────────────────────────────────────────

interface ZeitStart {
  id: number
  wochentag: number
  beginn: string
  ende: string
  ort: string
  saison: string
  rhythmus: string
  hinweis: string
}

export interface TeamStart {
  name: string
  bereich: string
  altersklasse: string
  beschreibung: string
  sichtbar: boolean
  reihenfolge: string
  trainingszeiten: ZeitStart[]
  trainer: { personId: number; rolle: string }[]
}

interface Props {
  art: TeamArt
  id: number
  /** "geändert am" beim Laden – für die Konfliktprüfung */
  stand: string
  start: TeamStart
  fotoUrl: string | null
  personen: AuswahlPerson[]
  orte: string[]
  optionen: { bereiche: string[]; saisons: string[]; rhythmen: string[]; rollen: string[] }
}

/** Zeile im Formular; `schluessel` ist nur für React und die Fehlerzuordnung. */
interface ZeitZeile {
  schluessel: string
  id: number | null
  wochentag: number
  beginn: string
  ende: string
  ort: string
  saison: string
  rhythmus: string
  hinweis: string
}

interface TrainerZeile {
  schluessel: string
  personId: number | null
  neu: NeuePersonDaten | null
  rolle: string
}

interface Formular {
  name: string
  bereich: string
  altersklasse: string
  beschreibung: string
  sichtbar: boolean
  reihenfolge: string
  zeiten: ZeitZeile[]
  trainer: TrainerZeile[]
}

/** Was an den Server geht (Feld "daten"). */
function fuerServer(f: Formular, art: TeamArt): TeamEingabe {
  return {
    name: f.name,
    bereich: art === 'mannschaft' ? f.bereich || null : null,
    altersklasse: f.altersklasse,
    beschreibung: f.beschreibung,
    sichtbar: f.sichtbar,
    reihenfolge: f.reihenfolge,
    trainingszeiten: f.zeiten.map(z => ({
      id: z.id,
      wochentag: z.wochentag,
      beginn: z.beginn,
      ende: z.ende,
      ort: z.ort,
      saison: z.saison,
      rhythmus: z.rhythmus,
      hinweis: z.hinweis,
    })),
    trainer: f.trainer.map(t => (t.neu ? { neu: t.neu, rolle: t.rolle } : { personId: t.personId, rolle: t.rolle })),
  }
}

// ─── Hülle: hält das Ergebnis der Server-Aktion über den Neustart des Formulars hinweg ──

export default function TeamBearbeiten(props: Props) {
  const [ergebnis, aktion] = useFormState(teamSpeichernAktion, LEER)
  return <TeamFormular key={props.stand} {...props} ergebnis={ergebnis} aktion={aktion} />
}

// ─── Formular ───────────────────────────────────────────────────────────────

function TeamFormular({
  art,
  id,
  stand,
  start,
  fotoUrl,
  personen,
  orte,
  optionen,
  ergebnis,
  aktion,
}: Props & { ergebnis: FormErgebnis; aktion: (formData: FormData) => void }) {
  const zaehler = useRef(0)
  const neuerSchluessel = () => `z${++zaehler.current}`

  const [anfang] = useState<Formular>(() => ({
    name: start.name,
    bereich: start.bereich,
    altersklasse: start.altersklasse,
    beschreibung: start.beschreibung,
    sichtbar: start.sichtbar,
    reihenfolge: start.reihenfolge,
    zeiten: start.trainingszeiten.map(z => ({ ...z, schluessel: `t${z.id}` })),
    trainer: start.trainer.map(t => ({ schluessel: `p${t.personId}`, personId: t.personId, neu: null, rolle: t.rolle })),
  }))
  const [f, setF] = useState<Formular>(anfang)
  const [fotoGeaendert, setFotoGeaendert] = useState(false)
  const [neueZeile, setNeueZeile] = useState<string | null>(null)

  const daten = fuerServer(f, art)
  const geaendert = fotoGeaendert || JSON.stringify(daten) !== JSON.stringify(fuerServer(anfang, art))
  useUngespeichertWarnung(geaendert)

  // Fehler gehören zu den Zeilen, wie sie beim Absenden standen – auch wenn danach Zeilen
  // verschoben oder entfernt werden, bleibt die Markierung an der richtigen Stelle.
  const abgeschickt = useRef<{ zeiten: string[]; trainer: string[] }>({ zeiten: [], trainer: [] })
  const felder = ergebnis.ok ? {} : (ergebnis.felder ?? {})
  const zeitFehler = (schluessel: string, feld: string) => {
    const i = abgeschickt.current.zeiten.indexOf(schluessel)
    return i < 0 ? undefined : felder[`zeiten.${i}.${feld}`]
  }
  const trainerFehler = (schluessel: string) => {
    const i = abgeschickt.current.trainer.indexOf(schluessel)
    if (i < 0) return []
    return Object.keys(felder)
      .filter(k => k === `trainer.${i}` || k.startsWith(`trainer.${i}.`))
      .map(k => felder[k])
  }

  // Nach einem Fehler zur ersten markierten Stelle scrollen.
  useEffect(() => {
    if (ergebnis.ok || !ergebnis.felder) return
    const erstes = document.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (erstes) {
      erstes.scrollIntoView({ behavior: 'smooth', block: 'center' })
      erstes.focus({ preventScroll: true })
    }
  }, [ergebnis])

  const setze = <K extends keyof Formular>(feld: K, wert: Formular[K]) => setF(alt => ({ ...alt, [feld]: wert }))

  // Trainingszeiten
  const zeitAendern = (schluessel: string, aenderung: Partial<ZeitZeile>) =>
    setF(alt => ({ ...alt, zeiten: alt.zeiten.map(z => (z.schluessel === schluessel ? { ...z, ...aenderung } : z)) }))
  const zeitEntfernen = (schluessel: string) => setF(alt => ({ ...alt, zeiten: alt.zeiten.filter(z => z.schluessel !== schluessel) }))
  const zeitHinzufuegen = () => {
    const schluessel = neuerSchluessel()
    setF(alt => {
      const letzte = alt.zeiten[alt.zeiten.length - 1]
      return {
        ...alt,
        zeiten: alt.zeiten.concat({
          schluessel,
          id: null,
          wochentag: 0,
          beginn: '',
          ende: '',
          // Ort und Saison der letzten Zeile vorschlagen – meist gleich.
          ort: letzte?.ort ?? '',
          saison: letzte?.saison ?? optionen.saisons[0],
          rhythmus: optionen.rhythmen[0],
          hinweis: '',
        }),
      }
    })
    setNeueZeile(schluessel)
  }

  // Trainerteam
  const trainerAendern = (schluessel: string, aenderung: Partial<TrainerZeile>) =>
    setF(alt => ({ ...alt, trainer: alt.trainer.map(t => (t.schluessel === schluessel ? { ...t, ...aenderung } : t)) }))
  const trainerEntfernen = (schluessel: string) => setF(alt => ({ ...alt, trainer: alt.trainer.filter(t => t.schluessel !== schluessel) }))
  const trainerVerschieben = (index: number, richtung: -1 | 1) =>
    setF(alt => {
      const ziel = index + richtung
      if (ziel < 0 || ziel >= alt.trainer.length) return alt
      const liste = alt.trainer.slice()
      const [zeile] = liste.splice(index, 1)
      liste.splice(ziel, 0, zeile)
      return { ...alt, trainer: liste }
    })
  const standardRolle = optionen.rollen[0] ?? 'Trainer:in'
  const personHinzufuegen = (personId: number) =>
    setF(alt => ({ ...alt, trainer: alt.trainer.concat({ schluessel: neuerSchluessel(), personId, neu: null, rolle: standardRolle }) }))
  const neuePersonHinzufuegen = (neu: NeuePersonDaten) =>
    setF(alt => ({ ...alt, trainer: alt.trainer.concat({ schluessel: neuerSchluessel(), personId: null, neu, rolle: standardRolle }) }))

  const personNachId = new Map(personen.map(p => [p.id, p] as const))
  const gespeichertImTeam = start.trainer.map(t => t.personId)
  const was = art === 'mannschaft' ? 'Mannschaft' : 'Gruppe'

  return (
    <form
      action={aktion}
      onSubmit={() => {
        abgeschickt.current = { zeiten: f.zeiten.map(z => z.schluessel), trainer: f.trainer.map(t => t.schluessel) }
      }}
      className="space-y-6"
      noValidate
    >
      <input type="hidden" name="art" value={art} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="geaendertAm" value={stand} />
      <input type="hidden" name="daten" value={JSON.stringify(daten)} />

      {/* ── Allgemein ─────────────────────────────────────────────── */}
      <Karte titel="Allgemein">
        <div className="grid gap-5 md:grid-cols-2">
          <Feld label="Name" htmlFor="name" fehler={felder.name} className="md:col-span-2">
            <input
              id="name"
              value={f.name}
              onChange={e => setze('name', e.target.value)}
              maxLength={80}
              required
              aria-invalid={!!felder.name || undefined}
              className={eingabeKlasse}
            />
          </Feld>
          {art === 'mannschaft' && (
            <Feld label="Bereich" htmlFor="bereich" fehler={felder.bereich} hinweis="Ordnet die Mannschaft auf der Website ein.">
              <select id="bereich" value={f.bereich} onChange={e => setze('bereich', e.target.value)} aria-invalid={!!felder.bereich || undefined} className={auswahlKlasse}>
                <option value="">– kein Bereich –</option>
                {optionen.bereiche.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Feld>
          )}
          <Feld
            label={art === 'mannschaft' ? 'Altersklasse / Jahrgang' : 'Für wen? (Alter)'}
            htmlFor="altersklasse"
            fehler={felder.altersklasse}
            hinweis={art === 'mannschaft' ? 'z. B. „Jg. 2013“ – optional' : 'z. B. „5–7 Jahre“ oder „Erwachsene“ – optional'}
          >
            <input
              id="altersklasse"
              value={f.altersklasse}
              onChange={e => setze('altersklasse', e.target.value)}
              maxLength={60}
              aria-invalid={!!felder.altersklasse || undefined}
              className={eingabeKlasse}
            />
          </Feld>
          <Feld label="Beschreibung" htmlFor="beschreibung" fehler={felder.beschreibung} hinweis="Erscheint auf der Website. Optional." className="md:col-span-2">
            <textarea
              id="beschreibung"
              value={f.beschreibung}
              onChange={e => setze('beschreibung', e.target.value)}
              rows={5}
              maxLength={5000}
              aria-invalid={!!felder.beschreibung || undefined}
              className={`${eingabeKlasse} leading-relaxed`}
            />
          </Feld>
          <div className="md:col-span-2">
            <span className="block text-sm font-medium text-[#0a0a0a] mb-1.5">Foto</span>
            <FotoFeld aktuell={fotoUrl} fehler={felder.foto} onAenderung={setFotoGeaendert} />
          </div>
          <label className="md:col-span-2 flex items-start gap-3 cursor-pointer rounded-sm border border-[#0a0a0a]/15 p-4 hover:border-[#0a0a0a]/40">
            <input type="checkbox" checked={f.sichtbar} onChange={e => setze('sichtbar', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0a0a0a]" />
            <span>
              <span className="block font-medium">Auf der Website anzeigen</span>
              <span className="block text-sm text-[#6b6b6b] mt-0.5">
                Ohne Haken bleibt alles gespeichert, die {was} ist aber auf der Website nicht zu sehen.
              </span>
            </span>
          </label>
          <Feld
            label="Reihenfolge (optional)"
            htmlFor="reihenfolge"
            fehler={felder.reihenfolge}
            hinweis="Kleinere Zahlen stehen auf der Website weiter oben."
          >
            <input
              id="reihenfolge"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              step={1}
              value={f.reihenfolge}
              onChange={e => setze('reihenfolge', e.target.value)}
              aria-invalid={!!felder.reihenfolge || undefined}
              className={`${eingabeKlasse} max-w-[8rem]`}
            />
          </Feld>
        </div>
      </Karte>

      {/* ── Trainingszeiten ───────────────────────────────────────── */}
      <Karte titel="Trainingszeiten" beschreibung="Wann und wo trainiert wird. Auf der Website werden die Zeiten nach Wochentag sortiert.">
        {felder.zeiten && <p className="mb-3 text-sm text-red-700">{felder.zeiten}</p>}
        {f.zeiten.length === 0 ? (
          <p className="text-sm text-[#6b6b6b] mb-4">Noch keine Trainingszeit eingetragen.</p>
        ) : (
          <div className="space-y-4 mb-4">
            {f.zeiten.map((z, i) => {
              const k = `zeit-${z.schluessel}`
              const fe = (feld: string) => zeitFehler(z.schluessel, feld)
              return (
                <fieldset key={z.schluessel} aria-labelledby={`${k}-titel`} className="border border-[#0a0a0a]/15 rounded-sm p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 id={`${k}-titel`} className="text-sm font-semibold">
                      Trainingszeit {i + 1}
                      {z.id == null && <span className="ml-2 font-normal text-xs text-[#6b6b6b]">neu</span>}
                    </h3>
                    <button
                      type="button"
                      onClick={() => zeitEntfernen(z.schluessel)}
                      className={`${knopfKlassen.leise} -mr-2 min-h-[44px] text-red-700 hover:text-red-800`}
                      aria-label={`Trainingszeit ${i + 1} entfernen`}
                    >
                      <Trash2 size={16} /> <span className="text-sm">Entfernen</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-x-3 gap-y-4">
                    <Feld label="Wochentag" htmlFor={`${k}-tag`} fehler={fe('wochentag')} className="col-span-2 md:col-span-3">
                      <select
                        id={`${k}-tag`}
                        autoFocus={neueZeile === z.schluessel}
                        value={z.wochentag}
                        onChange={e => zeitAendern(z.schluessel, { wochentag: Number(e.target.value) })}
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
                        onChange={e => zeitAendern(z.schluessel, { beginn: e.target.value })}
                        aria-invalid={!!fe('beginn') || undefined}
                        className={eingabeKlasse}
                      />
                    </Feld>
                    <Feld label="Ende" htmlFor={`${k}-ende`} fehler={fe('ende')} className="col-span-1 md:col-span-2">
                      <input
                        id={`${k}-ende`}
                        type="time"
                        value={z.ende}
                        onChange={e => zeitAendern(z.schluessel, { ende: e.target.value })}
                        aria-invalid={!!fe('ende') || undefined}
                        className={eingabeKlasse}
                      />
                    </Feld>
                    <Feld label="Ort" htmlFor={`${k}-ort`} fehler={fe('ort')} className="col-span-2 md:col-span-5">
                      <input
                        id={`${k}-ort`}
                        list="team-orte"
                        value={z.ort}
                        onChange={e => zeitAendern(z.schluessel, { ort: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        placeholder="z. B. Turnhalle …"
                        maxLength={100}
                        aria-invalid={!!fe('ort') || undefined}
                        className={eingabeKlasse}
                        autoComplete="off"
                      />
                    </Feld>
                    <Feld label="Saison" htmlFor={`${k}-saison`} fehler={fe('saison')} className="col-span-2 sm:col-span-1 md:col-span-3">
                      <select
                        id={`${k}-saison`}
                        value={z.saison}
                        onChange={e => zeitAendern(z.schluessel, { saison: e.target.value })}
                        aria-invalid={!!fe('saison') || undefined}
                        className={auswahlKlasse}
                      >
                        {optionen.saisons.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Feld>
                    <Feld label="Rhythmus" htmlFor={`${k}-rhythmus`} fehler={fe('rhythmus')} className="col-span-2 sm:col-span-1 md:col-span-3">
                      <select
                        id={`${k}-rhythmus`}
                        value={z.rhythmus}
                        onChange={e => zeitAendern(z.schluessel, { rhythmus: e.target.value })}
                        aria-invalid={!!fe('rhythmus') || undefined}
                        className={auswahlKlasse}
                      >
                        {optionen.rhythmen.map(r => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </Feld>
                    <Feld label="Hinweis (optional)" htmlFor={`${k}-hinweis`} fehler={fe('hinweis')} className="col-span-2 md:col-span-6">
                      <input
                        id={`${k}-hinweis`}
                        value={z.hinweis}
                        onChange={e => zeitAendern(z.schluessel, { hinweis: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        placeholder="z. B. „ab Februar“ oder „nur Torhüter“"
                        maxLength={200}
                        aria-invalid={!!fe('hinweis') || undefined}
                        className={eingabeKlasse}
                      />
                    </Feld>
                  </div>
                </fieldset>
              )
            })}
          </div>
        )}
        <datalist id="team-orte">
          {orte.map(o => (
            <option key={o} value={o} />
          ))}
        </datalist>
        <button type="button" onClick={zeitHinzufuegen} className={`${knopfKlassen.sekundaer} w-full sm:w-auto py-3`}>
          <Plus size={16} /> Trainingszeit hinzufügen
        </button>
      </Karte>

      {/* ── Trainerteam ───────────────────────────────────────────── */}
      <Karte
        titel="Trainerteam & Ansprechpartner"
        beschreibung="Diese Personen erscheinen mit Telefon und E-Mail auf der Website – in dieser Reihenfolge."
      >
        {felder.trainer && <p className="mb-3 text-sm text-red-700">{felder.trainer}</p>}
        {f.trainer.length === 0 ? (
          <p className="text-sm text-[#6b6b6b] mb-4">Noch niemand eingetragen.</p>
        ) : (
          <ul className="space-y-3 mb-4">
            {f.trainer.map((t, i) => {
              const person = t.personId != null ? personNachId.get(t.personId) : undefined
              const name = t.neu ? t.neu.name : (person?.name ?? 'Unbekannte Person')
              const kontakt = t.neu ? [t.neu.telefon, t.neu.email] : [person?.telefon, person?.email]
              const kontaktText = kontakt.filter(Boolean).join(' · ')
              const fehlerListe = trainerFehler(t.schluessel)
              return (
                <li
                  key={t.schluessel}
                  className={`border rounded-sm p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-x-3 gap-y-2 ${fehlerListe.length ? 'border-red-300 bg-red-50/40' : 'border-[#0a0a0a]/15'}`}
                >
                  <div className="flex-1 min-w-0 self-center">
                    <div className="font-medium flex flex-wrap items-center gap-2">
                      {name}
                      {t.neu && <Badge ton="erfolg">neu – wird beim Speichern angelegt</Badge>}
                    </div>
                    <div className="text-xs text-[#6b6b6b] mt-0.5 break-words">
                      {kontaktText || 'keine Kontaktdaten'}
                      {t.personId != null && gespeichertImTeam.indexOf(t.personId) >= 0 && (
                        <>
                          {' · '}
                          <Link href={`/verwaltung/personen/${t.personId}`} className="underline underline-offset-2 hover:text-[#0a0a0a]">
                            Kontaktdaten ändern
                          </Link>
                        </>
                      )}
                    </div>
                    {fehlerListe.map(m => (
                      <p key={m} className="mt-1 text-sm text-red-700" aria-live="polite">
                        {m}
                      </p>
                    ))}
                  </div>
                  {/* Handy: Knöpfe neben dem Namen, Rolle darunter in voller Breite – ab Tablet alles in einer Zeile */}
                  <div className="w-full sm:w-56 order-last sm:order-none">
                    <label htmlFor={`rolle-${t.schluessel}`} className="sr-only">
                      Rolle von {name}
                    </label>
                    <RollenAuswahl
                      id={`rolle-${t.schluessel}`}
                      wert={t.rolle}
                      onChange={rolle => trainerAendern(t.schluessel, { rolle })}
                      rollen={optionen.rollen}
                      ungueltig={fehlerListe.length > 0}
                    />
                  </div>
                  <div className="flex shrink-0 -mr-2 sm:mr-0">
                    <button
                      type="button"
                      onClick={() => trainerVerschieben(i, -1)}
                      disabled={i === 0}
                      className={`${knopfKlassen.leise} min-h-[44px] min-w-[40px] disabled:opacity-25`}
                      aria-label={`${name} nach oben`}
                      title="Nach oben"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => trainerVerschieben(i, 1)}
                      disabled={i === f.trainer.length - 1}
                      className={`${knopfKlassen.leise} min-h-[44px] min-w-[40px] disabled:opacity-25`}
                      aria-label={`${name} nach unten`}
                      title="Nach unten"
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => trainerEntfernen(t.schluessel)}
                      className={`${knopfKlassen.leise} min-h-[44px] min-w-[40px] text-red-700 hover:text-red-800`}
                      aria-label={`${name} entfernen`}
                      title="Entfernen"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <PersonAuswahl
          personen={personen}
          vorhanden={f.trainer.map(t => t.personId).filter((x): x is number => x != null)}
          onAuswahl={personHinzufuegen}
          onNeu={neuePersonHinzufuegen}
        />
        <p className="mt-3 text-xs text-[#6b6b6b]">Entfernen nimmt die Person nur aus dieser {was} – sie bleibt im System erhalten.</p>
      </Karte>

      {/* ── Speichern (unten angeheftet) ──────────────────────────── */}
      <SpeicherLeiste geaendert={geaendert} ergebnis={ergebnis} />
    </form>
  )
}
