/**
 * lib/verwaltung/passwort.ts
 *
 * Passwörter werden mit scrypt (Node-Bordmittel) gehasht – speicherintensiv und damit teuer
 * für Angreifer. Format: "scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>", damit sich die
 * Parameter später erhöhen lassen, ohne alte Hashes ungültig zu machen.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const N = 16384
const R = 8
const P = 1
const LAENGE = 64

export const PASSWORT_MIN = 10
const PASSWORT_MAX = 200

function scryptAsync(passwort: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((aufloesen, ablehnen) =>
    scrypt(passwort.normalize('NFKC'), salt, LAENGE, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (fehler, schluessel) =>
      fehler ? ablehnen(fehler) : aufloesen(schluessel),
    ),
  )
}

export async function passwortHashen(passwort: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(passwort, salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`
}

/** Prüft ein Passwort gegen einen gespeicherten Hash (zeitkonstant). */
export async function passwortPruefen(passwort: string, gespeichert: string | null): Promise<boolean> {
  const teile = (gespeichert ?? '').split('$')
  if (teile.length !== 6 || teile[0] !== 'scrypt') return false
  const [, n, r, p, salt, hash] = teile
  const erwartet = Buffer.from(hash, 'base64')
  const berechnet = await scryptAsync(passwort, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p))
  return erwartet.length === berechnet.length && timingSafeEqual(erwartet, berechnet)
}

/**
 * Hash eines zufälligen Passworts, gegen den geprüft wird, wenn es den Benutzernamen gar nicht gibt –
 * so dauert eine Anmeldung mit unbekanntem Namen genauso lang wie mit bekanntem.
 */
let attrappe: Promise<string> | null = null
export function attrappenHash(): Promise<string> {
  if (!attrappe) attrappe = passwortHashen(randomBytes(24).toString('base64'))
  return attrappe
}

/** Liefert eine Fehlermeldung, wenn das Passwort nicht den Regeln entspricht, sonst null. */
export function passwortRegelVerletzt(passwort: string, benutzername: string | null): string | null {
  if (passwort.length < PASSWORT_MIN) return `Das Passwort muss mindestens ${PASSWORT_MIN} Zeichen lang sein.`
  if (passwort.length > PASSWORT_MAX) return 'Das Passwort ist zu lang.'
  if (benutzername && passwort.toLowerCase().includes(benutzername.toLowerCase())) return 'Das Passwort darf den Benutzernamen nicht enthalten.'
  if (/^(.)\1+$/.test(passwort)) return 'Das Passwort ist zu einfach.'
  return null
}
