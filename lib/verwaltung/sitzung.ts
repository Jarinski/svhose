/**
 * lib/verwaltung/sitzung.ts
 *
 * Zugriff auf die aktuelle Sitzung in Server-Komponenten und Server-Aktionen.
 * Das Cookie enthält nur ein Zufallstoken; gültig ist eine Sitzung nur, solange der passende
 * Eintrag in der Tabelle geraete existiert und der Zugang aktiv ist.
 */

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { datenbank } from '@/lib/db'
import { sitzungFinden, SITZUNG_MERKEN_TAGE } from './anmeldung'
import { rechteLaden, type Rechte } from './rechte'

export const SITZUNGS_COOKIE = 'svhs_sitzung'

export interface Sitzung {
  geraetId: number
  rechte: Rechte
}

/** Aktuelle Sitzung oder null – pro Anfrage nur einmal aus der Datenbank gelesen. */
export const aktuelleSitzung = cache(async (): Promise<Sitzung | null> => {
  const token = (await cookies()).get(SITZUNGS_COOKIE)?.value
  if (!token) return null
  const db = datenbank()
  const treffer = sitzungFinden(db, token)
  if (!treffer) return null
  return { geraetId: treffer.geraet.id, rechte: rechteLaden(db, treffer.zugang) }
})

/** Für geschützte Seiten und Aktionen: ohne gültige Sitzung geht es zur Anmeldung. */
export async function sitzungErzwingen(): Promise<Sitzung> {
  const sitzung = await aktuelleSitzung()
  if (!sitzung) redirect('/verwaltung/login')
  return sitzung
}

/** Nur für Admins – alle anderen landen auf der Übersicht. */
export async function adminErzwingen(): Promise<Sitzung> {
  const sitzung = await sitzungErzwingen()
  if (!sitzung.rechte.istAdmin) redirect('/verwaltung')
  return sitzung
}

/** Läuft die Anfrage über HTTPS (direkt oder hinter einem Proxy wie nginx)? */
async function istHttps(): Promise<boolean> {
  const h = await headers()
  const proto = h.get('x-forwarded-proto')
  if (proto) return proto.split(',')[0].trim() === 'https'
  return (h.get('origin') ?? h.get('referer') ?? '').startsWith('https://')
}

/**
 * Setzt das Sitzungs-Cookie. Mit "angemeldet bleiben" hält es 30 Tage, sonst endet es mit dem
 * Schließen des Browsers (die Sitzung selbst läuft dann spätestens nach 12 Stunden ab).
 */
export async function sitzungsCookieSetzen(token: string, merken: boolean): Promise<void> {
  const cookieSpeicher = await cookies()
  cookieSpeicher.set(SITZUNGS_COOKIE, token, {
    httpOnly: true,
    secure: await istHttps(),
    sameSite: 'lax',
    path: '/',
    ...(merken ? { maxAge: SITZUNG_MERKEN_TAGE * 86_400 } : {}),
  })
}

export async function sitzungsCookieLoeschen(): Promise<void> {
  const cookieSpeicher = await cookies()
  cookieSpeicher.delete(SITZUNGS_COOKIE)
}

/**
 * IP der Anfrage – nur für die Begrenzung von Fehlversuchen. Hinter nginx kommt sie aus X-Real-IP
 * (nginx: proxy_set_header X-Real-IP $remote_addr). Fallback ist der LETZTE Eintrag in
 * X-Forwarded-For: Den hängt der eigene Proxy an; frühere Einträge kann der Browser frei erfinden.
 */
export async function anfrageIp(): Promise<string> {
  const h = await headers()
  const realIp = h.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const kette = (h.get('x-forwarded-for') ?? '').split(',').map(t => t.trim()).filter(Boolean)
  return kette[kette.length - 1] || 'unbekannt'
}

/** Öffentliche Basisadresse für Links in QR-Codes: SEITEN_URL oder die Adresse der aktuellen Anfrage. */
export async function basisUrl(): Promise<string> {
  const konfiguriert = process.env.SEITEN_URL?.trim()
  if (konfiguriert) return konfiguriert.replace(/\/+$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  return `${(await istHttps()) ? 'https' : 'http'}://${host}`
}
