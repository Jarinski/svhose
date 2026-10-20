/**
 * lib/verwaltung/team-bearbeiten.ts
 *
 * Laden, Prüfen, Anlegen, Speichern und Löschen einer Mannschaft oder Gruppe – samt
 * Trainingszeiten und Trainerteam. Bewusst ohne Next.js-Abhängigkeiten, damit sich die Logik in
 * Skripten testen (und später über API/Bot nutzen) lässt. Sitzung, Weiterleitung und
 * Cache-Erneuerung übernehmen die Server-Aktionen in app/verwaltung/(intern)/teams/aktionen.ts.
 *
 * Gespeichert wird immer alles auf einmal ("ein Speichern-Knopf"): Stammdaten, Trainingszeiten
 * (vorhandene ändern, neue anlegen, fehlende löschen) und Trainerteam (Zuordnungen werden ersetzt,
 * neue Personen beim Speichern angelegt) – in einer Transaktion, mit Eintrag im Verlauf.
 */

import { and, asc, eq, isNotNull } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { MANNSCHAFT_BEREICHE, RHYTHMEN, SAISONS } from '@/lib/db/schema'
import { erfolg, fehler, type FormErgebnis } from './formular'
import { bildSpeichern, medienFreigeben, UploadFehler } from './medien-upload'
import { kontaktPruefen, type DbZugriff } from './person-bearbeiten'
import {
  datenbankFehlerMeldung,
  feldFehlerMeldung,
  ganzzahlWert,
  KONFLIKT_MELDUNG,
  KonfliktFehler,
  listenWert,
  objektWert,
  textWert,
  uhrzeitWert,
} from './pruefhilfen'
import { kannGruppe, kannMannschaft, kannSparte, type Rechte } from './rechte'
import { protokollieren } from './verlauf'

export type TeamArt = 'mannschaft' | 'gruppe'
type Bereich = (typeof MANNSCHAFT_BEREICHE)[number]
type Saison = (typeof SAISONS)[number]
type Rhythmus = (typeof RHYTHMEN)[number]

export function istTeamArt(wert: unknown): wert is TeamArt {
  return wert === 'mannschaft' || wert === 'gruppe'
}

/** "Mannschaft" bzw. "Gruppe" */
export function artName(art: TeamArt): string {
  return art === 'mannschaft' ? 'Mannschaft' : 'Gruppe'
}

const OBJEKT_TYP: Record<TeamArt, string> = { mannschaft: 'mannschaften', gruppe: 'gruppen' }
const MEDIEN_KATEGORIE: Record<TeamArt, string> = { mannschaft: 'mannschaften', gruppe: 'gruppen' }

// ─── Laden ──────────────────────────────────────────────────────────────────

/** Zeile einer Mannschaft oder Gruppe (bei Gruppen ist bereich immer null). */
export type TeamZeile = typeof schema.mannschaften.$inferSelect
export type TrainingszeitZeile = typeof schema.trainingszeiten.$inferSelect

export interface TrainerZuordnung {
  personId: number
  rolle: string
  reihenfolge: number
  name: string
  telefon: string | null
  email: string | null
}

export interface TeamStand {
  art: TeamArt
  team: TeamZeile
  sparte: typeof schema.sparten.$inferSelect
  /** Sortiert nach Wochentag und Beginn (wie auf der Website). */
  trainingszeiten: TrainingszeitZeile[]
  /** In der gepflegten Reihenfolge. */
  trainer: TrainerZuordnung[]
}

function teamZeileLaden(db: DbZugriff, art: TeamArt, id: number): TeamZeile | undefined {
  if (art === 'mannschaft') return db.select().from(schema.mannschaften).where(eq(schema.mannschaften.id, id)).get()
  const g = db.select().from(schema.gruppen).where(eq(schema.gruppen.id, id)).get()
  return g ? { ...g, bereich: null } : undefined
}

function zeitSpalte(art: TeamArt) {
  return art === 'mannschaft' ? schema.trainingszeiten.mannschaftId : schema.trainingszeiten.gruppeId
}

