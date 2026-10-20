/**
 * Speicherlogik der Zugänge als reine Funktionen (ohne Next.js-Abhängigkeiten) –
 * genutzt von den Server-Aktionen und direkt testbar gegen eine Datenbankkopie.
 *
 * Grundregeln:
 *   - Alles hier dürfen nur Admins.
 *   - Es muss immer mindestens ein aktiver Admin übrig bleiben.
 *   - Niemand entzieht sich selbst die Admin-Rechte, deaktiviert oder löscht sich selbst.
 *   - Im Verlauf landen nie Codes, Passwort-Hashes oder App-Geheimnisse – nur Name,
 *     Benutzername, Rechte und Status.
 */

import { and, asc, eq, gt, inArray, isNull, ne, sql } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { benutzernameNormalisieren, zugangZuruecksetzen as anmeldungZuruecksetzen } from '@/lib/verwaltung/anmeldung'
import { MeldungsFehler } from '@/lib/verwaltung/fehlermeldung'
import type { Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'

type Lesend = Pick<Datenbank, 'select'>

const NUR_ADMINS = 'Zugänge können nur Admins verwalten.'
const NICHT_GEFUNDEN = 'Diesen Zugang gibt es nicht mehr. Bitte die Seite neu laden.'
const LETZTER_ADMIN = 'Es muss immer mindestens einen aktiven Admin geben. Bitte zuerst einen anderen Zugang zum Admin machen.'

export interface ZugangEingabe {
  name: string
  /** Anmeldename – wird über benutzernameNormalisieren() geprüft und vereinheitlicht. */
  benutzername: string
  personId: number | null
  istAdmin: boolean
  sparten: number[]
  mannschaften: number[]
  gruppen: number[]
}

function adminPruefen(wer: Rechte) {
  if (!wer.istAdmin) throw new MeldungsFehler(NUR_ADMINS)
}

function eindeutig(ids: number[]): number[] {
  return ids.filter((id, i) => Number.isInteger(id) && ids.indexOf(id) === i)
}

// ─── Lesen ──────────────────────────────────────────────────────────────────

/** Bereiche eines Zugangs als lesbare Texte, z. B. "Sparte Fußball" oder "Fußball · U13". */
export function bereicheText(db: Lesend, zugangId: number): string[] {
  const zeilen = db
    .select({
      sparte: schema.sparten.name,
      mannschaft: schema.mannschaften.name,
      mannschaftSparte: sql<string | null>`(select name from sparten where id = ${schema.mannschaften.sparteId})`,
      gruppe: schema.gruppen.name,
      gruppeSparte: sql<string | null>`(select name from sparten where id = ${schema.gruppen.sparteId})`,
    })
    .from(schema.zugangBereiche)
    .leftJoin(schema.sparten, eq(schema.sparten.id, schema.zugangBereiche.sparteId))
    .leftJoin(schema.mannschaften, eq(schema.mannschaften.id, schema.zugangBereiche.mannschaftId))
    .leftJoin(schema.gruppen, eq(schema.gruppen.id, schema.zugangBereiche.gruppeId))
    .where(eq(schema.zugangBereiche.zugangId, zugangId))
    .all()
  const sparten = zeilen.filter(z => z.sparte).map(z => `Sparte ${z.sparte}`)
  const teams = zeilen
    .filter(z => z.mannschaft || z.gruppe)
    .map(z => (z.mannschaft ? `${z.mannschaftSparte} · ${z.mannschaft}` : `${z.gruppeSparte} · ${z.gruppe} (Gruppe)`))
  return sparten.sort((a, b) => a.localeCompare(b, 'de')).concat(teams.sort((a, b) => a.localeCompare(b, 'de', { numeric: true })))
}

export interface SparteMitTeams {
  id: number
  name: string
  mannschaften: { id: number; name: string }[]
  gruppen: { id: number; name: string }[]
}

/** Alle Sparten mit ihren Mannschaften und Gruppen – für die Auswahl "Darf bearbeiten". */
export function bereichsBaum(db: Lesend): SparteMitTeams[] {
  const sortiert = <T extends { reihenfolge: number; name: string }>(a: T, b: T) =>
    a.reihenfolge - b.reihenfolge || a.name.localeCompare(b.name, 'de', { numeric: true })
  const mannschaften = db.select().from(schema.mannschaften).all().sort(sortiert)
  const gruppen = db.select().from(schema.gruppen).all().sort(sortiert)
  return db
    .select()
    .from(schema.sparten)
    .all()
    .sort(sortiert)
    .map(s => ({
      id: s.id,
      name: s.name,
      mannschaften: mannschaften.filter(m => m.sparteId === s.id).map(m => ({ id: m.id, name: m.name })),
      gruppen: gruppen.filter(g => g.sparteId === s.id).map(g => ({ id: g.id, name: g.name })),
    }))
}

/** Stand eines Zugangs für den Verlauf – ohne Codes, Hashes oder Geräte-Token. */
export function zugangSchnappschuss(db: Lesend, zugangId: number) {
  const z = db.select().from(schema.zugaenge).where(eq(schema.zugaenge.id, zugangId)).get()
  if (!z) return null
  const person = z.personId != null ? db.select({ name: schema.personen.name }).from(schema.personen).where(eq(schema.personen.id, z.personId)).get() : null
  // Bewusst nur ausgewählte Felder: passwortHash und totpGeheimnis landen nie im Verlauf.
  return {
    name: z.name,
    benutzername: z.benutzername,
    eingerichtetAm: z.eingerichtetAm,
    istAdmin: z.istAdmin,
    aktiv: z.aktiv,
    personId: z.personId,
    person: person?.name ?? null,
    bereiche: z.istAdmin ? [] : bereicheText(db, zugangId),
  }
}

/** Anzahl aktiver Admins, optional ohne einen bestimmten Zugang. */
function aktiveAdmins(db: Lesend, ohne?: number): number {
  const bedingung = and(eq(schema.zugaenge.istAdmin, true), eq(schema.zugaenge.aktiv, true), ohne != null ? ne(schema.zugaenge.id, ohne) : undefined)
  return db.select({ n: sql<number>`count(*)` }).from(schema.zugaenge).where(bedingung).get()?.n ?? 0
}

/** Wirft, wenn nach der Änderung kein aktiver Admin mehr übrig wäre. danach = null bedeutet "gelöscht". */
function adminsSichern(db: Lesend, zugangId: number, danach: { istAdmin: boolean; aktiv: boolean } | null) {
  const bleibtAdmin = danach != null && danach.istAdmin && danach.aktiv
  if (!bleibtAdmin && aktiveAdmins(db, zugangId) === 0) throw new MeldungsFehler(LETZTER_ADMIN)
}

/** Ablaufzeitpunkt einer offenen (unbenutzten, gültigen) Einladung – oder null. */
export function offeneEinladung(db: Lesend, zugangId: number): string | null {
  const code = db
    .select({ laeuftAb: schema.anmeldeCodes.laeuftAb })
    .from(schema.anmeldeCodes)
    .where(
      and(
        eq(schema.anmeldeCodes.zugangId, zugangId),
        eq(schema.anmeldeCodes.zweck, 'einladung'),
        isNull(schema.anmeldeCodes.verwendetAm),
        gt(schema.anmeldeCodes.laeuftAb, new Date().toISOString()),
      ),
    )
    .orderBy(asc(schema.anmeldeCodes.laeuftAb))
    .get()
  return code?.laeuftAb ?? null
}

// ─── Eingaben prüfen ────────────────────────────────────────────────────────

function eingabePruefen(db: Lesend, e: ZugangEingabe, ausserId?: number) {
  const name = e.name.trim().replace(/\s+/g, ' ')
  if (!name) throw new MeldungsFehler('Bitte einen Namen eintragen.', { name: 'Bitte einen Namen eintragen.' })
  if (name.length > 80) throw new MeldungsFehler('Der Name ist zu lang.', { name: 'Bitte höchstens 80 Zeichen.' })
  const gleichnamig = db
    .select({ id: schema.zugaenge.id, name: schema.zugaenge.name })
    .from(schema.zugaenge)
    .all()
    .filter(z => z.id !== ausserId && z.name.toLowerCase() === name.toLowerCase())
  if (gleichnamig.length > 0) {
    throw new MeldungsFehler('Einen Zugang mit diesem Namen gibt es schon.', { name: 'Diesen Namen hat schon ein anderer Zugang – bitte z. B. den Nachnamen ergänzen.' })
  }
  const benutzername = benutzernameNormalisieren(e.benutzername ?? '')
  if (!benutzername) {
    throw new MeldungsFehler('Bitte den Benutzernamen prüfen.', {
      benutzername: '2 bis 40 Zeichen: nur Kleinbuchstaben (a–z), Ziffern, Punkt, Bindestrich oder Unterstrich – z. B. „anna.beispiel“.',
    })
  }
  const belegt = db
    .select({ id: schema.zugaenge.id, benutzername: schema.zugaenge.benutzername })
    .from(schema.zugaenge)
    .all()
    .some(z => z.id !== ausserId && (z.benutzername ?? '').toLowerCase() === benutzername)
  if (belegt) {
    throw new MeldungsFehler('Diesen Benutzernamen gibt es schon.', { benutzername: 'Diesen Benutzernamen hat schon ein anderer Zugang – bitte einen anderen wählen.' })
  }
  if (e.personId != null && !db.select({ id: schema.personen.id }).from(schema.personen).where(eq(schema.personen.id, e.personId)).get()) {
    throw new MeldungsFehler('Die ausgewählte Person gibt es nicht mehr. Bitte die Seite neu laden.')
  }

  let sparten: number[] = []
  let mannschaften: number[] = []
  let gruppen: number[] = []
  if (!e.istAdmin) {
    const alleSparten = db.select({ id: schema.sparten.id }).from(schema.sparten).all().map(s => s.id)
    const alleMannschaften = db.select({ id: schema.mannschaften.id, sparteId: schema.mannschaften.sparteId }).from(schema.mannschaften).all()
    const alleGruppen = db.select({ id: schema.gruppen.id, sparteId: schema.gruppen.sparteId }).from(schema.gruppen).all()
    sparten = eindeutig(e.sparten).filter(id => alleSparten.indexOf(id) >= 0)
    // Teams einer ganz ausgewählten Sparte sind schon abgedeckt und werden nicht extra gespeichert.
    mannschaften = eindeutig(e.mannschaften).filter(id => alleMannschaften.some(m => m.id === id && sparten.indexOf(m.sparteId) < 0))
    gruppen = eindeutig(e.gruppen).filter(id => alleGruppen.some(g => g.id === id && sparten.indexOf(g.sparteId) < 0))
    if (sparten.length + mannschaften.length + gruppen.length === 0) {
      throw new MeldungsFehler('Bitte mindestens eine Sparte, Mannschaft oder Gruppe auswählen – oder „Alles (Admin)“.', {
        bereiche: 'Bitte mindestens einen Bereich auswählen.',
      })
    }
  }
  return { name, benutzername, personId: e.personId, istAdmin: e.istAdmin, sparten, mannschaften, gruppen }
}

function bereicheSchreiben(tx: Pick<Datenbank, 'insert' | 'delete'>, zugangId: number, e: { sparten: number[]; mannschaften: number[]; gruppen: number[] }) {
  tx.delete(schema.zugangBereiche).where(eq(schema.zugangBereiche.zugangId, zugangId)).run()
  const zeilen: (typeof schema.zugangBereiche.$inferInsert)[] = []
  e.sparten.forEach(id => zeilen.push({ zugangId, sparteId: id }))
  e.mannschaften.forEach(id => zeilen.push({ zugangId, mannschaftId: id }))
  e.gruppen.forEach(id => zeilen.push({ zugangId, gruppeId: id }))
  if (zeilen.length > 0) tx.insert(schema.zugangBereiche).values(zeilen).run()
}

// ─── Anlegen und ändern ─────────────────────────────────────────────────────

/** Legt einen Zugang samt Bereichen an. Den Einladungs-Code erstellt der Aufrufer danach. */
export function zugangAnlegen(db: Datenbank, wer: Rechte, eingabe: ZugangEingabe): { id: number; name: string; benutzername: string } {
  adminPruefen(wer)
  return db.transaction(tx => {
    const e = eingabePruefen(tx, eingabe)
    const neu = tx
      .insert(schema.zugaenge)
      .values({ name: e.name, benutzername: e.benutzername, istAdmin: e.istAdmin, personId: e.personId, erstelltVon: wer.zugangId })
      .returning()
      .get()
    if (!e.istAdmin) bereicheSchreiben(tx, neu.id, e)
    protokollieren(tx, wer, {
      aktion: 'angelegt',
      objektTyp: 'zugaenge',
      objektId: neu.id,
      bezeichnung: `Zugang ${e.name}${e.istAdmin ? ' (Admin)' : ''}`,
      nachher: zugangSchnappschuss(tx, neu.id),
    })
    return { id: neu.id, name: neu.name, benutzername: e.benutzername }
  })
}

/** Ändert Name, eigene Person und Rechte eines Zugangs. */
export function zugangAendern(db: Datenbank, wer: Rechte, zugangId: number, eingabe: ZugangEingabe): { geaendert: boolean } {
  adminPruefen(wer)
  return db.transaction(tx => {
    const vorher = zugangSchnappschuss(tx, zugangId)
    if (!vorher) throw new MeldungsFehler(NICHT_GEFUNDEN)
    if (zugangId === wer.zugangId && !eingabe.istAdmin) throw new MeldungsFehler('Du kannst dir nicht selbst die Admin-Rechte entziehen.')
    const e = eingabePruefen(tx, eingabe, zugangId)
    if (vorher.istAdmin && !e.istAdmin) adminsSichern(tx, zugangId, { istAdmin: false, aktiv: vorher.aktiv })

    tx.update(schema.zugaenge)
      .set({ name: e.name, benutzername: e.benutzername, istAdmin: e.istAdmin, personId: e.personId })
      .where(eq(schema.zugaenge.id, zugangId))
      .run()
    // Admins brauchen keine Bereiche – alte Einträge werden aufgeräumt.
    bereicheSchreiben(tx, zugangId, e.istAdmin ? { sparten: [], mannschaften: [], gruppen: [] } : e)

    const nachher = zugangSchnappschuss(tx, zugangId)
    if (JSON.stringify(nachher) === JSON.stringify(vorher)) return { geaendert: false }
    protokollieren(tx, wer, { aktion: 'geaendert', objektTyp: 'zugaenge', objektId: zugangId, bezeichnung: `Zugang ${e.name}`, vorher, nachher })
    return { geaendert: true }
  })
}

// ─── Aktivieren, deaktivieren, löschen ──────────────────────────────────────

/**
 * Aktiviert oder deaktiviert einen Zugang. Beim Deaktivieren werden alle Geräte abgemeldet
 * und offene Anmelde-Codes gelöscht – der Zugang ist damit sofort überall ausgesperrt.
 */
export function zugangAktivSetzen(db: Datenbank, wer: Rechte, zugangId: number, aktiv: boolean): { geaendert: boolean } {
  adminPruefen(wer)
  return db.transaction(tx => {
    const vorher = zugangSchnappschuss(tx, zugangId)
    if (!vorher) throw new MeldungsFehler(NICHT_GEFUNDEN)
    if (!aktiv && zugangId === wer.zugangId) throw new MeldungsFehler('Du kannst deinen eigenen Zugang nicht deaktivieren.')
    if (vorher.aktiv === aktiv) return { geaendert: false }
    if (!aktiv) adminsSichern(tx, zugangId, { istAdmin: vorher.istAdmin, aktiv: false })

    tx.update(schema.zugaenge).set({ aktiv }).where(eq(schema.zugaenge.id, zugangId)).run()
    let geraete = 0
    if (!aktiv) {
      geraete = tx.delete(schema.geraete).where(eq(schema.geraete.zugangId, zugangId)).run().changes
      tx.delete(schema.anmeldeCodes).where(and(eq(schema.anmeldeCodes.zugangId, zugangId), isNull(schema.anmeldeCodes.verwendetAm))).run()
    }
    protokollieren(tx, wer, {
      aktion: 'geaendert',
      objektTyp: 'zugaenge',
      objektId: zugangId,
      bezeichnung: aktiv ? `Zugang ${vorher.name} wieder aktiviert` : `Zugang ${vorher.name} deaktiviert${geraete > 0 ? ` (${geraete} ${geraete === 1 ? 'Gerät' : 'Geräte'} abgemeldet)` : ''}`,
      vorher: { aktiv: vorher.aktiv },
      nachher: { aktiv },
    })
    return { geaendert: true }
  })
}

/** Löscht einen Zugang samt Bereichen, Geräten und Codes. Der Verlauf bleibt (mit Namen) erhalten. */
export function zugangLoeschen(db: Datenbank, wer: Rechte, zugangId: number): { name: string } {
  adminPruefen(wer)
  return db.transaction(tx => {
    const vorher = zugangSchnappschuss(tx, zugangId)
    if (!vorher) throw new MeldungsFehler(NICHT_GEFUNDEN)
    if (zugangId === wer.zugangId) throw new MeldungsFehler('Du kannst deinen eigenen Zugang nicht löschen.')
    adminsSichern(tx, zugangId, null)
    tx.delete(schema.zugaenge).where(eq(schema.zugaenge.id, zugangId)).run()
    protokollieren(tx, wer, { aktion: 'geloescht', objektTyp: 'zugaenge', objektId: zugangId, bezeichnung: `Zugang ${vorher.name}`, vorher })
    return { name: vorher.name }
  })
}

// ─── Zurücksetzen ───────────────────────────────────────────────────────────

/**
 * Setzt Passwort und App-Kopplung zurück (alle Geräte abgemeldet, offene Codes gelöscht).
 * Danach braucht der Zugang einen neuen Einladungs-Code – den erstellt der Aufrufer.
 * Sich selbst zurückzusetzen ist erlaubt (man wird dabei abgemeldet).
 */
export function zugangZuruecksetzen(db: Datenbank, wer: Rechte, zugangId: number): { id: number; name: string; warEingerichtet: boolean } {
  adminPruefen(wer)
  return db.transaction(tx => {
    const zugang = tx.select().from(schema.zugaenge).where(eq(schema.zugaenge.id, zugangId)).get()
    if (!zugang) throw new MeldungsFehler(NICHT_GEFUNDEN)
    if (!zugang.aktiv) throw new MeldungsFehler('Der Zugang ist deaktiviert. Bitte zuerst wieder aktivieren.')
    const warEingerichtet = zugang.eingerichtetAm != null
    anmeldungZuruecksetzen(tx, zugangId)
    // Nur der Zeitpunkt der Einrichtung – nie Passwort-Hash oder App-Geheimnis.
    protokollieren(tx, wer, {
      aktion: 'geaendert',
      objektTyp: 'zugaenge',
      objektId: zugangId,
      bezeichnung: warEingerichtet
        ? `Zugang ${zugang.name} zurückgesetzt (Passwort & App neu einrichten, neuer Einladungs-Code)`
        : `Zugang ${zugang.name}: neuer Einladungs-Code`,
      vorher: warEingerichtet ? { eingerichtetAm: zugang.eingerichtetAm } : null,
      nachher: warEingerichtet ? { eingerichtetAm: null } : null,
    })
    return { id: zugang.id, name: zugang.name, warEingerichtet }
  })
}

// ─── Geräte ─────────────────────────────────────────────────────────────────

/**
 * Meldet Geräte eines Zugangs ab: ein bestimmtes oder alle. `ausser` schützt das Gerät,
 * an dem gerade gearbeitet wird (wenn Admins ihren eigenen Zugang bearbeiten).
 */
export function geraeteAbmelden(
  db: Datenbank,
  wer: Rechte,
  zugangId: number,
  auswahl: { geraetId: number } | { alle: true },
  ausser?: number,
): number {
  adminPruefen(wer)
  return db.transaction(tx => {
    const zugang = tx.select({ name: schema.zugaenge.name }).from(schema.zugaenge).where(eq(schema.zugaenge.id, zugangId)).get()
    if (!zugang) throw new MeldungsFehler(NICHT_GEFUNDEN)
    const geraete = tx
      .select({ id: schema.geraete.id, name: schema.geraete.name })
      .from(schema.geraete)
      .where(eq(schema.geraete.zugangId, zugangId))
      .all()
      .filter(g => g.id !== ausser && ('alle' in auswahl || g.id === auswahl.geraetId))
    if (geraete.length === 0) return 0
    tx.delete(schema.geraete)
      .where(
        inArray(
          schema.geraete.id,
          geraete.map(g => g.id),
        ),
      )
      .run()
    protokollieren(tx, wer, {
      aktion: 'abmeldung',
      objektTyp: 'geraete',
      objektId: geraete.length === 1 ? geraete[0].id : null,
      bezeichnung:
        geraete.length === 1
          ? `${zugang.name}: ${geraete[0].name} (durch Admin abgemeldet)`
          : `${zugang.name}: ${geraete.length} Geräte (durch Admin abgemeldet)`,
    })
    return geraete.length
  })
}
