'use server'

/**
 * Server-Aktionen rund um die Anmeldung: Zugang einrichten (Passwort + Authenticator-App),
 * anmelden mit Zwei-Faktor, Passwort ändern, Geräte abmelden.
 */

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { datenbank, schema } from '@/lib/db'
import {
  einrichtungAbschliessen,
  einrichtungVorbereiten,
  fehlversuchMerken,
  geraetNameAusUserAgent,
  istGesperrt,
  passwortAendern,
  zweiFaktorAnmelden,
} from '@/lib/verwaltung/anmeldung'
import { erfolg, fehler, type FormErgebnis } from '@/lib/verwaltung/formular'
import { qrSvg } from '@/lib/verwaltung/qr'
import { anfrageIp, aktuelleSitzung, sitzungErzwingen, sitzungsCookieLoeschen, sitzungsCookieSetzen } from '@/lib/verwaltung/sitzung'
import { totpGeheimnisAnzeigen, totpGeheimnisErzeugen, totpUri } from '@/lib/verwaltung/totp'
import { protokollieren } from '@/lib/verwaltung/verlauf'

const GESPERRT = 'Zu viele falsche Versuche. Bitte in einer Viertelstunde erneut probieren.'

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '')

// ─── Einrichtung ─────────────────────────────────────────────────────────────

export type EinrichtungsDaten =
  | { name: string; benutzername: string; totpGeheimnisAnzeige: string; qrSvg: string }
  | { fehler: string }

/**
 * Prüft einen Einladungs-Code und bereitet die App-Kopplung vor (neues Geheimnis + QR-Code).
 * Das Geheimnis wird am Einladungs-Code gespeichert und erst mit Abschluss der Einrichtung übernommen;
 * zurück an den Server kommt nur der 6-stellige App-Code.
 */
export async function einrichtungLaden(code: string): Promise<EinrichtungsDaten> {
  const db = datenbank()
  const ip = await anfrageIp()
  if (istGesperrt(db, ip)) return { fehler: GESPERRT }
  const geheimnis = totpGeheimnisErzeugen()
  const zugang = einrichtungVorbereiten(db, code, geheimnis)
  if (!zugang || !zugang.benutzername) {
    fehlversuchMerken(db, ip)
    return {
      fehler: 'Dieser Einladungs-Code ist ungültig, abgelaufen oder wurde schon benutzt. Bitte beim Admin einen neuen anfordern.',
    }
  }
  return {
    name: zugang.name,
    benutzername: zugang.benutzername,
    totpGeheimnisAnzeige: totpGeheimnisAnzeigen(geheimnis),
    qrSvg: await qrSvg(totpUri(geheimnis, zugang.benutzername)),
  }
}

export async function einrichten(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const db = datenbank()
  const ip = await anfrageIp()
  if (istGesperrt(db, ip)) return fehler(GESPERRT)
  const ergebnis = await einrichtungAbschliessen(db, {
    code: text(formData, 'code'),
    passwort: text(formData, 'passwort'),
    passwortWdh: text(formData, 'passwortWdh'),
    totpCode: text(formData, 'totpCode'),
    geraetName: geraetNameAusUserAgent((await headers()).get('user-agent')),
    merken: formData.get('merken') === 'ja',
  })
  if (!ergebnis.ok) {
    if (ergebnis.feld === 'totpCode' || ergebnis.codeUngueltig) fehlversuchMerken(db, ip)
    return fehler(ergebnis.meldung, ergebnis.feld ? { [ergebnis.feld]: ergebnis.meldung } : undefined)
  }
  await sitzungsCookieSetzen(ergebnis.token, formData.get('merken') === 'ja')
  redirect('/verwaltung')
}

// ─── Anmeldung ───────────────────────────────────────────────────────────────

export async function anmelden(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const merken = formData.get('merken') === 'ja'
  const ergebnis = await zweiFaktorAnmelden(datenbank(), {
    benutzername: text(formData, 'benutzername'),
    passwort: text(formData, 'passwort'),
    totpCode: text(formData, 'totpCode'),
    ip: await anfrageIp(),
    geraetName: geraetNameAusUserAgent((await headers()).get('user-agent')),
    merken,
  })
  if (!ergebnis.ok) {
    return fehler(
      ergebnis.gesperrt
        ? GESPERRT
        : 'Anmeldung fehlgeschlagen. Benutzername, Passwort oder App-Code stimmen nicht. Hinweis: Jeder App-Code gilt nur einmal – ggf. auf den nächsten warten.',
    )
  }
  await sitzungsCookieSetzen(ergebnis.token, merken)
  redirect('/verwaltung')
}

/** Meldet das aktuelle Gerät ab. */
export async function abmelden(): Promise<void> {
  const sitzung = await aktuelleSitzung()
  if (sitzung) {
    const db = datenbank()
    const geraet = db.select().from(schema.geraete).where(eq(schema.geraete.id, sitzung.geraetId)).get()
    db.delete(schema.geraete).where(eq(schema.geraete.id, sitzung.geraetId)).run()
    protokollieren(db, sitzung.rechte, { aktion: 'abmeldung', objektTyp: 'geraete', bezeichnung: geraet?.name ?? 'Gerät' })
  }
  await sitzungsCookieLoeschen()
  redirect('/verwaltung/login')
}

// ─── Mein Zugang ─────────────────────────────────────────────────────────────

/** Meldet ein eigenes (anderes) Gerät ab. */
export async function geraetAbmelden(formData: FormData): Promise<void> {
  const { rechte, geraetId } = await sitzungErzwingen()
  const id = Number(formData.get('geraetId'))
  if (!Number.isInteger(id) || id === geraetId) return
  const db = datenbank()
  const geraet = db
    .select()
    .from(schema.geraete)
    .where(and(eq(schema.geraete.id, id), eq(schema.geraete.zugangId, rechte.zugangId)))
    .get()
  if (!geraet) return
  db.delete(schema.geraete).where(eq(schema.geraete.id, id)).run()
  protokollieren(db, rechte, { aktion: 'abmeldung', objektTyp: 'geraete', objektId: id, bezeichnung: `${geraet.name} (aus der Ferne)` })
  redirect('/verwaltung/geraete')
}

export async function passwortAendernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte, geraetId } = await sitzungErzwingen()
  const ergebnis = await passwortAendern(datenbank(), rechte.zugangId, geraetId, await anfrageIp(), {
    altesPasswort: text(formData, 'altesPasswort'),
    totpCode: text(formData, 'totpCode'),
    neuesPasswort: text(formData, 'neuesPasswort'),
    neuesPasswortWdh: text(formData, 'neuesPasswortWdh'),
  })
  if (!ergebnis.ok) return fehler(ergebnis.meldung, ergebnis.feld ? { [ergebnis.feld]: ergebnis.meldung } : undefined)
  return erfolg('Passwort geändert. Alle anderen Geräte wurden abgemeldet.')
}
