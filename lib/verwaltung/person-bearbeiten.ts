/**
 * lib/verwaltung/person-bearbeiten.ts
 *
 * Personen in der Verwaltung: wo eine Person vorkommt (Verwendung), Prüfen der Kontaktangaben,
 * Anlegen, Speichern und Löschen. Bewusst ohne Next.js-Abhängigkeiten, damit sich die Logik in
 * Skripten testen (und später über API/Bot nutzen) lässt. Sitzung, Weiterleitung und
 * Cache-Erneuerung übernehmen die Server-Aktionen in app/verwaltung/(intern)/personen/aktionen.ts.
 */

import { eq, inArray } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { erfolg, fehler, type FormErgebnis } from './formular'
import { bildSpeichern, medienFreigeben, UploadFehler } from './medien-upload'
import {
  datenbankFehlerMeldung,
  emailGueltig,
  feldFehlerMeldung,
  KONFLIKT_MELDUNG,
  KonfliktFehler,
  nurZiffern,
  textWert,
} from './pruefhilfen'
import { bearbeitbareTeams, kannGruppe, kannMannschaft, kannPerson, kannSparte, type Rechte } from './rechte'
import { protokollieren } from './verlauf'

/** Datenbank oder laufende Transaktion. */
export type DbZugriff = Pick<Datenbank, 'select' | 'insert' | 'update' | 'delete'>

type PersonZeile = typeof schema.personen.$inferSelect

// ─── Verwendung: Wo kommt eine Person vor? ──────────────────────────────────

export interface Verwendung {
  art: 'mannschaft' | 'gruppe' | 'sparte' | 'funktion' | 'zugang'
  /** Lesbar, z. B. "Trainer:in bei U13 (Fußball)" oder "Kontaktseite: Kassenwart". */
  text: string
  /** Seite in der Verwaltung, auf der sich die Verwendung ändern lässt. */
  href: string | null
  /** Erscheint die Person dadurch auf der Website? */
  oeffentlich: boolean
  /** Mannschaft, Gruppe, Sparte bzw. Zugang, um den es geht (für Rechteprüfung der Links). */
  bezugId: number | null
  /** Sparte der Mannschaft/Gruppe bzw. die Sparte selbst. */
  sparteId: number | null
}

function nachName(a: string, b: string): number {
  return a.localeCompare(b, 'de', { numeric: true })
}