function trainerLaden(db: DbZugriff, art: TeamArt, id: number): TrainerZuordnung[] {
  const p = schema.personen
  const zeilen =
    art === 'mannschaft'
      ? db
          .select({ personId: p.id, rolle: schema.mannschaftPersonen.rolle, reihenfolge: schema.mannschaftPersonen.reihenfolge, name: p.name, telefon: p.telefon, email: p.email })
          .from(schema.mannschaftPersonen)
          .innerJoin(p, eq(p.id, schema.mannschaftPersonen.personId))
          .where(eq(schema.mannschaftPersonen.mannschaftId, id))
          .all()
      : db
          .select({ personId: p.id, rolle: schema.gruppePersonen.rolle, reihenfolge: schema.gruppePersonen.reihenfolge, name: p.name, telefon: p.telefon, email: p.email })
          .from(schema.gruppePersonen)
          .innerJoin(p, eq(p.id, schema.gruppePersonen.personId))
          .where(eq(schema.gruppePersonen.gruppeId, id))
          .all()
  return zeilen.sort((a, b) => a.reihenfolge - b.reihenfolge || a.name.localeCompare(b.name, 'de'))
}

/** Lädt eine Mannschaft oder Gruppe mit Sparte, Trainingszeiten und Trainerteam – oder null. */
export function teamLaden(db: DbZugriff, art: TeamArt, id: number): TeamStand | null {
  const team = teamZeileLaden(db, art, id)
  if (!team) return null
  const sparte = db.select().from(schema.sparten).where(eq(schema.sparten.id, team.sparteId)).get()
  if (!sparte) return null
  const trainingszeiten = db
    .select()
    .from(schema.trainingszeiten)
    .where(eq(zeitSpalte(art), id))
    .orderBy(asc(schema.trainingszeiten.wochentag), asc(schema.trainingszeiten.beginn), asc(schema.trainingszeiten.reihenfolge), asc(schema.trainingszeiten.id))
    .all()
  return { art, team, sparte, trainingszeiten, trainer: trainerLaden(db, art, id) }
}

/** Darf der Zugang dieses Team bearbeiten? */
export function darfTeam(rechte: Rechte, art: TeamArt, team: { id: number; sparteId: number }): boolean {
  return art === 'mannschaft' ? kannMannschaft(rechte, team) : kannGruppe(rechte, team)
}

/** Alle bisher verwendeten Trainingsorte – als Vorschläge im Formular. */
export function alleOrte(db: Datenbank): string[] {
  const orte = db.selectDistinct({ ort: schema.trainingszeiten.ort }).from(schema.trainingszeiten).all()
  return orte
    .map(o => (o.ort ?? '').trim())
    .filter((o, i, liste) => o !== '' && liste.indexOf(o) === i)
    .sort((a, b) => a.localeCompare(b, 'de'))
}

/** Stand für das Änderungsprotokoll (ohne Zeitstempel). */
function schnappschuss(s: TeamStand) {
  const t = s.team
  return {
    team: {
      id: t.id,
      sparteId: t.sparteId,
      name: t.name,
      ...(s.art === 'mannschaft' ? { bereich: t.bereich } : {}),
      altersklasse: t.altersklasse,
      beschreibung: t.beschreibung,
      foto: t.foto,
      sichtbar: t.sichtbar,
      reihenfolge: t.reihenfolge,
    },
    trainingszeiten: s.trainingszeiten.map(z => ({
      id: z.id,
      wochentag: z.wochentag,
      beginn: z.beginn,
      ende: z.ende,
      ort: z.ort,
      saison: z.saison,
      rhythmus: z.rhythmus,
      hinweis: z.hinweis,
      reihenfolge: z.reihenfolge,
    })),
    trainer: s.trainer.map(p => ({ personId: p.personId, name: p.name, rolle: p.rolle })),
  }
}

function bezeichnung(s: { sparte: { name: string }; team: { name: string } }): string {
  return `${s.sparte.name} · ${s.team.name}`
}

// ─── Eingaben (JSON aus dem Formular) ───────────────────────────────────────

/** So schickt das Formular eine Trainingszeit (Feld "daten"). */
export interface TrainingszeitEingabe {
  /** Vorhandene Trainingszeit; fehlt bei neuen Zeilen. */
  id?: number | null
  wochentag: number
  beginn: string
  ende: string
  ort: string
  saison: string
  rhythmus: string
  hinweis: string
}

