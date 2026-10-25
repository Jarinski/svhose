'use client'

/**
 * Übung "Trainingszeiten pflegen" – Nachbau des Abschnitts "Trainingszeiten" im Formular
 * "Mannschaft/Gruppe bearbeiten" (app/verwaltung/(intern)/teams/[art]/[id]/TeamFormular.tsx)
 * mit denselben Prüfungen und Meldungen (lib/verwaltung/team-bearbeiten.ts) und einer Vorschau
 * der Zeile auf /trainingszeiten (app/trainingszeiten/TrainingszeitenClient.tsx).
 */

import { useState } from 'react'
import { ChevronRight, Info, MapPin, Plus, Search, Trash2 } from 'lucide-react'
import { auswahlKlasse, eingabeKlasse, Feld, Karte, knopfKlassen } from '@/components/verwaltung/ui'
import { WOCHENTAGE } from '@/lib/verwaltung/text'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

const SAISONS = ['ganzjährig', 'Sommer', 'Winter']
const RHYTHMEN = ['jede Woche', 'alle 2 Wochen']

interface Zeit {
  schluessel: number
  neu: boolean
  wochentag: number
  beginn: string
  ende: string
  ort: string
  saison: string
  rhythmus: string
  hinweis: string
}

function zeit(z: Partial<Zeit> & { schluessel: number }): Zeit {
  return { neu: false, wochentag: 0, beginn: '', ende: '', ort: '', saison: 'ganzjährig', rhythmus: 'jede Woche', hinweis: '', ...z }
}

/** Dieselben Prüfungen und Texte wie beim echten Speichern (teamEingabePruefen). */
function pruefen(zeiten: Zeit[]): Record<string, string> {
  const felder: Record<string, string> = {}
  zeiten.forEach((z, i) => {
    const zeile = `Trainingszeit ${i + 1}: `
    const k = `${z.schluessel}.`
    if (z.wochentag < 1) felder[k + 'wochentag'] = `${zeile}Bitte einen Wochentag auswählen.`
    if (!z.beginn) felder[k + 'beginn'] = `${zeile}Bitte eintragen, wann das Training beginnt.`
    else if (z.ende && z.ende <= z.beginn) felder[k + 'ende'] = `${zeile}Das Ende muss nach dem Beginn liegen.`
  })
  return felder
}

function fehlerMeldung(felder: Record<string, string>): string {
  const meldungen = Object.values(felder)
  const weitere = meldungen.length - 1
  return `Noch nicht gespeichert. ${meldungen[0]}${weitere > 0 ? ` (dazu ${weitere} weitere Stelle${weitere === 1 ? '' : 'n'}, rot markiert)` : ''}`
}

const vergleich = (zeiten: Zeit[]) => JSON.stringify(zeiten.map(({ schluessel, neu, ...rest }) => rest))

/* ── Vorschau: so erscheint die Zeit auf /trainingszeiten ─────────────────── */

const TAG_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const TAG_FARBE = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#db2777']
const SAISON_STIL: Record<string, { bg: string; color: string }> = {
  ganzjährig: { bg: '#e5e7eb', color: '#374151' },
  Sommer: { bg: '#fef9c3', color: '#92400e' },
  Winter: { bg: '#dbeafe', color: '#1e40af' },
}

