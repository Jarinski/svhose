/**
 * lib/buchungen/postfach.ts
 *
 * Holt eingegangene Mails per IMAP aus dem Buchungs-Postfach und ordnet sie den Buchungen zu
 * (nachrichten.ts → zuordnungFinden). Das Postfach wird nur lesend geöffnet (EXAMINE): Es wird
 * nichts gelöscht, verschoben oder als gelesen markiert – wer das Postfach zusätzlich im Webmail
 * liest, merkt davon nichts.
 *
 * Abgerufen wird alles mit einer höheren UID als beim letzten Mal (Stand in einstellungen,
 * Schlüssel "mail-abruf"); beim ersten Abruf oder nach einem Wechsel der UIDVALIDITY nur die
 * Mails der letzten 30 Tage. Doppelte Mails verhindert die eindeutige Message-ID.
 *
 * Ausgelöst wird der Abruf beim Öffnen der Buchungen in der Verwaltung (höchstens alle paar
 * Minuten, im Hintergrund), über „Jetzt abrufen“ und per Cron (/api/cron/postfach).
 */

import { eq } from 'drizzle-orm'
import { ImapFlow, type MessageStructureObject } from 'imapflow'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { imapZugang } from '@/lib/mail'
import { messageIds, nachrichtEintragen, zuordnungFinden } from './nachrichten'

const ABRUF_SCHLUESSEL = 'mail-abruf'
const ERSTER_ABRUF_TAGE = 30
const MAX_JE_ABRUF = 200
const TEXT_MAX = 100_000

export interface AbrufStand {
  uidValidity: string | null
  letzteUid: number
  /** Letzter Versuch (ISO) */
  zuletztAm: string | null
  /** Letzter erfolgreicher Abruf (ISO) */
  erfolgreichAm: string | null
  fehler: string | null
}

export function abrufStandLesen(db: Pick<Datenbank, 'select'>): AbrufStand {
  const w = (db.select().from(schema.einstellungen).where(eq(schema.einstellungen.schluessel, ABRUF_SCHLUESSEL)).get()?.wert ?? {}) as Partial<AbrufStand>
  return {
    uidValidity: typeof w.uidValidity === 'string' ? w.uidValidity : null,
    letzteUid: typeof w.letzteUid === 'number' ? w.letzteUid : 0,
    zuletztAm: typeof w.zuletztAm === 'string' ? w.zuletztAm : null,
    erfolgreichAm: typeof w.erfolgreichAm === 'string' ? w.erfolgreichAm : null,
    fehler: typeof w.fehler === 'string' ? w.fehler : null,
  }
}

function abrufStandSchreiben(db: Pick<Datenbank, 'insert'>, stand: AbrufStand): void {
  db.insert(schema.einstellungen)
    .values({ schluessel: ABRUF_SCHLUESSEL, wert: stand })
    .onConflictDoUpdate({ target: schema.einstellungen.schluessel, set: { wert: stand, geaendertAm: new Date().toISOString() } })
    .run()
}

// ─── Mail-Struktur ───────────────────────────────────────────────────────────

function teile(knoten: MessageStructureObject | undefined): MessageStructureObject[] {
  if (!knoten) return []
  return knoten.childNodes?.length ? knoten.childNodes.flatMap(teile) : [knoten]
}

function istAnhang(t: MessageStructureObject): boolean {
  return t.disposition === 'attachment' || !!t.dispositionParameters?.filename || !!t.parameters?.name
}

/** Der Textteil, den wir anzeigen: text/plain, sonst text/html; part "1" bei einteiligen Mails. */
function textTeil(struktur: MessageStructureObject | undefined): { part: string; html: boolean } | null {
  const alle = teile(struktur).filter(t => !istAnhang(t))
  const plain = alle.find(t => t.type === 'text/plain')
  const html = alle.find(t => t.type === 'text/html')
  const wahl = plain ?? html
  if (!wahl) return null
  return { part: wahl.part ?? '1', html: !plain }
}

/** Sehr einfache Umwandlung von HTML in lesbaren Text (Absätze bleiben, Tags und Stile fallen weg). */
export function htmlZuText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function streamLesen(stream: NodeJS.ReadableStream, max: number): Promise<string> {
  const stuecke: Buffer[] = []
  let laenge = 0
  for await (const stueck of stream as AsyncIterable<Buffer>) {
    if (laenge < max) stuecke.push(stueck)
    laenge += stueck.length
  }
  return Buffer.concat(stuecke).toString('utf8').slice(0, max)
}

/** Header-Wert aus dem rohen Header-Block (mit gefalteten Zeilen). */
function headerWert(roh: Buffer | undefined, name: string): string {
  if (!roh) return ''
  const text = roh.toString('utf8').replace(/\r?\n[ \t]+/g, ' ')
  const zeile = text.split(/\r?\n/).find(z => z.toLowerCase().startsWith(`${name.toLowerCase()}:`))
  return zeile ? zeile.slice(name.length + 1).trim() : ''
}

// ─── Abruf ───────────────────────────────────────────────────────────────────

export type AbrufErgebnis = { ok: true; neu: number; zugeordnet: number } | { ok: false; fehler: string }

const globalFuerAbruf = globalThis as unknown as { __svhsPostfachAbruf?: Promise<AbrufErgebnis> }

