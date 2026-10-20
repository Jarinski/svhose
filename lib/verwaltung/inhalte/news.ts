/**
 * lib/verwaltung/inhalte/news.ts
 *
 * Speichern und Löschen von News – als reine Funktionen (Datenbank und Rechte werden übergeben),
 * damit sie sich ohne Next.js testen lassen. Die Server-Aktionen in
 * app/verwaltung/(intern)/news/aktionen.ts kümmern sich um Sitzung, Uploads und Neuladen.
 *
 * Rechte: Bearbeiten darf, wer die Zuordnung der News bearbeiten darf (kannZuordnung) –
 * beim Ändern sowohl die bisherige als auch die neue. Vereins-News ohne Zuordnung nur Admins.
 */

import { and, eq, ne } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { kannZuordnung, type Rechte } from '@/lib/verwaltung/rechte'
import { slugify } from '@/lib/verwaltung/text'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import {
  abgelehnt,
  datenbankFehler,
  FELDER_PRUEFEN,
  istDatum,
  KEINE_RECHTE,
  KONFLIKT,
  mehrzeilig,
  zuordnungAufloesen,
  type LoeschErgebnis,
  type SpeicherErgebnis,
} from './gemeinsam'

export interface NewsEingabe {
  /** null = neue News anlegen */
  id: number | null
  titel: string | null
  /** URL-Name; leer = automatisch aus der Überschrift */
  slug: string | null
  datum: string | null
  kategorie: string | null
  teaser: string | null
  inhalt: string | null
  /** "verein", "sparte:7", "mannschaft:6" oder "gruppe:3" */
  zuordnung: string | null
  veroeffentlicht: boolean
  /** geaendertAm beim Öffnen des Formulars (optimistische Sperre) */
  stand: string | null
  /** undefined = Bild unverändert, null = Bild entfernen, sonst das neu hochgeladene Bild */
  bild?: { pfad: string; breite: number; hoehe: number } | null
}

const SLUG_VERGEBEN = 'Diese Adresse ist schon an eine andere News vergeben. Bitte eine andere wählen.'

/** Prüft die Pflichtfelder – ohne Datenbank, damit vor einem Upload abgebrochen werden kann. */
export function newsPruefen(e: NewsEingabe): Record<string, string> {
  const felder: Record<string, string> = {}
  if (!e.titel) felder.titel = 'Bitte eine Überschrift eintragen.'
  else if (e.titel.length > 200) felder.titel = 'Die Überschrift ist zu lang (höchstens 200 Zeichen).'
  if (!istDatum(e.datum)) felder.datum = 'Bitte ein gültiges Datum wählen.'
  if (!e.zuordnung) felder.zuordnung = 'Bitte auswählen, zu wem die News gehört.'
  return felder
}

/** Ist der URL-Name schon an eine (andere) News vergeben? */
function slugBelegt(db: Datenbank, slug: string, ausserId: number | null): boolean {
  const bedingung = ausserId == null ? eq(schema.news.slug, slug) : and(eq(schema.news.slug, slug), ne(schema.news.id, ausserId))
  return !!db.select({ id: schema.news.id }).from(schema.news).where(bedingung).get()
}

/** Freier URL-Name: basis, sonst basis-2, basis-3 … */
export function freierNewsSlug(db: Datenbank, basis: string, ausserId: number | null = null): string {
  const grund = basis || 'news'
  let kandidat = grund
  for (let n = 2; slugBelegt(db, kandidat, ausserId); n++) kandidat = `${grund}-${n}`
  return kandidat
}

