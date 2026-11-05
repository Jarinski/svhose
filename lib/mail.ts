/**
 * lib/mail.ts
 *
 * E-Mail-Versand über SMTP (nodemailer) für die Buchungen des Vereinsheims.
 *
 * Woher der Zugang kommt:
 *   1. Admins tragen ihn in der Verwaltung ein (/verwaltung/e-mail, Tabelle einstellungen,
 *      Schlüssel "mail"). Vorbelegt ist Strato (smtp.strato.de, Port 587 mit STARTTLS – Hetzner
 *      sperrt auf Cloud-Servern ausgehend Port 465, dort läuft nur 587). Das Passwort steht nur
 *      verschlüsselt in der Datenbank (lib/verwaltung/geheimnis.ts, Schlüssel aus CRON_SECRET).
 *   2. Sind SMTP_HOST, SMTP_BENUTZER und SMTP_PASSWORT als Umgebungsvariablen gesetzt, gelten
 *      stattdessen diese (dazu SMTP_PORT, SMTP_ABSENDER, BUCHUNGEN_POSTFACH) – als Ausweg, falls
 *      die Verwaltung einmal nicht erreichbar ist.
 *
 * Ohne vollständigen Zugang ist der Versand aus: mailSenden() liefert dann false, alles andere läuft
 * weiter. Ein Fehler beim Versand bricht nie eine Anfrage oder ein Speichern ab – er landet im Log.
 */

import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import nodemailer, { type Transporter } from 'nodemailer'
import { datenbank, schema } from '@/lib/db'
import { entschluesseln } from '@/lib/verwaltung/geheimnis'

// ─── Gespeicherte Einstellungen ──────────────────────────────────────────────

export const MAIL_SCHLUESSEL = 'mail'

/** Der SMTP-Zugang, wie er in der Tabelle einstellungen steht. */
export interface MailEinstellungen {
  /** Versand an/aus – zum Pausieren, ohne den Zugang zu löschen */
  aktiv: boolean
  host: string
  /** 587 = STARTTLS (Standard), 465 = SSL/TLS (von Hetzner ausgehend gesperrt) */
  port: number
  benutzer: string
  /** verschlüsselt (geheimnis.ts) oder null */
  passwort: string | null
  absenderName: string
  /** Empfänger der Meldung „neue Anfrage“; leer = benutzer */
  postfach: string
}

/** Vorbelegung: Strato, Postfach der Buchungen. */
export const MAIL_STANDARD: MailEinstellungen = {
  aktiv: true,
  host: 'smtp.strato.de',
  port: 587,
  benutzer: 'buchungen@sv-holm-seppensen.de',
  passwort: null,
  absenderName: 'SV Holm-Seppensen · Vereinsheim',
  postfach: '',
}

/** Gespeicherte Einstellungen, fehlende Werte aus MAIL_STANDARD. */
export function mailEinstellungenLesen(db: Pick<ReturnType<typeof datenbank>, 'select'> = datenbank()): MailEinstellungen & { geaendertAm: string | null } {
  const zeile = db.select().from(schema.einstellungen).where(eq(schema.einstellungen.schluessel, MAIL_SCHLUESSEL)).get()
  const w = (zeile?.wert ?? {}) as Partial<MailEinstellungen>
  return {
    aktiv: typeof w.aktiv === 'boolean' ? w.aktiv : MAIL_STANDARD.aktiv,
    host: typeof w.host === 'string' ? w.host : MAIL_STANDARD.host,
    port: typeof w.port === 'number' ? w.port : MAIL_STANDARD.port,
    benutzer: typeof w.benutzer === 'string' ? w.benutzer : MAIL_STANDARD.benutzer,
    passwort: typeof w.passwort === 'string' ? w.passwort : null,
    absenderName: typeof w.absenderName === 'string' ? w.absenderName : MAIL_STANDARD.absenderName,
    postfach: typeof w.postfach === 'string' ? w.postfach : MAIL_STANDARD.postfach,
    geaendertAm: zeile?.geaendertAm ?? null,
  }
}

// ─── Wirksamer Zugang ────────────────────────────────────────────────────────

export interface MailZugang {
  host: string
  port: number
  benutzer: string
  passwort: string
  absender: string | { name: string; address: string }
  postfach: string
  quelle: 'umgebung' | 'verwaltung'
}

/** Sind die SMTP-Umgebungsvariablen gesetzt? Dann gelten sie vor den Einstellungen der Verwaltung. */
export function smtpUmgebungGesetzt(): boolean {
  return !!(process.env.SMTP_HOST?.trim() && process.env.SMTP_BENUTZER?.trim() && process.env.SMTP_PASSWORT)
}