/** So schickt das Formular eine Person im Trainerteam: vorhandene über personId, neue über neu. */
export interface TrainerEingabe {
  personId?: number | null
  neu?: { name: string; telefon: string; email: string } | null
  rolle: string
}

/** Inhalt des Formularfelds "daten". */
export interface TeamEingabe {
  name: string
  bereich: string | null
  altersklasse: string
  beschreibung: string
  sichtbar: boolean
  reihenfolge: number | string | null
  trainingszeiten: TrainingszeitEingabe[]
  trainer: TrainerEingabe[]
}

interface ZeitGeprueft {
  id: number | null
  wochentag: number
  beginn: string
  ende: string | null
  ort: string | null
  saison: Saison
  rhythmus: Rhythmus
  hinweis: string | null
}

interface TrainerGeprueft {
  personId: number | null
  neu: { name: string; telefon: string | null; email: string | null } | null
  rolle: string
}

interface TeamGeprueft {
  name: string
  bereich: Bereich | null
  altersklasse: string | null
  beschreibung: string | null
  sichtbar: boolean
  reihenfolge: number
  trainingszeiten: ZeitGeprueft[]
  trainer: TrainerGeprueft[]
}

const GRENZEN = { name: 80, altersklasse: 60, beschreibung: 5000, ort: 100, hinweis: 200, rolle: 60, zeilen: 40 }

function enthaelt<T extends string>(liste: readonly T[], wert: unknown): wert is T {
  return typeof wert === 'string' && (liste as readonly string[]).indexOf(wert) >= 0
}

function langerText(felder: Record<string, string>, schluessel: string, wert: string | null, max: number, was: string): void {
  if (wert && wert.length > max) felder[schluessel] = `${was} ist zu lang (höchstens ${max} Zeichen).`
}

/**
 * Prüft das Feld "daten" vollständig. Fehlermeldungen nennen die Zeile ("Trainingszeit 2: …"),
 * Feldschlüssel: name, bereich, altersklasse, beschreibung, reihenfolge, zeiten.<i>.<feld>, trainer.<i>[.<feld>].
 */
