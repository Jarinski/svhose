/**
 * Speicherlogik für den Vorstand des Fördervereins (Tabelle foerderverein_vorstand) als reine
 * Funktionen – genutzt von der Server-Aktion und direkt testbar gegen eine Datenbankkopie.
 *
 * Gespeichert wird immer die ganze Liste auf einmal (Abgleich): vorhandene Zeilen werden
 * aktualisiert, neue eingefügt, fehlende gelöscht. Die Reihenfolge ergibt sich aus der Position.
 * Personen, die es noch nicht gibt, werden dabei gleich angelegt (wie im Trainerteam).
 * Dazu gehört das Gruppenfoto des Vorstands (lib/foerderverein-gruppenfoto.ts), das mit derselben
 * Speicherung und derselben optimistischen Sperre gepflegt wird.
 */

import { createHash } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { ausschnittLesen, ausschnittText } from '@/lib/bild-ausschnitt'
import { GRUPPENFOTO_SCHLUESSEL, gruppenfotoLesen } from '@/lib/foerderverein-gruppenfoto'
import { MeldungsFehler } from '@/lib/verwaltung/fehlermeldung'
import { kontaktPruefen } from '@/lib/verwaltung/person-bearbeiten'
import { darfFoerdervereinVorstand, type Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'

type Lesend = Pick<Datenbank, 'select'>

export const VORSTAND_KONFLIKT = 'Inzwischen hat jemand anderes den Vorstand gespeichert. Bitte Seite neu laden.'
const UNLESBAR = 'Die Eingaben konnten nicht gelesen werden. Bitte die Seite neu laden.'
const MAX_BEZEICHNUNG = 60

export interface VorstandEingabe {
  /** Vorhandene Zeile – fehlt bei neuen Einträgen. */
  id?: number | null
  /** Vorhandene Person … */
  personId?: number | null
  /** … oder eine neue, die beim Speichern angelegt wird. */
  neu?: { name?: unknown; telefon?: unknown; email?: unknown } | null
  bezeichnung: string
  /** Statt der Kontaktdaten der Person eigene für die Förderverein-Seite zeigen (leere Felder = nicht anzeigen). */
  eigeneKontaktdaten?: unknown
  telefon?: unknown
  email?: unknown
}

/** Änderung am Gruppenfoto – das neue Foto ist beim Aufruf schon im Medienordner gespeichert. */
export interface GruppenfotoEingabe {
  /** Pfad eines neu hochgeladenen Fotos oder null */
  neu: string | null
  entfernen: boolean
  /** Feld "fotoAusschnitt": JSON-Text oder leer = mittig. null/undefined = unverändert (bei neuem Foto: mittig). */
  ausschnitt?: unknown
}

/** Der Vorstand in Anzeige-Reihenfolge, mit Personennamen. */
export function vorstandLaden(db: Lesend) {
  return db
    .select({
      id: schema.foerdervereinVorstand.id,
      personId: schema.foerdervereinVorstand.personId,
      person: schema.personen.name,
      bezeichnung: schema.foerdervereinVorstand.bezeichnung,
      reihenfolge: schema.foerdervereinVorstand.reihenfolge,
      eigeneKontaktdaten: schema.foerdervereinVorstand.eigeneKontaktdaten,
      telefon: schema.foerdervereinVorstand.telefon,
      email: schema.foerdervereinVorstand.email,
    })
    .from(schema.foerdervereinVorstand)
    .innerJoin(schema.personen, eq(schema.personen.id, schema.foerdervereinVorstand.personId))
    .orderBy(asc(schema.foerdervereinVorstand.reihenfolge), asc(schema.foerdervereinVorstand.id))
    .all()
}

/** Prüfsumme über den gespeicherten Stand – für die optimistische Sperre (wie bei der Kontaktseite). */
export function vorstandStand(db: Lesend): string {
  const zeilen = db.select().from(schema.foerdervereinVorstand).orderBy(asc(schema.foerdervereinVorstand.id)).all()
  const inhalt: unknown[] = zeilen.map(z => [z.id, z.personId, z.bezeichnung, z.reihenfolge, z.eigeneKontaktdaten, z.telefon, z.email, z.geaendertAm])
  inhalt.push(gruppenfotoLesen(db))
  return createHash('sha1').update(JSON.stringify(inhalt)).digest('hex').slice(0, 16)
}

function eigeneText(z: { telefon: string | null; email: string | null }): string {
  return [z.telefon, z.email].filter(Boolean).join(' · ') || 'keine Kontaktdaten'
}

/** Lesbarer Stand für den Verlauf, dazu die Rohdaten. */
function verlaufStand(db: Lesend) {
  const zeilen = vorstandLaden(db)
  const gruppenfoto = gruppenfotoLesen(db)
  return {
    Vorstand: zeilen.map(z => `${z.bezeichnung}: ${z.person}${z.eigeneKontaktdaten ? ` (für den Förderverein: ${eigeneText(z)})` : ''}`),
    Gruppenfoto: gruppenfoto ? `${gruppenfoto.foto}${gruppenfoto.ausschnitt ? ' (eigener Ausschnitt)' : ''}` : 'keins',
    // Rohdaten (für ein späteres Wiederherstellen); die Verlaufsansicht blendet "_"-Felder aus.
    _zeilen: zeilen.map(z => ({
      id: z.id,
      personId: z.personId,
      bezeichnung: z.bezeichnung,
      reihenfolge: z.reihenfolge,
      eigeneKontaktdaten: z.eigeneKontaktdaten,
      telefon: z.telefon,
      email: z.email,
    })),
    _gruppenfoto: gruppenfoto,
  }
}

/**
 * Gleicht den Vorstand mit der Eingabe ab. Für Admins und Zugänge mit Förderverein-Recht.
 * Liefert die Anzahl neuer, geänderter und entfernter Einträge, ob sich das Gruppenfoto geändert hat
 * und das ersetzte bzw. entfernte Foto (zum Freigeben nach dem Speichern).
 */
export function vorstandAbgleichen(
  db: Datenbank,
  wer: Rechte,
  eingabe: VorstandEingabe[],
  stand: string,
  fotoEingabe: GruppenfotoEingabe = { neu: null, entfernen: false },
): { neu: number; geaendert: number; entfernt: number; gruppenfoto: boolean; altesFoto: string | null } {
  if (!darfFoerdervereinVorstand(wer)) throw new MeldungsFehler('Den Vorstand des Fördervereins pflegen nur Admins und Zugänge mit Förderverein-Recht.')
  if (!Array.isArray(eingabe)) throw new MeldungsFehler(UNLESBAR)

  return db.transaction(tx => {
    if (vorstandStand(tx) !== stand) throw new MeldungsFehler(VORSTAND_KONFLIKT)

    const personIds = tx.select({ id: schema.personen.id }).from(schema.personen).all().map(p => p.id)
    const vorhanden = tx.select().from(schema.foerdervereinVorstand).all()
    const vorherStand = verlaufStand(tx)

    // Eingabe prüfen
    const soll: {
      id: number | null
      personId: number | null
      neu: { name: string; telefon: string | null; email: string | null } | null
      bezeichnung: string
      eigeneKontaktdaten: boolean
      telefon: string | null
      email: string | null
    }[] = []
    const gesehen: number[] = []
    const neueNamen: string[] = []
    eingabe.forEach((z, index) => {
      const zeile = `Zeile ${index + 1}: `
      const bezeichnung = (typeof z.bezeichnung === 'string' ? z.bezeichnung : '').trim()
      if (!bezeichnung) throw new MeldungsFehler(`${zeile}Bitte die Funktion eintragen (z. B. „1. Vorsitzender“).`)
      if (bezeichnung.length > MAX_BEZEICHNUNG) throw new MeldungsFehler(`${zeile}Die Funktion ist zu lang (höchstens ${MAX_BEZEICHNUNG} Zeichen).`)

      let personId: number | null = null
      let neu: (typeof soll)[number]['neu'] = null
      if (z.personId != null) {
        if (personIds.indexOf(z.personId) < 0) throw new MeldungsFehler('Eine ausgewählte Person gibt es nicht mehr. Bitte die Seite neu laden.')
        personId = z.personId
      } else if (z.neu && typeof z.neu === 'object') {
        const { daten, felder } = kontaktPruefen({ name: z.neu.name, telefon: z.neu.telefon, email: z.neu.email }, '', zeile)
        const ersterFehler = Object.keys(felder).map(k => felder[k])[0]
        if (ersterFehler) throw new MeldungsFehler(ersterFehler)
        if (neueNamen.indexOf(daten.name) >= 0) throw new MeldungsFehler(`„${daten.name}“ soll zweimal neu angelegt werden. Bitte eine der beiden Zeilen entfernen.`)
        neueNamen.push(daten.name)
        neu = { name: daten.name, telefon: daten.telefon, email: daten.email }
      } else {
        throw new MeldungsFehler(`${zeile}Bitte eine Person auswählen oder die Zeile entfernen.`)
      }

      // Eigene Kontaktdaten für den Förderverein – gleiche Regeln wie bei Personen (der Name spielt hier keine Rolle).
      const eigeneKontaktdaten = z.eigeneKontaktdaten === true
      let telefon: string | null = null
      let email: string | null = null
      if (eigeneKontaktdaten) {
        const geprueft = kontaktPruefen({ name: '-', telefon: z.telefon, email: z.email }, '', zeile)
        const ersterFehler = geprueft.felder.telefon ?? geprueft.felder.email
        if (ersterFehler) throw new MeldungsFehler(ersterFehler)
        telefon = geprueft.daten.telefon
        email = geprueft.daten.email
      }

      let id: number | null = null
      if (z.id != null) {
        // Unbekannte oder doppelte ids: Stand passt nicht zur Datenbank
        if (!vorhanden.some(v => v.id === z.id) || gesehen.indexOf(z.id) >= 0) throw new MeldungsFehler(VORSTAND_KONFLIKT)
        gesehen.push(z.id)
        id = z.id
      }
      soll.push({ id, personId, neu, bezeichnung, eigeneKontaktdaten, telefon, email })
    })

    let neu = 0
    let geaendert = 0
    let entfernt = 0
    vorhanden.forEach(v => {
      if (gesehen.indexOf(v.id) < 0) {
        tx.delete(schema.foerdervereinVorstand).where(eq(schema.foerdervereinVorstand.id, v.id)).run()
        entfernt++
      }
    })
    soll.forEach((z, reihenfolge) => {
      let personId = z.personId
      if (personId == null) {
        const person = tx.insert(schema.personen).values(z.neu!).returning().get()
        protokollieren(tx, wer, {
          aktion: 'angelegt',
          objektTyp: 'personen',
          objektId: person.id,
          bezeichnung: `${person.name} (${z.bezeichnung} im Förderverein-Vorstand)`,
          nachher: { id: person.id, name: person.name, telefon: person.telefon, email: person.email },
        })
        personId = person.id
      }
      const werte = { personId, bezeichnung: z.bezeichnung, reihenfolge, eigeneKontaktdaten: z.eigeneKontaktdaten, telefon: z.telefon, email: z.email }
      if (z.id == null) {
        tx.insert(schema.foerdervereinVorstand).values(werte).run()
        neu++
        return
      }
      const v = vorhanden.filter(x => x.id === z.id)[0]
      const anders = (Object.keys(werte) as (keyof typeof werte)[]).some(k => v[k] !== werte[k])
      if (anders) {
        tx.update(schema.foerdervereinVorstand).set(werte).where(eq(schema.foerdervereinVorstand.id, z.id)).run()
        geaendert++
      }
    })

    // Gruppenfoto: Ausschnitt gehört zum Foto – ohne Foto keiner, bei neuem Foto nur der mitgeschickte.
    const fotoVorher = gruppenfotoLesen(tx)
    const foto = fotoEingabe.neu ?? (fotoEingabe.entfernen ? null : (fotoVorher?.foto ?? null))
    const ausschnitt = !foto
      ? null
      : fotoEingabe.ausschnitt == null
        ? fotoEingabe.neu
          ? null
          : (fotoVorher?.ausschnitt ?? null)
        : ausschnittText(ausschnittLesen(fotoEingabe.ausschnitt))
    const gruppenfoto = foto !== (fotoVorher?.foto ?? null) || ausschnitt !== (fotoVorher?.ausschnitt ?? null)
    if (gruppenfoto) {
      if (foto) {
        const wert = { foto, ausschnitt }
        tx.insert(schema.einstellungen)
          .values({ schluessel: GRUPPENFOTO_SCHLUESSEL, wert })
          .onConflictDoUpdate({ target: schema.einstellungen.schluessel, set: { wert, geaendertAm: new Date().toISOString() } })
          .run()
      } else {
        tx.delete(schema.einstellungen).where(eq(schema.einstellungen.schluessel, GRUPPENFOTO_SCHLUESSEL)).run()
      }
    }
    const altesFoto = fotoVorher && fotoVorher.foto !== foto ? fotoVorher.foto : null

    if (neu + geaendert + entfernt > 0 || gruppenfoto) {
      const teile = [
        neu ? `${neu} neu` : '',
        geaendert ? `${geaendert} geändert` : '',
        entfernt ? `${entfernt} entfernt` : '',
        gruppenfoto ? 'Gruppenfoto geändert' : '',
      ]
        .filter(Boolean)
        .join(', ')
      protokollieren(tx, wer, {
        aktion: 'geaendert',
        objektTyp: 'foerderverein_vorstand',
        bezeichnung: `Förderverein-Vorstand (${teile})`,
        vorher: vorherStand,
        nachher: verlaufStand(tx),
      })
    }
    return { neu, geaendert, entfernt, gruppenfoto, altesFoto }
  })
}