/** Der Zugang, mit dem gerade verschickt würde – oder null (nicht eingerichtet, ausgeschaltet, Passwort unlesbar). */
export function mailZugang(): MailZugang | null {
  if (smtpUmgebungGesetzt()) {
    const benutzer = process.env.SMTP_BENUTZER!.trim()
    return {
      host: process.env.SMTP_HOST!.trim(),
      port: Number(process.env.SMTP_PORT) || 587,
      benutzer,
      passwort: process.env.SMTP_PASSWORT!,
      absender: process.env.SMTP_ABSENDER?.trim() || { name: MAIL_STANDARD.absenderName, address: benutzer },
      postfach: process.env.BUCHUNGEN_POSTFACH?.trim() || benutzer,
      quelle: 'umgebung',
    }
  }
  const e = mailEinstellungenLesen()
  const passwort = entschluesseln(e.passwort)
  if (!e.aktiv || !e.host || !e.benutzer || !passwort) return null
  return {
    host: e.host,
    port: e.port,
    benutzer: e.benutzer,
    passwort,
    absender: { name: e.absenderName || MAIL_STANDARD.absenderName, address: e.benutzer },
    postfach: e.postfach || e.benutzer,
    quelle: 'verwaltung',
  }
}

export function mailEingerichtet(): boolean {
  return mailZugang() !== null
}

/** Postfach, an das neue Buchungsanfragen gemeldet werden. */
export function buchungsPostfach(): string | null {
  return mailZugang()?.postfach ?? null
}

// ─── Versand ─────────────────────────────────────────────────────────────────

// Eine Verbindung pro Zugang und Prozess – auch über Hot-Reloads im Dev-Server hinweg.
const globalFuerMail = globalThis as unknown as { __svhsMail?: { schluessel: string; transporter: Transporter } }

function transporter(z: MailZugang): Transporter {
  const schluessel = createHash('sha256').update(`${z.host}:${z.port}:${z.benutzer}:${z.passwort}`).digest('hex')
  if (globalFuerMail.__svhsMail?.schluessel !== schluessel) {
    globalFuerMail.__svhsMail?.transporter.close()
    globalFuerMail.__svhsMail = {
      schluessel,
      transporter: nodemailer.createTransport({
        host: z.host,
        port: z.port,
        // 465 = TLS von Anfang an, sonst STARTTLS (Pflicht, damit das Passwort nie unverschlüsselt läuft)
        secure: z.port === 465,
        requireTLS: z.port !== 465,
        auth: { user: z.benutzer, pass: z.passwort },
        // Kurze Fristen: Ein klemmender Server soll nichts lange aufhalten.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      }),
    }
  }
  return globalFuerMail.__svhsMail.transporter
}

export interface Mail {
  an: string
  betreff: string
  text: string
  /** Wohin Antworten gehen sollen (z. B. an die buchende Person, wenn der Verein auf die Meldung antwortet). */
  antwortAn?: string | null
}

/** Verständliche Meldung zu einem SMTP-Fehler (für die Testmail in der Verwaltung). */
function fehlerText(e: unknown, port: number): string {
  const code = (e as { code?: string }).code
  const roh = e instanceof Error ? e.message : String(e)
  // Hetzner (und andere Hoster) sperren ausgehend Port 465 – die Verbindung läuft dann ins Leere.
  if (port === 465 && (code === 'ETIMEDOUT' || /timeout/i.test(roh)))
    return `Keine Verbindung über Port 465 – der Server sperrt diesen Port vermutlich. Bitte Port 587 (STARTTLS) wählen. (${roh})`
  if (code === 'EAUTH') return `Der Server hat die Anmeldung abgelehnt – Benutzer oder Passwort stimmen nicht. (${roh})`
  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'EDNS')
    return `Der Server ist so nicht erreichbar – bitte Server und Port prüfen. (${roh})`
  if (code === 'EENVELOPE') return `Absender oder Empfänger wurde abgelehnt. (${roh})`
  return roh
}

/** Schickt eine Text-Mail und meldet, ob es geklappt hat – mit Fehlertext für die Verwaltung. */
export async function mailVersuchen(mail: Mail, zugang: MailZugang | null = mailZugang()): Promise<{ ok: true } | { ok: false; fehler: string }> {
  if (!zugang) return { ok: false, fehler: 'Der E-Mail-Versand ist nicht eingerichtet oder ausgeschaltet.' }
  try {
    await transporter(zugang).sendMail({
      from: zugang.absender,
      to: mail.an,
      subject: mail.betreff,
      text: mail.text,
      ...(mail.antwortAn ? { replyTo: mail.antwortAn } : {}),
    })
    return { ok: true }
  } catch (e) {
    console.error('[mail] Versand fehlgeschlagen:', e instanceof Error ? e.message : e)
    return { ok: false, fehler: fehlerText(e, zugang.port) }
  }
}

/** Schickt eine Text-Mail. true = vom Server angenommen, false = nicht eingerichtet oder fehlgeschlagen. */
export async function mailSenden(mail: Mail): Promise<boolean> {
  return (await mailVersuchen(mail)).ok
}