function WebsiteZeiten({ team, zeiten }: { team: string; zeiten: Zeit[] }) {
  const sortiert = zeiten.filter(z => z.wochentag > 0 && z.beginn).sort((a, b) => a.wochentag - b.wochentag || a.beginn.localeCompare(b.beginn))
  return (
    <Vorschau adresse="/trainingszeiten">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#16a34a]" />
        <div className="shrink-0 text-xs font-medium uppercase tracking-[0.22em] text-[#16a34a]">Fußball</div>
        <div className="h-px flex-1 bg-[#16a34a]/20" />
      </div>
      {sortiert.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#6b6b6b]">Für die {team} steht noch keine Trainingszeit auf der Website.</p>
      ) : (
        <div className="space-y-px border-l-2 border-[#16a34a]/20">
          {sortiert.map(z => {
            const stil = SAISON_STIL[z.saison] ?? SAISON_STIL.ganzjährig
            return (
              <div key={z.schluessel} className="flex items-center gap-3 bg-[#f5f5f0] py-3 pl-4 pr-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-xs font-semibold tracking-wider text-white"
                  style={{ background: TAG_FARBE[z.wochentag - 1] }}
                >
                  {TAG_KURZ[z.wochentag - 1]}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-base font-medium leading-snug">{team}</div>
                    <span className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] uppercase tracking-[0.15em]" style={{ background: stil.bg, color: stil.color }}>
                      {z.saison === 'ganzjährig' ? 'Ganzjährig' : z.saison}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6b6b6b]">
                    {z.ort && (
                      <>
                        <span className="flex items-center gap-1">
                          <MapPin size={9} className="shrink-0" />
                          <span className="truncate">{z.ort}</span>
                        </span>
                        <span className="opacity-60">·</span>
                      </>
                    )}
                    <span>{z.rhythmus}</span>
                    <span className="opacity-60">·</span>
                    <span>{z.ende ? `${z.beginn} - ${z.ende}` : z.beginn} Uhr</span>
                  </div>
                  {z.hinweis && (
                    <div className="flex items-center gap-1 text-xs text-[#0a0a0a]/80">
                      <Info size={9} className="shrink-0" />
                      <span>{z.hinweis}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Vorschau>
  )
}

/* ── Nachbau des Abschnitts "Trainingszeiten" ─────────────────────────────── */

/**
 * Formular mit den Trainingszeiten einer Mannschaft. `aufgabe` prüft nach dem (echten)
 * Prüfen, ob die Aufgabe erfüllt ist, und liefert sonst einen Hinweis.
 */
function ZeitenUebung({
  team,
  start,
  aufgabe,
  geloest,
}: {
  team: string
  start: Zeit[]
  aufgabe: (zeiten: Zeit[]) => string | null
} & LektionProps) {
  const [zeiten, setZeiten] = useState<Zeit[]>(start)
  const [gespeichert, setGespeichert] = useState<Zeit[]>(start)
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [meldung, setMeldung] = useState<{ art: 'erfolg' | 'fehler' | 'hinweis'; text: string } | null>(null)
  const [naechster, setNaechster] = useState(100)
  const geaendert = vergleich(zeiten) !== vergleich(gespeichert)

  function aendern(schluessel: number, teil: Partial<Zeit>) {
    setZeiten(zs => zs.map(z => (z.schluessel === schluessel ? { ...z, ...teil } : z)))
  }

  function hinzufuegen() {
    // Wie im echten Formular: Ort und Saison der letzten Zeile vorschlagen
    const letzte = zeiten[zeiten.length - 1]
    setZeiten(zs => zs.concat(zeit({ schluessel: naechster, neu: true, ort: letzte?.ort ?? '', saison: letzte?.saison ?? 'ganzjährig' })))
    setNaechster(n => n + 1)
  }

  function speichern(e: React.FormEvent) {
    e.preventDefault()
    const felder = pruefen(zeiten)
    setFehler(felder)
    if (Object.keys(felder).length) {
      setMeldung({ art: 'fehler', text: fehlerMeldung(felder) })
      return
    }
    if (!geaendert) {
      setMeldung({ art: 'erfolg', text: 'Alles schon gespeichert – es gab keine Änderungen.' })
      return
    }
    const hinweis = aufgabe(zeiten)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    const neu = zeiten.map(z => ({ ...z, neu: false }))
    setZeiten(neu)
    setGespeichert(neu)
    setMeldung({ art: 'erfolg', text: 'Gespeichert – ist jetzt auf der Website sichtbar.' })
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        <form onSubmit={speichern} noValidate>
          <Karte titel="Trainingszeiten" beschreibung="Wann und wo trainiert wird. Auf der Website werden die Zeiten nach Wochentag sortiert.">
            {zeiten.length === 0 ? (
              <p className="mb-4 text-sm text-[#6b6b6b]">Noch keine Trainingszeit eingetragen.</p>
            ) : (
              <div className="mb-4 space-y-4">
                {zeiten.map((z, i) => {
                  const k = `uebung-zeit-${z.schluessel}`
                  const fe = (feld: string) => fehler[`${z.schluessel}.${feld}`]
                  return (
                    <fieldset key={z.schluessel} aria-labelledby={`${k}-titel`} className="rounded-sm border border-[#0a0a0a]/15 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 id={`${k}-titel`} className="text-sm font-semibold">
                          Trainingszeit {i + 1}
                          {z.neu && <span className="ml-2 text-xs font-normal text-[#6b6b6b]">neu</span>}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setZeiten(zs => zs.filter(x => x.schluessel !== z.schluessel))}
                          className={`${knopfKlassen.leise} -mr-2 min-h-[44px] text-red-700 hover:text-red-800`}
                          aria-label={`Trainingszeit ${i + 1} entfernen`}
                        >
                          <Trash2 size={16} /> <span className="text-sm">Entfernen</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-12">
                        <Feld label="Wochentag" htmlFor={`${k}-tag`} fehler={fe('wochentag')} className="col-span-2 md:col-span-3">
                          <select
                            id={`${k}-tag`}
                            value={z.wochentag}
                            onChange={e => aendern(z.schluessel, { wochentag: Number(e.target.value) })}
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
                            onChange={e => aendern(z.schluessel, { beginn: e.target.value })}
                            aria-invalid={!!fe('beginn') || undefined}
                            className={eingabeKlasse}
                          />
                        </Feld>
                        <Feld label="Ende" htmlFor={`${k}-ende`} fehler={fe('ende')} className="col-span-1 md:col-span-2">
                          <input
                            id={`${k}-ende`}
                            type="time"
                            value={z.ende}
                            onChange={e => aendern(z.schluessel, { ende: e.target.value })}
                            aria-invalid={!!fe('ende') || undefined}
                            className={eingabeKlasse}
                          />
                        </Feld>
                        <Feld label="Ort" htmlFor={`${k}-ort`} className="col-span-2 md:col-span-5">
                          <input
                            id={`${k}-ort`}
                            value={z.ort}
                            onChange={e => aendern(z.schluessel, { ort: e.target.value })}
                            placeholder="z. B. Turnhalle …"
                            maxLength={100}
                            className={eingabeKlasse}
                            autoComplete="off"
                          />
                        </Feld>
                        <Feld label="Saison" htmlFor={`${k}-saison`} className="col-span-2 sm:col-span-1 md:col-span-3">
                          <select id={`${k}-saison`} value={z.saison} onChange={e => aendern(z.schluessel, { saison: e.target.value })} className={auswahlKlasse}>
                            {SAISONS.map(s => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </Feld>
                        <Feld label="Rhythmus" htmlFor={`${k}-rhythmus`} className="col-span-2 sm:col-span-1 md:col-span-3">
                          <select id={`${k}-rhythmus`} value={z.rhythmus} onChange={e => aendern(z.schluessel, { rhythmus: e.target.value })} className={auswahlKlasse}>
                            {RHYTHMEN.map(r => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </Feld>
                        <Feld label="Hinweis (optional)" htmlFor={`${k}-hinweis`} className="col-span-2 md:col-span-6">
                          <input
                            id={`${k}-hinweis`}
                            value={z.hinweis}
                            onChange={e => aendern(z.schluessel, { hinweis: e.target.value })}
                            placeholder="z. B. „ab Februar“ oder „nur Torhüter“"
                            maxLength={200}
                            className={eingabeKlasse}
                          />
                        </Feld>
                      </div>
                    </fieldset>
                  )
                })}
              </div>
            )}
            <button type="button" onClick={hinzufuegen} className={`${knopfKlassen.sekundaer} w-full py-3 sm:w-auto`}>
              <Plus size={16} /> Trainingszeit hinzufügen
            </button>
            <UebungsLeiste geaendert={geaendert} meldung={meldung} />
          </Karte>
        </form>
      </Spielwiese>
      <WebsiteZeiten team={team} zeiten={gespeichert} />
    </div>
  )
}

/* ── Lektion 1: die Mannschaft finden ──────────────────────────────────────── */

const LISTE = [
  { sparte: 'Fußball', teams: [{ name: 'Herren', art: 'Mannschaft', info: '3 Trainingszeiten' }, { name: 'U13', art: 'Mannschaft', info: 'keine Trainingszeit' }, { name: 'U12', art: 'Mannschaft', info: '2 Trainingszeiten' }] },
  { sparte: 'Judo', teams: [{ name: 'Kinder / Anfänger (5–7 Jahre)', art: 'Gruppe', info: '2 Trainingszeiten' }] },
]

function TeamFinden({ geloest, istGeloest }: LektionProps) {
  const [suche, setSuche] = useState('')
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [offen, setOffen] = useState(istGeloest)
  const treffer = LISTE.map(g => ({ ...g, teams: g.teams.filter(t => `${g.sparte} ${t.name}`.toLowerCase().includes(suche.trim().toLowerCase())) })).filter(g => g.teams.length)

  return (
    <Spielwiese>
      <div className="mb-4">
        <h3 className="font-display text-3xl leading-none tracking-tight">Mannschaften &amp; Gruppen</h3>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" aria-hidden="true" />
        <input
          value={suche}
          onChange={e => setSuche(e.target.value)}
          placeholder="Suchen: Name, Sparte, Trainer:in …"
          aria-label="Mannschaften und Gruppen durchsuchen"
          className={`${eingabeKlasse} pl-9`}
        />
      </div>
      <div className="space-y-4">
        {treffer.map(g => (
          <div key={g.sparte}>
            <div className="mb-1.5 text-xs text-[#6b6b6b]">{g.sparte}</div>
            <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07] bg-white">
              {g.teams.map(t => (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => {
                      if (t.name === 'U13') {
                        setHinweis(null)
                        setOffen(true)
                        geloest()
                      } else setHinweis(`Das ist „${t.name}“ – gesucht ist die U13 aus dem Fußball.`)
                    }}
                    className="flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-[#0a0a0a]/[0.03]"
                  >
                    <span className="flex-1">
                      <span className="font-medium">{t.name}</span> <span className="text-xs text-[#6b6b6b]">{t.art}</span>
                      <span className="block text-xs text-[#6b6b6b]">{t.info}</span>
                    </span>
                    <ChevronRight size={16} className="text-[#6b6b6b]" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {treffer.length === 0 && <p className="py-4 text-center text-sm text-[#6b6b6b]">Nichts gefunden für „{suche}“.</p>}
      </div>
      {hinweis && <p className="mt-3 text-sm text-amber-800">{hinweis}</p>}
      {offen && <p className="mt-3 text-sm text-[#4a4a4a]">Die Seite „U13“ öffnet sich – mit den Abschnitten Allgemein, Trainingszeiten und Trainerteam.</p>}
    </Spielwiese>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Die Mannschaft finden',
    aufgabe: 'Öffne die U13 aus der Sparte Fußball. Tipp: Probier das Suchfeld aus.',
    Inhalt: TeamFinden,
    danach: 'In der echten Verwaltung findest du deine Mannschaften und Gruppen im Menü „Mannschaften & Gruppen“ und auf der Übersicht.',
  },
  {
    titel: 'Eine Zeit eintragen',
    aufgabe: (
      <>
        Die U13 trainiert ab sofort <strong>dienstags von 17:30 bis 19:00 Uhr</strong> auf dem <strong>Sportplatz</strong>. Trag die Zeit ein
        und speichere.
      </>
    ),
    Inhalt: props => (
      <ZeitenUebung
        {...props}
        team="U13"
        start={[]}
        aufgabe={zs => {
          const z = zs[0]
          if (zs.length !== 1) return 'Trag genau eine Trainingszeit ein.'
          if (z.wochentag !== 2) return 'Die U13 trainiert dienstags.'
          if (z.beginn !== '17:30' || z.ende !== '19:00') return 'Das Training geht von 17:30 bis 19:00 Uhr.'
          if (!z.ort.toLowerCase().includes('sportplatz')) return 'Als Ort bitte „Sportplatz“ eintragen.'
          return null
        }}
      />
    ),
    danach: 'Genau so geht es in echt: Zeit eintragen, unten auf „Speichern“ – schon steht sie auf der Website. Die Vorschau darüber zeigt, wie sie dort aussieht.',
  },
  {
    titel: 'Eine Zeit ändern',
    aufgabe: (
      <>
        Die Halle ist donnerstags erst später frei: Das Training beginnt jetzt um <strong>17:30</strong> und endet um <strong>19:00 Uhr</strong>.
        Ändere die Zeit.
      </>
    ),
    Inhalt: props => (
      <ZeitenUebung
        {...props}
        team="U13"
        start={[zeit({ schluessel: 1, wochentag: 4, beginn: '17:00', ende: '18:30', ort: 'Turnhalle Grundschule' })]}
        aufgabe={zs => {
          const z = zs[0]
          if (zs.length !== 1) return 'Ändere die vorhandene Zeit, statt eine neue anzulegen.'
          if (z.wochentag !== 4) return 'Der Tag bleibt Donnerstag.'
          if (z.beginn !== '17:30' || z.ende !== '19:00') return 'Neu ist: 17:30 bis 19:00 Uhr.'
          return null
        }}
      />
    ),
    danach: 'Ändern heißt: einfach im Feld überschreiben und speichern. Die alte Zeit ist dann sofort von der Website verschwunden.',
  },
  {
    titel: 'Nur im Winter',
    aufgabe: (
      <>
        Mittwochs trainiert die U13 in der Halle – aber <strong>nur im Winter</strong>. Stell die Saison passend ein und schreib als Hinweis
        „ab November“ dazu.
      </>
    ),
    Inhalt: props => (
      <ZeitenUebung
        {...props}
        team="U13"
        start={[
          zeit({ schluessel: 1, wochentag: 2, beginn: '17:30', ende: '19:00', ort: 'Sportplatz' }),
          zeit({ schluessel: 2, wochentag: 3, beginn: '16:30', ende: '18:00', ort: 'Turnhalle Grundschule' }),
        ]}
        aufgabe={zs => {
          const mi = zs.find(z => z.wochentag === 3)
          const di = zs.find(z => z.wochentag === 2)
          if (!mi || !di || zs.length !== 2) return 'Beide Zeiten sollen bleiben – nur der Mittwoch ändert sich.'
          if (mi.saison !== 'Winter') return 'Wähle beim Mittwoch unter „Saison“ den Winter.'
          if (!mi.hinweis.toLowerCase().includes('november')) return 'Trag beim Mittwoch als Hinweis „ab November“ ein.'
          if (di.saison !== 'ganzjährig') return 'Der Dienstag auf dem Sportplatz bleibt ganzjährig.'
          return null
        }}
      />
    ),
    danach: 'Saison und Rhythmus („alle 2 Wochen“) erscheinen auf der Website direkt an der Zeit. Der Hinweis steht darunter.',
  },
  {
    titel: 'Eine Zeit entfernen',
    aufgabe: 'Das Freitagstraining fällt ab sofort weg. Entferne es – der Montag bleibt.',
    Inhalt: props => (
      <ZeitenUebung
        {...props}
        team="U13"
        start={[
          zeit({ schluessel: 1, wochentag: 1, beginn: '17:00', ende: '18:30', ort: 'Sportplatz' }),
          zeit({ schluessel: 2, wochentag: 5, beginn: '16:00', ende: '17:30', ort: 'Sportplatz' }),
        ]}
        aufgabe={zs => {
          if (zs.some(z => z.wochentag === 5)) return 'Das Freitagstraining ist noch da. Tippe bei ihm auf „Entfernen“.'
          if (!zs.some(z => z.wochentag === 1)) return 'Der Montag sollte bleiben. Mit „Von vorn“ unten startest du die Übung neu.'
          return null
        }}
      />
    ),
    danach: 'Entfernte Zeiten verschwinden erst beim Speichern – bis dahin kannst du die Seite ohne Speichern verlassen, dann bleibt alles wie vorher.',
  },
  {
    titel: 'Wann ist es online?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Du hast eine Trainingszeit geändert und gespeichert. Wann sehen die Eltern die neue Zeit auf der Website?"
        antworten={[
          { text: 'Sofort nach dem Speichern', richtig: true },
          { text: 'Erst, wenn der Vorstand sie freigibt', erklaerung: 'Eine Freigabe gibt es nicht – du bist selbst verantwortlich. Gespeichert heißt: sofort live.' },
          { text: 'Am nächsten Morgen', erklaerung: 'Die Website liest bei jedem Aufruf frisch aus der Verwaltung. Es gibt keine Wartezeit.' },
        ]}
      />
    ),
    danach: 'Deshalb lohnt es sich, nach dem Speichern kurz auf der Website nachzusehen.',
  },
]
