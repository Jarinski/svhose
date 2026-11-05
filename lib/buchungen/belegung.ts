/**
 * lib/buchungen/belegung.ts
 *
 * Wer belegt wann Vereinsheim und Gelände? Fügt Regelbelegung (jede Woche, ohne ausgefallene
 * Tage) und Buchungen zu einer Liste zusammen – für den Kalender der Verwaltung, die Prüfung auf
 * Überschneidungen und die Verfügbarkeit im öffentlichen Buchungsformular.
 */

import { and, gte, inArray, lt } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import {
  BELEGENDE_STATUS,
  orteUeberschneiden,
  tagPlus,
  wochentag,
  zeitenUeberschneiden,
  type BuchungOrt,
  type BuchungStatus,
  type Zeitraum,
} from './zeit'

type Lesend = Pick<Datenbank, 'select'>
type Buchung = typeof schema.buchungen.$inferSelect
type Regel = typeof schema.belegungRegeln.$inferSelect

export interface RegelTermin extends Zeitraum {
  typ: 'regel'
  regelId: number
  titel: string
  ort: BuchungOrt
  /** Tag, für den die Regel gilt (Beginn) */
  datum: string
  ausgefallen: boolean
}

export interface BuchungsTermin extends Zeitraum {
  typ: 'buchung'
  buchung: Buchung
  titel: string
  ort: BuchungOrt
  status: BuchungStatus
}

export type BelegungsEintrag = RegelTermin | BuchungsTermin

/** Gilt die Regel an diesem Tag (Wochentag und Gültigkeitszeitraum)? */
export function regelGiltAm(r: Pick<Regel, 'wochentag' | 'gueltigAb' | 'gueltigBis'>, datum: string): boolean {
  return wochentag(datum) === r.wochentag && (!r.gueltigAb || datum >= r.gueltigAb) && (!r.gueltigBis || datum <= r.gueltigBis)
}

/** Zeitraum einer Regel an einem Tag: endet sie nicht nach dem Beginn, reicht sie in den Folgetag. */
export function regelZeitraum(r: Pick<Regel, 'beginn' | 'ende'>, datum: string): Zeitraum {
  return { von: `${datum}T${r.beginn}`, bis: r.ende > r.beginn ? `${datum}T${r.ende}` : `${tagPlus(datum, 1)}T${r.ende}` }
}

/** Alle Termine der Regelbelegung, die in [vonDatum, bisDatum) beginnen – samt ausgefallener Tage (markiert). */
export function regelTermine(db: Lesend, vonDatum: string, bisDatum: string): RegelTermin[] {
  const regeln = db.select().from(schema.belegungRegeln).all()
  if (regeln.length === 0) return []
  const ausfaelle = new Set(
    db
      .select()
      .from(schema.belegungAusfaelle)
      .where(and(gte(schema.belegungAusfaelle.datum, vonDatum), lt(schema.belegungAusfaelle.datum, bisDatum)))
      .all()
      .map(a => `${a.regelId}|${a.datum}`),
  )
  const termine: RegelTermin[] = []
  for (let datum = vonDatum; datum < bisDatum; datum = tagPlus(datum, 1)) {
    for (const r of regeln) {
      if (!regelGiltAm(r, datum)) continue
      termine.push({
        typ: 'regel',
        regelId: r.id,
        titel: r.titel,
        ort: r.ort,
        datum,
        ...regelZeitraum(r, datum),
        ausgefallen: ausfaelle.has(`${r.id}|${datum}`),
      })
    }
  }
  return termine
}

/** Buchungen, die sich mit [vonDatum, bisDatum) überschneiden – standardmäßig nur belegende (ohne abgelehnte/stornierte). */
export function buchungsTermine(db: Lesend, vonDatum: string, bisDatum: string, status: readonly BuchungStatus[] = BELEGENDE_STATUS): BuchungsTermin[] {
  return db
    .select()
    .from(schema.buchungen)
    .where(
      and(
        lt(schema.buchungen.von, `${bisDatum}T00:00`),
        // "bis" ist exklusiv: eine Buchung bis 00:00 liegt nicht mehr auf dem Folgetag
        gte(schema.buchungen.bis, `${vonDatum}T00:01`),
        inArray(schema.buchungen.status, status as BuchungStatus[]),
      ),
    )
    .all()
    .map(b => ({ typ: 'buchung' as const, buchung: b, titel: b.titel, ort: b.ort, status: b.status, von: b.von, bis: b.bis }))
}

