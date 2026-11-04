'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FOERDERVEREIN } from '@/lib/foerderverein'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import type { AuswahlPerson } from '@/lib/verwaltung/person-bearbeiten'
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
  bezeichnung: string
}

interface Props {
  stand: string
  zeilen: VorstandZeile[]
  personen: AuswahlPerson[]
  /** Personen im gespeicherten Vorstand, deren Kontaktdaten der Zugang ändern darf. */
  bearbeitbar: number[]
}

/** Vergleichbarer Stand – Funktionen ohne Leerzeichen am Rand, so wie sie gespeichert werden. */
function vergleichsStand(zeilen: VorstandZeile[]): string {
  return JSON.stringify(zeilen.map(z => [z.id, z.personId, z.neu?.name ?? null, z.bezeichnung.trim()]))
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

function Editor({ stand, zeilen: start, personen, bearbeitbar, ergebnis }: Props & { ergebnis: FormErgebnis }) {
  const [zeilen, setZeilen] = useState<VorstandZeile[]>(start)
  const [fokus, setFokus] = useState<string | null>(null)
  const zaehler = useRef(0)
  const personNachId = new Map(personen.map(p => [p.id, p] as const))

  // Nach dem Hinzufügen gleich ins Feld "Funktion" – erst im nächsten Takt, weil PersonAuswahl den Fokus
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
    setZeilen(zeilen.concat({ schluessel, id: null, personId, neu, bezeichnung: '' }))
    setFokus(schluessel)
  }

  const daten = zeilen.map(z => ({ id: z.id, personId: z.personId, neu: z.neu, bezeichnung: z.bezeichnung }))
  // Vergleich mit dem Stand beim Laden – nach dem Speichern startet der Editor ohnehin neu (key).
  const geaendert = vergleichsStand(zeilen) !== vergleichsStand(start)
  useUngespeichertWarnung(geaendert)
  const ohneFunktion = zeilen.filter(z => !z.bezeichnung.trim()).length
  const gespeichert = start.map(z => z.personId)

  return (
    <div className="space-y-6">
      <input type="hidden" name="stand" value={stand} />
      <input type="hidden" name="daten" value={JSON.stringify(daten)} />

      <Karte titel="Vorstand" beschreibung="Diese Personen erscheinen mit Funktion, Foto, Telefon und E-Mail auf der Website – in dieser Reihenfolge.">
        {zeilen.length === 0 ? (
          <p className="text-sm text-[#6b6b6b] mb-4">Noch niemand eingetragen. Bis dahin nennt die Website nur den Vorsitzenden {FOERDERVEREIN.vorsitz}.</p>
        ) : (
          <ol className="space-y-3 mb-4">
            {zeilen.map((z, i) => {
              const person = z.personId != null ? personNachId.get(z.personId) : undefined
              const name = z.neu ? z.neu.name : (person?.name ?? 'Unbekannte Person')
              const kontakt = (z.neu ? [z.neu.telefon, z.neu.email] : [person?.telefon, person?.email]).filter(Boolean).join(' · ')
              const kontaktLink = z.personId != null && gespeichert.indexOf(z.personId) >= 0 && bearbeitbar.indexOf(z.personId) >= 0
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
                    </div>
                    <ReihenfolgeKnoepfe
                      index={i}
                      anzahl={zeilen.length}
                      bezeichnung={z.bezeichnung || name}
                      onVerschieben={r => setZeilen(verschieben(zeilen, i, r))}
                      onEntfernen={() => setZeilen(zeilen.filter((_, j) => j !== i))}
                    />
                  </div>
                  <div className="mt-3 sm:max-w-sm">
                    <label htmlFor={`${z.schluessel}-bez`} className="block text-sm font-medium mb-1.5">
                      Funktion
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
          ohneFunktion > 0 && (
            <Meldung art="hinweis">
              {ohneFunktion === 1 ? 'Bei einer Person fehlt noch die Funktion.' : `Bei ${ohneFunktion} Personen fehlt noch die Funktion.`}
            </Meldung>
          )
        }
      />
    </div>
  )
}
