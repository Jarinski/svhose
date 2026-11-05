/**
 * lib/verwaltung/inhalte/buchungen.ts
 *
 * Buchungen und Regelbelegung von Vereinsheim und Gelände in der Verwaltung – als reine
 * Funktionen (Datenbank und Rechte werden übergeben, siehe news.ts und termine.ts).
 *
 * Bearbeiten dürfen Admins und Zugänge mit Buchungs-Recht (darfBuchungen). Überschneidungen sind
 * erlaubt (z. B. Elternabend neben dem Dart-Training) – gespeichert wird trotzdem, die Meldung
 * weist aber darauf hin. Im Verlauf landen nie Name, E-Mail, Telefon oder Nachricht.
 */

import { and, count, eq, inArray, isNull, or } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { neueNummer } from '@/lib/buchungen/anfrage'
import { ueberschneidungen } from '@/lib/buchungen/belegung'
import { buchungSchnappschuss } from '@/lib/buchungen/schnappschuss'
import {
  datumText,
  istArt,
  istDatum,
  istOrt,
  istStatus,
  istUhrzeit,
  STATUS_NAMEN,
  WOCHENTAGE_LANG,
  zeitraumAus,
  type BuchungArt,
  type BuchungOrt,
  OFFENE_STATUS,
  type BuchungStatus,
} from '@/lib/buchungen/zeit'
import { darfBuchungen, type Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { abgelehnt, datenbankFehler, FELDER_PRUEFEN, KEINE_RECHTE, KONFLIKT, type SpeicherErgebnis } from './gemeinsam'

type Buchung = typeof schema.buchungen.$inferSelect
type Regel = typeof schema.belegungRegeln.$inferSelect

const LAENGEN = { titel: 150, bereich: 150, name: 150, email: 200, telefon: 50, nachricht: 3000, rueckmeldung: 2000, notiz: 3000 } as const

function laengePruefen(felder: Record<string, string>, werte: Partial<Record<keyof typeof LAENGEN, string | null>>) {
  for (const feld of Object.keys(LAENGEN) as (keyof typeof LAENGEN)[]) {
    const wert = werte[feld]
    if (typeof wert === 'string' && wert.length > LAENGEN[feld]) felder[feld] = `Bitte kürzer fassen (höchstens ${LAENGEN[feld]} Zeichen).`
  }
}

/** Kurzbeschreibung für Verlauf und Meldungen, z. B. "Buchung K7M2-Q9XD: Elternabend U11 (12.11.2026)". */
export function buchungBezeichnung(b: Pick<Buchung, 'nummer' | 'titel' | 'von'>): string {
  return `Buchung ${b.nummer}: ${b.titel} (${datumText(b.von.slice(0, 10))})`
}

/** Hinweis auf Überschneidungen für die Meldung nach dem Speichern. */
function ueberschneidungsHinweis(db: Pick<Datenbank, 'select'>, b: Pick<Buchung, 'id' | 'von' | 'bis' | 'ort' | 'status'>): string {
  if (b.status === 'abgelehnt' || b.status === 'storniert') return ''
  const treffer = ueberschneidungen(db, b, b.id)
  if (treffer.length === 0) return ''
  const namen = treffer.slice(0, 3).map(t => `„${t.titel}“`)
  const rest = treffer.length > 3 ? ` und ${treffer.length - 3} weitere` : ''
  return ` Achtung: Überschneidet sich mit ${namen.join(', ')}${rest}.`
}

// ─── Buchungen ───────────────────────────────────────────────────────────────

/** Anzahl der Anfragen, die noch bearbeitet werden müssen (angefragt oder Rückfrage). */
export function offeneAnfragen(db: Pick<Datenbank, 'select'>): number {
  return (
    db
      .select({ n: count() })
      .from(schema.buchungen)
      .where(inArray(schema.buchungen.status, OFFENE_STATUS as BuchungStatus[]))
      .get()?.n ?? 0
  )
}

/** Für die Zahl im Menü: offene Anfragen, ungelesene Mails zu Buchungen und Mails ohne Buchung. */
export function buchungenZuTun(db: Pick<Datenbank, 'select'>): number {
  const ungelesen = db
    .select({ n: count() })
    .from(schema.buchungNachrichten)
    .where(
      and(
        eq(schema.buchungNachrichten.richtung, 'eingang'),
        or(isNull(schema.buchungNachrichten.buchungId), isNull(schema.buchungNachrichten.gelesenAm)),
      ),
    )
    .get()?.n ?? 0
  return offeneAnfragen(db) + ungelesen
}

export interface BuchungEingabe {
  /** null = neue Belegung anlegen */
  id: number | null
  /** geaendertAm beim Öffnen des Formulars (optimistische Sperre) */
  stand: string | null
  art: string | null
  ort: string | null
  status: string | null
  titel: string | null
  datum: string | null
  beginn: string | null
  ende: string | null
  bisDatum: string | null
  ganztaegig: boolean
  personenzahl: string | null
  bereich: string | null
  name: string | null
  email: string | null
  telefon: string | null
  nachricht: string | null
  rueckmeldung: string | null
  notiz: string | null
}

export type BuchungsErgebnis = (SpeicherErgebnis & { ok: false }) | { ok: true; id: number; stand: string; meldung: string }

/** Prüft die Eingaben und liefert die Spalten (ohne Nummer, Quelle und Stand). */
export function buchungPruefen(e: BuchungEingabe): { felder: Record<string, string> } | { werte: Omit<typeof schema.buchungen.$inferInsert, 'nummer' | 'quelle'> } {
  const felder: Record<string, string> = {}
  if (!istArt(e.art)) felder.art = 'Bitte auswählen, wer bucht.'
  if (!istOrt(e.ort)) felder.ort = 'Bitte den Ort wählen.'
  if (!istStatus(e.status)) felder.status = 'Bitte einen Status wählen.'
  if (!e.titel) felder.titel = 'Bitte den Anlass eintragen.'
  if (e.art !== 'verein' && !e.name) felder.name = 'Bitte einen Namen eintragen – bei Belegungen des Vereins selbst darf er fehlen.'
  if (e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) felder.email = 'Diese E-Mail-Adresse sieht nicht richtig aus.'
  laengePruefen(felder, e)
  let personenzahl: number | null = null
  if (e.personenzahl) {
    personenzahl = Number(e.personenzahl)
    if (!Number.isInteger(personenzahl) || personenzahl < 1 || personenzahl > 5000) felder.personenzahl = 'Bitte eine ganze Zahl eintragen.'
  }
  const z = zeitraumAus(e)
  if ('felder' in z) Object.assign(felder, z.felder)
  if (Object.keys(felder).length > 0 || 'felder' in z) return { felder }
  return {
    werte: {
      art: e.art as BuchungArt,
      ort: e.ort as BuchungOrt,
      status: e.status as BuchungStatus,
      titel: e.titel as string,
      von: z.zeitraum.von,
      bis: z.zeitraum.bis,
      personenzahl,
      bereich: e.bereich,
      name: e.name,
      email: e.email,
      telefon: e.telefon,
      nachricht: e.nachricht,
      rueckmeldung: e.rueckmeldung,
      notiz: e.notiz,
    },
  }
}

export function buchungSpeichern(db: Datenbank, rechte: Rechte, e: BuchungEingabe): BuchungsErgebnis {
  if (!darfBuchungen(rechte)) return { ok: false, meldung: KEINE_RECHTE }
  const geprueft = buchungPruefen(e)
  if ('felder' in geprueft) return { ok: false, meldung: FELDER_PRUEFEN, felder: geprueft.felder }

  try {
    return db.transaction((tx): BuchungsErgebnis => {
      if (e.id == null) {
        const neu = tx
          .insert(schema.buchungen)
          .values({ ...geprueft.werte, nummer: neueNummer(tx), quelle: 'verwaltung' })
          .returning()
          .get()
        protokollieren(tx, rechte, { aktion: 'angelegt', objektTyp: 'buchungen', objektId: neu.id, bezeichnung: buchungBezeichnung(neu), nachher: buchungSchnappschuss(neu) })
        return { ok: true, id: neu.id, stand: neu.geaendertAm, meldung: `Gespeichert – Buchungsnummer ${neu.nummer}.${ueberschneidungsHinweis(tx, neu)}` }
      }

      const alt = tx.select().from(schema.buchungen).where(eq(schema.buchungen.id, e.id)).get()
      if (!alt) return { ok: false, meldung: 'Diese Buchung gibt es nicht mehr – vielleicht wurde sie gerade gelöscht.' }
      if (alt.geaendertAm !== e.stand) return { ok: false, meldung: KONFLIKT }
      // Nach dem Löschen der Kontaktdaten (ein Jahr nach der Belegung) bleiben die Felder leer.
      const werte = alt.anonymisiertAm ? { ...geprueft.werte, name: null, email: null, telefon: null, nachricht: null } : geprueft.werte
      const neu = tx.update(schema.buchungen).set(werte).where(eq(schema.buchungen.id, alt.id)).returning().get()
      const vorher = buchungSchnappschuss(alt)
      const nachher = buchungSchnappschuss(neu)
      const nurKontakt = JSON.stringify(vorher) === JSON.stringify(nachher)
      protokollieren(tx, rechte, {
        aktion: 'geaendert',
        objektTyp: 'buchungen',
        objektId: neu.id,
        bezeichnung: alt.status !== neu.status ? `${buchungBezeichnung(neu)} – ${STATUS_NAMEN[neu.status]}` : buchungBezeichnung(neu),
        vorher: nurKontakt ? { kontaktdaten: 'geändert' } : vorher,
        nachher: nurKontakt ? { kontaktdaten: 'geändert' } : nachher,
      })
      const statusText = alt.status !== neu.status ? ` Status: ${STATUS_NAMEN[neu.status]}.` : ''
      return { ok: true, id: neu.id, stand: neu.geaendertAm, meldung: `Gespeichert.${statusText}${ueberschneidungsHinweis(tx, neu)}` }
    })
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return ergebnis.ok ? { ok: false, meldung: 'Speichern hat nicht geklappt.' } : ergebnis
  }
}

export function buchungLoeschen(db: Datenbank, rechte: Rechte, id: number): { ok: true } | { ok: false; meldung: string } {
  if (!darfBuchungen(rechte)) return { ok: false, meldung: KEINE_RECHTE }
  try {
    db.transaction(tx => {
      const alt = tx.select().from(schema.buchungen).where(eq(schema.buchungen.id, id)).get()
      if (!alt) return
      tx.delete(schema.buchungen).where(eq(schema.buchungen.id, id)).run()
      protokollieren(tx, rechte, { aktion: 'geloescht', objektTyp: 'buchungen', objektId: id, bezeichnung: buchungBezeichnung(alt), vorher: buchungSchnappschuss(alt) })
    })
    return { ok: true }
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return { ok: false, meldung: ergebnis.ok ? 'Löschen hat nicht geklappt.' : ergebnis.meldung }
  }
}

// ─── Regelbelegung ───────────────────────────────────────────────────────────

export interface RegelEingabe {
  id: number | null
  stand: string | null
  titel: string | null
  ort: string | null
  wochentag: number | null
  beginn: string | null
  ende: string | null
  ganztaegig: boolean
  gueltigAb: string | null
  gueltigBis: string | null
  hinweis: string | null
}

export function regelBezeichnung(r: Pick<Regel, 'titel' | 'wochentag'>): string {
  return `Regelbelegung: ${r.titel} (${WOCHENTAGE_LANG[r.wochentag - 1] ?? '?'})`
}

export function regelPruefen(e: RegelEingabe): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!e.titel) felder.titel = 'Bitte eintragen, was stattfindet.'
  else if (e.titel.length > 100) felder.titel = 'Bitte kürzer fassen (höchstens 100 Zeichen).'
  if (!istOrt(e.ort)) felder.ort = 'Bitte den Ort wählen.'
  if (e.wochentag == null || e.wochentag < 1 || e.wochentag > 7) felder.wochentag = 'Bitte einen Wochentag wählen.'
  if (!e.ganztaegig) {
    if (!istUhrzeit(e.beginn)) felder.beginn = 'Bitte eine Uhrzeit eintragen.'
    if (!istUhrzeit(e.ende)) felder.ende = 'Bitte eine Uhrzeit eintragen.'
  }
  if (e.gueltigAb && !istDatum(e.gueltigAb)) felder.gueltigAb = 'Bitte ein gültiges Datum wählen.'
  if (e.gueltigBis && !istDatum(e.gueltigBis)) felder.gueltigBis = 'Bitte ein gültiges Datum wählen.'
  else if (e.gueltigAb && e.gueltigBis && e.gueltigBis < e.gueltigAb) felder.gueltigBis = 'Das Ende liegt vor dem Beginn.'
  if (e.hinweis && e.hinweis.length > 300) felder.hinweis = 'Bitte kürzer fassen (höchstens 300 Zeichen).'
  return felder
}

