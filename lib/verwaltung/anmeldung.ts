/**
 * lib/verwaltung/anmeldung.ts
 *
 * Anmeldung mit Zwei-Faktor: Benutzername + Passwort + 6-stelliger Code aus einer Authenticator-App.
 *
 *   Einladung vom Admin   → Einmal-Code (QR/Link), 7 Tage gültig. Damit legt die Person einmalig
 *                            ihr Passwort fest und koppelt die Authenticator-App.
 *   Anmeldung             → Benutzername + Passwort + App-Code. "Angemeldet bleiben" = 30 Tage,
 *                            sonst endet die Sitzung nach 12 Stunden bzw. mit dem Schließen des Browsers.
 *   Passwort vergessen /   → ein Admin setzt den Zugang zurück: alle Geräte abgemeldet, Passwort und
 *   Handy verloren           App-Kopplung ungültig, neuer Einladungs-Code.
 *
 * Gespeichert werden nur Hashes (Codes, Sitzungstoken: SHA-256; Passwörter: scrypt). Fehlversuche
 * werden pro IP und pro Kombination aus Benutzername und IP gezählt; danach ist eine Viertelstunde Pause.
 */

import { and, eq, gt, isNotNull, isNull, lt, ne, or, sql } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { codeErzeugen, codeNormalisieren, hash, sitzungsTokenErzeugen } from './codes'
import { attrappenHash, passwortHashen, passwortPruefen, passwortRegelVerletzt } from './passwort'
import { slugify } from './text'
import { totpPruefen } from './totp'
import { protokollieren } from './verlauf'

export const EINLADUNG_TAGE = 7
export const SITZUNG_MERKEN_TAGE = 30
export const SITZUNG_KURZ_STUNDEN = 12
const FEHLVERSUCHE_FENSTER_MINUTEN = 15
const FEHLVERSUCHE_MAX_IP = 20
const FEHLVERSUCHE_MAX_NAME = 5

type Zweck = (typeof schema.CODE_ZWECKE)[number]

function inZukunft(ms: number): string {
  return new Date(Date.now() + ms).toISOString()
}

function sitzungsEnde(merken: boolean): string {
  return merken ? inZukunft(SITZUNG_MERKEN_TAGE * 86_400_000) : inZukunft(SITZUNG_KURZ_STUNDEN * 3_600_000)
}

// ─── Benutzernamen ───────────────────────────────────────────────────────────

/** Klein, getrimmt, nur a–z, 0–9, Punkt, Bindestrich, Unterstrich (2–40 Zeichen) – sonst null. */
export function benutzernameNormalisieren(eingabe: string): string | null {
  const name = eingabe.trim().toLowerCase()
  return /^[a-z0-9][a-z0-9._-]{1,39}$/.test(name) ? name : null
}

/** Vorschlag aus dem Namen, z. B. "Max Beispiel" → "max.beispiel" (bei Bedarf mit Zahl eindeutig gemacht). */
export function benutzernameVorschlag(db: Datenbank, name: string): string {
  const basis =
    name
      .split(/\s+/)
      .map(teil => slugify(teil))
      .filter(Boolean)
      .join('.')
      .slice(0, 36) || 'zugang'
  let vorschlag = basis.length >= 2 ? basis : `${basis}1`
  for (let i = 2; db.select().from(schema.zugaenge).where(eq(schema.zugaenge.benutzername, vorschlag)).get(); i++) {
    vorschlag = `${basis}${i}`
  }
  return vorschlag
}

// ─── Einladungs-Codes ────────────────────────────────────────────────────────

/** Erstellt einen Einladungs-Code. Der Klartext wird nur hier zurückgegeben und nirgends gespeichert. */
export function anmeldeCodeErstellen(
  db: Datenbank,
  zugangId: number,
  zweck: Zweck,
  erstelltVon: number | null,
): { code: string; laeuftAb: string } {
  const laeuftAb = inZukunft(EINLADUNG_TAGE * 86_400_000)
  const code = codeErzeugen()
  db.transaction(tx => {
    // Pro Zugang ist immer nur ein Code aktiv – ein neuer macht den alten ungültig.
    tx.delete(schema.anmeldeCodes)
      .where(and(eq(schema.anmeldeCodes.zugangId, zugangId), isNull(schema.anmeldeCodes.verwendetAm)))
      .run()
    // Aufräumen: abgelaufene bzw. vor über 30 Tagen benutzte Codes löschen.
    const vor30Tagen = new Date(Date.now() - 30 * 86_400_000).toISOString()
    tx.delete(schema.anmeldeCodes)
      .where(or(lt(schema.anmeldeCodes.laeuftAb, vor30Tagen), lt(schema.anmeldeCodes.verwendetAm, vor30Tagen)))
      .run()
    tx.insert(schema.anmeldeCodes).values({ zugangId, codeHash: hash(code), zweck, laeuftAb, erstelltVon }).run()
  })
  return { code, laeuftAb }
}