export function teamEingabePruefen(art: TeamArt, roh: unknown): { daten: TeamGeprueft } | { fehler: FormErgebnis } {
  const o = objektWert(roh)
  const felder: Record<string, string> = {}

  const name = textWert(o.name) ?? ''
  if (!name) felder.name = 'Bitte einen Namen eintragen.'
  langerText(felder, 'name', name, GRENZEN.name, 'Der Name')

  let bereich: Bereich | null = null
  if (art === 'mannschaft') {
    const b = textWert(o.bereich)
    if (b && !enthaelt(MANNSCHAFT_BEREICHE, b)) felder.bereich = 'Bitte einen Bereich aus der Liste wählen.'
    else bereich = (b as Bereich | null) ?? null
  }

  const altersklasse = textWert(o.altersklasse)
  langerText(felder, 'altersklasse', altersklasse, GRENZEN.altersklasse, 'Die Altersklasse')
  const beschreibung = textWert(o.beschreibung)
  langerText(felder, 'beschreibung', beschreibung, GRENZEN.beschreibung, 'Die Beschreibung')

  const reihenfolgeRoh = ganzzahlWert(o.reihenfolge)
  if (reihenfolgeRoh === false || (reihenfolgeRoh !== null && (reihenfolgeRoh < 0 || reihenfolgeRoh > 9999))) {
    felder.reihenfolge = 'Die Reihenfolge muss eine ganze Zahl zwischen 0 und 9999 sein.'
  }
  const reihenfolge = typeof reihenfolgeRoh === 'number' ? reihenfolgeRoh : 0

  // Trainingszeiten
  const zeitenRoh = listenWert(o.trainingszeiten)
  if (zeitenRoh.length > GRENZEN.zeilen) felder.zeiten = `Bitte höchstens ${GRENZEN.zeilen} Trainingszeiten eintragen.`
  const trainingszeiten: ZeitGeprueft[] = zeitenRoh.slice(0, GRENZEN.zeilen).map((zRoh, i) => {
    const z = objektWert(zRoh)
    const zeile = `Trainingszeit ${i + 1}: `
    const k = `zeiten.${i}.`

    const tag = ganzzahlWert(z.wochentag)
    if (typeof tag !== 'number' || tag < 1 || tag > 7) felder[k + 'wochentag'] = `${zeile}Bitte einen Wochentag auswählen.`

    const beginn = uhrzeitWert(z.beginn)
    if (beginn === null) felder[k + 'beginn'] = `${zeile}Bitte eintragen, wann das Training beginnt.`
    else if (beginn === false) felder[k + 'beginn'] = `${zeile}Bitte den Beginn als Uhrzeit eintragen, z. B. 17:30.`

    const ende = uhrzeitWert(z.ende)
    if (ende === false) felder[k + 'ende'] = `${zeile}Bitte das Ende als Uhrzeit eintragen, z. B. 19:00.`
    else if (ende && typeof beginn === 'string' && ende <= beginn) felder[k + 'ende'] = `${zeile}Das Ende muss nach dem Beginn liegen.`

    const ort = textWert(z.ort)
    langerText(felder, k + 'ort', ort, GRENZEN.ort, `${zeile}Der Ort`)
    const hinweis = textWert(z.hinweis)
    langerText(felder, k + 'hinweis', hinweis, GRENZEN.hinweis, `${zeile}Der Hinweis`)

    const saison = textWert(z.saison) ?? 'ganzjährig'
    if (!enthaelt(SAISONS, saison)) felder[k + 'saison'] = `${zeile}Bitte eine Saison aus der Liste wählen.`
    const rhythmus = textWert(z.rhythmus) ?? 'jede Woche'
    if (!enthaelt(RHYTHMEN, rhythmus)) felder[k + 'rhythmus'] = `${zeile}Bitte einen Rhythmus aus der Liste wählen.`

    const id = ganzzahlWert(z.id)
    return {
      id: typeof id === 'number' ? id : null,
      wochentag: typeof tag === 'number' ? tag : 0,
      beginn: typeof beginn === 'string' ? beginn : '',
      ende: typeof ende === 'string' ? ende : null,
      ort,
      saison: saison as Saison,
      rhythmus: rhythmus as Rhythmus,
      hinweis,
    }
  })

  // Trainerteam
  const trainerRoh = listenWert(o.trainer)
  if (trainerRoh.length > GRENZEN.zeilen) felder.trainer = `Bitte höchstens ${GRENZEN.zeilen} Personen eintragen.`
  const gesehenIds: number[] = []
  const gesehenNeu: string[] = []
  const trainer: TrainerGeprueft[] = []
  trainerRoh.slice(0, GRENZEN.zeilen).forEach((tRoh, i) => {
    const t = objektWert(tRoh)
    const zeile = `Person ${i + 1}: `
    const k = `trainer.${i}`
    const rolle = textWert(t.rolle) ?? 'Trainer:in'
    langerText(felder, k + '.rolle', rolle, GRENZEN.rolle, `${zeile}Die Rolle`)

    const personId = ganzzahlWert(t.personId)
    if (typeof personId === 'number') {
      if (gesehenIds.indexOf(personId) >= 0) felder[k] = `${zeile}Diese Person steht schon im Trainerteam. Bitte eine der beiden Zeilen entfernen.`
      gesehenIds.push(personId)
      trainer.push({ personId, neu: null, rolle })
      return
    }
    const neuRoh = t.neu
    if (neuRoh && typeof neuRoh === 'object') {
      const { daten, felder: kontaktFelder } = kontaktPruefen(objektWert(neuRoh), k + '.', zeile)
      Object.keys(kontaktFelder).forEach(f => (felder[f] = kontaktFelder[f]))
      const schluessel = daten.name.toLowerCase()
      if (daten.name && gesehenNeu.indexOf(schluessel) >= 0) felder[k] = `${zeile}„${daten.name}“ soll zweimal neu angelegt werden. Bitte eine der beiden Zeilen entfernen.`
      gesehenNeu.push(schluessel)
      trainer.push({ personId: null, neu: { name: daten.name, telefon: daten.telefon, email: daten.email }, rolle })
      return
    }
    felder[k] = `${zeile}Bitte eine Person auswählen oder entfernen.`
  })

  if (Object.keys(felder).length) return { fehler: feldFehlerMeldung(felder) }
  return {
    daten: {
      name,
      bereich,
      altersklasse,
      beschreibung,
      sichtbar: o.sichtbar !== false,
      reihenfolge,
      trainingszeiten,
      trainer,
    },
  }
}

