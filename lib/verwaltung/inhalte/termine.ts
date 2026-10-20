/**
 * lib/verwaltung/inhalte/termine.ts
 *
 * Speichern und Löschen von Terminen als reine Funktionen (siehe news.ts).
 *
 * Nur manuelle Termine sind bearbeitbar. Termine von fussball.de und click-tt werden jede Nacht
 * abgeglichen – Änderungen würden überschrieben. Bearbeiten dürfen Admins und Zugänge, die die
 * Sparte des Termins bearbeiten dürfen; Termine ohne Sparte nur Admins.
 */

import { eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { kannSparte, type Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { datumDeutsch } from '@/lib/verwaltung/text'
import {
  abgelehnt,
  datenbankFehler,
  FELDER_PRUEFEN,
  istDatum,
  KEINE_RECHTE,
  KONFLIKT,
  kommaListe,
  vorschlaege,
  type LoeschErgebnis,
  type SpeicherErgebnis,
} from './gemeinsam'

type Termin = typeof schema.termine.$inferSelect

export const SYNC_HINWEIS = 'Wird jede Nacht von fussball.de/click-tt abgeglichen – Änderungen hier würden überschrieben.'

export const QUELLEN_NAMEN: Record<Termin['quelle'], string> = {
  manuell: 'Eigener Termin',
  'fussball-de': 'fussball.de',
  'click-tt': 'click-tt',
}

/** Darf der Zugang diesen Termin bearbeiten? */
export function terminBearbeitbar(r: Rechte, t: Pick<Termin, 'quelle' | 'sparteId'>): boolean {
  return t.quelle === 'manuell' && kannSparte(r, t.sparteId)
}

/** Darf der Zugang überhaupt Termine anlegen (Admin oder mindestens eine Sparte)? */
export function darfTermineAnlegen(r: Rechte): boolean {
  return r.istAdmin || r.sparten.length > 0
}

/** Auswahllisten und Vorschläge für das Termin-Formular. */
export function terminFormularDaten(db: Datenbank, r: Rechte) {
  const sparten = db
    .select({ id: schema.sparten.id, name: schema.sparten.name })
    .from(schema.sparten)
    .all()
    .filter(s => kannSparte(r, s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const alle = db.select({ bereich: schema.termine.bereich, tags: schema.termine.tags, quelle: schema.termine.quelle }).from(schema.termine).all()
  const tags: string[] = []
  alle
    .filter(t => t.quelle === 'manuell' && Array.isArray(t.tags))
    .forEach(t => t.tags.forEach(tag => tags.push(tag)))
  return {
    sparten,
    ohneSparteErlaubt: r.istAdmin,
    bereiche: vorschlaege(['Gesamtverein'].concat(alle.map(t => t.bereich ?? ''))),
    tags: vorschlaege(tags),
  }
}

export interface TerminEingabe {
  /** null = neuen Termin anlegen */
  id: number | null
  titel: string | null
  datum: string | null
  uhrzeit: string | null
  ort: string | null
  beschreibung: string | null
  bereich: string | null
  sparteId: number | null
  /** kommagetrennt, z. B. "Familie, Kinder" */
  tags: string | null
  /** geaendertAm beim Öffnen des Formulars (optimistische Sperre) */
  stand: string | null
  /** undefined = Bild unverändert, null = Bild entfernen, sonst Pfad des neu hochgeladenen Bildes */
  bild?: string | null
}

/** Prüft die Pflichtfelder – ohne Datenbank, damit vor einem Upload abgebrochen werden kann. */
export function terminPruefen(e: TerminEingabe): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!e.titel) felder.titel = 'Bitte einen Titel eintragen.'
  else if (e.titel.length > 200) felder.titel = 'Der Titel ist zu lang (höchstens 200 Zeichen).'
  if (!istDatum(e.datum)) felder.datum = 'Bitte ein gültiges Datum wählen.'
  return felder
}

function bezeichnung(t: Pick<Termin, 'titel' | 'datum'>): string {
  return `Termin: ${t.titel} (${datumDeutsch(t.datum)})`
}

export function terminSpeichern(db: Datenbank, rechte: Rechte, e: TerminEingabe): SpeicherErgebnis {
  const felder = terminPruefen(e)
  if (Object.keys(felder).length > 0) return abgelehnt(FELDER_PRUEFEN, felder)

  if (e.sparteId != null && !db.select({ id: schema.sparten.id }).from(schema.sparten).where(eq(schema.sparten.id, e.sparteId)).get()) {
    return abgelehnt(FELDER_PRUEFEN, { sparteId: 'Diese Sparte gibt es nicht mehr. Bitte Seite neu laden.' })
  }
  if (!kannSparte(rechte, e.sparteId)) {
    return abgelehnt(FELDER_PRUEFEN, {
      sparteId: e.sparteId == null ? 'Termine ohne Sparte dürfen nur Admins anlegen.' : 'Für diese Sparte hast du keine Berechtigung.',
    })
  }

  const werte = {
    titel: e.titel as string,
    datum: e.datum as string,
    uhrzeit: e.uhrzeit,
    ort: e.ort,
    beschreibung: e.beschreibung,
    bereich: e.bereich,
    sparteId: e.sparteId,
    tags: kommaListe(e.tags),
    ...(e.bild !== undefined ? { bild: e.bild } : {}),
  }

  try {
    return db.transaction((): SpeicherErgebnis => {
      if (e.id == null) {
        const neu = db
          .insert(schema.termine)
          .values({ ...werte, quelle: 'manuell', externeId: null })
          .returning()
          .get()
        protokollieren(db, rechte, { aktion: 'angelegt', objektTyp: 'termine', objektId: neu.id, bezeichnung: bezeichnung(neu), nachher: neu })
        return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: null }
      }

      const alt = db.select().from(schema.termine).where(eq(schema.termine.id, e.id)).get()
      if (!alt) return abgelehnt('Diesen Termin gibt es nicht mehr – vielleicht wurde er gerade gelöscht.')
      if (alt.quelle !== 'manuell') return abgelehnt(SYNC_HINWEIS)
      if (!kannSparte(rechte, alt.sparteId)) return abgelehnt(KEINE_RECHTE)
      if (alt.geaendertAm !== e.stand) return abgelehnt(KONFLIKT)

      const neu = db.update(schema.termine).set(werte).where(eq(schema.termine.id, alt.id)).returning().get()
      protokollieren(db, rechte, { aktion: 'geaendert', objektTyp: 'termine', objektId: neu.id, bezeichnung: bezeichnung(neu), vorher: alt, nachher: neu })
      return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: alt.bild && alt.bild !== neu.bild ? alt.bild : null }
    })
  } catch (fehler) {
    return datenbankFehler(fehler)
  }
}

export function terminLoeschen(db: Datenbank, rechte: Rechte, id: number): LoeschErgebnis {
  try {
    return db.transaction((): LoeschErgebnis => {
      const alt = db.select().from(schema.termine).where(eq(schema.termine.id, id)).get()
      if (!alt) return { ok: true, alteDatei: null }
      if (alt.quelle !== 'manuell') return { ok: false, meldung: SYNC_HINWEIS }
      if (!kannSparte(rechte, alt.sparteId)) return { ok: false, meldung: KEINE_RECHTE }
      db.delete(schema.termine).where(eq(schema.termine.id, id)).run()
      protokollieren(db, rechte, { aktion: 'geloescht', objektTyp: 'termine', objektId: id, bezeichnung: bezeichnung(alt), vorher: alt })
      return { ok: true, alteDatei: alt.bild }
    })
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return { ok: false, meldung: ergebnis.ok ? 'Löschen hat nicht geklappt.' : ergebnis.meldung }
  }
}