/**
 * Regelbelegung und Buchungen in [vonDatum, bisDatum), nach Beginn sortiert. Regeltermine vom Vortag
 * werden mitgenommen, damit eine Belegung über Mitternacht (20:00–02:00) auch am Folgetag auftaucht.
 */
export function belegung(db: Lesend, vonDatum: string, bisDatum: string, status?: readonly BuchungStatus[]): BelegungsEintrag[] {
  const regeln = regelTermine(db, tagPlus(vonDatum, -1), bisDatum).filter(t => t.bis > `${vonDatum}T00:00`)
  const liste: BelegungsEintrag[] = [...regeln, ...buchungsTermine(db, vonDatum, bisDatum, status)]
  return liste.sort((a, b) => a.von.localeCompare(b.von) || a.bis.localeCompare(b.bis) || (a.typ === b.typ ? 0 : a.typ === 'regel' ? -1 : 1))
}

/** Schlüssel eines Eintrags, z. B. für React-Listen. */
export function eintragSchluessel(e: BelegungsEintrag): string {
  return e.typ === 'regel' ? `r${e.regelId}-${e.datum}` : `b${e.buchung.id}`
}

/**
 * Was überschneidet sich mit diesem Zeitraum am selben Ort? Ausgefallene Regeltermine und die
 * Buchung selbst (ohneBuchungId) zählen nicht.
 */
export function ueberschneidungen(db: Lesend, z: Zeitraum & { ort: BuchungOrt }, ohneBuchungId?: number | null): BelegungsEintrag[] {
  return belegung(db, z.von.slice(0, 10), tagPlus(z.bis.slice(0, 10), 1)).filter(
    e =>
      !(e.typ === 'regel' && e.ausgefallen) &&
      !(e.typ === 'buchung' && e.buchung.id === ohneBuchungId) &&
      orteUeberschneiden(e.ort, z.ort) &&
      zeitenUeberschneiden(e, z),
  )
}

/** Für jede Buchung bzw. jeden Regeltermin in der Liste: die Schlüssel der Einträge, mit denen er sich überschneidet. */
export function ueberschneidungenInListe(liste: BelegungsEintrag[]): Map<string, string[]> {
  const aktiv = liste.filter(e => !(e.typ === 'regel' && e.ausgefallen))
  const ergebnis = new Map<string, string[]>()
  for (let i = 0; i < aktiv.length; i++) {
    for (let j = i + 1; j < aktiv.length; j++) {
      const a = aktiv[i]
      const b = aktiv[j]
      if (b.von >= a.bis) continue
      // Zwei Regeltermine untereinander sind gewollt (z. B. Fußball und Bogenschießen auf dem Gelände)
      if (a.typ === 'regel' && b.typ === 'regel') continue
      if (!orteUeberschneiden(a.ort, b.ort) || !zeitenUeberschneiden(a, b)) continue
      const ka = eintragSchluessel(a)
      const kb = eintragSchluessel(b)
      ergebnis.set(ka, (ergebnis.get(ka) ?? []).concat(kb))
      ergebnis.set(kb, (ergebnis.get(kb) ?? []).concat(ka))
    }
  }
  return ergebnis
}

// ─── Öffentliche Verfügbarkeit ───────────────────────────────────────────────

export interface FreiBelegt extends Zeitraum {
  /** regel = regelmäßig belegt, belegt = bestätigte Buchung, angefragt = noch nicht entschieden */
  art: 'regel' | 'belegt' | 'angefragt'
}

/**
 * Belegung eines Tages für das öffentliche Buchungsformular – nur Zeiten und Art, nie Titel oder
 * Namen. Überschneidungen gleicher Art werden zusammengefasst.
 */
export function belegungOeffentlich(db: Lesend, datum: string, ort: BuchungOrt): FreiBelegt[] {
  const roh = belegung(db, datum, tagPlus(datum, 1))
    .filter(e => !(e.typ === 'regel' && e.ausgefallen) && orteUeberschneiden(e.ort, ort))
    .map(
      (e): FreiBelegt => ({
        von: e.von,
        bis: e.bis,
        art: e.typ === 'regel' ? 'regel' : e.status === 'bestaetigt' ? 'belegt' : 'angefragt',
      }),
    )
  const ergebnis: FreiBelegt[] = []
  for (const e of roh) {
    const gleich = ergebnis.find(x => x.art === e.art && e.von <= x.bis && x.von <= e.bis)
    if (gleich) {
      gleich.von = gleich.von < e.von ? gleich.von : e.von
      gleich.bis = gleich.bis > e.bis ? gleich.bis : e.bis
    } else ergebnis.push({ ...e })
  }
  return ergebnis.sort((a, b) => a.von.localeCompare(b.von))
}