/** Alle Verwendungen aller Personen, je Person sortiert (Mannschaften, Gruppen, Sparten, Kontaktseite, Zugang). */
export function verwendungenLaden(db: DbZugriff): Map<number, Verwendung[]> {
  const ergebnis = new Map<number, Verwendung[]>()
  const hinzu = (personId: number, v: Verwendung) => {
    const liste = ergebnis.get(personId)
    if (liste) liste.push(v)
    else ergebnis.set(personId, [v])
  }

  const sparten = db.select({ id: schema.sparten.id, name: schema.sparten.name }).from(schema.sparten).all()
  const spartenName = new Map(sparten.map(s => [s.id, s.name] as const))
  const sparteVon = (id: number | null) => (id == null ? '' : (spartenName.get(id) ?? ''))

  const teamSortierung = (
    a: { sparteId: number; reihenfolge: number; team: string },
    b: { sparteId: number; reihenfolge: number; team: string },
  ) => nachName(sparteVon(a.sparteId), sparteVon(b.sparteId)) || a.reihenfolge - b.reihenfolge || nachName(a.team, b.team)

  const mp = schema.mannschaftPersonen
  const m = schema.mannschaften
  db.select({ personId: mp.personId, rolle: mp.rolle, teamId: m.id, team: m.name, sparteId: m.sparteId, reihenfolge: m.reihenfolge })
    .from(mp)
    .innerJoin(m, eq(m.id, mp.mannschaftId))
    .all()
    .sort(teamSortierung)
    .forEach(z =>
      hinzu(z.personId, {
        art: 'mannschaft',
        text: `${z.rolle} bei ${z.team} (${sparteVon(z.sparteId)})`,
        href: `/verwaltung/teams/mannschaft/${z.teamId}`,
        oeffentlich: true,
        bezugId: z.teamId,
        sparteId: z.sparteId,
      }),
    )

  const gp = schema.gruppePersonen
  const g = schema.gruppen
  db.select({ personId: gp.personId, rolle: gp.rolle, teamId: g.id, team: g.name, sparteId: g.sparteId, reihenfolge: g.reihenfolge })
    .from(gp)
    .innerJoin(g, eq(g.id, gp.gruppeId))
    .all()
    .sort(teamSortierung)
    .forEach(z =>
      hinzu(z.personId, {
        art: 'gruppe',
        text: `${z.rolle} bei ${z.team} (${sparteVon(z.sparteId)})`,
        href: `/verwaltung/teams/gruppe/${z.teamId}`,
        oeffentlich: true,
        bezugId: z.teamId,
        sparteId: z.sparteId,
      }),
    )

  db.select()
    .from(schema.sparteAnsprechpartner)
    .all()
    .sort((a, b) => nachName(sparteVon(a.sparteId), sparteVon(b.sparteId)))
    .forEach(z =>
      hinzu(z.personId, {
        art: 'sparte',
        text: `${z.rolle} der Sparte ${sparteVon(z.sparteId)}`,
        href: `/verwaltung/sparten/${z.sparteId}`,
        oeffentlich: true,
        bezugId: z.sparteId,
        sparteId: z.sparteId,
      }),
    )

  db.select()
    .from(schema.funktionen)
    .all()
    .sort((a, b) => a.reihenfolge - b.reihenfolge || nachName(a.bezeichnung, b.bezeichnung))
    .forEach(f =>
      hinzu(f.personId, { art: 'funktion', text: `Kontaktseite: ${f.bezeichnung}`, href: '/verwaltung/kontakte', oeffentlich: true, bezugId: f.id, sparteId: f.sparteId }),
    )

  db.select({ id: schema.zugaenge.id, personId: schema.zugaenge.personId, name: schema.zugaenge.name })
    .from(schema.zugaenge)
    .all()
    .forEach(z => {
      if (z.personId == null) return
      hinzu(z.personId, { art: 'zugang', text: `Zugang zur Verwaltung („${z.name}“)`, href: '/verwaltung/zugaenge', oeffentlich: false, bezugId: z.id, sparteId: null })
    })

  return ergebnis
}

/** Darf der Zugang die Seite öffnen, auf die eine Verwendung verlinkt? */
export function verwendungVerlinkbar(rechte: Rechte, v: Verwendung): boolean {
  if (rechte.istAdmin) return v.href != null
  if ((v.art === 'mannschaft' || v.art === 'gruppe') && v.bezugId != null && v.sparteId != null) {
    const team = { id: v.bezugId, sparteId: v.sparteId }
    return v.art === 'mannschaft' ? kannMannschaft(rechte, team) : kannGruppe(rechte, team)
  }
  if (v.art === 'sparte') return kannSparte(rechte, v.sparteId)
  return false
}

/** Verwendungen, die ein Zugang sehen soll: Zugänge zur Verwaltung nur für Admins. */
export function sichtbareVerwendungen(liste: Verwendung[] | undefined, rechte: Pick<Rechte, 'istAdmin'>): Verwendung[] {
  return (liste ?? []).filter(v => v.art !== 'zugang' || rechte.istAdmin)
}

// ─── Listen ─────────────────────────────────────────────────────────────────

export interface PersonListenEintrag {
  id: number
  name: string
  telefon: string | null
  email: string | null
  foto: string | null
  verwendung: Verwendung[]
}

/** Alle Personen, die der Zugang bearbeiten darf (Admins: alle), nach Name sortiert. */
export function personenListe(db: Datenbank, rechte: Rechte): PersonListenEintrag[] {
  const verwendungen = verwendungenLaden(db)
  return db
    .select()
    .from(schema.personen)
    .all()
    .filter(p => rechte.istAdmin || kannPerson(db, rechte, p.id))
    .sort((a, b) => nachName(a.name, b.name))
    .map(p => ({
      id: p.id,
      name: p.name,
      telefon: p.telefon,
      email: p.email,
      foto: p.foto,
      verwendung: sichtbareVerwendungen(verwendungen.get(p.id), rechte),
    }))
}

/** Für die Personensuche im Trainerteam: alle Personen (ohne interne Notiz), mit Verwendung als Text. */
export interface AuswahlPerson {
  id: number
  name: string
  telefon: string | null
  email: string | null
  verwendung: string[]
}

