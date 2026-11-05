/**
 * lib/verwaltung/inhalte/mail.ts
 *
 * SMTP-Zugang für den Mailversand in der Verwaltung speichern (/verwaltung/e-mail) – nur Admins:
 * Mit dem Postfach-Passwort ließen sich Mails im Namen des Vereins verschicken.
 *
 * Das Passwort wird verschlüsselt gespeichert (geheimnis.ts) und nie wieder angezeigt; ein leeres
 * Feld behält das gespeicherte. Im Verlauf steht nur, ob eins gespeichert ist.
 */

import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { MAIL_SCHLUESSEL, mailEinstellungenLesen, type MailEinstellungen } from '@/lib/mail'
import { verschluesseln } from '@/lib/verwaltung/geheimnis'
import type { Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { datenbankFehler, FELDER_PRUEFEN, KEINE_RECHTE, KONFLIKT } from './gemeinsam'

export interface MailEingabe {
  aktiv: boolean
  host: string | null
  port: number | null
  benutzer: string | null
  /** leer = gespeichertes Passwort behalten */
  passwort: string | null
  passwortLoeschen: boolean
  absenderName: string | null
  postfach: string | null
  abrufen: boolean
  imapHost: string | null
  imapPort: number | null
  /** geaendertAm beim Öffnen (optimistische Sperre); null = noch nie gespeichert */
  stand: string | null
}

export type MailSpeicherErgebnis = { ok: true; stand: string } | { ok: false; meldung: string; felder?: Record<string, string> }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i

/** Stand für den Verlauf – ohne Passwort. */
function schnappschuss(e: MailEinstellungen) {
  return {
    aktiv: e.aktiv,
    host: e.host,
    port: e.port,
    benutzer: e.benutzer,
    absenderName: e.absenderName,
    postfach: e.postfach,
    abrufen: e.abrufen,
    imapHost: e.imapHost,
    imapPort: e.imapPort,
    passwort: e.passwort ? 'gespeichert' : 'keins',
  }
}

export function mailEinstellungenSpeichern(db: Datenbank, rechte: Rechte, e: MailEingabe): MailSpeicherErgebnis {
  if (!rechte.istAdmin) return { ok: false, meldung: KEINE_RECHTE }

  const felder: Record<string, string> = {}
  const host = (e.host ?? '').toLowerCase()
  if (!HOST.test(host)) felder.host = 'Bitte den Postausgangsserver eintragen, z. B. smtp.strato.de.'
  if (e.port == null || e.port < 1 || e.port > 65535) felder.port = 'Bitte einen Port wählen.'
  if (!e.benutzer || !EMAIL.test(e.benutzer)) felder.benutzer = 'Bitte die E-Mail-Adresse des Postfachs eintragen.'
  if (e.postfach && !EMAIL.test(e.postfach)) felder.postfach = 'Diese E-Mail-Adresse sieht nicht richtig aus.'
  if ((e.absenderName ?? '').length > 100) felder.absenderName = 'Bitte kürzer fassen (höchstens 100 Zeichen).'
  if ((e.passwort ?? '').length > 500) felder.passwort = 'Das Passwort ist zu lang.'
  const imapHost = (e.imapHost ?? '').toLowerCase()
  if (e.abrufen && !HOST.test(imapHost)) felder.imapHost = 'Bitte den Posteingangsserver eintragen, z. B. imap.strato.de.'
  if (e.imapPort == null || e.imapPort < 1 || e.imapPort > 65535) felder.imapPort = 'Bitte einen Port eintragen (Strato: 993).'

  let neuesPasswort: string | null | undefined // undefined = unverändert
  if (e.passwortLoeschen) neuesPasswort = null
  else if (e.passwort) {
    const verschluesselt = verschluesseln(e.passwort)
    if (!verschluesselt) felder.passwort = 'Auf dem Server fehlt CRON_SECRET – ohne ihn lässt sich das Passwort nicht sicher speichern.'
    else neuesPasswort = verschluesselt
  }
  if (Object.keys(felder).length > 0) return { ok: false, meldung: FELDER_PRUEFEN, felder }

  try {
    return db.transaction((tx): MailSpeicherErgebnis => {
      const alt = mailEinstellungenLesen(tx)
      if ((alt.geaendertAm ?? null) !== (e.stand || null)) return { ok: false, meldung: KONFLIKT }
      const neu: MailEinstellungen = {
        aktiv: e.aktiv,
        host,
        port: e.port as number,
        benutzer: (e.benutzer as string).toLowerCase(),
        passwort: neuesPasswort === undefined ? alt.passwort : neuesPasswort,
        absenderName: e.absenderName ?? '',
        postfach: (e.postfach ?? '').toLowerCase(),
        abrufen: e.abrufen,
        imapHost,
        imapPort: e.imapPort as number,
      }
      const zeile = tx
        .insert(schema.einstellungen)
        .values({ schluessel: MAIL_SCHLUESSEL, wert: neu })
        .onConflictDoUpdate({ target: schema.einstellungen.schluessel, set: { wert: neu, geaendertAm: new Date().toISOString() } })
        .returning()
        .get()
      protokollieren(tx, rechte, {
        aktion: alt.geaendertAm ? 'geaendert' : 'angelegt',
        objektTyp: 'einstellungen',
        bezeichnung: neuesPasswort !== undefined ? 'E-Mail-Versand (Passwort geändert)' : 'E-Mail-Versand',
        vorher: alt.geaendertAm ? schnappschuss(alt) : null,
        nachher: schnappschuss(neu),
      })
      return { ok: true, stand: zeile.geaendertAm }
    })
  } catch (fehler) {
    const ergebnis = datenbankFehler(fehler)
    return { ok: false, meldung: ergebnis.ok ? 'Speichern hat nicht geklappt.' : ergebnis.meldung }
  }
}
