/**
 * lib/buchungen/captcha.ts
 *
 * Captcha für das Anfrageformular als Rechenaufgabe (Proof of Work, Prinzip wie ALTCHA) – ohne
 * Drittanbieter, ohne Cookies, ohne Bilderrätsel:
 *
 *   1. Der Server würfelt eine Zahl n < MAX und schickt salt + sha256(salt + n) + Signatur.
 *   2. Der Browser probiert n = 0, 1, 2, … durch, bis der Hash passt (meist unter einer Sekunde).
 *   3. Beim Absenden prüft der Server Signatur, Ablaufzeit und Hash – und dass dieselbe Aufgabe
 *      nicht zweimal benutzt wird (Zähler in fehlversuche, wie bei den Anfragen).
 *
 * Bots ohne JavaScript kommen so gar nicht durch, alle anderen müssen pro Anfrage rechnen.
 * Zusammen mit dem Lockfeld und der Grenze pro IP (anfrage.ts) reicht das für ein Vereinsformular.
 */

import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'
import { and, count, eq, gt } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'

/**
 * Obergrenze der gesuchten Zahl – im Mittel MAX/2 Hashes im Browser: am Rechner knapp eine Sekunde,
 * auf älteren Handys einige Sekunden. Das Rechnen startet beim Laden der Seite, also lange vor dem Absenden.
 */
export const CAPTCHA_MAX = 250_000
const GUELTIG_MINUTEN = 30

export interface CaptchaAufgabe {
  salt: string
  aufgabe: string
  signatur: string
  max: number
}

let schluesselSpeicher: { geheimnis: string; schluessel: Buffer } | null = null
// Ohne CRON_SECRET (z. B. lokal) ein Zufallsschlüssel pro Prozess – Aufgaben gelten dann bis zum Neustart.
const ersatzSchluessel = randomBytes(32)

function schluessel(): Buffer {
  const geheimnis = process.env.CRON_SECRET?.trim()
  if (!geheimnis) return ersatzSchluessel
  if (schluesselSpeicher?.geheimnis !== geheimnis) schluesselSpeicher = { geheimnis, schluessel: scryptSync(geheimnis, 'svhs-captcha-v1', 32) }
  return schluesselSpeicher.schluessel
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
const signieren = (aufgabe: string) => createHmac('sha256', schluessel()).update(aufgabe).digest('hex')

export function captchaAufgabe(jetzt: number = Date.now()): CaptchaAufgabe {
  const salt = `${randomBytes(12).toString('hex')}?ablauf=${jetzt + GUELTIG_MINUTEN * 60_000}`
  const aufgabe = sha256(salt + randomInt(CAPTCHA_MAX))
  return { salt, aufgabe, signatur: signieren(aufgabe), max: CAPTCHA_MAX }
}

/** Prüft die Lösung aus dem Formularfeld (JSON) und verbraucht sie. */
export function captchaPruefen(db: Pick<Datenbank, 'select' | 'insert'>, roh: string | null, jetzt: number = Date.now()): boolean {
  if (!roh || roh.length > 1000) return false
  let l: { salt?: unknown; zahl?: unknown; aufgabe?: unknown; signatur?: unknown }
  try {
    l = JSON.parse(roh)
  } catch {
    return false
  }
  if (typeof l.salt !== 'string' || typeof l.aufgabe !== 'string' || typeof l.signatur !== 'string' || typeof l.zahl !== 'number') return false
  if (!Number.isInteger(l.zahl) || l.zahl < 0 || l.zahl >= CAPTCHA_MAX) return false
  const erwartet = Buffer.from(signieren(l.aufgabe), 'hex')
  const erhalten = Buffer.from(l.signatur, 'hex')
  if (erwartet.length !== erhalten.length || !timingSafeEqual(erwartet, erhalten)) return false
  const ablauf = Number(/[?&]ablauf=(\d+)/.exec(l.salt)?.[1])
  if (!ablauf || ablauf < jetzt) return false
  if (sha256(l.salt + l.zahl) !== l.aufgabe) return false

  // Jede Aufgabe nur einmal (gemerkt in fehlversuche, verschwindet dort nach einem Tag)
  const merker = sha256(`captcha:${l.aufgabe}`)
  const seit = new Date(jetzt - GUELTIG_MINUTEN * 60_000 - 60_000).toISOString()
  const benutzt = db
    .select({ n: count() })
    .from(schema.fehlversuche)
    .where(and(eq(schema.fehlversuche.schluessel, merker), gt(schema.fehlversuche.zeitpunkt, seit)))
    .get()?.n
  if (benutzt) return false
  db.insert(schema.fehlversuche).values({ schluessel: merker }).run()
  return true
}