/** Link, der im QR-Code steckt. Der Code steht hinter "#" und wird deshalb nie an den Server geschickt. */
export function anmeldeLink(basisUrl: string, code: string): string {
  return `${basisUrl.replace(/\/+$/, '')}/verwaltung/anmelden#${code}`
}

/** Sucht einen gültigen (unbenutzten, nicht abgelaufenen) Code eines aktiven Zugangs. */
export function codeAufloesen(db: Datenbank, eingabe: string) {
  const code = codeNormalisieren(eingabe)
  if (!code) return null
  const zeile = db
    .select({ code: schema.anmeldeCodes, zugang: schema.zugaenge })
    .from(schema.anmeldeCodes)
    .innerJoin(schema.zugaenge, eq(schema.zugaenge.id, schema.anmeldeCodes.zugangId))
    .where(
      and(
        eq(schema.anmeldeCodes.codeHash, hash(code)),
        isNull(schema.anmeldeCodes.verwendetAm),
        gt(schema.anmeldeCodes.laeuftAb, new Date().toISOString()),
        eq(schema.zugaenge.aktiv, true),
      ),
    )
    .get()
  return zeile ?? null
}

/**
 * Erzeugt für einen gültigen Einladungs-Code die App-Kopplung: Das Geheimnis wird am Code
 * gespeichert, beim Abschluss kommt vom Browser nur der 6-stellige App-Code – nie das Geheimnis.
 * Wird die Seite neu geladen, gilt das neue Geheimnis (die App muss dann neu scannen).
 */
export function einrichtungVorbereiten(db: Datenbank, eingabe: string, geheimnis: string) {
  const treffer = codeAufloesen(db, eingabe)
  if (!treffer || !treffer.zugang.benutzername) return null
  db.update(schema.anmeldeCodes).set({ totpGeheimnis: geheimnis }).where(eq(schema.anmeldeCodes.id, treffer.code.id)).run()
  return treffer.zugang
}

/** Setzt einen Zugang zurück: Passwort und App-Kopplung ungültig, alle Geräte abgemeldet, offene Codes gelöscht. */
export function zugangZuruecksetzen(db: Pick<Datenbank, 'update' | 'delete'>, zugangId: number): void {
  db.update(schema.zugaenge)
    .set({ passwortHash: null, totpGeheimnis: null, totpLetzterSchritt: null, eingerichtetAm: null })
    .where(eq(schema.zugaenge.id, zugangId))
    .run()
  db.delete(schema.geraete).where(eq(schema.geraete.zugangId, zugangId)).run()
  db.delete(schema.anmeldeCodes).where(and(eq(schema.anmeldeCodes.zugangId, zugangId), isNull(schema.anmeldeCodes.verwendetAm))).run()
}

// ─── Fehlversuche ────────────────────────────────────────────────────────────

const ipSchluessel = (ip: string) => hash(`ip:${ip}`)
// Pro Benutzername UND IP: So kann niemand durch Fehlversuche von irgendwoher einen bestimmten
// Zugang (z. B. einen Admin) aussperren.
const nameSchluessel = (benutzername: string, ip: string) => hash(`name:${benutzername}:${ip}`)

function anzahlFehlversuche(db: Datenbank, schluessel: string): number {
  const seit = new Date(Date.now() - FEHLVERSUCHE_FENSTER_MINUTEN * 60_000).toISOString()
  const zeile = db
    .select({ anzahl: sql<number>`count(*)` })
    .from(schema.fehlversuche)
    .where(and(eq(schema.fehlversuche.schluessel, schluessel), gt(schema.fehlversuche.zeitpunkt, seit)))
    .get()
  return zeile?.anzahl ?? 0
}

