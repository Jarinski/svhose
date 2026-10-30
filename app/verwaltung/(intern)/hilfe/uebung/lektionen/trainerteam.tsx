'use client'

/**
 * Übung "Trainerteam zusammenstellen" – Nachbau des Abschnitts "Trainerteam & Ansprechpartner"
 * im Formular "Mannschaft/Gruppe bearbeiten" (app/verwaltung/(intern)/teams/[art]/[id]/TeamFormular.tsx).
 * Personen- und Rollenauswahl sind die echten Bausteine (components/verwaltung/PersonAuswahl.tsx,
 * RollenAuswahl.tsx) – beide arbeiten nur im Browser. Prüfungen und Meldungen wie beim echten
 * Speichern (teamEingabePruefen und kontaktPruefen in lib/verwaltung/), dazu eine Vorschau der
 * Teamkarte auf der Spartenseite (app/sparten/[slug]/page.tsx).
 */

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Mail, MessageCircle, Phone, X } from 'lucide-react'
import type { AuswahlPerson } from '@/lib/verwaltung/person-bearbeiten'
import { suchNormal } from '@/lib/verwaltung/suche'
import { whatsappLink } from '@/lib/whatsapp'
import PersonAuswahl, { type NeuePersonDaten } from '@/components/verwaltung/PersonAuswahl'
import RollenAuswahl from '@/components/verwaltung/RollenAuswahl'
import { Badge, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

const ROLLEN = ['Trainer:in', 'Co-Trainer:in', 'Torwarttrainer:in', 'Betreuer:in', 'Übungsleiter:in']
const STANDARD_ROLLE = ROLLEN[0]
const TEAM = 'U13'
const SPARTE = 'Fußball'
const FARBE = '#16a34a'

/* ── Erfundene Personen (Verwendung ohne die U13 – die kommt je Lektion dazu) ── */

const ANNA: AuswahlPerson = { id: 1, name: 'Anna Beispiel', telefon: null, email: 'anna@example.org', verwendung: [] }
const BJOERN: AuswahlPerson = { id: 2, name: 'Björn Muster', telefon: null, email: 'b.muster@example.org', verwendung: ['Betreuer:in bei U12 (Fußball)'] }
const JONAS: AuswahlPerson = { id: 3, name: 'Jonas Muster', telefon: null, email: 'jonas@example.org', verwendung: ['Trainer:in bei Herren (Tischtennis)'] }
const KARLA: AuswahlPerson = { id: 4, name: 'Karla Probe', telefon: null, email: null, verwendung: ['Übungsleiter:in bei Kinderturnen (Turnen)'] }
const OLE: AuswahlPerson = { id: 5, name: 'Ole Beispiel', telefon: null, email: null, verwendung: [] }
const MIRA: AuswahlPerson = { id: 6, name: 'Mira Probe', telefon: '0171 2345678', email: null, verwendung: [] }

/** Verwendung wie in der Personensuche: mit (oder ohne) Rolle in der U13, die U13 steht vorn. */
const IM_TEAM = ` bei ${TEAM} (${SPARTE})`
const mitTeam = (verwendung: string[], rolle: string | null) => {
  const rest = verwendung.filter(v => !v.endsWith(IM_TEAM))
  return rolle ? [rolle + IM_TEAM].concat(rest) : rest
}

/** Zeile im Trainerteam – wie im echten Formular: vorhandene Person über personId, neue über neu. */
interface Zeile {
  schluessel: string
  personId: number | null
  neu: NeuePersonDaten | null
  rolle: string
}

const MAX = { name: 100, email: 200, telefon: 50, rolle: 60 }
const nurZiffern = (nummer: string) => nummer.replace(/\D/g, '')

/** Dieselben Prüfungen und Texte wie kontaktPruefen beim Anlegen einer neuen Person. */
function kontaktPruefen(neu: NeuePersonDaten, praefix: string, zeile: string): Record<string, string> {
  const felder: Record<string, string> = {}
  const name = neu.name.trim()
  const email = neu.email.trim()
  const telefon = neu.telefon.trim()
  if (!name) felder[praefix + 'name'] = `${zeile}Bitte einen Namen eintragen.`
  else if (name.length > MAX.name) felder[praefix + 'name'] = `${zeile}Der Name ist zu lang (höchstens ${MAX.name} Zeichen).`
  if (email && (email.length > MAX.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    felder[praefix + 'email'] = `${zeile}Bitte eine gültige E-Mail-Adresse eintragen, z. B. name@beispiel.de.`
  }
  if (telefon && (telefon.length > MAX.telefon || nurZiffern(telefon).length < 3)) {
    felder[praefix + 'telefon'] = `${zeile}Bitte eine Telefonnummer mit Ziffern eintragen, z. B. 0171 1234567.`
  }
  return felder
}

/** Dieselben Prüfungen und Texte wie beim echten Speichern (teamEingabePruefen, Teil Trainerteam). */
function pruefen(zeilen: Zeile[]): Record<string, string> {
  const felder: Record<string, string> = {}
  const gesehenIds: number[] = []
  const gesehenNeu: string[] = []
  zeilen.forEach((z, i) => {
    const zeile = `Person ${i + 1}: `
    const k = `trainer.${i}`
    const rolle = z.rolle.trim() || STANDARD_ROLLE
    if (rolle.length > MAX.rolle) felder[k + '.rolle'] = `${zeile}Die Rolle ist zu lang (höchstens ${MAX.rolle} Zeichen).`
    if (z.personId != null) {
      if (gesehenIds.indexOf(z.personId) >= 0) felder[k] = `${zeile}Diese Person steht schon im Trainerteam. Bitte eine der beiden Zeilen entfernen.`
      gesehenIds.push(z.personId)
      return
    }
    if (z.neu) {
      Object.assign(felder, kontaktPruefen(z.neu, k + '.', zeile))
      const name = z.neu.name.trim()
      if (name && gesehenNeu.indexOf(name.toLowerCase()) >= 0) felder[k] = `${zeile}„${name}“ soll zweimal neu angelegt werden. Bitte eine der beiden Zeilen entfernen.`
      gesehenNeu.push(name.toLowerCase())
      return
    }
    felder[k] = `${zeile}Bitte eine Person auswählen oder entfernen.`
  })
  return felder
}

function fehlerMeldung(felder: Record<string, string>): string {
  const meldungen = Object.values(felder)
  const weitere = meldungen.length - 1
  return `Noch nicht gespeichert. ${meldungen[0]}${weitere > 0 ? ` (dazu ${weitere} weitere Stelle${weitere === 1 ? '' : 'n'}, rot markiert)` : ''}`
}

/** Ungültige Angaben einer neuen Person lassen sich in der Zeile nicht ändern – Tipp, wie es weitergeht. */
function neuKorrigieren(zeilen: Zeile[], felder: Record<string, string>): string | null {
  for (let i = 0; i < zeilen.length; i++) {
    const neu = zeilen[i].neu
    if (!neu) continue
    const k = `trainer.${i}.`
    const was = [felder[k + 'name'] && 'der Name', felder[k + 'telefon'] && 'die Telefonnummer', felder[k + 'email'] && 'die E-Mail-Adresse'].filter(
      (x): x is string => !!x,
    )
    if (was.length)
      return `Tipp: Bei einer neuen Person ${was.length > 1 ? 'lassen' : 'lässt'} sich ${aufzaehlen(was)} in der Zeile nicht mehr ändern. Nimm ${neu.name || 'die Zeile'} mit dem Kreuz raus und leg die Person über „Person hinzufügen“ noch einmal an – diesmal mit den richtigen Angaben.`
  }
  return null
}

/** "A", "A und B", "A, B und C" */
const aufzaehlen = (namen: string[]) => (namen.length < 2 ? namen.join('') : `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`)

/** Was ans Speichern ginge; mit `normal` wie es danach in der Datenbank steht (leere Rolle = Trainer:in). */
const vergleich = (zeilen: Zeile[], normal = false) =>
  JSON.stringify(zeilen.map(z => ({ personId: z.personId, neu: z.neu, rolle: normal ? z.rolle.trim() || STANDARD_ROLLE : z.rolle })))

/* ── Vorschau: die Teamkarte auf der Spartenseite ─────────────────────────── */

interface Kontakt {
  schluessel: string
  name: string
  rolle: string
  email: string | null
  telefon: string | null
}

function initialen(name: string) {
  return (name || '?').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function WebsiteTeam({ trainer }: { trainer: Kontakt[] }) {
  return (
    <Vorschau adresse="/sparten/fussball">
      <div className="overflow-hidden border border-[#0a0a0a]/[0.08] bg-[#fafaf8]">
        <div className="flex gap-4 p-4">
          <div className="flex aspect-[16/10] w-24 shrink-0 items-center justify-center text-2xl sm:w-40" style={{ background: `${FARBE}12` }} aria-hidden="true">
            ⚽
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-base font-medium leading-tight">{TEAM}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="bg-[#0a0a0a]/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b]">Junioren</span>
              <span className="bg-[#0a0a0a]/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b]">Jg. 2013</span>
            </div>
          </div>
        </div>
        {trainer.length > 0 ? (
          <div className="border-t border-[#0a0a0a]/[0.06] px-4 pb-4 pt-4">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: FARBE }}>
              Trainer &amp; Ansprechpartner
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {trainer.map(t => {
                const wa = whatsappLink({ telefon: t.telefon })
                return (
                  <div key={t.schluessel} className="flex items-start gap-2.5 border border-[#0a0a0a]/[0.06] bg-white p-3">
                    <div
                      className="flex h-[4.5rem] w-[4.5rem] shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ background: FARBE }}
                      aria-hidden="true"
                    >
                      {initialen(t.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-sm font-medium leading-tight">{t.name}</div>
                      <div className="mb-2 text-[11px] leading-snug text-[#6b6b6b]">{t.rolle}</div>
                      <div className="space-y-0.5 text-[11px] text-[#6b6b6b]">
                        {t.email && (
                          <div className="flex min-w-0 items-center gap-1">
                            <Mail size={9} className="shrink-0" aria-hidden="true" />
                            <span className="min-w-0 truncate leading-tight">{t.email}</span>
                          </div>
                        )}
                        {t.telefon && (
                          <div className="flex items-center gap-1">
                            <Phone size={9} className="shrink-0" aria-hidden="true" />
                            {t.telefon}
                          </div>
                        )}
                        {wa && (
                          <div className="flex items-center gap-1 text-[#16a34a]">
                            <MessageCircle size={9} className="shrink-0" aria-hidden="true" />
                            WhatsApp
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="border-t border-[#0a0a0a]/[0.06] px-4 py-4 text-sm text-[#6b6b6b]">Ohne Trainerteam fehlt dieser Abschnitt auf der Website.</p>
        )}
      </div>
    </Vorschau>
  )
}

/* ── Nachbau des Abschnitts "Trainerteam & Ansprechpartner" ───────────────── */

/**
 * Formular mit dem Trainerteam der U13. `team` ist der gespeicherte Stand, `weitere` sind alle
 * anderen Personen, die die Suche findet. `aufgabe` prüft nach dem (echten) Prüfen, ob die
 * Aufgabe erfüllt ist, und liefert sonst einen Hinweis (`name` liefert den Namen einer Zeile).
 */
function TrainerUebung({
  team,
  weitere,
  aufgabe,
  geloest,
}: {
  team: [AuswahlPerson, string][]
  weitere: AuswahlPerson[]
  aufgabe: (zeilen: Zeile[], name: (z: Zeile) => string) => string | null
} & LektionProps) {
  // Wie vom Server geladen: Wer im Team steht, hat die U13 in seiner Verwendung.
  const [personen, setPersonen] = useState<AuswahlPerson[]>(() =>
    team
      .map(([p, rolle]) => ({ ...p, verwendung: mitTeam(p.verwendung, rolle) }))
      .concat(weitere)
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
  )
  const anfang = team.map(([p, rolle]) => ({ schluessel: `p${p.id}`, personId: p.id, neu: null, rolle }))
  const [zeilen, setZeilen] = useState<Zeile[]>(anfang)
  const [gespeichert, setGespeichert] = useState<Zeile[]>(anfang)
  const [fehler, setFehler] = useState<Record<string, string[]>>({})
  const [meldung, setMeldung] = useState<{ art: 'erfolg' | 'fehler' | 'hinweis'; text: string } | null>(null)
  // Zweite, gelbe Meldung unter der echten: Tipp oder was in der Übung noch fehlt
  const [zusatz, setZusatz] = useState<string | null>(null)
  // Nach dem Speichern startet das echte Formular frisch (neuer key) – das machen wir hier nach.
  const [stand, setStand] = useState(0)
  const zaehler = useRef(0)
  const geaendert = vergleich(zeilen) !== vergleich(gespeichert)

  const personNachId = new Map(personen.map(p => [p.id, p] as const))
  const gespeichertImTeam = gespeichert.map(z => z.personId)

  const neueZeile = (teil: Pick<Zeile, 'personId' | 'neu'>) =>
    setZeilen(zs => zs.concat({ schluessel: `z${++zaehler.current}`, rolle: STANDARD_ROLLE, ...teil }))
  const aendern = (schluessel: string, teil: Partial<Zeile>) => setZeilen(zs => zs.map(z => (z.schluessel === schluessel ? { ...z, ...teil } : z)))
  const verschieben = (index: number, richtung: -1 | 1) =>
    setZeilen(zs => {
      const ziel = index + richtung
      if (ziel < 0 || ziel >= zs.length) return zs
      const liste = zs.slice()
      const [zeile] = liste.splice(index, 1)
      liste.splice(ziel, 0, zeile)
      return liste
    })

  function kontakt(z: Zeile): Kontakt {
    const p = z.personId != null ? personNachId.get(z.personId) : undefined
    return {
      schluessel: z.schluessel,
      name: z.neu ? z.neu.name : (p?.name ?? 'Unbekannte Person'),
      rolle: z.rolle.trim() || STANDARD_ROLLE,
      email: z.neu ? z.neu.email || null : (p?.email ?? null),
      telefon: z.neu ? z.neu.telefon || null : (p?.telefon ?? null),
    }
  }

  function speichern(e: React.FormEvent) {
    e.preventDefault()
    setZusatz(null)
    const felder = pruefen(zeilen)
    // Fehler gehören zu den Zeilen, wie sie beim Absenden standen
    const jeZeile: Record<string, string[]> = {}
    zeilen.forEach((z, i) => {
      const liste = Object.keys(felder)
        .filter(k => k === `trainer.${i}` || k.startsWith(`trainer.${i}.`))
        .map(k => felder[k])
      if (liste.length) jeZeile[z.schluessel] = liste
    })
    setFehler(jeZeile)
    if (Object.keys(felder).length) {
      setMeldung({ art: 'fehler', text: fehlerMeldung(felder) })
      setZusatz(neuKorrigieren(zeilen, felder))
      return
    }
    const hinweis = aufgabe(zeilen, z => kontakt(z).name)
    if (vergleich(zeilen, true) === vergleich(gespeichert, true)) {
      // Echte Meldung unverändert – was in der Übung noch fehlt, steht extra darunter
      setMeldung({ art: 'erfolg', text: 'Alles schon gespeichert – es gab keine Änderungen.' })
      if (hinweis) setZusatz(`In der Übung noch nicht ganz: ${hinweis}`)
      return
    }
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    // Wie nach dem echten Speichern (die Seite lädt neu): neue Personen sind angelegt, leere
    // Rollen heißen "Trainer:in" und die Suche zeigt bei allen die neue Verwendung.
    let naechsteId = personen.reduce((max, p) => Math.max(max, p.id), 0) + 1
    const angelegt: AuswahlPerson[] = []
    const neu = zeilen.map(z => {
      const rolle = z.rolle.trim() || STANDARD_ROLLE
      if (!z.neu) return { ...z, rolle }
      const p: AuswahlPerson = { id: naechsteId++, name: z.neu.name, telefon: z.neu.telefon || null, email: z.neu.email || null, verwendung: [] }
      angelegt.push(p)
      return { schluessel: `p${p.id}`, personId: p.id, neu: null, rolle }
    })
    const rolleVon = new Map(neu.map(z => [z.personId, z.rolle] as const))
    setPersonen(ps =>
      ps
        .concat(angelegt)
        .map(p => ({ ...p, verwendung: mitTeam(p.verwendung, rolleVon.get(p.id) ?? null) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    )
    setZeilen(neu)
    setGespeichert(neu)
    setStand(s => s + 1)
    setMeldung({ art: 'erfolg', text: 'Gespeichert – ist jetzt auf der Website sichtbar.' })
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        <div className="mb-4">
          <h3 className="font-display text-3xl leading-none tracking-tight">{TEAM}</h3>
          <p className="mt-1.5 text-sm text-[#6b6b6b]">Mannschaft · Sparte {SPARTE}</p>
        </div>
        <form onSubmit={speichern} noValidate>
          <Karte titel="Trainerteam & Ansprechpartner" beschreibung="Diese Personen erscheinen mit Telefon und E-Mail auf der Website – in dieser Reihenfolge.">
            {zeilen.length === 0 ? (
              <p className="mb-4 text-sm text-[#6b6b6b]">Noch niemand eingetragen.</p>
            ) : (
              <ul className="mb-4 space-y-3">
                {zeilen.map((z, i) => {
                  const k = kontakt(z)
                  const kontaktText = [k.telefon, k.email].filter(Boolean).join(' · ')
                  const fehlerListe = fehler[z.schluessel] ?? []
                  return (
                    <li
                      key={`${stand}-${z.schluessel}`}
                      className={`flex flex-wrap items-start gap-x-3 gap-y-2 rounded-sm border p-3 sm:flex-nowrap sm:items-center sm:p-4 ${fehlerListe.length ? 'border-red-300 bg-red-50/40' : 'border-[#0a0a0a]/15'}`}
                    >
                      <div className="min-w-0 flex-1 self-center">
                        <div className="flex flex-wrap items-center gap-2 font-medium">
                          {k.name}
                          {z.neu && <Badge ton="erfolg">neu – wird beim Speichern angelegt</Badge>}
                        </div>
                        <div className="mt-0.5 break-words text-xs text-[#6b6b6b]">
                          {kontaktText || 'keine Kontaktdaten'}
                          {z.personId != null && gespeichertImTeam.indexOf(z.personId) >= 0 && (
                            <>
                              {' · '}
                              <button
                                type="button"
                                onClick={() =>
                                  setMeldung({
                                    art: 'hinweis',
                                    text: `In der echten Verwaltung öffnet sich jetzt die Seite von ${k.name}. Dort änderst du Telefon und E-Mail – für alle Stellen, an denen ${k.name} eingetragen ist.`,
                                  })
                                }
                                className="text-left underline underline-offset-2 hover:text-[#0a0a0a]"
                              >
                                Kontaktdaten ändern
                              </button>
                            </>
                          )}
                        </div>
                        {fehlerListe.map(m => (
                          <p key={m} className="mt-1 text-sm text-red-700" aria-live="polite">
                            {m}
                          </p>
                        ))}
                      </div>
                      {/* Handy: Knöpfe neben dem Namen, Rolle darunter in voller Breite */}
                      <div className="order-last w-full sm:order-none sm:w-56">
                        <label htmlFor={`uebung-rolle-${z.schluessel}`} className="sr-only">
                          Rolle von {k.name}
                        </label>
                        <RollenAuswahl
                          id={`uebung-rolle-${z.schluessel}`}
                          wert={z.rolle}
                          onChange={rolle => aendern(z.schluessel, { rolle })}
                          rollen={ROLLEN}
                          ungueltig={fehlerListe.length > 0}
                        />
                      </div>
                      <div className="-mr-2 flex shrink-0 sm:mr-0">
                        <button
                          type="button"
                          onClick={() => verschieben(i, -1)}
                          disabled={i === 0}
                          className={`${knopfKlassen.leise} min-h-[44px] min-w-[40px] disabled:opacity-25`}
                          aria-label={`${k.name} nach oben`}
                          title="Nach oben"
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => verschieben(i, 1)}
                          disabled={i === zeilen.length - 1}
                          className={`${knopfKlassen.leise} min-h-[44px] min-w-[40px] disabled:opacity-25`}
                          aria-label={`${k.name} nach unten`}
                          title="Nach unten"
                        >
                          <ChevronDown size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setZeilen(zs => zs.filter(x => x.schluessel !== z.schluessel))}
                          className={`${knopfKlassen.leise} min-h-[44px] min-w-[40px] text-red-700 hover:text-red-800`}
                          aria-label={`${k.name} entfernen`}
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
              key={stand}
              personen={personen}
              vorhanden={zeilen.map(z => z.personId).filter((x): x is number => x != null)}
              onAuswahl={personId => neueZeile({ personId, neu: null })}
              onNeu={neu => neueZeile({ personId: null, neu })}
            />
            <p className="mt-3 text-xs text-[#6b6b6b]">Entfernen nimmt die Person nur aus dieser Mannschaft – sie bleibt im System erhalten.</p>
            <UebungsLeiste geaendert={geaendert} meldung={meldung} />
            {zusatz && (
              <div className="mt-3">
                <Meldung art="hinweis">{zusatz}</Meldung>
              </div>
            )}
          </Karte>
        </form>
      </Spielwiese>
      <WebsiteTeam trainer={gespeichert.map(kontakt)} />
    </div>
  )
}

/* ── Hilfen für die Aufgaben ───────────────────────────────────────────────── */

const steht = (zs: Zeile[], p: AuswahlPerson) => zs.find(z => z.personId === p.id)
const neueNamen = (zs: Zeile[]) => zs.filter(z => z.neu).map(z => z.neu!.name)
/** Alle Zeilen außer den genannten Personen – auch neu angelegte. */
const ohne = (zs: Zeile[], personen: AuswahlPerson[]) => zs.filter(z => !personen.some(p => p.id === z.personId))

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Eine Person hinzufügen',
    aufgabe: (
      <>
        <strong>Björn Muster</strong> hilft ab sofort bei der U13 mit. Hol ihn über „Person hinzufügen“ ins Trainerteam und speichere. Probier
        bei der Suche ruhig zuerst „Bjorn“ – ohne ö.
      </>
    ),
    Inhalt: props => (
      <TrainerUebung
        {...props}
        team={[[ANNA, 'Trainer:in']]}
        weitere={[BJOERN, JONAS, KARLA, OLE]}
        aufgabe={(zs, name) => {
          const doppelt = neueNamen(zs).find(n => /bjo?e?rn|muster/.test(suchNormal(n)))
          if (doppelt)
            return `Björn Muster gibt es schon – mit „${doppelt}“ stünde er doppelt im System. Nimm die neue Zeile mit dem Kreuz wieder raus und such nach „Björn“, „Bjoern“ oder nur nach „Muster“.`
          if (neueNamen(zs).length) return 'Hier soll niemand neu angelegt werden – Björn Muster ist schon erfasst. Nimm die neue Zeile mit dem Kreuz wieder raus.'
          if (!steht(zs, BJOERN)) {
            if (steht(zs, JONAS)) return 'Jonas Muster trainiert die Tischtennis-Herren – gesucht ist Björn Muster. Unter jedem Treffer steht, wo die Person schon eingetragen ist.'
            return 'Björn Muster fehlt noch. Tippe auf „Person hinzufügen“ und such nach ihm.'
          }
          if (!steht(zs, ANNA)) return 'Anna Beispiel soll im Trainerteam bleiben. Mit „Von vorn“ unten startest du die Übung neu.'
          const andere = ohne(zs, [ANNA, BJOERN])
          if (andere.length) return `Hol nur Björn Muster dazu. Anna bleibt – ${aufzaehlen(andere.map(name))} nimmst du mit dem Kreuz wieder raus.`
          return null
        }}
      />
    ),
    danach: (
      <>
        Björn steht jetzt im Trainerteam – erst einmal als Trainer:in. Merk dir: „Björn“ oder „Bjoern“ findet ihn, „Bjorn“ nicht. Findest du
        jemanden nicht, probier vor dem Neuanlegen die andere Schreibweise oder nur den Nachnamen – sonst gibt es die Person doppelt.
      </>
    ),
  },
  {
    titel: 'Eine neue Person anlegen',
    aufgabe: (
      <>
        <strong>Mira Probe</strong> ist neu dabei und noch nicht erfasst. Sie ist einverstanden, dass ihre Handynummer{' '}
        <strong>0171 2345678</strong> auf der Website steht. Leg sie direkt hier als neue Person an, gleich mit dieser Nummer, und speichere. Prüf
        die Nummer vor „Hinzufügen“ genau – danach lässt sie sich in der Zeile nicht mehr ändern.
      </>
    ),
    Inhalt: props => (
      <TrainerUebung
        {...props}
        team={[
          [ANNA, 'Trainer:in'],
          [BJOERN, 'Trainer:in'],
        ]}
        weitere={[JONAS, KARLA, OLE]}
        aufgabe={(zs, name) => {
          const mira = zs.find(z => z.neu && suchNormal(z.neu.name.trim()) === 'mira probe')
          if (!mira) {
            if (neueNamen(zs).some(n => suchNormal(n).includes('mira')))
              return 'Trag den vollständigen Namen ein: „Mira Probe“. In der Zeile lässt sich der Name nicht mehr ändern – nimm sie mit dem Kreuz raus und leg sie noch einmal an.'
            return 'Mira Probe fehlt noch. Tippe auf „Person hinzufügen“, gib ihren Namen ein und wähle ganz unten „… als neue Person anlegen“.'
          }
          if (nurZiffern(mira.neu!.telefon) !== '01712345678')
            return 'Miras Telefonnummer ist 0171 2345678. In der Zeile lässt sie sich nicht mehr ändern – nimm Mira mit dem Kreuz raus und leg sie noch einmal an.'
          if (!steht(zs, ANNA) || !steht(zs, BJOERN)) return 'Anna Beispiel und Björn Muster bleiben im Team. Mit „Von vorn“ unten startest du die Übung neu.'
          const andere = ohne(zs, [ANNA, BJOERN]).filter(z => z !== mira)
          if (andere.length) return `Leg nur Mira Probe an. Anna und Björn bleiben – ${aufzaehlen(andere.map(name))} nimmst du mit dem Kreuz wieder raus.`
          return null
        }}
      />
    ),
    danach: (
      <>
        Erst beim Speichern wird Mira angelegt – danach findest du sie auch unter „Personen“. Weil 0171 eine Handynummer ist, erscheint auf der
        Website automatisch ein WhatsApp-Link. Wichtig: Kontaktdaten stehen öffentlich im Netz, trag sie nur mit Einverständnis ein. Der sichere
        Weg im Alltag: Gib bei neuen Personen erst nur den Namen ein und speichere. Telefon und E-Mail ergänzt du danach über „Kontaktdaten ändern“ –
        dort lassen sie sich jederzeit korrigieren.
      </>
    ),
  },
  {
    titel: 'Die Rolle wählen',
    aufgabe: (
      <>
        Björn ist <strong>Co-Trainer:in</strong>. Mira kümmert sich um Organisation und Fahrten – ihre Rolle <strong>„Teammanager:in“</strong> steht
        nicht in der Liste. Stell beide Rollen ein und speichere.
      </>
    ),
    Inhalt: props => (
      <TrainerUebung
        {...props}
        team={[
          [ANNA, 'Trainer:in'],
          [BJOERN, 'Trainer:in'],
          [MIRA, 'Trainer:in'],
        ]}
        weitere={[JONAS, KARLA, OLE]}
        aufgabe={(zs, name) => {
          const bjoern = steht(zs, BJOERN)
          const mira = steht(zs, MIRA)
          const anna = steht(zs, ANNA)
          if (!bjoern || !mira || !anna) return 'Alle drei bleiben im Team. Mit „Von vorn“ unten startest du die Übung neu.'
          const andere = ohne(zs, [ANNA, BJOERN, MIRA])
          if (andere.length) return `Hier kommt niemand dazu – ${aufzaehlen(andere.map(name))} nimmst du mit dem Kreuz wieder raus.`
          if (bjoern.rolle !== 'Co-Trainer:in') return 'Wähle bei Björn Muster die Rolle „Co-Trainer:in“.'
          if (!mira.rolle.trim()) return 'Miras Rolle ist noch leer – so würde die Verwaltung „Trainer:in“ speichern. Tippe „Teammanager:in“ ein.'
          if (!suchNormal(mira.rolle).replace(/[^a-z]/g, '').startsWith('teammanager'))
            return 'Wähle bei Mira Probe „Andere Rolle eintippen …“ und schreib „Teammanager:in“ ins Feld.'
          if (anna.rolle !== 'Trainer:in') return 'Anna Beispiel bleibt Trainer:in.'
          return null
        }}
      />
    ),
    danach: (
      <>
        Die Rolle gilt nur für diese Mannschaft – woanders kann dieselbe Person eine andere Rolle haben. Zur Auswahl zurück kommst du über den kleinen
        Knopf mit dem Listen-Symbol neben dem Feld.
      </>
    ),
  },
  {
    titel: 'Reihenfolge und Entfernen',
    aufgabe: (
      <>
        Eltern sollen zuerst <strong>Anna Beispiel</strong> erreichen: Setz sie mit den Pfeilen ganz nach oben. <strong>Jonas Muster</strong> hört bei
        der U13 auf – nimm ihn aus dem Trainerteam. Dann speichern.
      </>
    ),
    Inhalt: props => (
      <TrainerUebung
        {...props}
        team={[
          [BJOERN, 'Co-Trainer:in'],
          [JONAS, 'Betreuer:in'],
          [MIRA, 'Teammanager:in'],
          [ANNA, 'Trainer:in'],
        ]}
        weitere={[KARLA, OLE]}
        aufgabe={(zs, name) => {
          if (steht(zs, JONAS)) return 'Jonas Muster steht noch im Trainerteam. Tippe in seiner Zeile auf das Kreuz.'
          if (!steht(zs, ANNA) || !steht(zs, BJOERN) || !steht(zs, MIRA))
            return 'Nur Jonas hört auf – Anna, Björn und Mira bleiben. Mit „Von vorn“ unten startest du die Übung neu.'
          const andere = ohne(zs, [ANNA, BJOERN, MIRA])
          if (andere.length) return `Hier kommt niemand dazu – ${aufzaehlen(andere.map(name))} nimmst du mit dem Kreuz wieder raus.`
          if (zs[0].personId !== ANNA.id) return 'Anna Beispiel soll ganz oben stehen. Tippe in ihrer Zeile so oft auf den Pfeil nach oben, bis sie an erster Stelle ist.'
          return null
        }}
      />
    ),
    danach: (
      <>
        Jonas ist nur aus der U13 raus – er bleibt im System und bei den Tischtennis-Herren eingetragen. Und weil Anna oben steht, erscheint auf der
        Seite Trainingszeiten bei der U13 ihre E-Mail-Adresse: Dort stehen nur eine E-Mail-Adresse und eine Telefonnummer – jeweils von der ersten
        Person in der Liste, die eine hat.
      </>
    ),
  },
  {
    titel: 'Wer sieht das Trainerteam?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Wer kann Name, Telefonnummer und E-Mail-Adresse aus dem Trainerteam sehen?"
        antworten={[
          {
            text: 'Nur angemeldete Vereinsmitglieder',
            erklaerung: 'Eine Anmeldung für Mitglieder gibt es auf der Website nicht – das Trainerteam steht öffentlich auf der Spartenseite und bei den Trainingszeiten.',
          },
          { text: 'Alle, die die Website besuchen', richtig: true },
          {
            text: 'Nur die Spartenleitung und Admins',
            erklaerung: 'In der Verwaltung sehen sie es natürlich auch – aber das Trainerteam erscheint vor allem öffentlich auf der Website, damit Interessierte anrufen oder schreiben können.',
          },
        ]}
      />
    ),
    danach: 'Deshalb gilt: Kontaktdaten nur mit Einverständnis der Person eintragen.',
  },
]
