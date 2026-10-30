/**
 * Speicherlogik der Sparten als reine Funktionen (ohne Next.js-Abhängigkeiten) –
 * genutzt von den Server-Aktionen und direkt testbar gegen eine Datenbankkopie.
 * Jede Funktion prüft die Rechte selbst und protokolliert ihre Änderungen im Verlauf.
 */

import { asc, eq, sql } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { MeldungsFehler } from '@/lib/verwaltung/fehlermeldung'
import { kannSparte, type Rechte } from '@/lib/verwaltung/rechte'
import { slugify } from '@/lib/verwaltung/text'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { KONFLIKT_MELDUNG, STANDARD_ROLLE } from './konstanten'

type Tx = Parameters<Parameters<Datenbank['transaction']>[0]>[0]
type Lesend = Pick<Datenbank, 'select'>
type Wer = Rechte

const KEINE_RECHTE = 'Dafür fehlen dir die Rechte.'
const NICHT_GEFUNDEN = 'Diese Sparte gibt es nicht mehr. Bitte die Seite neu laden.'

/** Liefert einen noch freien Slug auf Basis des Textes ("fussball", "fussball-2", …). */
export function eindeutigerSlug(db: Lesend, text: string, ausserId?: number): string {
  const basis = slugify(text) || 'sparte'
  const belegt = db
    .select({ id: schema.sparten.id, slug: schema.sparten.slug })
    .from(schema.sparten)
    .all()
    .filter(s => s.id !== ausserId)
    .map(s => s.slug)
  if (belegt.indexOf(basis) < 0) return basis
  for (let i = 2; ; i++) {
    const kandidat = `${basis}-${i}`
    if (belegt.indexOf(kandidat) < 0) return kandidat
  }
}

// ─── Anlegen ────────────────────────────────────────────────────────────────

export function sparteAnlegen(db: Datenbank, wer: Wer, nameRoh: string): { id: number; slug: string } {
  if (!wer.istAdmin) throw new MeldungsFehler('Neue Sparten können nur Admins anlegen.')
  const name = nameRoh.trim()
  if (!name) throw new MeldungsFehler('Bitte einen Namen eintragen.', { name: 'Bitte einen Namen eintragen.' })

  return db.transaction(tx => {
    const slug = eindeutigerSlug(tx, name)
    const max = tx.select({ max: sql<number | null>`max(${schema.sparten.reihenfolge})` }).from(schema.sparten).get()
    const neu = tx
      .insert(schema.sparten)
      // Neue Sparten starten ausgeblendet, damit keine leere Seite öffentlich erscheint.
      .values({ name, slug, sichtbar: false, reihenfolge: (max?.max ?? -1) + 1 })
      .returning()
      .get()
    protokollieren(tx, wer, { aktion: 'angelegt', objektTyp: 'sparten', objektId: neu.id, bezeichnung: `Sparte ${name}`, nachher: neu })
    return { id: neu.id, slug: neu.slug }
  })
}

// ─── Bearbeiten ─────────────────────────────────────────────────────────────

export interface AnsprechpartnerEingabe {
  personId: number
  rolle: string
}

export interface SparteEingabe {
  /** Stand beim Laden des Formulars – für die optimistische Sperre. */
  geaendertAm: string
  name: string
  icon: string | null
  farbe: string | null
  kurzbeschreibung: string | null
  beschreibung: string | null
  sichtbar: boolean
  reihenfolge: number
  /** Nur Admins; undefined = unverändert lassen. */
  slug?: string
  fotoEntfernen: boolean
  /** Pfad eines bereits gespeicherten neuen Fotos (Upload läuft vor der Transaktion). */
  neuesFoto?: string | null
  ansprechpartner: AnsprechpartnerEingabe[]
}