/** true, wenn von dieser IP (bzw. für diesen Benutzernamen von dieser IP) zu viele Fehlversuche kamen. */
export function istGesperrt(db: Datenbank, ip: string, benutzername?: string | null): boolean {
  if (anzahlFehlversuche(db, ipSchluessel(ip)) >= FEHLVERSUCHE_MAX_IP) return true
  return !!benutzername && anzahlFehlversuche(db, nameSchluessel(benutzername, ip)) >= FEHLVERSUCHE_MAX_NAME
}

export function fehlversuchMerken(db: Datenbank, ip: string, benutzername?: string | null): void {
  const vorEinemTag = new Date(Date.now() - 86_400_000).toISOString()
  db.delete(schema.fehlversuche).where(lt(schema.fehlversuche.zeitpunkt, vorEinemTag)).run()
  db.insert(schema.fehlversuche).values({ schluessel: ipSchluessel(ip) }).run()
  if (benutzername) db.insert(schema.fehlversuche).values({ schluessel: nameSchluessel(benutzername, ip) }).run()
}

// ─── Einrichtung (Passwort + App) ────────────────────────────────────────────

export type EinrichtungsErgebnis =
  | { ok: true; token: string; laeuftAb: string }
  | { ok: false; feld?: 'passwort' | 'passwortWdh' | 'totpCode'; codeUngueltig?: boolean; meldung: string }

/**
 * Schließt die Einrichtung über einen Einladungs-Code ab: Passwort setzen, App koppeln, Gerät anmelden.
 * Das App-Geheimnis wurde vorher mit einrichtungVorbereiten() am Code gespeichert und als QR-Code
 * angezeigt; der eingegebene App-Code beweist, dass die App richtig gekoppelt ist.
 */
export async function einrichtungAbschliessen(
  db: Datenbank,
  eingabe: { code: string; passwort: string; passwortWdh: string; totpCode: string; geraetName: string; merken: boolean },
): Promise<EinrichtungsErgebnis> {
  const treffer = codeAufloesen(db, eingabe.code)
  if (!treffer) {
    return { ok: false, codeUngueltig: true, meldung: 'Dieser Einladungs-Code ist ungültig, abgelaufen oder wurde schon benutzt. Bitte beim Admin einen neuen anfordern.' }
  }
  const regel = passwortRegelVerletzt(eingabe.passwort, treffer.zugang.benutzername)
  if (regel) return { ok: false, feld: 'passwort', meldung: regel }
  if (eingabe.passwort !== eingabe.passwortWdh) return { ok: false, feld: 'passwortWdh', meldung: 'Die beiden Passwörter stimmen nicht überein.' }
  const geheimnis = treffer.code.totpGeheimnis
  if (!geheimnis) return { ok: false, meldung: 'Die App-Kopplung ist unvollständig. Bitte die Seite neu laden.' }
  const schritt = totpPruefen(geheimnis, eingabe.totpCode)
  if (schritt == null) {
    return { ok: false, feld: 'totpCode', meldung: 'Der Code aus der App stimmt nicht. Bitte den aktuell angezeigten Code eingeben (er wechselt alle 30 Sekunden).' }
  }

  const passwortHash = await passwortHashen(eingabe.passwort)
  const token = sitzungsTokenErzeugen()
  const laeuftAb = sitzungsEnde(eingabe.merken)
  const jetzt = new Date().toISOString()
  const ok = db.transaction(tx => {
    const markiert = tx
      .update(schema.anmeldeCodes)
      .set({ verwendetAm: jetzt, totpGeheimnis: null })
      .where(
        and(
          eq(schema.anmeldeCodes.id, treffer.code.id),
          isNull(schema.anmeldeCodes.verwendetAm),
          // Wurde die Seite inzwischen neu geladen, gilt nur noch das neue Geheimnis.
          eq(schema.anmeldeCodes.totpGeheimnis, geheimnis),
        ),
      )
      .run()
    if (markiert.changes !== 1) return false
    tx.update(schema.zugaenge)
      .set({ passwortHash, totpGeheimnis: geheimnis, totpLetzterSchritt: schritt, eingerichtetAm: jetzt, letzteAnmeldung: jetzt })
      .where(eq(schema.zugaenge.id, treffer.zugang.id))
      .run()
    // Neu eingerichtet = frischer Start: alte Sitzungen gelten nicht mehr.
    tx.delete(schema.geraete).where(eq(schema.geraete.zugangId, treffer.zugang.id)).run()
    tx.insert(schema.geraete).values({ zugangId: treffer.zugang.id, sitzungHash: hash(token), name: eingabe.geraetName, laeuftAb }).run()
    protokollieren(tx, { zugangId: treffer.zugang.id, name: treffer.zugang.name }, {
      aktion: 'anmeldung',
      objektTyp: 'zugaenge',
      objektId: treffer.zugang.id,
      bezeichnung: `${eingabe.geraetName} · Passwort und Authenticator-App eingerichtet`,
    })
    return true
  })
  if (!ok) return { ok: false, meldung: 'Dieser Einladungs-Code wurde gerade schon benutzt.' }
  return { ok: true, token, laeuftAb }
}