/** Holt neue Mails ab. Läuft schon ein Abruf, wartet der Aufruf auf dessen Ergebnis. */
export function postfachAbrufen(db: Datenbank): Promise<AbrufErgebnis> {
  if (!globalFuerAbruf.__svhsPostfachAbruf) {
    globalFuerAbruf.__svhsPostfachAbruf = abrufen(db).finally(() => {
      globalFuerAbruf.__svhsPostfachAbruf = undefined
    })
  }
  return globalFuerAbruf.__svhsPostfachAbruf
}

/** Ist der letzte Abruf länger als minuten her (oder gab es noch keinen)? */
export function abrufFaellig(db: Pick<Datenbank, 'select'>, minuten: number): boolean {
  const stand = abrufStandLesen(db)
  return !stand.zuletztAm || Date.now() - Date.parse(stand.zuletztAm) > minuten * 60_000
}

async function abrufen(db: Datenbank): Promise<AbrufErgebnis> {
  const zugang = imapZugang()
  if (!zugang) return { ok: false, fehler: 'Der Abruf ist nicht eingerichtet (E-Mail-Versand mit Passwort und „Eingehende Mails abrufen“).' }
  const stand = abrufStandLesen(db)
  const jetzt = new Date().toISOString()
  const client = new ImapFlow({
    host: zugang.host,
    port: zugang.port,
    secure: zugang.port === 993,
    auth: { user: zugang.benutzer, pass: zugang.passwort },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  })

  let neu = 0
  let zugeordnet = 0
  try {
    await client.connect()
    const sperre = await client.getMailboxLock('INBOX', { readOnly: true })
    try {
      const box = client.mailbox
      if (!box) throw new Error('Posteingang ließ sich nicht öffnen.')
      const uidValidity = String(box.uidValidity)
      const gleicherStand = stand.uidValidity === uidValidity

      // Welche UIDs sind neu?
      let uids: number[]
      if (gleicherStand) {
        uids = box.uidNext > stand.letzteUid + 1 ? ((await client.search({ uid: `${stand.letzteUid + 1}:*` }, { uid: true })) || []) : []
      } else {
        uids = (await client.search({ since: new Date(Date.now() - ERSTER_ABRUF_TAGE * 86_400_000) }, { uid: true })) || []
      }
      uids = uids.filter(u => u > (gleicherStand ? stand.letzteUid : 0)).sort((a, b) => a - b).slice(0, MAX_JE_ABRUF)
      let letzteUid = gleicherStand ? stand.letzteUid : 0

      if (uids.length > 0) {
        const nachrichten = await client.fetchAll(
          uids.join(','),
          { uid: true, envelope: true, bodyStructure: true, internalDate: true, headers: ['references', 'in-reply-to'] },
          { uid: true },
        )
        for (const m of nachrichten) {
          letzteUid = Math.max(letzteUid, m.uid)
          const umschlag = m.envelope
          const von = umschlag?.from?.[0]
          const adresse = von?.address?.toLowerCase() ?? null
          // Eigene Mails (z. B. die Meldung „neue Anfrage“ ans selbe Postfach) nicht als Eingang führen
          if (adresse && adresse === zugang.benutzer.toLowerCase()) continue

          let text = ''
          const teil = textTeil(m.bodyStructure)
          if (teil) {
            const download = await client.download(String(m.uid), teil.part, { uid: true })
            if ('content' in download && download.content) {
              const roh = await streamLesen(download.content, TEXT_MAX)
              text = teil.html ? htmlZuText(roh) : roh.replace(/\r\n?/g, '\n').trim()
            }
          }
          const verweise = messageIds(`${umschlag?.inReplyTo ?? headerWert(m.headers, 'in-reply-to')} ${headerWert(m.headers, 'references')}`)
          const betreff = umschlag?.subject ?? null
          const treffer = zuordnungFinden(db, { verweise, betreff, text, von: adresse })
          const datum = umschlag?.date ?? m.internalDate
          const id = nachrichtEintragen(db, {
            buchungId: treffer?.buchungId ?? null,
            zuordnung: treffer?.zuordnung ?? null,
            kanal: 'email',
            richtung: 'eingang',
            zeitpunkt: (datum ? new Date(datum) : new Date()).toISOString(),
            von: von ? (von.name ? `${von.name} <${von.address}>` : (von.address ?? null)) : null,
            an: umschlag?.to?.map(a => a.address).filter(Boolean).join(', ') || null,
            betreff,
            text,
            anhaenge: teile(m.bodyStructure).filter(istAnhang).length,
            // Ohne Message-ID verhindert die UID doppelte Einträge
            messageId: umschlag?.messageId ?? `<uid-${uidValidity}-${m.uid}@imap>`,
            verweise: verweise.join(' ') || null,
            imapUid: m.uid,
          })
          if (id != null) {
            neu++
            if (treffer) zugeordnet++
          }
        }
      }
      abrufStandSchreiben(db, { uidValidity, letzteUid, zuletztAm: jetzt, erfolgreichAm: jetzt, fehler: null })
      return { ok: true, neu, zugeordnet }
    } finally {
      sperre.release()
    }
  } catch (e) {
    const code = (e as { code?: string; authenticationFailed?: boolean }).authenticationFailed ? 'Anmeldung abgelehnt – Passwort prüfen.' : ''
    const fehler = [code, e instanceof Error ? e.message : String(e)].filter(Boolean).join(' ')
    console.error('[postfach] Abruf fehlgeschlagen:', fehler)
    abrufStandSchreiben(db, { ...stand, zuletztAm: jetzt, fehler })
    return { ok: false, fehler }
  } finally {
    await client.logout().catch(() => client.close())
  }
}
