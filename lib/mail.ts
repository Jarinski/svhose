/**
 * lib/mail.ts
 *
 * E-Mail-Versand über SMTP (nodemailer). Eingerichtet wird er nur über Umgebungsvariablen – die
 * Zugangsdaten stehen nie im Code oder in der Datenbank:
 *
 *   SMTP_HOST          Server, z. B. "smtp.example.de" (Pflicht)
 *   SMTP_PORT          465 (Standard, TLS) oder 587 (STARTTLS)
 *   SMTP_BENUTZER      Anmeldename, z. B. "buchungen@sv-holm-seppensen.de" (Pflicht)
 *   SMTP_PASSWORT      Passwort des Postfachs (Pflicht)
 *   SMTP_ABSENDER      optional, z. B. "SV Holm-Seppensen <buchungen@sv-holm-seppensen.de>"
 *   BUCHUNGEN_POSTFACH optional: wohin neue Buchungsanfragen gemeldet werden (Standard: SMTP_BENUTZER)
 *
 * Fehlt etwas, ist der Versand aus: mailSenden() liefert dann false, und alles andere läuft weiter.
 * Ein Fehler beim Versand bricht nie eine Anfrage oder ein Speichern ab – er landet im Server-Log.
 */

import nodemailer, { type Transporter } from 'nodemailer'

export function mailEingerichtet(): boolean {
  return !!(process.env.SMTP_HOST?.trim() && process.env.SMTP_BENUTZER?.trim() && process.env.SMTP_PASSWORT)
}

/** Postfach, an das neue Buchungsanfragen gemeldet werden. */
export function buchungsPostfach(): string | null {
  return process.env.BUCHUNGEN_POSTFACH?.trim() || process.env.SMTP_BENUTZER?.trim() || null
}

function absender(): string {
  const benutzer = process.env.SMTP_BENUTZER?.trim() ?? ''
  return process.env.SMTP_ABSENDER?.trim() || `"SV Holm-Seppensen · Vereinsheim" <${benutzer}>`
}

// Eine Verbindung pro Prozess – auch über Hot-Reloads im Dev-Server hinweg.
const globalFuerMail = globalThis as unknown as { __svhsMail?: { schluessel: string; transporter: Transporter } }

function transporter(): Transporter {
  const host = process.env.SMTP_HOST!.trim()
  const port = Number(process.env.SMTP_PORT) || 465
  const user = process.env.SMTP_BENUTZER!.trim()
  const schluessel = `${host}:${port}:${user}`
  if (globalFuerMail.__svhsMail?.schluessel !== schluessel) {
    globalFuerMail.__svhsMail = {
      schluessel,
      transporter: nodemailer.createTransport({
        host,
        port,
        // 465 = TLS von Anfang an, sonst STARTTLS (Pflicht, damit das Passwort nie unverschlüsselt läuft)
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user, pass: process.env.SMTP_PASSWORT },
        // Kurze Fristen: Das Buchungsformular soll nicht minutenlang hängen, wenn der Server klemmt.
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

/** Schickt eine Text-Mail. true = vom Server angenommen, false = nicht eingerichtet oder fehlgeschlagen. */
export async function mailSenden(mail: Mail): Promise<boolean> {
  if (!mailEingerichtet()) return false
  try {
    await transporter().sendMail({
      from: absender(),
      to: mail.an,
      subject: mail.betreff,
      text: mail.text,
      ...(mail.antwortAn ? { replyTo: mail.antwortAn } : {}),
    })
    return true
  } catch (e) {
    console.error('[mail] Versand fehlgeschlagen:', e instanceof Error ? e.message : e)
    return false
  }
}