/**
 * Alle Personen für die Auswahl im Trainerteam. Kontaktdaten gibt es nur für Personen, die der
 * Zugang selbst bearbeiten darf oder die schon im geöffneten Team stehen – für alle anderen
 * reichen Name und Verwendung zum Wiedererkennen.
 */
export function personenFuerAuswahl(db: DbZugriff, rechte: Rechte, imTeam: number[] = []): AuswahlPerson[] {
  const verwendungen = verwendungenLaden(db)
  return db
    .select({ id: schema.personen.id, name: schema.personen.name, telefon: schema.personen.telefon, email: schema.personen.email })
    .from(schema.personen)
    .all()
    .sort((a, b) => nachName(a.name, b.name))
    .map(p => ({
      ...p,
      ...(imTeam.indexOf(p.id) >= 0 || kannPerson(db, rechte, p.id) ? {} : { telefon: null, email: null }),
      verwendung: (verwendungen.get(p.id) ?? []).filter(v => v.art !== 'zugang').map(v => v.text),
    }))
}

// ─── Prüfen ─────────────────────────────────────────────────────────────────

export interface PersonDaten {
  name: string
  email: string | null
  telefon: string | null
  whatsapp: string | null
  notiz: string | null
}

const MAX = { name: 100, email: 200, telefon: 50, notiz: 2000 }

/**
 * Prüft Kontaktangaben einer Person. Feldfehler bekommen das Präfix (z. B. "trainer.2.") und
 * die Meldungen den Zeilentext (z. B. "Person 3: "), damit klar ist, wo es hakt.
 */
export function kontaktPruefen(roh: Record<string, unknown>, praefix = '', zeile = ''): { daten: PersonDaten; felder: Record<string, string> } {
  const felder: Record<string, string> = {}
  const name = textWert(roh.name) ?? ''
  const email = textWert(roh.email)
  const telefon = textWert(roh.telefon)
  let whatsapp = textWert(roh.whatsapp)
  const notiz = textWert(roh.notiz)

  if (!name) felder[praefix + 'name'] = `${zeile}Bitte einen Namen eintragen.`
  else if (name.length > MAX.name) felder[praefix + 'name'] = `${zeile}Der Name ist zu lang (höchstens ${MAX.name} Zeichen).`

  if (email && (email.length > MAX.email || !emailGueltig(email))) {
    felder[praefix + 'email'] = `${zeile}Bitte eine gültige E-Mail-Adresse eintragen, z. B. name@beispiel.de.`
  }
  if (telefon && (telefon.length > MAX.telefon || nurZiffern(telefon).length < 3)) {
    felder[praefix + 'telefon'] = `${zeile}Bitte eine Telefonnummer mit Ziffern eintragen, z. B. 0171 1234567.`
  }
  if (whatsapp && (whatsapp.length > MAX.telefon || nurZiffern(whatsapp).length < 3)) {
    felder[praefix + 'whatsapp'] = `${zeile}Bitte eine WhatsApp-Nummer mit Ziffern eintragen, z. B. 0171 1234567.`
  }
  // WhatsApp nur speichern, wenn die Nummer wirklich von der Telefonnummer abweicht.
  if (whatsapp && telefon && nurZiffern(whatsapp) === nurZiffern(telefon)) whatsapp = null
  if (notiz && notiz.length > MAX.notiz) felder[praefix + 'notiz'] = `${zeile}Die Notiz ist zu lang (höchstens ${MAX.notiz} Zeichen).`

  return { daten: { name, email, telefon, whatsapp, notiz }, felder }
}

/** Stand einer Person für das Änderungsprotokoll (ohne Zeitstempel). */
function personSchnappschuss(p: PersonZeile) {
  return { id: p.id, name: p.name, email: p.email, telefon: p.telefon, whatsapp: p.whatsapp, foto: p.foto, notiz: p.notiz }
}

/** Setzt "geändert am" der betroffenen Teams, damit offene Bearbeitungsseiten den Konflikt bemerken. */
function teamsBeruehren(tx: DbZugriff, mannschaftIds: number[], gruppeIds: number[]): void {
  const jetzt = new Date().toISOString()
  if (mannschaftIds.length) tx.update(schema.mannschaften).set({ geaendertAm: jetzt }).where(inArray(schema.mannschaften.id, mannschaftIds)).run()
  if (gruppeIds.length) tx.update(schema.gruppen).set({ geaendertAm: jetzt }).where(inArray(schema.gruppen.id, gruppeIds)).run()
}