// ─── Anmeldung ───────────────────────────────────────────────────────────────

export type AnmeldeErgebnis = { ok: true; token: string; laeuftAb: string } | { ok: false; gesperrt: boolean }

/** Anmeldung mit Benutzername + Passwort + App-Code. Fehler bleiben bewusst unspezifisch. */
export async function zweiFaktorAnmelden(
  db: Datenbank,
  eingabe: { benutzername: string; passwort: string; totpCode: string; ip: string; geraetName: string; merken: boolean },
): Promise<AnmeldeErgebnis> {
  const benutzername = benutzernameNormalisieren(eingabe.benutzername)
  if (istGesperrt(db, eingabe.ip, benutzername)) return { ok: false, gesperrt: true }

  const zugang = benutzername
    ? db
        .select()
        .from(schema.zugaenge)
        .where(and(eq(schema.zugaenge.benutzername, benutzername), eq(schema.zugaenge.aktiv, true)))
        .get()
    : undefined

  // Passwort immer prüfen – auch ohne Treffer gegen einen Attrappen-Hash, damit die Antwortzeit nichts verrät.
  const passwortOk = await passwortPruefen(eingabe.passwort, zugang?.passwortHash ?? (await attrappenHash()))
  const schritt =
    zugang && passwortOk && zugang.totpGeheimnis ? totpPruefen(zugang.totpGeheimnis, eingabe.totpCode, zugang.totpLetzterSchritt) : null

  if (!zugang || !passwortOk || schritt == null) {
    fehlversuchMerken(db, eingabe.ip, benutzername)
    return { ok: false, gesperrt: false }
  }

  const token = sitzungsTokenErzeugen()
  const laeuftAb = sitzungsEnde(eingabe.merken)
  const jetzt = new Date().toISOString()
  const ok = db.transaction(tx => {
    // Derselbe App-Code gilt nur einmal (auch bei zwei gleichzeitigen Anmeldungen).
    const aktualisiert = tx
      .update(schema.zugaenge)
      .set({ totpLetzterSchritt: schritt, letzteAnmeldung: jetzt })
      .where(
        and(
          eq(schema.zugaenge.id, zugang.id),
          eq(schema.zugaenge.aktiv, true),
          // Wurde der Zugang währenddessen zurückgesetzt oder das Passwort geändert, gilt die Anmeldung nicht.
          eq(schema.zugaenge.passwortHash, zugang.passwortHash!),
          eq(schema.zugaenge.totpGeheimnis, zugang.totpGeheimnis!),
          or(isNull(schema.zugaenge.totpLetzterSchritt), lt(schema.zugaenge.totpLetzterSchritt, schritt)),
        ),
      )
      .run()
    if (aktualisiert.changes !== 1) return false
    tx.delete(schema.geraete).where(and(eq(schema.geraete.zugangId, zugang.id), lt(schema.geraete.laeuftAb, jetzt))).run()
    tx.insert(schema.geraete).values({ zugangId: zugang.id, sitzungHash: hash(token), name: eingabe.geraetName, laeuftAb }).run()
    protokollieren(tx, { zugangId: zugang.id, name: zugang.name }, {
      aktion: 'anmeldung',
      objektTyp: 'geraete',
      bezeichnung: `${eingabe.geraetName}${eingabe.merken ? ' · angemeldet bleiben' : ''}`,
    })
    return true
  })
  if (!ok) {
    fehlversuchMerken(db, eingabe.ip, benutzername)
    return { ok: false, gesperrt: false }
  }
  return { ok: true, token, laeuftAb }
}

