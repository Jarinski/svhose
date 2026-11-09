'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { VORSTAND_FOTO_VERHAELTNIS, type Ausschnitt } from '@/lib/bild-ausschnitt'
import { FOERDERVEREIN } from '@/lib/foerderverein'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import type { AuswahlPerson } from '@/lib/verwaltung/person-bearbeiten'
import FotoFeld from '@/components/verwaltung/FotoFeld'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import PersonAuswahl, { type NeuePersonDaten } from '@/components/verwaltung/PersonAuswahl'
import ReihenfolgeKnoepfe, { verschieben } from '@/components/verwaltung/ReihenfolgeKnoepfe'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { Badge, eingabeKlasse, Karte, Meldung } from '@/components/verwaltung/ui'
import { useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { vorstandSpeichernAktion } from './aktionen'

export interface VorstandZeile {
  /** Stabiler Schlüssel für React (auch für neue Zeilen ohne id). */
  schluessel: string
  id: number | null
  /** Vorhandene Person – oder null bei einer neuen, die beim Speichern angelegt wird. */
  personId: number | null
  neu: NeuePersonDaten | null
  /** Amt im Vorstand, z. B. "1. Vorsitzender" */
  bezeichnung: string
  /** Feld "Funktion": wofür die Person zuständig ist, z. B. "Festivitäten" (leer = keine) */
  aufgabe: string
  /** Doppelrolle: auf der Förderverein-Seite statt der Personendaten diese Telefonnummer und E-Mail zeigen. */
  eigene: boolean
  telefon: string
  email: string
}

interface Props {
  stand: string
  zeilen: VorstandZeile[]
  personen: AuswahlPerson[]
  /** Personen im gespeicherten Vorstand, deren Kontaktdaten der Zugang ändern darf. */
  bearbeitbar: number[]
  /** Übrige Personen im gespeicherten Vorstand: wo sie sonst noch stehen (darum ändert ihre Kontaktdaten ein Admin). */
  auchEingetragen: Record<number, string[]>
  /** Gespeichertes Gruppenfoto (URL) und sein Ausschnitt */
  gruppenfoto: { url: string; ausschnitt: Ausschnitt | null } | null
}

/** Vergleichbarer Stand – Amt und Funktion ohne Leerzeichen am Rand, so wie sie gespeichert werden. */
function vergleichsStand(zeilen: VorstandZeile[]): string {
  return JSON.stringify(
    zeilen.map(z => [
      z.id,
      z.personId,
      z.neu?.name ?? null,
      z.bezeichnung.trim(),
      z.aufgabe.trim(),
      z.eigene,
      z.eigene ? z.telefon.trim() : '',
      z.eigene ? z.email.trim() : '',
    ]),
  )
}

export default function VorstandFormular(props: Props) {
  const [ergebnis, aktion] = useActionState(vorstandSpeichernAktion, LEER)
  return (
    <form action={aktion} onReset={eingabenBehalten}>
      {/* Nach dem Speichern ändert sich der Stand → der Editor startet mit den frisch gespeicherten Zeilen (inkl. neuer ids). */}
      <Editor key={props.stand} {...props} ergebnis={ergebnis} />
    </form>
  )
}

function Editor({ stand, zeilen: start, personen, bearbeitbar, auchEingetragen, gruppenfoto, ergebnis }: Props & { ergebnis: FormErgebnis }) {
  const [zeilen, setZeilen] = useState<VorstandZeile[]>(start)
  const [fotoGeaendert, setFotoGeaendert] = useState(false)
  const [fokus, setFokus] = useState<string | null>(null)
  const zaehler = useRef(0)
  const personNachId = new Map(personen.map(p => [p.id, p] as const))

  // Nach dem Hinzufügen gleich ins Feld "Amt" – erst im nächsten Takt, weil PersonAuswahl den Fokus
  // beim Schließen auf ihren Knopf zurücksetzt.
  useEffect(() => {
    if (!fokus) return
    const t = setTimeout(() => document.getElementById(`${fokus}-bez`)?.focus(), 0)
    return () => clearTimeout(t)
  }, [fokus])

  function aendern(i: number, aenderung: Partial<VorstandZeile>) {
    setZeilen(zeilen.map((z, j) => (j === i ? { ...z, ...aenderung } : z)))
  }
  function hinzufuegen(personId: number | null, neu: NeuePersonDaten | null) {
    zaehler.current += 1
    const schluessel = `neu${zaehler.current}`
    setZeilen(zeilen.concat({ schluessel, id: null, personId, neu, bezeichnung: '', aufgabe: '', eigene: false, telefon: '', email: '' }))
    setFokus(schluessel)
  }

  const daten = zeilen.map(z => ({
    id: z.id,
    personId: z.personId,
    neu: z.neu,
    bezeichnung: z.bezeichnung,
    aufgabe: z.aufgabe,
    eigeneKontaktdaten: z.eigene,
    telefon: z.eigene ? z.telefon : '',
    email: z.eigene ? z.email : '',
  }))
  // Vergleich mit dem Stand beim Laden – nach dem Speichern startet der Editor ohnehin neu (key).
  const geaendert = fotoGeaendert || vergleichsStand(zeilen) !== vergleichsStand(start)
  useUngespeichertWarnung(geaendert)
  const ohneAmt = zeilen.filter(z => !z.bezeichnung.trim()).length
  const gespeichert = start.map(z => z.personId)

  return (
    <div className="space-y-6">
      <input type="hidden" name="stand" value={stand} />
      <input type="hidden" name="daten" value={JSON.stringify(daten)} />

      <Karte titel="Gruppenfoto" beschreibung="Ein Foto des ganzen Vorstands – steht auf der Website oben, über den Namen. Freiwillig.">
        <FotoFeld
          aktuell={gruppenfoto?.url ?? null}
          fehler={ergebnis.ok ? undefined : ergebnis.felder?.foto}
          onAenderung={setFotoGeaendert}
          ausschnitt={{
            verhaeltnis: VORSTAND_FOTO_VERHAELTNIS,
            aktuell: gruppenfoto?.ausschnitt ?? null,
            hinweis: 'So erscheint das Foto auf der Vorstandsseite. Ein Klick dort zeigt das ganze Foto.',
          }}
        />
      </Karte>

      <Karte titel="Vorstand" beschreibung="Diese Personen erscheinen mit Amt, Funktion, Foto, Telefon und E-Mail auf der Website – in dieser Reihenfolge.">
        {zeilen.length === 0 ? (
          <p className="text-sm text-[#6b6b6b] mb-4">Noch niemand eingetragen. Bis dahin nennt die Website nur den Vorsitzenden {FOERDERVEREIN.vorsitz}.</p>
        ) : (
          <ol className="space-y-3 mb-4">
            {zeilen.map((z, i) => {
              const person = z.personId != null ? personNachId.get(z.personId) : undefined
              const name = z.neu ? z.neu.name : (person?.name ?? 'Unbekannte Person')
              const kontakt = (z.neu ? [z.neu.telefon, z.neu.email] : [person?.telefon, person?.email]).filter(Boolean).join(' · ')
              const imGespeicherten = z.personId != null && gespeichert.indexOf(z.personId) >= 0
              const kontaktLink = imGespeicherten && bearbeitbar.indexOf(z.personId!) >= 0
              const anderswo = imGespeicherten && !kontaktLink ? auchEingetragen[z.personId!] : undefined
              return (
                <li key={z.schluessel} className="border border-[#0a0a0a]/10 rounded-sm p-3 sm:p-4 bg-[#fafaf7]">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 self-center">
                      <div className="font-medium flex flex-wrap items-center gap-2">
                        {name}
                        {z.neu && <Badge ton="erfolg">neu – wird beim Speichern angelegt</Badge>}
                      </div>
                      <div className="text-xs text-[#6b6b6b] mt-0.5 break-words">
                        {kontakt || 'keine Kontaktdaten'}
                        {kontaktLink && (
                          <>
                            {' · '}
                            <Link href={`/verwaltung/personen/${z.personId}`} className="underline underline-offset-2 hover:text-[#0a0a0a]">
                              Kontaktdaten und Foto ändern
                            </Link>
                          </>
                        )}
                      </div>
                      {anderswo && (
                        <p className="text-xs text-[#6b6b6b] mt-1 break-words">
                          {anderswo.length > 0
                            ? `Auch eingetragen: ${anderswo.join(' · ')}. Kontaktdaten und Foto der Person gelten überall und ändert deshalb ein Admin.`
                            : 'Kontaktdaten und Foto der Person ändert ein Admin.'}
                          {' Für den Förderverein kannst du unten eigene Kontaktdaten eintragen.'}
                        </p>
                      )}
                    </div>
                    <ReihenfolgeKnoepfe
                      index={i}
                      anzahl={zeilen.length}
                      bezeichnung={z.bezeichnung || name}
                      onVerschieben={r => setZeilen(verschieben(zeilen, i, r))}
                      onEntfernen={() => setZeilen(zeilen.filter((_, j) => j !== i))}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-w-2xl">
                    <div>
                      <label htmlFor={`${z.schluessel}-bez`} className="block text-sm font-medium mb-1.5">
                        Amt
                      </label>
                      <input
                        id={`${z.schluessel}-bez`}
                        required
                        maxLength={60}
                        value={z.bezeichnung}
                        placeholder="z. B. 1. Vorsitzender"
                        onChange={e => aendern(i, { bezeichnung: e.target.value })}
                        className={eingabeKlasse}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${z.schluessel}-aufgabe`} className="block text-sm font-medium mb-1.5">
                        Funktion <span className="font-normal text-[#6b6b6b]">(optional)</span>
                      </label>
                      <input
                        id={`${z.schluessel}-aufgabe`}
                        maxLength={80}
                        value={z.aufgabe}
                        placeholder="z. B. Festivitäten, Bandenwerbung"
                        onChange={e => aendern(i, { aufgabe: e.target.value })}
                        className={eingabeKlasse}
                      />
                    </div>
                  </div>
                  {/* Neue Personen bekommen ihre Kontaktdaten schon beim Anlegen – eigene gibt es erst danach. */}
                  {!z.neu && (
                    <div className="mt-3">
                      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={z.eigene}
                          onChange={e => {
                            // Beim Einschalten mit den bekannten Personendaten vorbelegen – meist ändert sich nur eins davon.
                            const leer = !z.telefon.trim() && !z.email.trim()
                            aendern(
                              i,
                              e.target.checked && leer
                                ? { eigene: true, telefon: person?.telefon ?? '', email: person?.email ?? '' }
                                : { eigene: e.target.checked },
                            )
                          }}
                          className="w-4 h-4 shrink-0"
                        />
                        Eigene Kontaktdaten für den Förderverein
                      </label>
                      {z.eigene && (
                        <>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-w-2xl">
                            <div>
                              <label htmlFor={`${z.schluessel}-tel`} className="block text-sm font-medium mb-1.5">
                                Telefon
                              </label>
                              <input
                                id={`${z.schluessel}-tel`}
                                type="tel"
                                inputMode="tel"
                                maxLength={50}
                                autoComplete="off"
                                value={z.telefon}
                                onChange={e => aendern(i, { telefon: e.target.value })}
                                className={eingabeKlasse}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${z.schluessel}-mail`} className="block text-sm font-medium mb-1.5">
                                E-Mail
                              </label>
                              <input
                                id={`${z.schluessel}-mail`}
                                type="email"
                                inputMode="email"
                                maxLength={200}
                                autoComplete="off"
                                value={z.email}
                                onChange={e => aendern(i, { email: e.target.value })}
                                className={eingabeKlasse}
                              />
                            </div>
                          </div>
                          <p className="mt-1.5 text-xs text-[#6b6b6b] leading-relaxed">
                            Erscheinen nur auf der Förderverein-Seite, statt der Kontaktdaten oben. Ein leeres Feld wird dort nicht angezeigt. Die
                            Personendaten und alle anderen Stellen bleiben unverändert.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        <PersonAuswahl
          personen={personen}
          vorhanden={zeilen.map(z => z.personId).filter((x): x is number => x != null)}
          onAuswahl={personId => hinzufuegen(personId, null)}
          onNeu={neu => hinzufuegen(null, neu)}
          knopfText="Person zum Vorstand hinzufügen"
        />
        <p className="mt-3 text-xs text-[#6b6b6b]">Entfernen nimmt die Person nur aus dem Vorstand – sie bleibt im System erhalten.</p>
      </Karte>

      <SpeicherLeiste
        geaendert={geaendert}
        ergebnis={ergebnis}
        knopfText="Vorstand speichern"
        zusatz={
          ohneAmt > 0 && (
            <Meldung art="hinweis">
              {ohneAmt === 1 ? 'Bei einer Person fehlt noch das Amt.' : `Bei ${ohneAmt} Personen fehlt noch das Amt.`}
            </Meldung>
          )
        }
      />
    </div>
  )
}