// ─── Speichern ──────────────────────────────────────────────────────────────

export interface PersonSpeichernEingabe {
  id: number
  /** Formularwerte: name, email, telefon, whatsapp, notiz */
  roh: Record<string, unknown>
  foto: File | null
  fotoEntfernen: boolean
  /** "geändert am" beim Laden der Seite – für die Konfliktprüfung. */
  geaendertAm: string | null
}

export async function personSpeichern(db: Datenbank, rechte: Rechte, e: PersonSpeichernEingabe): Promise<FormErgebnis> {
  const person = db.select().from(schema.personen).where(eq(schema.personen.id, e.id)).get()
  if (!person) return fehler('Diese Person gibt es nicht mehr – vielleicht wurde sie gelöscht.')
  if (!kannPerson(db, rechte, person.id)) return fehler('Du darfst diese Person nicht bearbeiten.')
  if (!e.geaendertAm || e.geaendertAm !== person.geaendertAm) return fehler(KONFLIKT_MELDUNG)

  const { daten, felder } = kontaktPruefen(e.roh)
  if (Object.keys(felder).length) return feldFehlerMeldung(felder)

  let neuesFoto: string | null = null
  if (e.foto) {
    try {
      neuesFoto = (await bildSpeichern(e.foto, 'personen', daten.name)).pfad
    } catch (err) {
      if (err instanceof UploadFehler) return fehler(err.message, { foto: err.message })
      return datenbankFehlerMeldung(err, 'Speichern des Fotos')
    }
  }
  const foto = neuesFoto ?? (e.fotoEntfernen ? null : person.foto)

  try {
    db.transaction(tx => {
      const aktuell = tx.select({ geaendertAm: schema.personen.geaendertAm }).from(schema.personen).where(eq(schema.personen.id, person.id)).get()
      if (!aktuell || aktuell.geaendertAm !== e.geaendertAm) throw new KonfliktFehler()
      const nachher = tx
        .update(schema.personen)
        .set({ ...daten, foto, geaendertAm: new Date().toISOString() })
        .where(eq(schema.personen.id, person.id))
        .returning()
        .get()
      protokollieren(tx, rechte, {
        aktion: 'geaendert',
        objektTyp: 'personen',
        objektId: person.id,
        bezeichnung: daten.name,
        vorher: personSchnappschuss(person),
        nachher: personSchnappschuss(nachher),
      })
    })
  } catch (err) {
    if (neuesFoto && neuesFoto !== person.foto) medienFreigeben(neuesFoto)
    if (err instanceof KonfliktFehler) return fehler(KONFLIKT_MELDUNG)
    return datenbankFehlerMeldung(err, 'Speichern einer Person')
  }

  if (person.foto && person.foto !== foto) medienFreigeben(person.foto)

  const oeffentlich = (verwendungenLaden(db).get(person.id) ?? []).some(v => v.oeffentlich)
  return erfolg(oeffentlich ? 'Gespeichert – ist jetzt auf der Website sichtbar.' : 'Gespeichert.')
}

// ─── Anlegen ────────────────────────────────────────────────────────────────

export interface PersonAnlegenEingabe {
  /** Formularwerte: name, email, telefon (optional whatsapp, notiz) */
  roh: Record<string, unknown>
  /** Optional gleich einer Mannschaft oder Gruppe zuordnen. */
  zuordnung: { art: 'mannschaft' | 'gruppe'; id: number; rolle: string | null } | null
}

/**
 * Legt eine Person an. Jeder angemeldete Zugang darf das. Wer kein Admin ist, ordnet die Person
 * gleich einer eigenen Mannschaft oder Gruppe zu (sonst könnte er sie danach nicht mehr bearbeiten).
 */
