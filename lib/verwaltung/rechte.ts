/**
 * lib/verwaltung/rechte.ts
 *
 * Wer darf was? Admins dürfen alles. Alle anderen Zugänge dürfen ihre Bereiche bearbeiten
 * (zugang_bereiche): eine Sparte mit allen Mannschaften und Gruppen darin – oder einzelne
 * Mannschaften bzw. Gruppen. Personen dürfen Nicht-Admins nur bearbeiten, wenn die Person
 * ausschließlich in ihrem eigenen Bereich vorkommt (siehe kannPerson) – und jede:r sich selbst.
 *
 * Jede Server-Aktion prüft diese Rechte selbst – die Oberfläche blendet nur aus.
 */

import { eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'

export interface Rechte {
  zugangId: number
  name: string
  istAdmin: boolean
  personId: number | null
  sparten: number[]
  mannschaften: number[]
  gruppen: number[]
}

export function rechteLaden(db: Datenbank, zugang: typeof schema.zugaenge.$inferSelect): Rechte {
  const bereiche = db.select().from(schema.zugangBereiche).where(eq(schema.zugangBereiche.zugangId, zugang.id)).all()
  return {
    zugangId: zugang.id,
    name: zugang.name,
    istAdmin: zugang.istAdmin,
    personId: zugang.personId,
    sparten: bereiche.map(b => b.sparteId).filter((x): x is number => x != null),
    mannschaften: bereiche.map(b => b.mannschaftId).filter((x): x is number => x != null),
    gruppen: bereiche.map(b => b.gruppeId).filter((x): x is number => x != null),
  }
}

export function kannSparte(r: Rechte, sparteId: number | null | undefined): boolean {
  if (r.istAdmin) return true
  return sparteId != null && r.sparten.indexOf(sparteId) >= 0
}

export function kannMannschaft(r: Rechte, m: { id: number; sparteId: number }): boolean {
  return kannSparte(r, m.sparteId) || r.mannschaften.indexOf(m.id) >= 0
}

export function kannGruppe(r: Rechte, g: { id: number; sparteId: number }): boolean {
  return kannSparte(r, g.sparteId) || r.gruppen.indexOf(g.id) >= 0
}

/** Darf der Zugang überhaupt Inhalte einer Sparte bearbeiten (die Sparte selbst oder eines ihrer Teams)? */
export function hatBereichInSparte(db: Datenbank, r: Rechte, sparteId: number): boolean {
  if (kannSparte(r, sparteId)) return true
  const m = db.select({ id: schema.mannschaften.id }).from(schema.mannschaften).where(eq(schema.mannschaften.sparteId, sparteId)).all()
  if (m.some(x => r.mannschaften.indexOf(x.id) >= 0)) return true
  const g = db.select({ id: schema.gruppen.id }).from(schema.gruppen).where(eq(schema.gruppen.sparteId, sparteId)).all()
  return g.some(x => r.gruppen.indexOf(x.id) >= 0)
}

/**
 * Darf der Zugang diese Person bearbeiten? Admins immer, jede:r die eigene verknüpfte Person.
 * Alle anderen nur, wenn die Person mindestens einmal und AUSSCHLIESSLICH im eigenen Bereich
 * vorkommt. Sonst könnte man eine fremde Person (z. B. aus dem Vorstand) kurz ins eigene Team
 * holen, ihre Kontaktdaten ändern und sie wieder entfernen. Personen mit Vereinsfunktion
 * (Kontaktseite) oder mit eigenem Zugang sind deshalb Admin-Sache.
 */
export function kannPerson(db: Pick<Datenbank, 'select'>, r: Rechte, personId: number): boolean {
  if (r.istAdmin || r.personId === personId) return true
  if (db.select({ id: schema.funktionen.id }).from(schema.funktionen).where(eq(schema.funktionen.personId, personId)).get()) return false
  if (db.select({ id: schema.zugaenge.id }).from(schema.zugaenge).where(eq(schema.zugaenge.personId, personId)).get()) return false

  const inMannschaften = db
    .select({ id: schema.mannschaften.id, sparteId: schema.mannschaften.sparteId })
    .from(schema.mannschaftPersonen)
    .innerJoin(schema.mannschaften, eq(schema.mannschaften.id, schema.mannschaftPersonen.mannschaftId))
    .where(eq(schema.mannschaftPersonen.personId, personId))
    .all()
  const inGruppen = db
    .select({ id: schema.gruppen.id, sparteId: schema.gruppen.sparteId })
    .from(schema.gruppePersonen)
    .innerJoin(schema.gruppen, eq(schema.gruppen.id, schema.gruppePersonen.gruppeId))
    .where(eq(schema.gruppePersonen.personId, personId))
    .all()
  const inSparten = db
    .select({ sparteId: schema.sparteAnsprechpartner.sparteId })
    .from(schema.sparteAnsprechpartner)
    .where(eq(schema.sparteAnsprechpartner.personId, personId))
    .all()

  const verwendungen = inMannschaften.length + inGruppen.length + inSparten.length
  return (
    verwendungen > 0 &&
    inMannschaften.every(m => kannMannschaft(r, m)) &&
    inGruppen.every(g => kannGruppe(r, g)) &&
    inSparten.every(s => kannSparte(r, s.sparteId))
  )
}

/** Darf der Zugang einen Inhalt mit dieser Zuordnung (News, Termin, Download) bearbeiten? Ohne Zuordnung = Verein → nur Admins. */
export function kannZuordnung(
  db: Datenbank,
  r: Rechte,
  z: { sparteId?: number | null; mannschaftId?: number | null; gruppeId?: number | null },
): boolean {
  if (r.istAdmin) return true
  if (z.mannschaftId != null) {
    const m = db.select().from(schema.mannschaften).where(eq(schema.mannschaften.id, z.mannschaftId)).get()
    if (!m || !kannMannschaft(r, m)) return false
  }
  if (z.gruppeId != null) {
    const g = db.select().from(schema.gruppen).where(eq(schema.gruppen.id, z.gruppeId)).get()
    if (!g || !kannGruppe(r, g)) return false
  }
  if (z.sparteId != null && z.mannschaftId == null && z.gruppeId == null) return kannSparte(r, z.sparteId)
  return z.sparteId != null || z.mannschaftId != null || z.gruppeId != null
}

export interface TeamEintrag {
  art: 'mannschaft' | 'gruppe'
  id: number
  name: string
  sparteId: number
  sparte: string
  reihenfolge: number
  sichtbar: boolean
}

/** Alle Mannschaften und Gruppen, die der Zugang bearbeiten darf – für Übersicht und Auswahllisten. */
export function bearbeitbareTeams(db: Datenbank, r: Rechte): TeamEintrag[] {
  const sparten = db.select().from(schema.sparten).all()
  const spartenName = new Map(sparten.map(s => [s.id, s.name] as const))
  const eintrag = (art: TeamEintrag['art'], t: { id: number; name: string; sparteId: number; reihenfolge: number; sichtbar: boolean }): TeamEintrag => ({
    art,
    id: t.id,
    name: t.name,
    sparteId: t.sparteId,
    sparte: spartenName.get(t.sparteId) ?? '',
    reihenfolge: t.reihenfolge,
    sichtbar: t.sichtbar,
  })
  const mannschaften = db.select().from(schema.mannschaften).all().filter(m => kannMannschaft(r, m)).map(m => eintrag('mannschaft', m))
  const gruppen = db.select().from(schema.gruppen).all().filter(g => kannGruppe(r, g)).map(g => eintrag('gruppe', g))
  return mannschaften.concat(gruppen).sort(
    (a, b) =>
      a.sparte.localeCompare(b.sparte, 'de') ||
      (a.art === b.art ? 0 : a.art === 'mannschaft' ? -1 : 1) ||
      a.reihenfolge - b.reihenfolge ||
      a.name.localeCompare(b.name, 'de', { numeric: true }),
  )
}
