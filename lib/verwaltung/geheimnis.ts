/**
 * lib/verwaltung/geheimnis.ts
 *
 * Verschlüsselt Geheimnisse, die die Anwendung im Klartext zurückbraucht (z. B. das Passwort des
 * SMTP-Postfachs), bevor sie in der Datenbank landen: AES-256-GCM mit einem Schlüssel, der aus
 * CRON_SECRET abgeleitet wird. Das Geheimnis steht in der Env-Datei des Servers, nicht im
 * Datenordner – eine kopierte Datenbank oder ein Backup allein verrät das Passwort also nicht.
 *
 * Ändert sich CRON_SECRET, lassen sich gespeicherte Werte nicht mehr entschlüsseln
 * (entschluesseln → null); dann muss das Passwort in der Verwaltung neu eingetragen werden.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const VERSION = 'v1'
let zwischenspeicher: { geheimnis: string; schluessel: Buffer } | null = null

function schluessel(): Buffer | null {
  const geheimnis = process.env.CRON_SECRET?.trim()
  if (!geheimnis) return null
  if (zwischenspeicher?.geheimnis !== geheimnis) {
    zwischenspeicher = { geheimnis, schluessel: scryptSync(geheimnis, 'svhs-einstellungen-v1', 32) }
  }
  return zwischenspeicher.schluessel
}

/** Kann verschlüsselt werden (ist CRON_SECRET gesetzt)? */
export function verschluesselungMoeglich(): boolean {
  return schluessel() !== null
}

/** "v1:<iv>:<tag>:<daten>" (Base64) oder null, wenn kein Schlüssel da ist. */
export function verschluesseln(klartext: string): string | null {
  const s = schluessel()
  if (!s) return null
  const iv = randomBytes(12)
  const chiffre = createCipheriv('aes-256-gcm', s, iv)
  const daten = Buffer.concat([chiffre.update(klartext, 'utf8'), chiffre.final()])
  return [VERSION, iv.toString('base64'), chiffre.getAuthTag().toString('base64'), daten.toString('base64')].join(':')
}

/** Klartext oder null (kein Schlüssel, anderer Schlüssel oder beschädigter Wert). */
export function entschluesseln(wert: string | null | undefined): string | null {
  const s = schluessel()
  if (!s || !wert) return null
  const [version, iv, tag, daten] = wert.split(':')
  if (version !== VERSION || !iv || !tag || daten == null) return null
  try {
    const entschluessler = createDecipheriv('aes-256-gcm', s, Buffer.from(iv, 'base64'))
    entschluessler.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([entschluessler.update(Buffer.from(daten, 'base64')), entschluessler.final()]).toString('utf8')
  } catch {
    return null
  }
}
