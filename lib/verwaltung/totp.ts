/**
 * lib/verwaltung/totp.ts
 *
 * Zeitbasierte Einmal-Codes (TOTP, RFC 6238) für Authenticator-Apps wie Google Authenticator,
 * Microsoft Authenticator oder Aegis: SHA-1, 6 Ziffern, 30 Sekunden. Akzeptiert wird der aktuelle
 * Zeitschritt und je einer davor und danach (Uhren gehen nie ganz gleich).
 */

import { createHmac, randomBytes } from 'node:crypto'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const SCHRITT_SEKUNDEN = 30
const STELLEN = 6

export const TOTP_HERAUSGEBER = 'SV Holm-Seppensen'

function base32Kodieren(daten: Buffer): string {
  let bits = 0
  let wert = 0
  let ausgabe = ''
  for (let i = 0; i < daten.length; i++) {
    wert = (wert << 8) | daten[i]
    bits += 8
    while (bits >= 5) {
      ausgabe += BASE32[(wert >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) ausgabe += BASE32[(wert << (5 - bits)) & 31]
  return ausgabe
}

function base32Dekodieren(text: string): Buffer {
  const sauber = text.toUpperCase().replace(/[\s=-]/g, '')
  const bytes: number[] = []
  let bits = 0
  let wert = 0
  for (let i = 0; i < sauber.length; i++) {
    const index = BASE32.indexOf(sauber[i])
    if (index < 0) throw new Error('Ungültiges Base32-Zeichen')
    wert = (wert << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((wert >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Neues Geheimnis (160 Bit, Base32) für die Kopplung einer App. */
export function totpGeheimnisErzeugen(): string {
  return base32Kodieren(randomBytes(20))
}

/** Für die Eingabe von Hand in Vierergruppen: "ABCD EFGH …". */
export function totpGeheimnisAnzeigen(geheimnis: string): string {
  return geheimnis.replace(/(.{4})(?=.)/g, '$1 ')
}

function codeFuerSchritt(schluessel: Buffer, schritt: number): string {
  const zaehler = Buffer.alloc(8)
  zaehler.writeUInt32BE(Math.floor(schritt / 0x100000000), 0)
  zaehler.writeUInt32BE(schritt >>> 0, 4)
  const hmac = createHmac('sha1', schluessel).update(zaehler).digest()
  const versatz = hmac[hmac.length - 1] & 0x0f
  const zahl =
    ((hmac[versatz] & 0x7f) << 24) | (hmac[versatz + 1] << 16) | (hmac[versatz + 2] << 8) | hmac[versatz + 3]
  return String(zahl % 10 ** STELLEN).padStart(STELLEN, '0')
}

export function aktuellerSchritt(zeitMs = Date.now()): number {
  return Math.floor(zeitMs / 1000 / SCHRITT_SEKUNDEN)
}

/**
 * Prüft einen eingegebenen Code. Liefert den passenden Zeitschritt oder null.
 * Mit `nachSchritt` gelten nur Codes NACH dem zuletzt benutzten – derselbe Code geht nicht zweimal.
 */
export function totpPruefen(geheimnis: string, eingabe: string, nachSchritt: number | null = null): number | null {
  const code = eingabe.replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return null
  let schluessel: Buffer
  try {
    schluessel = base32Dekodieren(geheimnis)
  } catch {
    return null
  }
  const jetzt = aktuellerSchritt()
  for (const schritt of [jetzt, jetzt - 1, jetzt + 1]) {
    if (nachSchritt != null && schritt <= nachSchritt) continue
    if (codeFuerSchritt(schluessel, schritt) === code) return schritt
  }
  return null
}

/** Inhalt des QR-Codes, den Authenticator-Apps zum Koppeln scannen. */
export function totpUri(geheimnis: string, benutzername: string): string {
  const label = encodeURIComponent(`${TOTP_HERAUSGEBER}:${benutzername}`)
  return `otpauth://totp/${label}?secret=${geheimnis}&issuer=${encodeURIComponent(TOTP_HERAUSGEBER)}&algorithm=SHA1&digits=${STELLEN}&period=${SCHRITT_SEKUNDEN}`
}

/** Nur für Tests: Code zu einem Zeitpunkt berechnen. */
export function totpCodeBerechnen(geheimnis: string, zeitMs = Date.now()): string {
  return codeFuerSchritt(base32Dekodieren(geheimnis), aktuellerSchritt(zeitMs))
}
