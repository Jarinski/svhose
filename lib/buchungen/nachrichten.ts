/**
 * lib/buchungen/nachrichten.ts
 *
 * Kontaktverlauf der Buchungen (Tabelle buchung_nachrichten): Mails an Buchende schicken und
 * mitschreiben, Telefonate und Notizen eintragen, eingegangene Mails einer Buchung zuordnen.
 *
 * Zuordnung eingehender Mails, in dieser Reihenfolge:
 *   1. antwort  – In-Reply-To/References verweist auf eine Mail aus dem Kontaktverlauf
 *   2. nummer   – Buchungsnummer (XXXX-XXXX) in Betreff oder Text
 *   3. absender – die Absenderadresse gehört zu genau einer Buchung (bei mehreren: zur einzigen,
 *                 die noch nicht vorbei ist)
 * Sonst bleibt die Mail im Eingang „nicht zugeordnet“ und wird von Hand zugeordnet (hand).
 */

import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { mailVersuchen, type Mail } from '@/lib/mail'
import { jetztOrtszeit, NUMMER_ZEICHEN } from './zeit'

type Lesend = Pick<Datenbank, 'select'>
type Buchung = typeof schema.buchungen.$inferSelect
export type Nachricht = typeof schema.buchungNachrichten.$inferSelect

/** Wer etwas schreibt oder einträgt (null = das System selbst, z. B. die Eingangsbestätigung). */
export type Wer = { zugangId: number; name: string } | null

const NUMMER_MUSTER = new RegExp(`\\b([${NUMMER_ZEICHEN}]{4})-([${NUMMER_ZEICHEN}]{4})\\b`, 'g')

/** Alle Buchungsnummern in einem Text, in der Reihenfolge ihres Auftretens. */
export function nummernIn(text: string | null | undefined): string[] {
  const treffer: string[] = []
  for (const m of (text ?? '').toUpperCase().matchAll(NUMMER_MUSTER)) {
    const n = `${m[1]}-${m[2]}`
    if (treffer.indexOf(n) < 0) treffer.push(n)
  }
  return treffer
}

/** Message-IDs aus In-Reply-To/References ("<a@b> <c@d>") */
export function messageIds(text: string | null | undefined): string[] {
  return Array.from((text ?? '').matchAll(/<[^<>\s]+>/g), m => m[0])
}

export function nachrichtEintragen(db: Pick<Datenbank, 'insert'>, werte: typeof schema.buchungNachrichten.$inferInsert): number | null {
  const neu = db.insert(schema.buchungNachrichten).values(werte).onConflictDoNothing().returning({ id: schema.buchungNachrichten.id }).get()
  return neu?.id ?? null
}

/**
 * Schickt eine Mail an die buchende Person und schreibt sie in den Kontaktverlauf. Wird auf eine
 * eingegangene Mail geantwortet, setzt sie In-Reply-To/References – dann landet auch die nächste
 * Antwort wieder bei dieser Buchung.
 */
export async function buchungsMailSenden(
  db: Datenbank,
  b: Pick<Buchung, 'id' | 'email'>,
  mail: Omit<Mail, 'an'> & { an?: string },
  wer: Wer,
): Promise<{ ok: true } | { ok: false; fehler: string }> {
  const an = mail.an ?? b.email
  if (!an) return { ok: false, fehler: 'Für diese Buchung ist keine E-Mail-Adresse eingetragen.' }
  const ergebnis = await mailVersuchen({ ...mail, an })
  if (!ergebnis.ok) return ergebnis
  nachrichtEintragen(db, {
    buchungId: b.id,
    kanal: 'email',
    richtung: 'ausgang',
    zeitpunkt: new Date().toISOString(),
    von: ergebnis.von,
    an,
    betreff: mail.betreff,
    text: mail.text,
    messageId: ergebnis.messageId,
    verweise: [mail.antwortAuf, ...(mail.verweise ?? [])].filter(Boolean).join(' ') || null,
    zugangId: wer?.zugangId ?? null,
    zugangName: wer?.name ?? null,
  })
  return { ok: true }
}