/** Gibt es in der Sparte schon ein anderes Team gleicher Art mit diesem Namen (ohne Groß-/Kleinschreibung)? */
function nameVergeben(db: DbZugriff, art: TeamArt, sparteId: number, name: string, ausserId: number | null): boolean {
  const tabelle = art === 'mannschaft' ? schema.mannschaften : schema.gruppen
  const namen = db.select({ id: tabelle.id, name: tabelle.name }).from(tabelle).where(eq(tabelle.sparteId, sparteId)).all()
  const gesucht = name.trim().toLowerCase()
  return namen.some(t => t.id !== ausserId && t.name.trim().toLowerCase() === gesucht)
}

function nameVergebenMeldung(art: TeamArt, name: string): string {
  return art === 'mannschaft'
    ? `In dieser Sparte gibt es schon eine Mannschaft „${name}“. Bitte einen anderen Namen wählen.`
    : `In dieser Sparte gibt es schon eine Gruppe „${name}“. Bitte einen anderen Namen wählen.`
}

// ─── Speichern ──────────────────────────────────────────────────────────────

export interface TeamSpeichernEingabe {
  art: TeamArt
  id: number
  /** Geparster Inhalt des Formularfelds "daten" (siehe TeamEingabe) – wird vollständig geprüft. */
  daten: unknown
  /** Neues Foto (bereits geprüft, dass eine Datei gewählt ist) oder null. */
  foto: File | null
  fotoEntfernen: boolean
  /** "geändert am" beim Laden der Seite – für die Konfliktprüfung. */
  geaendertAm: string | null
}

/** Signalisiert in der Transaktion: Es hat sich nichts geändert – alles zurückrollen. */
class KeineAenderung extends Error {}