export function regelSpeichern(db: Datenbank, rechte: Rechte, e: RegelEingabe): SpeicherErgebnis {
  if (!darfBuchungen(rechte)) return abgelehnt(KEINE_RECHTE)
  const felder = regelPruefen(e)
  if (Object.keys(felder).length > 0) return abgelehnt(FELDER_PRUEFEN, felder)
  const werte = {
    titel: e.titel as string,
    ort: e.ort as BuchungOrt,
    wochentag: e.wochentag as number,
    // Ganztägig = 00:00 bis 00:00 des Folgetags
    beginn: e.ganztaegig ? '00:00' : (e.beginn as string),
    ende: e.ganztaegig ? '00:00' : (e.ende as string),
    gueltigAb: e.gueltigAb,
    gueltigBis: e.gueltigBis,
    hinweis: e.hinweis,
  }
  try {
    return db.transaction((tx): SpeicherErgebnis => {
      if (e.id == null) {
        const neu = tx.insert(schema.belegungRegeln).values(werte).returning().get()
        protokollieren(tx, rechte, { aktion: 'angelegt', objektTyp: 'belegung_regeln', objektId: neu.id, bezeichnung: regelBezeichnung(neu), nachher: neu })
        return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: null }
      }
      const alt = tx.select().from(schema.belegungRegeln).where(eq(schema.belegungRegeln.id, e.id)).get()
      if (!alt) return abgelehnt('Diesen Eintrag gibt es nicht mehr – vielleicht wurde er gerade gelöscht.')
      if (alt.geaendertAm !== e.stand) return abgelehnt(KONFLIKT)
      const neu = tx.update(schema.belegungRegeln).set(werte).where(eq(schema.belegungRegeln.id, alt.id)).returning().get()
      protokollieren(tx, rechte, { aktion: 'geaendert', objektTyp: 'belegung_regeln', objektId: neu.id, bezeichnung: regelBezeichnung(neu), vorher: alt, nachher: neu })
      return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: null }
    })
  } catch (fehler) {
    return datenbankFehler(fehler)
  }
}