/** Passwort ändern (mit aktuellem Passwort und App-Code). Meldet alle anderen Geräte ab. */
export async function passwortAendern(
  db: Datenbank,
  zugangId: number,
  aktuellesGeraetId: number,
  ip: string,
  eingabe: { altesPasswort: string; totpCode: string; neuesPasswort: string; neuesPasswortWdh: string },
): Promise<{ ok: true } | { ok: false; feld?: 'altesPasswort' | 'totpCode' | 'neuesPasswort' | 'neuesPasswortWdh'; meldung: string }> {
  const zugang = db.select().from(schema.zugaenge).where(eq(schema.zugaenge.id, zugangId)).get()
  if (!zugang?.passwortHash || !zugang.totpGeheimnis) return { ok: false, meldung: 'Der Zugang ist nicht eingerichtet.' }
  if (istGesperrt(db, ip, zugang.benutzername)) return { ok: false, meldung: 'Zu viele falsche Versuche. Bitte in einer Viertelstunde erneut probieren.' }
  const passwortOk = await passwortPruefen(eingabe.altesPasswort, zugang.passwortHash)
  const schritt = passwortOk ? totpPruefen(zugang.totpGeheimnis, eingabe.totpCode, zugang.totpLetzterSchritt) : null
  if (schritt == null) {
    // Bewusst eine gemeinsame Meldung – sie verrät nicht, ob das Passwort gestimmt hat.
    fehlversuchMerken(db, ip, zugang.benutzername)
    return { ok: false, meldung: 'Aktuelles Passwort oder App-Code stimmt nicht.' }
  }
  const regel = passwortRegelVerletzt(eingabe.neuesPasswort, zugang.benutzername)
  if (regel) return { ok: false, feld: 'neuesPasswort', meldung: regel }
  if (eingabe.neuesPasswort !== eingabe.neuesPasswortWdh) return { ok: false, feld: 'neuesPasswortWdh', meldung: 'Die beiden neuen Passwörter stimmen nicht überein.' }
  const passwortHash = await passwortHashen(eingabe.neuesPasswort)
  db.transaction(tx => {
    tx.update(schema.zugaenge).set({ passwortHash, totpLetzterSchritt: schritt }).where(eq(schema.zugaenge.id, zugangId)).run()
    tx.delete(schema.geraete).where(and(eq(schema.geraete.zugangId, zugangId), ne(schema.geraete.id, aktuellesGeraetId))).run()
    protokollieren(tx, { zugangId, name: zugang.name }, { aktion: 'geaendert', objektTyp: 'zugaenge', objektId: zugangId, bezeichnung: 'Passwort geändert (andere Geräte abgemeldet)' })
  })
  return { ok: true }
}

// ─── Sitzungen ───────────────────────────────────────────────────────────────

/** Findet die Sitzung zu einem Cookie-Token. "zuletzt aktiv" wird höchstens einmal pro Stunde aktualisiert. */
export function sitzungFinden(db: Datenbank, token: string) {
  const jetzt = new Date()
  const zeile = db
    .select({ geraet: schema.geraete, zugang: schema.zugaenge })
    .from(schema.geraete)
    .innerJoin(schema.zugaenge, eq(schema.zugaenge.id, schema.geraete.zugangId))
    .where(
      and(
        eq(schema.geraete.sitzungHash, hash(token)),
        gt(schema.geraete.laeuftAb, jetzt.toISOString()),
        eq(schema.zugaenge.aktiv, true),
        // Zurückgesetzte (noch nicht neu eingerichtete) Zugänge haben keine gültigen Sitzungen.
        isNotNull(schema.zugaenge.eingerichtetAm),
      ),
    )
    .get()
  if (!zeile) return null
  if (jetzt.getTime() - new Date(zeile.geraet.zuletztAktiv).getTime() > 3_600_000) {
    db.update(schema.geraete).set({ zuletztAktiv: jetzt.toISOString() }).where(eq(schema.geraete.id, zeile.geraet.id)).run()
  }
  return zeile
}

/** Lesbarer Gerätename aus dem User-Agent, z. B. "iPhone · Safari". */
export function geraetNameAusUserAgent(ua: string | null): string {
  if (!ua) return 'Unbekanntes Gerät'
  const system = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Gerät'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung Internet'
      : /Firefox|FxiOS/.test(ua)
        ? 'Firefox'
        : /Chrome|CriOS/.test(ua)
          ? 'Chrome'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'Browser'
  return `${system} · ${browser}`
}