export async function teamSpeichern(db: Datenbank, rechte: Rechte, e: TeamSpeichernEingabe): Promise<FormErgebnis> {
  const was = artName(e.art)
  const vorher = teamLaden(db, e.art, e.id)
  if (!vorher) return fehler(`Diese ${was} gibt es nicht mehr – vielleicht wurde sie gelöscht.`)
  if (!darfTeam(rechte, e.art, vorher.team)) return fehler(`Du darfst diese ${was} nicht bearbeiten.`)
  if (!e.geaendertAm || e.geaendertAm !== vorher.team.geaendertAm) return fehler(KONFLIKT_MELDUNG)

  const geprueft = teamEingabePruefen(e.art, e.daten)
  if ('fehler' in geprueft) return geprueft.fehler
  const d = geprueft.daten

  if (nameVergeben(db, e.art, vorher.team.sparteId, d.name, e.id)) {
    const meldung = nameVergebenMeldung(e.art, d.name)
    return fehler(`Noch nicht gespeichert. ${meldung}`, { name: meldung })
  }

  // Ausgewählte Personen müssen (noch) existieren.
  const ids = d.trainer.map(t => t.personId).filter((x): x is number => x != null)
  if (ids.length) {
    const vorhanden = db.select({ id: schema.personen.id }).from(schema.personen).all().map(p => p.id)
    const felder: Record<string, string> = {}
    d.trainer.forEach((t, i) => {
      if (t.personId != null && vorhanden.indexOf(t.personId) < 0) {
        felder[`trainer.${i}`] = `Person ${i + 1}: Diese Person wurde inzwischen gelöscht. Bitte entfernen oder die Seite neu laden.`
      }
    })
    if (Object.keys(felder).length) return feldFehlerMeldung(felder)
  }

  // Foto vor der Transaktion speichern (Bildverarbeitung ist asynchron, die Transaktion nicht).
  let neuesFoto: string | null = null
  if (e.foto) {
    try {
      neuesFoto = (await bildSpeichern(e.foto, MEDIEN_KATEGORIE[e.art], `${vorher.sparte.slug}-${d.name}`)).pfad
    } catch (err) {
      if (err instanceof UploadFehler) return fehler(err.message, { foto: err.message })
      return datenbankFehlerMeldung(err, 'Speichern des Fotos')
    }
  }
  const foto = neuesFoto ?? (e.fotoEntfernen ? null : vorher.team.foto)

  let nachherStand: TeamStand | null = null
  try {
    db.transaction(tx => {
      // Zweite Konfliktprüfung: Während das Foto verarbeitet wurde, könnte jemand gespeichert haben.
      const aktuell = teamZeileLaden(tx, e.art, e.id)
      if (!aktuell || aktuell.geaendertAm !== e.geaendertAm) throw new KonfliktFehler()

      // 1. Stammdaten – "geändert am" immer setzen, auch wenn sich nur Trainingszeiten oder Trainer ändern.
      const werte = {
        name: d.name,
        altersklasse: d.altersklasse,
        beschreibung: d.beschreibung,
        foto,
        sichtbar: d.sichtbar,
        reihenfolge: d.reihenfolge,
        geaendertAm: new Date().toISOString(),
      }
      if (e.art === 'mannschaft') {
        tx.update(schema.mannschaften).set({ ...werte, bereich: d.bereich }).where(eq(schema.mannschaften.id, e.id)).run()
      } else {
        tx.update(schema.gruppen).set(werte).where(eq(schema.gruppen.id, e.id)).run()
      }

      // 2. Trainingszeiten abgleichen – nur die dieses Teams.
      const vorhandene = vorher.trainingszeiten
      const behalten: number[] = []
      d.trainingszeiten.forEach((z, i) => {
        const zeitWerte = {
          wochentag: z.wochentag,
          beginn: z.beginn,
          ende: z.ende,
          ort: z.ort,
          saison: z.saison,
          rhythmus: z.rhythmus,
          hinweis: z.hinweis,
          reihenfolge: i,
        }
        const alt = z.id != null && behalten.indexOf(z.id) < 0 ? vorhandene.find(v => v.id === z.id) : undefined
        if (alt) {
          behalten.push(alt.id)
          const unveraendert = (Object.keys(zeitWerte) as (keyof typeof zeitWerte)[]).every(k => alt[k] === zeitWerte[k])
          const gemeinsam = alt.mannschaftId != null && alt.gruppeId != null
          if (!unveraendert && gemeinsam) {
            // Gemeinsame Zeit von Mannschaft UND Gruppe: nicht für das andere Team mitändern (dafür fehlen
            // evtl. die Rechte) – eigene Verbindung lösen und eine eigene Zeile anlegen.
            tx.update(schema.trainingszeiten)
              .set(e.art === 'mannschaft' ? { mannschaftId: null } : { gruppeId: null })
              .where(eq(schema.trainingszeiten.id, alt.id))
              .run()
            tx.insert(schema.trainingszeiten)
              .values({ ...zeitWerte, mannschaftId: e.art === 'mannschaft' ? e.id : null, gruppeId: e.art === 'gruppe' ? e.id : null })
              .run()
          } else if (!unveraendert) {
            tx.update(schema.trainingszeiten).set(zeitWerte).where(eq(schema.trainingszeiten.id, alt.id)).run()
          }
        } else {
          tx.insert(schema.trainingszeiten)
            .values({ ...zeitWerte, mannschaftId: e.art === 'mannschaft' ? e.id : null, gruppeId: e.art === 'gruppe' ? e.id : null })
            .run()
        }
      })
      for (const alt of vorhandene) {
        if (behalten.indexOf(alt.id) >= 0) continue
        // Hängt eine Trainingszeit an Mannschaft UND Gruppe, wird nur die Verbindung zu diesem Team gelöst.
        const gemeinsam = alt.mannschaftId != null && alt.gruppeId != null
        if (gemeinsam && e.art === 'mannschaft') {
          tx.update(schema.trainingszeiten).set({ mannschaftId: null }).where(eq(schema.trainingszeiten.id, alt.id)).run()
        } else if (gemeinsam) {
          tx.update(schema.trainingszeiten).set({ gruppeId: null }).where(eq(schema.trainingszeiten.id, alt.id)).run()
        } else {
          tx.delete(schema.trainingszeiten).where(eq(schema.trainingszeiten.id, alt.id)).run()
        }
      }

      // 3. Neue Personen anlegen, dann Trainerteam ersetzen (Reihenfolge = Position in der Liste).
      const personIds = d.trainer.map(t => {
        if (t.personId != null) return t.personId
        const neu = t.neu!
        const person = tx.insert(schema.personen).values({ name: neu.name, telefon: neu.telefon, email: neu.email }).returning().get()
        protokollieren(tx, rechte, {
          aktion: 'angelegt',
          objektTyp: 'personen',
          objektId: person.id,
          bezeichnung: `${person.name} (${t.rolle} bei ${d.name})`,
          nachher: { id: person.id, name: person.name, telefon: person.telefon, email: person.email },
        })
        return person.id
      })
      if (e.art === 'mannschaft') {
        tx.delete(schema.mannschaftPersonen).where(eq(schema.mannschaftPersonen.mannschaftId, e.id)).run()
        if (personIds.length) {
          tx.insert(schema.mannschaftPersonen)
            .values(personIds.map((personId, i) => ({ mannschaftId: e.id, personId, rolle: d.trainer[i].rolle, reihenfolge: i })))
            .run()
        }
      } else {
        tx.delete(schema.gruppePersonen).where(eq(schema.gruppePersonen.gruppeId, e.id)).run()
        if (personIds.length) {
          tx.insert(schema.gruppePersonen)
            .values(personIds.map((personId, i) => ({ gruppeId: e.id, personId, rolle: d.trainer[i].rolle, reihenfolge: i })))
            .run()
        }
      }

      // 4. Verlauf – nur, wenn sich wirklich etwas geändert hat (sonst alles zurückrollen).
      const nachher = teamLaden(tx, e.art, e.id)!
      const s1 = schnappschuss(vorher)
      const s2 = schnappschuss(nachher)
      if (JSON.stringify(s1) === JSON.stringify(s2)) throw new KeineAenderung()
      protokollieren(tx, rechte, {
        aktion: 'geaendert',
        objektTyp: OBJEKT_TYP[e.art],
        objektId: e.id,
        bezeichnung: bezeichnung(nachher),
        vorher: s1,
        nachher: s2,
      })
      nachherStand = nachher
    })
  } catch (err) {
    if (neuesFoto && neuesFoto !== vorher.team.foto) medienFreigeben(neuesFoto)
    if (err instanceof KeineAenderung) return erfolg('Alles schon gespeichert – es gab keine Änderungen.')
    if (err instanceof KonfliktFehler) return fehler(KONFLIKT_MELDUNG)
    return datenbankFehlerMeldung(err, `Speichern einer ${was}`)
  }

  // Altes Foto löschen, wenn es ersetzt oder entfernt wurde (und nirgends sonst verwendet wird).
  if (vorher.team.foto && vorher.team.foto !== foto) medienFreigeben(vorher.team.foto)

  const stand = nachherStand as TeamStand | null
  if (stand && (!stand.team.sichtbar || !stand.sparte.sichtbar)) {
    return erfolg(`Gespeichert. Hinweis: Die ${was} ist zurzeit auf der Website ausgeblendet.`)
  }
  return erfolg('Gespeichert – ist jetzt auf der Website sichtbar.')
}