/** Legt eine News an oder ändert sie. Prüft Pflichtfelder, Rechte und die optimistische Sperre. */
export function newsSpeichern(db: Datenbank, rechte: Rechte, e: NewsEingabe): SpeicherErgebnis {
  const felder = newsPruefen(e)
  if (Object.keys(felder).length > 0) return abgelehnt(FELDER_PRUEFEN, felder)
  const titel = e.titel as string

  const ziel = zuordnungAufloesen(db, e.zuordnung)
  if (!ziel) return abgelehnt(FELDER_PRUEFEN, { zuordnung: 'Diese Auswahl gibt es nicht mehr. Bitte Seite neu laden.' })
  if (!kannZuordnung(db, rechte, ziel)) {
    return abgelehnt(FELDER_PRUEFEN, {
      zuordnung: ziel.sparteId == null ? 'News für den ganzen Verein dürfen nur Admins anlegen.' : 'Für diese Auswahl hast du keine Berechtigung.',
    })
  }

  const werte = {
    titel,
    datum: e.datum as string,
    kategorie: e.kategorie,
    teaser: e.teaser,
    inhalt: mehrzeilig(e.inhalt),
    veroeffentlicht: e.veroeffentlicht,
    ...ziel,
    ...(e.bild !== undefined
      ? { bild: e.bild?.pfad ?? null, bildBreite: e.bild?.breite ?? null, bildHoehe: e.bild?.hoehe ?? null }
      : {}),
  }

  try {
    return db.transaction((): SpeicherErgebnis => {
      // ── Neu anlegen ──
      if (e.id == null) {
        const slug = freierNewsSlug(db, slugify(e.slug || titel))
        const neu = db.insert(schema.news).values({ ...werte, slug }).returning().get()
        protokollieren(db, rechte, { aktion: 'angelegt', objektTyp: 'news', objektId: neu.id, bezeichnung: `News: ${neu.titel}`, nachher: neu })
        return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: null }
      }

      // ── Ändern ──
      const alt = db.select().from(schema.news).where(eq(schema.news.id, e.id)).get()
      if (!alt) return abgelehnt('Diese News gibt es nicht mehr – vielleicht wurde sie gerade gelöscht.')
      if (!kannZuordnung(db, rechte, alt)) return abgelehnt(KEINE_RECHTE)
      if (alt.geaendertAm !== e.stand) return abgelehnt(KONFLIKT)

      const gewuenscht = slugify(e.slug ?? '')
      let slug: string
      if (!gewuenscht) slug = freierNewsSlug(db, slugify(titel), alt.id)
      else if (gewuenscht !== alt.slug && slugBelegt(db, gewuenscht, alt.id)) return abgelehnt(FELDER_PRUEFEN, { slug: SLUG_VERGEBEN })
      else slug = gewuenscht

      const neu = db.update(schema.news).set({ ...werte, slug }).where(eq(schema.news.id, alt.id)).returning().get()
      protokollieren(db, rechte, { aktion: 'geaendert', objektTyp: 'news', objektId: neu.id, bezeichnung: `News: ${neu.titel}`, vorher: alt, nachher: neu })
      return { ok: true, id: neu.id, stand: neu.geaendertAm, alteDatei: alt.bild && alt.bild !== neu.bild ? alt.bild : null }
    })
  } catch (fehler) {
    return datenbankFehler(fehler, { slug: { feld: 'slug', meldung: SLUG_VERGEBEN } })
  }
}

/** Löscht eine News (mit Rechteprüfung). Das Bild gibt die aufrufende Aktion danach frei. */
export function newsLoeschen(db: Datenbank, rechte: Rechte, id: number): LoeschErgebnis {
  try {
    return db.transaction((): LoeschErgebnis => {
      const alt = db.select().from(schema.news).where(eq(schema.news.id, id)).get()
      if (!alt) return { ok: true, alteDatei: null }
      if (!kannZuordnung(db, rechte, alt)) return { ok: false, meldung: KEINE_RECHTE }
      db.delete(schema.news).where(eq(schema.news.id, id)).run()
      protokollieren(db, rechte, { aktion: 'geloescht', objektTyp: 'news', objektId: id, bezeichnung: `News: ${alt.titel}`, vorher: alt })
      return { ok: true, alteDatei: alt.bild }
    })
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return { ok: false, meldung: ergebnis.ok ? 'Löschen hat nicht geklappt.' : ergebnis.meldung }
  }
}