/** Ansprechpartner:innen einer Sparte in Reihenfolge, mit Namen (für Formular und Verlauf). */
export function ansprechpartnerLaden(db: Lesend, sparteId: number) {
  return db
    .select({
      personId: schema.sparteAnsprechpartner.personId,
      name: schema.personen.name,
      rolle: schema.sparteAnsprechpartner.rolle,
    })
    .from(schema.sparteAnsprechpartner)
    .innerJoin(schema.personen, eq(schema.personen.id, schema.sparteAnsprechpartner.personId))
    .where(eq(schema.sparteAnsprechpartner.sparteId, sparteId))
    .orderBy(asc(schema.sparteAnsprechpartner.reihenfolge), asc(schema.personen.name))
    .all()
}

function schnappschuss(tx: Lesend, sparteId: number) {
  const sparte = tx.select().from(schema.sparten).where(eq(schema.sparten.id, sparteId)).get()
  if (!sparte) return null
  return { ...sparte, ansprechpartner: ansprechpartnerLaden(tx, sparteId) }
}

const FARBE = /^#[0-9a-fA-F]{6}$/

/** Prüft und vereinheitlicht die Eingaben; wirft MeldungsFehler mit Feldfehlern. */
function eingabePruefen(tx: Tx, e: SparteEingabe) {
  const felder: Record<string, string> = {}
  const name = e.name.trim()
  if (!name) felder.name = 'Bitte einen Namen eintragen.'
  const farbe = e.farbe?.trim() || null
  if (farbe && !FARBE.test(farbe)) felder.farbe = 'Bitte eine Farbe im Format #12ab56 eintragen – oder das Feld leer lassen.'
  if (!Number.isInteger(e.reihenfolge)) felder.reihenfolge = 'Bitte eine ganze Zahl eintragen.'

  let slug: string | undefined
  if (e.slug !== undefined) {
    slug = slugify(e.slug)
    if (!slug) felder.slug = 'Bitte eine Adresse eintragen (nur Kleinbuchstaben, Ziffern und Bindestriche).'
  }

  const personIds = e.ansprechpartner.map(a => a.personId)
  const vorhandene = tx
    .select({ id: schema.personen.id })
    .from(schema.personen)
    .all()
    .map(p => p.id)
  if (personIds.some(id => vorhandene.indexOf(id) < 0)) {
    felder.ansprechpartner = 'Eine ausgewählte Person gibt es nicht mehr. Bitte die Seite neu laden.'
  } else if (personIds.some((id, i) => personIds.indexOf(id) !== i)) {
    felder.ansprechpartner = 'Jede Person kann nur einmal Ansprechpartner:in derselben Sparte sein.'
  }

  if (Object.keys(felder).length > 0) {
    throw new MeldungsFehler('Bitte die markierten Angaben prüfen.', felder)
  }
  return {
    name,
    icon: e.icon?.trim() || null,
    farbe: farbe ? farbe.toLowerCase() : null,
    kurzbeschreibung: e.kurzbeschreibung?.trim() || null,
    beschreibung: e.beschreibung?.trim() || null,
    sichtbar: e.sichtbar,
    reihenfolge: e.reihenfolge,
    slug,
    ansprechpartner: e.ansprechpartner.map(a => ({ personId: a.personId, rolle: a.rolle.trim() || STANDARD_ROLLE })),
  }
}

/**
 * Speichert eine Sparte samt Ansprechpartner:innen. Liefert den alten Fotopfad, wenn das Foto
 * ersetzt oder entfernt wurde – die Datei gibt der Aufrufer NACH dem Speichern frei.
 */