export function regelLoeschen(db: Datenbank, rechte: Rechte, id: number): { ok: true } | { ok: false; meldung: string } {
  if (!darfBuchungen(rechte)) return { ok: false, meldung: KEINE_RECHTE }
  try {
    db.transaction(tx => {
      const alt = tx.select().from(schema.belegungRegeln).where(eq(schema.belegungRegeln.id, id)).get()
      if (!alt) return
      tx.delete(schema.belegungRegeln).where(eq(schema.belegungRegeln.id, id)).run()
      protokollieren(tx, rechte, { aktion: 'geloescht', objektTyp: 'belegung_regeln', objektId: id, bezeichnung: regelBezeichnung(alt), vorher: alt })
    })
    return { ok: true }
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return { ok: false, meldung: ergebnis.ok ? 'Löschen hat nicht geklappt.' : ergebnis.meldung }
  }
}

/** Regelbelegung an einem Tag ausfallen lassen – oder wieder stattfinden lassen. */
export function ausfallSetzen(db: Datenbank, rechte: Rechte, regelId: number, datum: string, ausgefallen: boolean): { ok: true } | { ok: false; meldung: string } {
  if (!darfBuchungen(rechte)) return { ok: false, meldung: KEINE_RECHTE }
  if (!istDatum(datum)) return { ok: false, meldung: 'Ungültiges Datum.' }
  try {
    db.transaction(tx => {
      const regel = tx.select().from(schema.belegungRegeln).where(eq(schema.belegungRegeln.id, regelId)).get()
      if (!regel) return
      const bedingung = and(eq(schema.belegungAusfaelle.regelId, regelId), eq(schema.belegungAusfaelle.datum, datum))
      const vorhanden = !!tx.select().from(schema.belegungAusfaelle).where(bedingung).get()
      if (vorhanden === ausgefallen) return
      if (ausgefallen) tx.insert(schema.belegungAusfaelle).values({ regelId, datum }).run()
      else tx.delete(schema.belegungAusfaelle).where(bedingung).run()
      protokollieren(tx, rechte, {
        aktion: 'geaendert',
        objektTyp: 'belegung_regeln',
        objektId: regelId,
        bezeichnung: `${regelBezeichnung(regel)}: ${ausgefallen ? 'fällt' : 'findet'} am ${datumText(datum)} ${ausgefallen ? 'aus' : 'wieder statt'}`,
        vorher: { datum, ausgefallen: !ausgefallen },
        nachher: { datum, ausgefallen },
      })
    })
    return { ok: true }
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return { ok: false, meldung: ergebnis.ok ? 'Das hat nicht geklappt.' : ergebnis.meldung }
  }
}