/** Zu welcher Buchung gehört eine eingegangene Mail? */
export function zuordnungFinden(
  db: Lesend,
  m: { verweise: string[]; betreff: string | null; text: string; von: string | null },
): { buchungId: number; zuordnung: 'antwort' | 'nummer' | 'absender' } | null {
  if (m.verweise.length > 0) {
    const bekannt = db
      .select({ buchungId: schema.buchungNachrichten.buchungId })
      .from(schema.buchungNachrichten)
      .where(inArray(schema.buchungNachrichten.messageId, m.verweise))
      .all()
      .find(x => x.buchungId != null)
    if (bekannt?.buchungId != null) return { buchungId: bekannt.buchungId, zuordnung: 'antwort' }
  }

  const nummern = nummernIn(m.betreff).concat(nummernIn(m.text.slice(0, 20_000)))
  if (nummern.length > 0) {
    const treffer = db.select({ id: schema.buchungen.id, nummer: schema.buchungen.nummer }).from(schema.buchungen).where(inArray(schema.buchungen.nummer, nummern)).all()
    const erste = nummern.map(n => treffer.find(t => t.nummer === n)).find(Boolean)
    if (erste) return { buchungId: erste.id, zuordnung: 'nummer' }
  }

  const adresse = m.von?.trim().toLowerCase()
  if (adresse) {
    const passende = db
      .select({ id: schema.buchungen.id, bis: schema.buchungen.bis })
      .from(schema.buchungen)
      .where(sql`lower(${schema.buchungen.email}) = ${adresse}`)
      .all()
    if (passende.length === 1) return { buchungId: passende[0].id, zuordnung: 'absender' }
    const offen = passende.filter(p => p.bis >= jetztOrtszeit())
    if (offen.length === 1) return { buchungId: offen[0].id, zuordnung: 'absender' }
  }
  return null
}

// ─── Lesen ───────────────────────────────────────────────────────────────────

export function verlaufLaden(db: Lesend, buchungId: number) {
  return db
    .select()
    .from(schema.buchungNachrichten)
    .where(eq(schema.buchungNachrichten.buchungId, buchungId))
    .orderBy(desc(schema.buchungNachrichten.zeitpunkt), desc(schema.buchungNachrichten.id))
    .all()
}

/** Eingegangene Mails, die noch niemand in der Verwaltung angesehen hat – je Buchung (null = nicht zugeordnet). */
export function ungeleseneMails(db: Lesend): Map<number | null, number> {
  const zeilen = db
    .select({ buchungId: schema.buchungNachrichten.buchungId, n: count() })
    .from(schema.buchungNachrichten)
    .where(and(eq(schema.buchungNachrichten.richtung, 'eingang'), isNull(schema.buchungNachrichten.gelesenAm)))
    .groupBy(schema.buchungNachrichten.buchungId)
    .all()
  return new Map(zeilen.map(z => [z.buchungId, z.n] as const))
}

/** Anzahl nicht zugeordneter Mails (für Menü und Eingang). */
export function nichtZugeordnet(db: Lesend): number {
  return (
    db
      .select({ n: count() })
      .from(schema.buchungNachrichten)
      .where(and(isNull(schema.buchungNachrichten.buchungId), eq(schema.buchungNachrichten.richtung, 'eingang')))
      .get()?.n ?? 0
  )
}

/** Eingegangene Mails einer Buchung als gelesen markieren (beim Öffnen der Buchung). */
export function alsGelesenMarkieren(db: Pick<Datenbank, 'update'>, buchungId: number): void {
  db.update(schema.buchungNachrichten)
    .set({ gelesenAm: new Date().toISOString() })
    .where(and(eq(schema.buchungNachrichten.buchungId, buchungId), eq(schema.buchungNachrichten.richtung, 'eingang'), isNull(schema.buchungNachrichten.gelesenAm)))
    .run()
}

/** Nicht zugeordnete Mails löschen, die älter als 90 Tage sind (Datenschutz). */
export function alteEingaengeLoeschen(db: Pick<Datenbank, 'delete'>, jetzt: Date = new Date()): void {
  const grenze = new Date(jetzt.getTime() - 90 * 86_400_000).toISOString()
  db.delete(schema.buchungNachrichten)
    .where(and(isNull(schema.buchungNachrichten.buchungId), sql`${schema.buchungNachrichten.erstelltAm} < ${grenze}`))
    .run()
}

// ─── Anzeige ─────────────────────────────────────────────────────────────────

/**
 * Teilt den Text einer Mail in die neue Nachricht und den zitierten Verlauf darunter („Am … schrieb“,
 * „-----Original Message-----“, Zeilen mit „>“), damit die Anzeige das Zitat einklappen kann.
 */
export function zitatAbtrennen(text: string): { neu: string; zitat: string } {
  const zeilen = text.replace(/\r\n?/g, '\n').split('\n')
  const start = zeilen.findIndex(
    (z, i) =>
      /^\s*(Am |On ).{4,200}(schrieb|wrote)[^:]*:\s*$/i.test(z) ||
      /^-{2,}\s*(Original Message|Ursprüngliche Nachricht|Originalnachricht)/i.test(z.trim()) ||
      (/^\s*(Von|From):\s/.test(z) && zeilen.slice(i + 1, i + 5).some(x => /^\s*(Gesendet|Sent|Datum|Date|An|To|Betreff|Subject):/.test(x))) ||
      (/^>/.test(z) && zeilen.slice(i, i + 3).every(x => /^>/.test(x) || x.trim() === '')),
  )
  if (start <= 0) return { neu: text.trim(), zitat: '' }
  return { neu: zeilen.slice(0, start).join('\n').trim(), zitat: zeilen.slice(start).join('\n').trim() }
}