export function personAnlegen(db: Datenbank, rechte: Rechte, e: PersonAnlegenEingabe): { id: number } | { fehler: FormErgebnis } {
  const { daten, felder } = kontaktPruefen(e.roh)
  const rolle = textWert(e.zuordnung?.rolle) ?? 'Trainer:in'
  if (rolle.length > 60) felder.rolle = 'Die Rolle ist zu lang (höchstens 60 Zeichen).'

  let team: { art: 'mannschaft' | 'gruppe'; id: number; name: string } | null = null
  if (e.zuordnung) {
    const z = e.zuordnung
    const zeile =
      z.art === 'mannschaft'
        ? db.select().from(schema.mannschaften).where(eq(schema.mannschaften.id, z.id)).get()
        : db.select().from(schema.gruppen).where(eq(schema.gruppen.id, z.id)).get()
    const erlaubt = zeile ? (z.art === 'mannschaft' ? kannMannschaft(rechte, zeile) : kannGruppe(rechte, zeile)) : false
    if (!zeile || !erlaubt) felder.zuordnung = 'Bitte eine Mannschaft oder Gruppe aus der Liste wählen.'
    else team = { art: z.art, id: zeile.id, name: zeile.name }
  } else if (!rechte.istAdmin && bearbeitbareTeams(db, rechte).length > 0) {
    felder.zuordnung = 'Bitte auswählen, zu welcher Mannschaft oder Gruppe die Person gehört.'
  }
  if (Object.keys(felder).length) return { fehler: feldFehlerMeldung(felder) }

  try {
    const id = db.transaction(tx => {
      const person = tx.insert(schema.personen).values(daten).returning().get()
      if (team) {
        if (team.art === 'mannschaft') {
          const vorhandene = tx.select().from(schema.mannschaftPersonen).where(eq(schema.mannschaftPersonen.mannschaftId, team.id)).all()
          tx.insert(schema.mannschaftPersonen)
            .values({ mannschaftId: team.id, personId: person.id, rolle, reihenfolge: vorhandene.reduce((m, x) => Math.max(m, x.reihenfolge + 1), 0) })
            .run()
          teamsBeruehren(tx, [team.id], [])
        } else {
          const vorhandene = tx.select().from(schema.gruppePersonen).where(eq(schema.gruppePersonen.gruppeId, team.id)).all()
          tx.insert(schema.gruppePersonen)
            .values({ gruppeId: team.id, personId: person.id, rolle, reihenfolge: vorhandene.reduce((m, x) => Math.max(m, x.reihenfolge + 1), 0) })
            .run()
          teamsBeruehren(tx, [], [team.id])
        }
      }
      protokollieren(tx, rechte, {
        aktion: 'angelegt',
        objektTyp: 'personen',
        objektId: person.id,
        bezeichnung: team ? `${person.name} (${rolle} bei ${team.name})` : person.name,
        nachher: personSchnappschuss(person),
      })
      return person.id
    })
    return { id }
  } catch (err) {
    return { fehler: datenbankFehlerMeldung(err, 'Anlegen einer Person') }
  }
}

// ─── Löschen ────────────────────────────────────────────────────────────────

/** Löscht eine Person samt aller Zuordnungen (per CASCADE). Nur für Admins. */
export function personLoeschen(db: Datenbank, rechte: Rechte, id: number): FormErgebnis {
  if (!rechte.istAdmin) return fehler('Personen dürfen nur Admins löschen.')
  const person = db.select().from(schema.personen).where(eq(schema.personen.id, id)).get()
  if (!person) return fehler('Diese Person gibt es nicht mehr – vielleicht wurde sie schon gelöscht.')
  const verwendung = verwendungenLaden(db).get(id) ?? []

  try {
    db.transaction(tx => {
      const mannschaftIds = tx
        .select({ id: schema.mannschaftPersonen.mannschaftId })
        .from(schema.mannschaftPersonen)
        .where(eq(schema.mannschaftPersonen.personId, id))
        .all()
        .map(x => x.id)
      const gruppeIds = tx
        .select({ id: schema.gruppePersonen.gruppeId })
        .from(schema.gruppePersonen)
        .where(eq(schema.gruppePersonen.personId, id))
        .all()
        .map(x => x.id)
      teamsBeruehren(tx, mannschaftIds, gruppeIds)
      tx.delete(schema.personen).where(eq(schema.personen.id, id)).run()
      protokollieren(tx, rechte, {
        aktion: 'geloescht',
        objektTyp: 'personen',
        objektId: id,
        bezeichnung: person.name,
        vorher: { ...personSchnappschuss(person), verwendung: verwendung.map(v => v.text) },
      })
    })
  } catch (err) {
    return datenbankFehlerMeldung(err, 'Löschen einer Person')
  }
  medienFreigeben(person.foto)
  return erfolg(`„${person.name}“ wurde gelöscht.`)
}
