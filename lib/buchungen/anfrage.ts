/**
 * lib/buchungen/anfrage.ts
 *
 * Die öffentliche Seite der Buchungen (/vereinsheim): eine Anfrage einreichen und mit
 * Buchungsnummer und Datum ihren Stand abrufen. Reine Funktionen – Datenbank und IP werden
 * übergeben, die Server-Aktionen liegen in app/vereinsheim/aktionen.ts.
 *
 * Schutz:
 *   - Pro IP höchstens ANFRAGEN_MAX Anfragen pro Stunde, dazu ein unsichtbares Lockfeld gegen Bots.
 *   - Abrufen braucht Nummer UND Datum; nach STATUS_FEHLVERSUCHE_MAX falschen Versuchen pro IP ist
 *     eine Viertelstunde Pause. Die Statusseite zeigt nie Name, E-Mail, Telefon oder Nachricht.
 *   - Zähler liegen (nur gehasht) in der Tabelle fehlversuche, wie bei der Anmeldung.
 *   - Kontaktdaten werden AUFBEWAHREN_TAGE nach dem Ende der Belegung gelöscht (personendatenLoeschen).
 */

import { createHash, randomInt } from 'node:crypto'
import { and, count, eq, gt, isNull, lt, or } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { ueberschneidungen } from './belegung'
import { buchungSchnappschuss } from './schnappschuss'
import {
  heute,
  istArt,
  istOrt,
  jetztOrtszeit,
  NUMMER_ZEICHEN,
  nummerNormalisieren,
  tagPlus,
  zeitraumAus,
  type BuchungOrt,
  type BuchungStatus,
} from './zeit'

export const ANFRAGEN_MAX = 5
const ANFRAGEN_FENSTER_MINUTEN = 60
export const STATUS_FEHLVERSUCHE_MAX = 10
const STATUS_FENSTER_MINUTEN = 15
/** So lange nach dem Ende der Belegung bleiben Name, E-Mail, Telefon und Nachricht gespeichert. */
export const AUFBEWAHREN_TAGE = 365
/** So weit im Voraus kann man anfragen. */
export const VORLAUF_MAX_TAGE = 2 * 366
/** Längste Dauer einer Anfrage über die Website. */
const DAUER_MAX_TAGE = 14

// ─── Zähler (Tabelle fehlversuche) ───────────────────────────────────────────

const schluessel = (zweck: string, ip: string) => createHash('sha256').update(`${zweck}:${ip}`).digest('hex')

function anzahl(db: Pick<Datenbank, 'select'>, s: string, minuten: number): number {
  const seit = new Date(Date.now() - minuten * 60_000).toISOString()
  return (
    db
      .select({ n: count() })
      .from(schema.fehlversuche)
      .where(and(eq(schema.fehlversuche.schluessel, s), gt(schema.fehlversuche.zeitpunkt, seit)))
      .get()?.n ?? 0
  )
}

function zaehlen(db: Pick<Datenbank, 'insert' | 'delete'>, s: string): void {
  const vorEinemTag = new Date(Date.now() - 86_400_000).toISOString()
  db.delete(schema.fehlversuche).where(lt(schema.fehlversuche.zeitpunkt, vorEinemTag)).run()
  db.insert(schema.fehlversuche).values({ schluessel: s }).run()
}

// ─── Buchungsnummer ──────────────────────────────────────────────────────────

/** Neue, noch nicht vergebene Nummer "XXXX-XXXX" (31^8 ≈ 850 Mrd. Möglichkeiten). */
export function neueNummer(db: Pick<Datenbank, 'select'>): string {
  for (;;) {
    let roh = ''
    for (let i = 0; i < 8; i++) roh += NUMMER_ZEICHEN[randomInt(NUMMER_ZEICHEN.length)]
    const nummer = `${roh.slice(0, 4)}-${roh.slice(4)}`
    if (!db.select({ id: schema.buchungen.id }).from(schema.buchungen).where(eq(schema.buchungen.nummer, nummer)).get()) return nummer
  }
}

// ─── Anfrage einreichen ──────────────────────────────────────────────────────

export interface AnfrageEingabe {
  art: string | null
  ort: string | null
  datum: string | null
  beginn: string | null
  ende: string | null
  bisDatum: string | null
  ganztaegig: boolean
  titel: string | null
  personenzahl: string | null
  bereich: string | null
  name: string | null
  email: string | null
  telefon: string | null
  nachricht: string | null
  datenschutz: boolean
  /** Unsichtbares Lockfeld – Menschen lassen es leer. */
  falle: string | null
}

