'use client'

import { useRef, useState } from 'react'
import { useFormState } from 'react-dom'
import { Plus } from 'lucide-react'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import PersonSuche, { type PersonKurz } from '@/components/verwaltung/PersonSuche'
import ReihenfolgeKnoepfe, { verschieben } from '@/components/verwaltung/ReihenfolgeKnoepfe'
import { auswahlKlasse, eingabeKlasse, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { kontakteSpeichernAktion } from './aktionen'

type Gruppe = 'vorstand' | 'abteilungsleitung' | 'weitere'

export interface FunktionZeile {
  /** Stabiler Schlüssel für React (auch für neue Zeilen ohne id). */
  schluessel: string
  id: number | null
  personId: number | null
  personName: string
  bezeichnung: string
  sparteId: number | null
}

type Zeilen = Record<Gruppe, FunktionZeile[]>

const ABSCHNITTE: { gruppe: Gruppe; titel: string; beschreibung: string; beispiel: string }[] = [
  { gruppe: 'vorstand', titel: 'Vorstand', beschreibung: 'Der geschäftsführende und erweiterte Vorstand.', beispiel: 'z. B. 1. Vorsitzende:r' },
  { gruppe: 'abteilungsleitung', titel: 'Abteilungsleitung', beschreibung: 'Leitungen der Sparten – am besten mit passender Sparte.', beispiel: 'z. B. Abteilungsleitung Fußball' },
  { gruppe: 'weitere', titel: 'Weitere Ansprechpartner', beschreibung: 'Zum Beispiel Mitgliederverwaltung, Kinderschutz oder Platzwart.', beispiel: 'z. B. Mitgliederverwaltung' },
]

interface Props {
  stand: string
  zeilen: Zeilen
  personen: PersonKurz[]
  sparten: { id: number; name: string }[]
}

export default function KontakteFormular(props: Props) {
  const [ergebnis, aktion] = useFormState(kontakteSpeichernAktion, LEER)
  return (
    <form action={aktion}>
      {/* Nach dem Speichern ändert sich der Stand → der Editor startet mit den frisch gespeicherten Zeilen (inkl. neuer ids). */}
      <Editor key={props.stand} {...props} ergebnis={ergebnis} />
    </form>
  )
}

function Editor({ stand, zeilen: start, personen, sparten, ergebnis }: Props & { ergebnis: FormErgebnis }) {
  const [zeilen, setZeilen] = useState<Zeilen>(start)
  const [suchOffen, setSuchOffen] = useState<string | null>(null)
  const zaehler = useRef(0)

  function liste(g: Gruppe, neu: FunktionZeile[]) {
    setZeilen({ ...zeilen, [g]: neu })
  }
  function aendern(g: Gruppe, i: number, aenderung: Partial<FunktionZeile>) {
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

  const daten: Record<string, unknown> = {}
  ABSCHNITTE.forEach(({ gruppe }) => {
    daten[gruppe] = zeilen[gruppe].map(z => ({ id: z.id, personId: z.personId, bezeichnung: z.bezeichnung, sparteId: z.sparteId }))
  })
  const ohnePerson = ABSCHNITTE.reduce((n, a) => n + zeilen[a.gruppe].filter(z => z.personId == null).length, 0)

  return (
    <div className="space-y-6">
      <input type="hidden" name="stand" value={stand} />
      <input type="hidden" name="daten" value={JSON.stringify(daten)} />

      {ABSCHNITTE.map(({ gruppe, titel, beschreibung, beispiel }) => (
        <Karte key={gruppe} titel={titel} beschreibung={beschreibung}>
          {zeilen[gruppe].length === 0 ? (
            <p className="text-sm text-[#6b6b6b] pb-3">Noch keine Einträge – dieser Abschnitt erscheint dann nicht auf der Website.</p>
          ) : (
            <ol className="space-y-3">
              {zeilen[gruppe].map((z, i) => {
                const sucheZeigen = z.personId == null || suchOffen === z.schluessel
                return (
                  <li key={z.schluessel} className="border border-[#0a0a0a]/10 rounded-sm p-3 sm:p-4 bg-[#fafaf7]">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1.5">Person</div>
                        {sucheZeigen ? (
                          <div>
                            <PersonSuche
                              personen={personen}
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
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-h-[2.75rem]">
                            <span className="font-medium text-[15px]">{z.personName}</span>
                            <button
                              type="button"
                              className="text-xs text-[#6b6b6b] underline underline-offset-2 hover:text-[#0a0a0a]"
                              onClick={() => setSuchOffen(z.schluessel)}
                            >
                              Person ändern
                            </button>
                          </div>
                        )}
                      </div>
                      <ReihenfolgeKnoepfe
                        index={i}
                        anzahl={zeilen[gruppe].length}
                        bezeichnung={z.bezeichnung || z.personName || 'Neue Funktion'}
                        onVerschieben={r => liste(gruppe, verschieben(zeilen[gruppe], i, r))}
                        onEntfernen={() => liste(gruppe, zeilen[gruppe].filter((_, j) => j !== i))}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 mt-3">
                      <div>
                        <label htmlFor={`${z.schluessel}-bez`} className="block text-sm font-medium mb-1.5">
                          Bezeichnung
                        </label>
                        <input
                          id={`${z.schluessel}-bez`}
                          required
                          value={z.bezeichnung}
                          placeholder={beispiel}
                          onChange={e => aendern(gruppe, i, { bezeichnung: e.target.value })}
                          className={eingabeKlasse}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${z.schluessel}-sparte`} className="block text-sm font-medium mb-1.5">
                          Sparte <span className="font-normal text-[#6b6b6b]">(optional)</span>
                        </label>
                        <select
                          id={`${z.schluessel}-sparte`}
                          value={z.sparteId ?? ''}
                          onChange={e => aendern(gruppe, i, { sparteId: e.target.value ? Number(e.target.value) : null })}
                          className={auswahlKlasse}
                        >
                          <option value="">– keine –</option>
                          {sparten.map(s => (
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
            <Plus size={15} /> Funktion hinzufügen
          </button>
        </Karte>
      ))}

      <div className="sticky bottom-0 z-10 py-3 bg-[#f5f5f0]/95 backdrop-blur-sm border-t border-[#0a0a0a]/10 space-y-3">
        {ohnePerson > 0 && (
          <Meldung art="hinweis">
            {ohnePerson === 1 ? 'Bei einer Funktion fehlt noch die Person.' : `Bei ${ohnePerson} Funktionen fehlt noch die Person.`} Bitte auswählen oder die Zeile
            entfernen.
          </Meldung>
        )}
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf className="w-full sm:w-auto">Kontaktseite speichern</SpeichernKnopf>
      </div>
    </div>
  )
}