// ─── Anlegen ────────────────────────────────────────────────────────────────

export interface TeamAnlegenEingabe {
  art: TeamArt
  sparteId: number | null
  name: unknown
  bereich: unknown
}

/** Legt eine Mannschaft oder Gruppe an (nur mit Recht auf die Sparte). Liefert die neue id. */
export function teamAnlegen(db: Datenbank, rechte: Rechte, e: TeamAnlegenEingabe): { id: number } | { fehler: FormErgebnis } {
  const was = artName(e.art)
  const sparte = e.sparteId == null ? undefined : db.select().from(schema.sparten).where(eq(schema.sparten.id, e.sparteId)).get()
  if (!sparte) return { fehler: fehler('Bitte eine Sparte auswählen.', { sparte: 'Bitte eine Sparte auswählen.' }) }
  if (!kannSparte(rechte, sparte.id)) return { fehler: fehler(`Du darfst in der Sparte ${sparte.name} keine ${was} anlegen.`) }

  const felder: Record<string, string> = {}
  const name = textWert(e.name) ?? ''
  if (!name) felder.name = 'Bitte einen Namen eintragen.'
  else if (name.length > GRENZEN.name) felder.name = `Der Name ist zu lang (höchstens ${GRENZEN.name} Zeichen).`
  let bereich: Bereich | null = null
  if (e.art === 'mannschaft') {
    const b = textWert(e.bereich)
    if (b && !enthaelt(MANNSCHAFT_BEREICHE, b)) felder.bereich = 'Bitte einen Bereich aus der Liste wählen.'
    else bereich = (b as Bereich | null) ?? null
  }
  if (Object.keys(felder).length) return { fehler: feldFehlerMeldung(felder) }
  if (nameVergeben(db, e.art, sparte.id, name, null)) {
    const meldung = nameVergebenMeldung(e.art, name)
    return { fehler: fehler(meldung, { name: meldung }) }
  }

  try {
    const id = db.transaction(tx => {
      const tabelle = e.art === 'mannschaft' ? schema.mannschaften : schema.gruppen
      // Neue Teams kommen ans Ende der Sparte.
      const reihenfolge = tx
        .select({ r: tabelle.reihenfolge })
        .from(tabelle)
        .where(eq(tabelle.sparteId, sparte.id))
        .all()
        .reduce((max, t) => Math.max(max, t.r + 1), 0)
      const neu =
        e.art === 'mannschaft'
          ? tx.insert(schema.mannschaften).values({ sparteId: sparte.id, name, bereich, reihenfolge }).returning().get()
          : tx.insert(schema.gruppen).values({ sparteId: sparte.id, name, reihenfolge }).returning().get()
      const stand = teamLaden(tx, e.art, neu.id)!
      protokollieren(tx, rechte, {
        aktion: 'angelegt',
        objektTyp: OBJEKT_TYP[e.art],
        objektId: neu.id,
        bezeichnung: bezeichnung(stand),
        nachher: schnappschuss(stand),
      })
      return neu.id
    })
    return { id }
  } catch (err) {
    return { fehler: datenbankFehlerMeldung(err, `Anlegen einer ${was}`) }
  }
}

