/**
 * lib/verwaltung/inhalte/downloads.ts
 *
 * Speichern und Löschen von Downloads (PDFs) als reine Funktionen (siehe news.ts).
 * Downloads pflegen nur Admins.
 */

import { eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { FOERDERVEREIN_KATEGORIE, kategorieVereinheitlichen } from '@/lib/foerderverein'
import { schema } from '@/lib/db'
import type { Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import {
  abgelehnt,
  datenbankFehler,
  FELDER_PRUEFEN,
  istDatum,
  KEINE_RECHTE,
  KONFLIKT,
  vorschlaege,
  type LoeschErgebnis,
  type SpeicherErgebnis,
} from './gemeinsam'

/** Auswahllisten und Vorschläge für das Download-Formular. */
export function downloadFormularDaten(db: Datenbank) {
  return {
    sparten: db
      .select({ id: schema.sparten.id, name: schema.sparten.name })
      .from(schema.sparten)
      .all()
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    kategorien: vorschlaege([FOERDERVEREIN_KATEGORIE, ...db.select({ k: schema.downloads.kategorie }).from(schema.downloads).all().map(d => d.k)]),
  }
}

export interface DownloadEingabe {
  /** null = neuen Download anlegen */
  id: number | null
  titel: string | null
  beschreibung: string | null
  kategorie: string | null
  /** "YYYY-MM-DD" oder leer */
  datum: string | null
  sparteId: number | null
  /** geaendertAm beim Öffnen des Formulars (optimistische Sperre) */
  stand: string | null
  /** Pfad der neu hochgeladenen PDF-Datei; undefined = Datei unverändert */
  datei?: string
}

/** Prüft die Pflichtfelder – ohne Datenbank, damit vor einem Upload abgebrochen werden kann. */
export function downloadPruefen(e: DownloadEingabe, mitDatei: boolean): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!e.titel) felder.titel = 'Bitte einen Titel eintragen.'
  else if (e.titel.length > 200) felder.titel = 'Der Titel ist zu lang (höchstens 200 Zeichen).'
  if (e.datum && !istDatum(e.datum)) felder.datum = 'Bitte ein gültiges Datum wählen oder das Feld leer lassen.'
  if (e.id == null && !mitDatei) felder.datei = 'Bitte eine PDF-Datei auswählen.'
  return felder
}

export function downloadSpeichern(db: Datenbank, rechte: Rechte, e: DownloadEingabe): SpeicherErgebnis {
  if (!rechte.istAdmin) return abgelehnt(KEINE_RECHTE)
  const felder = downloadPruefen(e, e.datei !== undefined)
  if (Object.keys(felder).length > 0) return abgelehnt(FELDER_PRUEFEN, felder)
  if (e.sparteId != null && !db.select({ id: schema.sparten.id }).from(schema.sparten).where(eq(schema.sparten.id, e.sparteId)).get()) {
    return abgelehnt(FELDER_PRUEFEN, { sparteId: 'Diese Sparte gibt es nicht mehr. Bitte Seite neu laden.' })
  }

  const werte = {
    titel: e.titel as string,
    beschreibung: e.beschreibung,
    kategorie: kategorieVereinheitlichen(e.kategorie),
    datum: e.datum,
    sparteId: e.sparteId,
    ...(e.datei !== undefined ? { datei: e.datei } : {}),
  }

  try {
    return db.transaction((): SpeicherErgebnis => {
      if (e.id == null) {
        const neu = db
          .insert(schema.downloads)
          .values({ ...werte, datei: e.datei as string })
          .returning()
          .get()
        protokollieren(db, rechte, { aktion: 'angelegt', objektTyp: 'downloads', objektId: neu.id, bezeichnung: `Download: ${neu.titel}`, nachher: neu })
        return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: null }
      }

      const alt = db.select().from(schema.downloads).where(eq(schema.downloads.id, e.id)).get()
      if (!alt) return abgelehnt('Diesen Download gibt es nicht mehr – vielleicht wurde er gerade gelöscht.')
      if (alt.geaendertAm !== e.stand) return abgelehnt(KONFLIKT)

      const neu = db.update(schema.downloads).set(werte).where(eq(schema.downloads.id, alt.id)).returning().get()
      protokollieren(db, rechte, { aktion: 'geaendert', objektTyp: 'downloads', objektId: neu.id, bezeichnung: `Download: ${neu.titel}`, vorher: alt, nachher: neu })
      return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: alt.datei !== neu.datei ? alt.datei : null }
    })
  } catch (fehler) {
    return datenbankFehler(fehler)
  }
}

export function downloadLoeschen(db: Datenbank, rechte: Rechte, id: number): LoeschErgebnis {
  if (!rechte.istAdmin) return { ok: false, meldung: KEINE_RECHTE }
  try {
    return db.transaction((): LoeschErgebnis => {
      const alt = db.select().from(schema.downloads).where(eq(schema.downloads.id, id)).get()
      if (!alt) return { ok: true, alteDatei: null }
      db.delete(schema.downloads).where(eq(schema.downloads.id, id)).run()
      protokollieren(db, rechte, { aktion: 'geloescht', objektTyp: 'downloads', objektId: id, bezeichnung: `Download: ${alt.titel}`, vorher: alt })
      return { ok: true, alteDatei: alt.datei }
    })
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return { ok: false, meldung: ergebnis.ok ? 'Löschen hat nicht geklappt.' : ergebnis.meldung }
  }
}