export type AnfrageErgebnis =
  | { ok: true; nummer: string; datum: string; ueberschneidung: boolean }
  | { ok: false; meldung: string; felder?: Record<string, string> }

const LAENGEN: Partial<Record<keyof AnfrageEingabe, number>> = { titel: 150, bereich: 150, name: 150, email: 200, telefon: 50, nachricht: 3000 }

export function anfragePruefen(e: AnfrageEingabe, jetzt: Date = new Date()): { felder: Record<string, string> } | { werte: typeof schema.buchungen.$inferInsert } {
  const felder: Record<string, string> = {}
  if (e.art !== 'mitglied' && e.art !== 'extern') felder.art = 'Bitte auswählen, ob du Vereinsmitglied bist.'
  if (!istOrt(e.ort)) felder.ort = 'Bitte auswählen, was du buchen möchtest.'
  if (!e.titel) felder.titel = 'Bitte den Anlass eintragen.'
  if (!e.name) felder.name = 'Bitte deinen Namen eintragen.'
  if (!e.email) felder.email = 'Bitte deine E-Mail-Adresse eintragen.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) felder.email = 'Diese E-Mail-Adresse sieht nicht richtig aus.'
  if (!e.datenschutz) felder.datenschutz = 'Bitte der Verarbeitung deiner Angaben zustimmen.'
  for (const [feld, max] of Object.entries(LAENGEN)) {
    const wert = e[feld as keyof AnfrageEingabe]
    if (typeof wert === 'string' && wert.length > (max as number)) felder[feld] = `Bitte kürzer fassen (höchstens ${max} Zeichen).`
  }
  let personenzahl: number | null = null
  if (e.personenzahl) {
    personenzahl = Number(e.personenzahl)
    if (!Number.isInteger(personenzahl) || personenzahl < 1 || personenzahl > 2000) felder.personenzahl = 'Bitte eine Zahl eintragen.'
  }

  const z = zeitraumAus(e)
  if ('felder' in z) Object.assign(felder, z.felder)
  else {
    const jetztHier = jetztOrtszeit(jetzt)
    if (z.zeitraum.von < jetztHier) felder.datum = 'Der Termin liegt in der Vergangenheit.'
    else if (z.zeitraum.von.slice(0, 10) > tagPlus(heute(jetzt), VORLAUF_MAX_TAGE)) felder.datum = 'So weit im Voraus können wir leider noch nicht planen.'
    else if (z.zeitraum.bis > `${tagPlus(z.zeitraum.von.slice(0, 10), DAUER_MAX_TAGE)}T00:00`)
      felder.bisDatum = `Über die Website geht höchstens ${DAUER_MAX_TAGE} Tage am Stück – für Längeres sprich uns bitte direkt an.`
  }
  if (Object.keys(felder).length > 0 || 'felder' in z) return { felder }

  return {
    werte: {
      nummer: '',
      quelle: 'website',
      art: istArt(e.art) ? e.art : 'extern',
      ort: e.ort as BuchungOrt,
      titel: e.titel as string,
      von: z.zeitraum.von,
      bis: z.zeitraum.bis,
      personenzahl,
      status: 'angefragt',
      bereich: e.bereich,
      name: e.name,
      email: e.email,
      telefon: e.telefon,
      nachricht: e.nachricht,
    },
  }
}

