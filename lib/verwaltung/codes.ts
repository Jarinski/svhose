/**
 * lib/verwaltung/codes.ts
 *
 * Einmal-Codes für die Anmeldung (12 Zeichen, z. B. "K7QM-9XTD-2HWP") und Zufallstoken für Sitzungen.
 * Alphabet nach Crockford: keine Verwechslungsgefahr – O wird als 0, I/L als 1 gelesen.
 * 12 Zeichen × 5 Bit = 60 Bit Zufall; zusammen mit Ablaufzeit, Einmal-Nutzung und der
 * Begrenzung von Fehlversuchen lässt sich ein Code nicht erraten.
 */

import { createHash, randomBytes } from 'node:crypto'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_LAENGE = 12

/** Neuer Code ohne Trennstriche, z. B. "K7QM9XTD2HWP". */
export function codeErzeugen(): string {
  const bytes = randomBytes(CODE_LAENGE)
  let code = ''
  // 256 ist durch 32 teilbar – jedes Zeichen ist damit gleich wahrscheinlich.
  for (let i = 0; i < CODE_LAENGE; i++) code += ALPHABET[bytes[i] & 31]
  return code
}

/** Für die Anzeige in Dreiergruppen à vier Zeichen: "K7QM-9XTD-2HWP". */
export function codeFormatieren(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-')
}

/**
 * Bringt eine Eingabe in die kanonische Form oder liefert null, wenn sie kein gültiger Code sein kann.
 * Leerzeichen, Bindestriche und Groß-/Kleinschreibung sind egal.
 */
export function codeNormalisieren(eingabe: string): string | null {
  const roh = eingabe
    .toUpperCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (roh.length !== CODE_LAENGE) return null
  for (let i = 0; i < roh.length; i++) if (ALPHABET.indexOf(roh[i]) < 0) return null
  return roh
}

export function hash(wert: string): string {
  return createHash('sha256').update(wert).digest('hex')
}

/** Zufallstoken für das Sitzungs-Cookie (256 Bit, URL-sicher). */
export function sitzungsTokenErzeugen(): string {
  return randomBytes(32).toString('base64url')
}