// ─── Löschen ────────────────────────────────────────────────────────────────

/** Löscht eine Mannschaft oder Gruppe samt Trainingszeiten und Zuordnungen (nur mit Recht auf die Sparte). */
export function teamLoeschen(db: Datenbank, rechte: Rechte, art: TeamArt, id: number): FormErgebnis {
  const was = artName(art)
  const vorher = teamLaden(db, art, id)
  if (!vorher) return fehler(`Diese ${was} gibt es nicht mehr – vielleicht wurde sie schon gelöscht.`)
  if (!kannSparte(rechte, vorher.team.sparteId)) {
    return fehler(`Löschen dürfen nur Admins und die Spartenleitung. Du kannst die ${was} aber ausblenden.`)
  }
  try {
    db.transaction(tx => {
      // Trainingszeiten, die zusätzlich an einer Gruppe bzw. Mannschaft hängen, bleiben dort erhalten;
      // alle anderen löscht die Datenbank mit dem Team (ON DELETE CASCADE).
      const andereSpalte = art === 'mannschaft' ? schema.trainingszeiten.gruppeId : schema.trainingszeiten.mannschaftId
      tx.update(schema.trainingszeiten)
        .set(art === 'mannschaft' ? { mannschaftId: null } : { gruppeId: null })
        .where(and(eq(zeitSpalte(art), id), isNotNull(andereSpalte)))
        .run()
      if (art === 'mannschaft') tx.delete(schema.mannschaften).where(eq(schema.mannschaften.id, id)).run()
      else tx.delete(schema.gruppen).where(eq(schema.gruppen.id, id)).run()
      protokollieren(tx, rechte, {
        aktion: 'geloescht',
        objektTyp: OBJEKT_TYP[art],
        objektId: id,
        bezeichnung: bezeichnung(vorher),
        vorher: schnappschuss(vorher),
      })
    })
  } catch (err) {
    return datenbankFehlerMeldung(err, `Löschen einer ${was}`)
  }
  medienFreigeben(vorher.team.foto)
  return erfolg(`${was} „${vorher.team.name}“ wurde gelöscht.`)
}