export function anfrageEinreichen(db: Datenbank, e: AnfrageEingabe, ip: string, jetzt: Date = new Date()): AnfrageErgebnis {
  const geprueft = anfragePruefen(e, jetzt)
  if ('felder' in geprueft) return { ok: false, meldung: 'Bitte die markierten Felder prüfen.', felder: geprueft.felder }

  const s = schluessel('buchung-anfrage', ip)
  if (anzahl(db, s, ANFRAGEN_FENSTER_MINUTEN) >= ANFRAGEN_MAX) {
    return { ok: false, meldung: 'Von hier kamen gerade sehr viele Anfragen. Bitte versuch es in einer Stunde noch einmal oder schreib uns eine E-Mail.' }
  }
  // Bots füllen das versteckte Feld aus: freundlich "angenommen" melden, aber nichts speichern.
  if (e.falle) {
    zaehlen(db, s)
    return { ok: true, nummer: neueNummer(db), datum: geprueft.werte.von.slice(0, 10), ueberschneidung: false }
  }

  return db.transaction(tx => {
    personendatenLoeschen(tx, jetzt)
    const neu = tx
      .insert(schema.buchungen)
      .values({ ...geprueft.werte, nummer: neueNummer(tx) })
      .returning()
      .get()
    zaehlen(tx, s)
    protokollieren(tx, null, {
      quelle: 'system',
      aktion: 'angelegt',
      objektTyp: 'buchungen',
      objektId: neu.id,
      bezeichnung: `Buchungsanfrage ${neu.nummer} über die Website`,
      nachher: buchungSchnappschuss(neu),
    })
    // Hinweis für die Bestätigungsseite: Zu der Zeit ist schon etwas eingetragen (ohne Details).
    const ueberschneidung = ueberschneidungen(tx, neu, neu.id).length > 0
    return { ok: true as const, nummer: neu.nummer, datum: neu.von.slice(0, 10), ueberschneidung }
  })
}

// ─── Stand abrufen ───────────────────────────────────────────────────────────

/** Was die Statusseite zeigen darf – bewusst ohne personenbezogene Daten. */
export interface OeffentlicherStand {
  nummer: string
  status: BuchungStatus
  ort: BuchungOrt
  von: string
  bis: string
  rueckmeldung: string | null
  geaendertAm: string
}

export type StandErgebnis = { ok: true; stand: OeffentlicherStand } | { ok: false; meldung: string; gesperrt?: boolean }

const NICHT_GEFUNDEN = 'Dazu haben wir keine Buchung gefunden. Bitte Nummer und Datum prüfen – das Datum ist der Tag, für den du angefragt hast.'

export function standAbrufen(db: Datenbank, nummerEingabe: string | null, datum: string | null, ip: string): StandErgebnis {
  const s = schluessel('buchung-status', ip)
  if (anzahl(db, s, STATUS_FENSTER_MINUTEN) >= STATUS_FEHLVERSUCHE_MAX) {
    return { ok: false, gesperrt: true, meldung: 'Zu viele erfolglose Versuche. Bitte in einer Viertelstunde noch einmal probieren.' }
  }
  const nummer = nummerNormalisieren(nummerEingabe)
  const b = nummer ? db.select().from(schema.buchungen).where(eq(schema.buchungen.nummer, nummer)).get() : undefined
  // Passt das Datum? Jeder Tag der Belegung zählt (auch der letzte Tag einer mehrtägigen).
  const passt = !!b && !!datum && datum >= b.von.slice(0, 10) && `${datum}T00:00` < b.bis
  if (!b || !passt) {
    zaehlen(db, s)
    return { ok: false, meldung: NICHT_GEFUNDEN }
  }
  return {
    ok: true,
    stand: { nummer: b.nummer, status: b.status, ort: b.ort, von: b.von, bis: b.bis, rueckmeldung: b.rueckmeldung, geaendertAm: b.geaendertAm },
  }
}

// ─── Aufräumen ───────────────────────────────────────────────────────────────

/**
 * Löscht Name, E-Mail, Telefon und Nachricht von Buchungen, deren Ende mehr als AUFBEWAHREN_TAGE
 * zurückliegt. Anlass, Zeit und Status bleiben für die Belegungsübersicht stehen.
 * Läuft bei jeder neuen Anfrage und beim Öffnen der Buchungsübersicht in der Verwaltung.
 */
export function personendatenLoeschen(db: Pick<Datenbank, 'update'>, jetzt: Date = new Date()): number {
  const grenze = `${tagPlus(heute(jetzt), -AUFBEWAHREN_TAGE)}T00:00`
  const ergebnis = db
    .update(schema.buchungen)
    .set({ name: null, email: null, telefon: null, nachricht: null, anonymisiertAm: jetzt.toISOString() })
    .where(
      and(
        isNull(schema.buchungen.anonymisiertAm),
        lt(schema.buchungen.bis, grenze),
        or(
          // nur, wenn überhaupt etwas zu löschen ist
          gt(schema.buchungen.name, ''),
          gt(schema.buchungen.email, ''),
          gt(schema.buchungen.telefon, ''),
          gt(schema.buchungen.nachricht, ''),
        ),
      ),
    )
    .run()
  return ergebnis.changes
}