export function sparteSpeichern(
  db: Datenbank,
  wer: Wer,
  sparteId: number,
  eingabe: SparteEingabe,
): { geaendert: boolean; altesFoto: string | null } {
  return db.transaction(tx => {
    const vorher = schnappschuss(tx, sparteId)
    if (!vorher) throw new MeldungsFehler(NICHT_GEFUNDEN)
    if (!kannSparte(wer, sparteId)) throw new MeldungsFehler(KEINE_RECHTE)
    if (vorher.geaendertAm !== eingabe.geaendertAm) throw new MeldungsFehler(KONFLIKT_MELDUNG)
    if (eingabe.slug !== undefined && !wer.istAdmin) throw new MeldungsFehler('Die Adresse einer Sparte können nur Admins ändern.')

    const e = eingabePruefen(tx, eingabe)
    const foto = eingabe.neuesFoto ? eingabe.neuesFoto : eingabe.fotoEntfernen ? null : vorher.foto
    const slug = e.slug ?? vorher.slug
    if (slug !== vorher.slug) {
      const belegt = tx.select({ id: schema.sparten.id }).from(schema.sparten).where(eq(schema.sparten.slug, slug)).get()
      if (belegt) throw new MeldungsFehler('Diese Adresse hat schon eine andere Sparte.', { slug: 'Diese Adresse ist schon vergeben.' })
    }

    const werte = {
      name: e.name,
      slug,
      icon: e.icon,
      farbe: e.farbe,
      kurzbeschreibung: e.kurzbeschreibung,
      beschreibung: e.beschreibung,
      foto,
      sichtbar: e.sichtbar,
      reihenfolge: e.reihenfolge,
    }
    const apAlt = vorher.ansprechpartner.map(a => ({ personId: a.personId, rolle: a.rolle }))
    const unveraendert =
      (Object.keys(werte) as (keyof typeof werte)[]).every(k => werte[k] === vorher[k]) &&
      JSON.stringify(apAlt) === JSON.stringify(e.ansprechpartner)
    if (unveraendert) return { geaendert: false, altesFoto: null }

    tx.update(schema.sparten)
      .set({ ...werte, geaendertAm: new Date().toISOString() })
      .where(eq(schema.sparten.id, sparteId))
      .run()
    tx.delete(schema.sparteAnsprechpartner).where(eq(schema.sparteAnsprechpartner.sparteId, sparteId)).run()
    if (e.ansprechpartner.length > 0) {
      tx.insert(schema.sparteAnsprechpartner)
        .values(e.ansprechpartner.map((a, i) => ({ sparteId, personId: a.personId, rolle: a.rolle, reihenfolge: i })))
        .run()
    }

    protokollieren(tx, wer, {
      aktion: 'geaendert',
      objektTyp: 'sparten',
      objektId: sparteId,
      bezeichnung: `Sparte ${e.name}`,
      vorher,
      nachher: schnappschuss(tx, sparteId),
    })
    return { geaendert: true, altesFoto: vorher.foto && vorher.foto !== foto ? vorher.foto : null }
  })
}

// ─── Löschen ────────────────────────────────────────────────────────────────

/** Löscht eine Sparte ohne Mannschaften und Gruppen. Liefert den Fotopfad zum Freigeben. */
export function sparteLoeschen(db: Datenbank, wer: Wer, sparteId: number): { name: string; foto: string | null } {
  if (!wer.istAdmin) throw new MeldungsFehler('Sparten können nur Admins löschen.')
  return db.transaction(tx => {
    const vorher = schnappschuss(tx, sparteId)
    if (!vorher) throw new MeldungsFehler(NICHT_GEFUNDEN)
    const anzahl = (tabelle: typeof schema.mannschaften | typeof schema.gruppen) =>
      tx.select({ n: sql<number>`count(*)` }).from(tabelle).where(eq(tabelle.sparteId, sparteId)).get()?.n ?? 0
    const m = anzahl(schema.mannschaften)
    const g = anzahl(schema.gruppen)
    if (m + g > 0) {
      const teile = [m > 0 ? `${m} ${m === 1 ? 'Mannschaft' : 'Mannschaften'}` : '', g > 0 ? `${g} ${g === 1 ? 'Gruppe' : 'Gruppen'}` : '']
        .filter(Boolean)
        .join(' und ')
      throw new MeldungsFehler(
        `Die Sparte „${vorher.name}“ hat noch ${teile}. Bitte diese zuerst löschen oder einer anderen Sparte zuordnen – dann lässt sich die Sparte löschen.`,
      )
    }
    tx.delete(schema.sparten).where(eq(schema.sparten.id, sparteId)).run()
    protokollieren(tx, wer, { aktion: 'geloescht', objektTyp: 'sparten', objektId: sparteId, bezeichnung: `Sparte ${vorher.name}`, vorher })
    return { name: vorher.name, foto: vorher.foto }
  })
}
