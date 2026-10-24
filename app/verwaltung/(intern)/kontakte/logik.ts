/**
 * Speicherlogik der Kontaktseite (Tabelle funktionen) als reine Funktionen –
 * genutzt von der Server-Aktion und direkt testbar gegen eine Datenbankkopie.
 *
 * Gespeichert wird immer die ganze Seite auf einmal (Abgleich): vorhandene Zeilen werden
 * aktualisiert, neue eingefügt, fehlende gelöscht. Die Reihenfolge ergibt sich aus der Position.
 */

import { createHash } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { MeldungsFehler } from '@/lib/verwaltung/fehlermeldung'
import type { Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'

type Lesend = Pick<Datenbank, 'select'>
export type FunktionsGruppe = (typeof schema.FUNKTIONS_GRUPPEN)[number]

export const GRUPPEN_NAMEN: Record<FunktionsGruppe, string> = {
  vorstand: 'Vorstand',
  abteilungsleitung: 'Abteilungsleitung',
  weitere: 'Weitere Ansprechpartner',
}

export const KONTAKTE_KONFLIKT = 'Inzwischen hat jemand anderes die Kontaktseite gespeichert. Bitte Seite neu laden.'

export interface FunktionEingabe {
  /** Vorhandene Zeile – fehlt bei neuen Funktionen. */
  id?: number | null
  personId: number | null
  bezeichnung: string
  sparteId: number | null
}

export type KontakteEingabe = Record<FunktionsGruppe, FunktionEingabe[]>

/** Alle Funktionen in Anzeige-Reihenfolge, mit Personen- und Spartennamen. */
export function funktionenLaden(db: Lesend) {
  const zeilen = db
    .select({
      id: schema.funktionen.id,
      personId: schema.funktionen.personId,
      person: schema.personen.name,
      bezeichnung: schema.funktionen.bezeichnung,
      gruppe: schema.funktionen.gruppe,
      sparteId: schema.funktionen.sparteId,
      sparte: schema.sparten.name,
      reihenfolge: schema.funktionen.reihenfolge,
    })
    .from(schema.funktionen)
    .innerJoin(schema.personen, eq(schema.personen.id, schema.funktionen.personId))
    .leftJoin(schema.sparten, eq(schema.sparten.id, schema.funktionen.sparteId))
    .orderBy(asc(schema.funktionen.reihenfolge), asc(schema.personen.name), asc(schema.funktionen.id))
    .all()
  return schema.FUNKTIONS_GRUPPEN.map(g => zeilen.filter(z => z.gruppe === g)).reduce((a, b) => a.concat(b), [])
}

/**
 * Prüfsumme über den gespeicherten Stand – für die optimistische Sperre: Hat jemand anderes
 * zwischen Laden und Speichern etwas geändert, passt sie nicht mehr.
 */
export function kontakteStand(db: Lesend): string {
  const zeilen = db.select().from(schema.funktionen).orderBy(asc(schema.funktionen.id)).all()
  const inhalt = zeilen.map(z => [z.id, z.personId, z.bezeichnung, z.gruppe, z.sparteId, z.reihenfolge, z.geaendertAm])
  return createHash('sha1').update(JSON.stringify(inhalt)).digest('hex').slice(0, 16)
}

/** Lesbarer Stand für den Verlauf: je Abschnitt eine Zeile pro Funktion, dazu die Rohdaten. */
function verlaufStand(db: Lesend) {
  const zeilen = funktionenLaden(db)
  const lesbar: Record<string, string[]> = {}
  schema.FUNKTIONS_GRUPPEN.forEach(g => {
    lesbar[GRUPPEN_NAMEN[g]] = zeilen
      .filter(z => z.gruppe === g)
      .map(z => `${z.bezeichnung}: ${z.person}${z.sparte ? ` (${z.sparte})` : ''}`)
  })
  return {
    ...lesbar,
    // Rohdaten (für ein späteres Wiederherstellen); die Verlaufsansicht blendet "_"-Felder aus.
    _zeilen: zeilen.map(z => ({ id: z.id, personId: z.personId, bezeichnung: z.bezeichnung, gruppe: z.gruppe, sparteId: z.sparteId, reihenfolge: z.reihenfolge })),
  }
}

/**
 * Gleicht die Kontaktseite mit der Eingabe ab. Nur für Admins.
 * Liefert die Anzahl neuer, geänderter und entfernter Funktionen.
 */
export function funktionenAbgleichen(
  db: Datenbank,
  wer: Rechte,
  eingabe: KontakteEingabe,
  stand: string,
): { neu: number; geaendert: number; entfernt: number } {
  if (!wer.istAdmin) throw new MeldungsFehler('Die Kontaktseite können nur Admins bearbeiten.')

  return db.transaction(tx => {
    if (kontakteStand(tx) !== stand) throw new MeldungsFehler(KONTAKTE_KONFLIKT)

    const personIds = tx.select({ id: schema.personen.id }).from(schema.personen).all().map(p => p.id)
    const sparteIds = tx.select({ id: schema.sparten.id }).from(schema.sparten).all().map(s => s.id)
    const vorhanden = tx.select().from(schema.funktionen).all()
    const vorherStand = verlaufStand(tx)

    // Eingabe prüfen und in eine flache Liste bringen
    const soll: { id: number | null; personId: number; bezeichnung: string; gruppe: FunktionsGruppe; sparteId: number | null; reihenfolge: number }[] = []
    const gesehen: number[] = []
    schema.FUNKTIONS_GRUPPEN.forEach(gruppe => {
      const liste = eingabe[gruppe]
      if (!Array.isArray(liste)) throw new MeldungsFehler('Die Eingaben konnten nicht gelesen werden. Bitte die Seite neu laden.')
      liste.forEach((z, index) => {
        const bezeichnung = (z.bezeichnung ?? '').trim()
        const abschnitt = GRUPPEN_NAMEN[gruppe]
        if (z.personId == null) throw new MeldungsFehler(`Im Abschnitt „${abschnitt}“ fehlt bei Zeile ${index + 1} die Person.`)
        if (personIds.indexOf(z.personId) < 0) throw new MeldungsFehler('Eine ausgewählte Person gibt es nicht mehr. Bitte die Seite neu laden.')
        if (!bezeichnung) throw new MeldungsFehler(`Im Abschnitt „${abschnitt}“ fehlt bei Zeile ${index + 1} die Bezeichnung (z. B. „1. Vorsitzende:r“).`)
        if (z.sparteId != null && sparteIds.indexOf(z.sparteId) < 0) throw new MeldungsFehler('Eine ausgewählte Sparte gibt es nicht mehr. Bitte die Seite neu laden.')
        let id: number | null = null
        if (z.id != null) {
          // Unbekannte oder doppelte ids: Stand passt nicht zur Datenbank
          if (!vorhanden.some(v => v.id === z.id) || gesehen.indexOf(z.id) >= 0) throw new MeldungsFehler(KONTAKTE_KONFLIKT)
          gesehen.push(z.id)
          id = z.id
        }
        soll.push({ id, personId: z.personId, bezeichnung, gruppe, sparteId: z.sparteId ?? null, reihenfolge: index })
      })
    })

    // Reihenfolge nur dort neu durchnummerieren, wo sie sich wirklich geändert hat – sonst bleiben die
    // gespeicherten Werte (z. B. aus dem Import) stehen und unverändertes Speichern ändert nichts.
    const geladen = funktionenLaden(tx)
    schema.FUNKTIONS_GRUPPEN.forEach(gruppe => {
      const zeilen = soll.filter(z => z.gruppe === gruppe)
      const bisher = geladen.filter(g => g.gruppe === gruppe && gesehen.indexOf(g.id) >= 0).map(g => g.id)
      const vorhandeneZuerst = zeilen.every((z, i) => (i < bisher.length ? z.id === bisher[i] : z.id == null))
      if (!vorhandeneZuerst) return
      let max = -1
      zeilen.forEach(z => {
        if (z.id == null) {
          max += 1
          z.reihenfolge = max
        } else {
          const v = vorhanden.filter(x => x.id === z.id)[0]
          z.reihenfolge = v.reihenfolge
          if (v.reihenfolge > max) max = v.reihenfolge
        }
      })
    })

    let neu = 0
    let geaendert = 0
    let entfernt = 0
    vorhanden.forEach(v => {
      if (gesehen.indexOf(v.id) < 0) {
        tx.delete(schema.funktionen).where(eq(schema.funktionen.id, v.id)).run()
        entfernt++
      }
    })
    soll.forEach(z => {
      const werte = { personId: z.personId, bezeichnung: z.bezeichnung, gruppe: z.gruppe, sparteId: z.sparteId, reihenfolge: z.reihenfolge }
      if (z.id == null) {
        tx.insert(schema.funktionen).values(werte).run()
        neu++
        return
      }
      const v = vorhanden.filter(x => x.id === z.id)[0]
      const anders =
        v.personId !== werte.personId ||
        v.bezeichnung !== werte.bezeichnung ||
        v.gruppe !== werte.gruppe ||
        v.sparteId !== werte.sparteId ||
        v.reihenfolge !== werte.reihenfolge
      if (anders) {
        tx.update(schema.funktionen).set(werte).where(eq(schema.funktionen.id, z.id)).run()
        geaendert++
      }
    })

    if (neu + geaendert + entfernt > 0) {
      const teile = [neu ? `${neu} neu` : '', geaendert ? `${geaendert} geändert` : '', entfernt ? `${entfernt} entfernt` : ''].filter(Boolean).join(', ')
      protokollieren(tx, wer, {
        aktion: 'geaendert',
        objektTyp: 'funktionen',
        bezeichnung: `Kontaktseite (${teile})`,
        vorher: vorherStand,
        nachher: verlaufStand(tx),
      })
    }
    return { neu, geaendert, entfernt }
  })
}
