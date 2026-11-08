/**
 * lib/instagram.ts
 *
 * Die neuesten Beiträge von @svholmseppensen für die Instagram-Kachel der Startseite.
 *
 * Woher die Bilder kommen:
 *   Über die offizielle „Instagram API with Instagram Login“ (graph.instagram.com). Dafür braucht es
 *   ein professionelles Instagram-Konto (Creator oder Unternehmen) und einen Zugangsschlüssel
 *   (Long-lived Access Token), den Admins in der Verwaltung eintragen (/verwaltung/instagram). Er
 *   steht nur verschlüsselt in der Datenbank (lib/verwaltung/geheimnis.ts, Schlüssel aus CRON_SECRET).
 *
 * Ablauf eines Abgleichs (instagramAbgleichen):
 *   1. Den Zugangsschlüssel verlängern, wenn die letzte Verlängerung ein paar Tage her ist. Ein
 *      Schlüssel gilt 60 Tage und lässt sich ab einem Alter von 24 Stunden beliebig oft um 60 Tage
 *      verlängern – solange die Website regelmäßig abgleicht, läuft er also nie ab.
 *   2. Die letzten Beiträge abfragen und die ersten ANZAHL mit Bild nehmen (Videos und Reels mit
 *      Vorschaubild, Alben mit ihrem ersten Bild).
 *   3. Die Bilder herunterladen, quadratisch zuschneiden und als WebP in den Medienordner legen
 *      (instagram/<id>-<hash>.webp). Besucher*innen laden sie von unserem Server – ihr Browser
 *      verbindet sich nicht mit Instagram (Datenschutz), und die zeitlich begrenzten CDN-Links von
 *      Instagram spielen keine Rolle. Bilder älterer Beiträge werden gelöscht.
 *
 * Wann abgeglichen wird:
 *   - Beim Aufruf der Startseite, wenn der letzte Versuch über eine Stunde her ist (im Hintergrund
 *     per after(), die Seite wartet nicht darauf),
 *   - per Cron über /api/cron/instagram (optional, hält den Schlüssel auch ohne Besuche frisch),
 *   - sofort beim Speichern des Schlüssels und mit „Jetzt abrufen“ in der Verwaltung.
 *
 * Schlägt ein Abgleich fehl, bleiben die zuletzt geholten Bilder stehen; der Fehler erscheint in
 * der Verwaltung. Solange nichts abgerufen ist, zeigt die Startseite Platzhalterfotos.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { datenbank, schema, type Datenbank } from '@/lib/db'
import { medienDatei, medienUrl } from '@/lib/medien'
import { entschluesseln, verschluesseln } from '@/lib/verwaltung/geheimnis'

// ─── Konstanten ──────────────────────────────────────────────────────────────

/** Einstellung mit dem Zugang (Schlüssel verschlüsselt) – geändert von Admins und beim Verlängern. */
export const INSTAGRAM_ZUGANG_SCHLUESSEL = 'instagram'
/** Einstellung mit den abgerufenen Beiträgen und dem Stand des letzten Abgleichs. */
export const INSTAGRAM_FEED_SCHLUESSEL = 'instagram-beitraege'

/** So viele Fotos zeigt die Kachel auf der Startseite. */
export const INSTAGRAM_ANZAHL = 3

/**
 * Ohne Versionsnummer im Pfad nimmt die API die älteste noch unterstützte Version – so bricht der
 * Abruf nicht, wenn eine fest eingetragene Version nach etwa zwei Jahren abgeschaltet wird.
 */
const API = 'https://graph.instagram.com'
const ORDNER = 'instagram'
/** Kantenlänge der gespeicherten Quadrate – reicht für die Kachel auf Retina-Displays. */
const KANTE = 640
const MAX_BILD_BYTES = 15 * 1024 * 1024
const ZEITLIMIT_MS = 15_000
/** Abstand zwischen zwei automatischen Abgleichen (auch nach einem Fehler). */
const ABRUF_ABSTAND_MS = 60 * 60 * 1000
/** Verlängern, wenn die letzte Verlängerung so lange her ist (frühestens nach 24 Std. erlaubt). */
const VERLAENGERN_NACH_MS = 3 * 24 * 60 * 60 * 1000
/** Ein neuer oder verlängerter Schlüssel gilt 60 Tage. */
const GUELTIGKEIT_MS = 60 * 24 * 60 * 60 * 1000

// ─── Gespeicherte Daten ──────────────────────────────────────────────────────

export interface InstagramZugang {
  /** verschlüsselt (geheimnis.ts) oder null = nicht verbunden */
  token: string | null
  /** Instagram-Name des verbundenen Kontos, ohne "@" */
  benutzername: string | null
  /** Wann der Schlüssel eingetragen oder zuletzt verlängert wurde (ISO) */
  erneuertAm: string | null
  /** Ablauf laut API bzw. geschätzt beim Eintragen (ISO) */
  gueltigBis: string | null
}

export interface InstagramBeitrag {
  /** Medien-ID bei Instagram */
  id: string
  /** Link zum Beitrag (permalink) */
  link: string
  /** relativer Medienpfad des gespeicherten Quadrats */
  bild: string
  /** Veröffentlichung (ISO, UTC) */
  datum: string
}

export interface InstagramFeed {
  /** neueste zuerst */
  beitraege: InstagramBeitrag[]
  /** letzter erfolgreicher Abgleich (ISO) */
  abgerufenAm: string | null
  /** letzter Versuch, ob erfolgreich oder nicht (ISO) – bremst die automatischen Abrufe */
  versuchtAm: string | null
  /** Fehler des letzten Versuchs oder null */
  fehler: string | null
}

const LEERER_ZUGANG: InstagramZugang = { token: null, benutzername: null, erneuertAm: null, gueltigBis: null }
const LEERER_FEED: InstagramFeed = { beitraege: [], abgerufenAm: null, versuchtAm: null, fehler: null }

type Lesend = Pick<Datenbank, 'select'>
type Schreibend = Pick<Datenbank, 'insert'>

function einstellungLesen(db: Lesend, schluessel: string): { wert: Record<string, unknown>; geaendertAm: string | null } {
  const zeile = db.select().from(schema.einstellungen).where(eq(schema.einstellungen.schluessel, schluessel)).get()
  const wert = zeile?.wert && typeof zeile.wert === 'object' ? (zeile.wert as Record<string, unknown>) : {}
  return { wert, geaendertAm: zeile?.geaendertAm ?? null }
}

export function einstellungSchreiben(db: Schreibend, schluessel: string, wert: object): void {
  db.insert(schema.einstellungen)
    .values({ schluessel, wert })
    .onConflictDoUpdate({ target: schema.einstellungen.schluessel, set: { wert, geaendertAm: new Date().toISOString() } })
    .run()
}

const text = (w: unknown): string | null => (typeof w === 'string' && w !== '' ? w : null)

export function instagramZugangLesen(db: Lesend = datenbank()): InstagramZugang & { geaendertAm: string | null } {
  const { wert: w, geaendertAm } = einstellungLesen(db, INSTAGRAM_ZUGANG_SCHLUESSEL)
  return {
    token: text(w.token),
    benutzername: text(w.benutzername),
    erneuertAm: text(w.erneuertAm),
    gueltigBis: text(w.gueltigBis),
    geaendertAm,
  }
}

export function instagramFeedLesen(db: Lesend = datenbank()): InstagramFeed {
  const { wert: w } = einstellungLesen(db, INSTAGRAM_FEED_SCHLUESSEL)
  const beitraege = Array.isArray(w.beitraege)
    ? (w.beitraege as unknown[]).filter(
        (b): b is InstagramBeitrag =>
          !!b && typeof b === 'object' && ['id', 'link', 'bild', 'datum'].every(k => typeof (b as Record<string, unknown>)[k] === 'string'),
      )
    : []
  return { beitraege, abgerufenAm: text(w.abgerufenAm), versuchtAm: text(w.versuchtAm), fehler: text(w.fehler) }
}

// ─── Für die Startseite ──────────────────────────────────────────────────────

/** Bild für die Kachel: Link zum Beitrag und URL des gespeicherten Quadrats. */
export interface InstagramFoto {
  link: string
  bild: string
}

/**
 * Die gespeicherten Beiträge, deren Bilddatei da ist – neueste zuerst, höchstens INSTAGRAM_ANZAHL.
 * Ohne Verbindung keine (falls ein Abgleich noch zu Ende lief, während die Verbindung getrennt wurde).
 */
export function instagramFotos(db: Lesend = datenbank()): InstagramFoto[] {
  if (!instagramZugangLesen(db).token) return []
  return instagramFeedLesen(db)
    .beitraege.filter(b => dateiVorhanden(b.bild))
    .slice(0, INSTAGRAM_ANZAHL)
    .map(b => ({ link: b.link, bild: medienUrl(b.bild) as string }))
}

/** Ist ein automatischer Abgleich dran? (verbunden und letzter Versuch über eine Stunde her) */
export function instagramAbgleichFaellig(db: Lesend = datenbank(), jetzt = Date.now()): boolean {
  if (laufend) return false
  if (!instagramZugangLesen(db).token) return false
  const versucht = instagramFeedLesen(db).versuchtAm
  return !versucht || jetzt - Date.parse(versucht) >= ABRUF_ABSTAND_MS
}

// ─── Instagram API ───────────────────────────────────────────────────────────

/** Fehler mit einem Text, der so in der Verwaltung angezeigt werden kann. */
export class InstagramFehler extends Error {
  constructor(
    meldung: string,
    /** Fehlercode der API (z. B. 190 = Schlüssel ungültig oder abgelaufen) */
    readonly code?: number,
  ) {
    super(meldung)
  }
}

interface ApiFehler {
  error?: { message?: string; code?: number }
}

async function apiAbruf<T>(pfad: string, parameter: Record<string, string>, token: string): Promise<T> {
  const url = new URL(pfad, API)
  for (const [name, wert] of Object.entries(parameter)) url.searchParams.set(name, wert)
  url.searchParams.set('access_token', token)
  let antwort: Response
  try {
    antwort = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ZEITLIMIT_MS) })
  } catch (fehler) {
    throw new InstagramFehler(`Instagram ist nicht erreichbar (${fehler instanceof Error ? fehler.message : String(fehler)}).`)
  }
  const daten = (await antwort.json().catch(() => null)) as (T & ApiFehler) | null
  if (!antwort.ok || !daten || daten.error) {
    const code = daten?.error?.code
    if (code === 190) {
      throw new InstagramFehler('Der Zugangsschlüssel ist abgelaufen oder ungültig. Bitte einen neuen eintragen.', code)
    }
    const text = daten?.error?.message ?? `HTTP ${antwort.status}`
    throw new InstagramFehler(`Instagram meldet: ${text}`, code)
  }
  return daten
}

/** Prüft einen Schlüssel und liefert den Namen des Kontos. */
export async function instagramKontoPruefen(token: string): Promise<{ benutzername: string }> {
  const ich = await apiAbruf<{ username?: string }>('/me', { fields: 'user_id,username' }, token)
  if (!ich.username) throw new InstagramFehler('Instagram hat kein Konto zu diesem Schlüssel geliefert.')
  return { benutzername: ich.username }
}

async function tokenVerlaengern(token: string): Promise<{ token: string; gueltigBis: string }> {
  const antwort = await apiAbruf<{ access_token?: string; expires_in?: number }>(
    '/refresh_access_token',
    { grant_type: 'ig_refresh_token' },
    token,
  )
  if (!antwort.access_token) throw new InstagramFehler('Instagram hat beim Verlängern keinen Schlüssel geliefert.')
  const sekunden = typeof antwort.expires_in === 'number' ? antwort.expires_in : GUELTIGKEIT_MS / 1000
  return { token: antwort.access_token, gueltigBis: new Date(Date.now() + sekunden * 1000).toISOString() }
}

interface ApiMedium {
  id: string
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  children?: { data?: ApiMedium[] }
}

const FELDER = 'id,media_type,media_url,thumbnail_url,permalink,timestamp'

/** Die letzten Beiträge, neueste zuerst. Alben mit ihren Einzelbildern (für das Titelbild). */
async function beitraegeLaden(token: string): Promise<ApiMedium[]> {
  const abfrage = (felder: string) => apiAbruf<{ data?: ApiMedium[] }>('/me/media', { fields: felder, limit: '12' }, token)
  let antwort: { data?: ApiMedium[] }
  try {
    antwort = await abfrage(`${FELDER},children{media_type,media_url,thumbnail_url}`)
  } catch (fehler) {
    // Code 100 = ungültiger Parameter: dann eben ohne Einzelbilder der Alben (media_url zeigt aufs erste).
    if (!(fehler instanceof InstagramFehler) || fehler.code !== 100) throw fehler
    antwort = await abfrage(FELDER)
  }
  return Array.isArray(antwort.data) ? antwort.data : []
}

/** Adresse des Bildes, das für einen Beitrag gezeigt wird – oder null (z. B. Video ohne Vorschaubild). */
function bildAdresse(m: ApiMedium): string | null {
  if (m.media_type === 'VIDEO') return m.thumbnail_url ?? null
  if (m.media_type === 'CAROUSEL_ALBUM') {
    const erstes = m.children?.data?.[0]
    const vomErsten = erstes ? bildAdresse(erstes) : null
    if (vomErsten) return vomErsten
  }
  return m.media_url ?? m.thumbnail_url ?? null
}

// ─── Bilder ──────────────────────────────────────────────────────────────────

function dateiVorhanden(pfad: string): boolean {
  const datei = medienDatei(pfad)
  return !!datei && fs.existsSync(datei)
}

/** Lädt ein Bild, schneidet es quadratisch zu und speichert es; liefert den relativen Medienpfad. */
async function bildSpeichern(id: string, adresse: string): Promise<string> {
  const antwort = await fetch(adresse, { cache: 'no-store', signal: AbortSignal.timeout(ZEITLIMIT_MS) })
  if (!antwort.ok) throw new InstagramFehler(`Bild nicht ladbar (HTTP ${antwort.status}).`)
  const typ = antwort.headers.get('content-type') ?? ''
  if (!typ.startsWith('image/')) throw new InstagramFehler(`Kein Bild (${typ || 'unbekannter Typ'}).`)
  const laenge = Number(antwort.headers.get('content-length'))
  if (laenge > MAX_BILD_BYTES) throw new InstagramFehler('Bild zu groß.')
  const roh = Buffer.from(await antwort.arrayBuffer())
  if (roh.length > MAX_BILD_BYTES) throw new InstagramFehler('Bild zu groß.')
  const quadrat = await sharp(roh, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize(KANTE, KANTE, { fit: 'cover', withoutEnlargement: false })
    .webp({ quality: 80 })
    .toBuffer()
  const hash = createHash('sha1').update(quadrat).digest('hex').slice(0, 8)
  const name = /^\d+$/.test(id) ? id : createHash('sha1').update(id).digest('hex').slice(0, 16)
  const relativ = `${ORDNER}/${name}-${hash}.webp`
  const ziel = medienDatei(relativ)
  if (!ziel) throw new InstagramFehler('Ungültiger Dateipfad.')
  fs.mkdirSync(path.dirname(ziel), { recursive: true })
  fs.writeFileSync(ziel, quadrat)
  return relativ
}

/** Löscht alle Bilder im Instagram-Ordner, die nicht mehr gezeigt werden. */
function aufraeumen(behalten: string[]): void {
  const ordner = medienDatei(ORDNER)
  if (!ordner || !fs.existsSync(ordner)) return
  const bleibt = new Set(behalten.map(p => path.basename(p)))
  for (const datei of fs.readdirSync(ordner)) {
    if (!bleibt.has(datei)) fs.rmSync(path.join(ordner, datei), { force: true })
  }
}

// ─── Abgleich ────────────────────────────────────────────────────────────────

export type InstagramAbgleich =
  | { ok: true; anzahl: number; neu: number; verlaengert: boolean }
  | { ok: false; fehler: string; nichtVerbunden?: true }

/** Läuft gerade ein Abgleich? Dann hängen sich weitere Aufrufe an ihn an (ein Prozess, ein Abgleich). */
let laufend: Promise<InstagramAbgleich> | null = null

export function instagramAbgleichen(): Promise<InstagramAbgleich> {
  laufend ??= abgleichen(datenbank()).finally(() => {
    laufend = null
  })
  return laufend
}

async function abgleichen(db: Datenbank): Promise<InstagramAbgleich> {
  const zugang = instagramZugangLesen(db)
  if (!zugang.token) return { ok: false, fehler: 'Instagram ist noch nicht verbunden.', nichtVerbunden: true }
  const alt = instagramFeedLesen(db)
  const jetzt = new Date().toISOString()

  const fehlschlag = (fehler: string): InstagramAbgleich => {
    einstellungSchreiben(db, INSTAGRAM_FEED_SCHLUESSEL, { ...alt, versuchtAm: jetzt, fehler } satisfies InstagramFeed)
    console.warn(`[instagram] ${fehler}`)
    return { ok: false, fehler }
  }

  let token = entschluesseln(zugang.token)
  if (!token) return fehlschlag('Der gespeicherte Zugangsschlüssel lässt sich nicht mehr lesen (CRON_SECRET wurde geändert). Bitte neu eintragen.')

  // 1. Schlüssel verlängern. Klappt das nicht, geht es mit dem bisherigen weiter – nächstes Mal neuer Versuch.
  let verlaengert = false
  if (!zugang.erneuertAm || Date.now() - Date.parse(zugang.erneuertAm) >= VERLAENGERN_NACH_MS) {
    try {
      const neu = await tokenVerlaengern(token)
      const verschluesselt = verschluesseln(neu.token)
      if (verschluesselt) {
        token = neu.token
        verlaengert = true
        einstellungSchreiben(db, INSTAGRAM_ZUGANG_SCHLUESSEL, {
          token: verschluesselt,
          benutzername: zugang.benutzername,
          erneuertAm: jetzt,
          gueltigBis: neu.gueltigBis,
        } satisfies InstagramZugang)
      }
    } catch (fehler) {
      if (fehler instanceof InstagramFehler && fehler.code === 190) return fehlschlag(fehler.message)
      console.warn(`[instagram] Verlängern des Schlüssels fehlgeschlagen: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
    }
  }

  // 2. Beiträge abfragen und 3. Bilder speichern – vorhandene Bilder werden wiederverwendet.
  try {
    const medien = await beitraegeLaden(token)
    const beitraege: InstagramBeitrag[] = []
    let neu = 0
    for (const m of medien) {
      if (beitraege.length >= INSTAGRAM_ANZAHL) break
      const link = m.permalink
      if (!m.id || !link) continue
      const vorhanden = alt.beitraege.find(b => b.id === m.id && dateiVorhanden(b.bild))
      if (vorhanden) {
        beitraege.push({ ...vorhanden, link })
        continue
      }
      const adresse = bildAdresse(m)
      if (!adresse) continue
      try {
        const bild = await bildSpeichern(m.id, adresse)
        beitraege.push({ id: m.id, link, bild, datum: m.timestamp ?? jetzt })
        neu++
      } catch (fehler) {
        // Ein einzelnes Bild, das nicht klappt, überspringen – dann kommt der nächste Beitrag dran.
        console.warn(`[instagram] Bild von Beitrag ${m.id} übersprungen: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
      }
    }
    if (medien.length > 0 && beitraege.length === 0) return fehlschlag('Instagram hat Beiträge geliefert, aber kein Bild ließ sich laden.')

    einstellungSchreiben(db, INSTAGRAM_FEED_SCHLUESSEL, { beitraege, abgerufenAm: jetzt, versuchtAm: jetzt, fehler: null } satisfies InstagramFeed)
    aufraeumen(beitraege.map(b => b.bild))
    return { ok: true, anzahl: beitraege.length, neu, verlaengert }
  } catch (fehler) {
    return fehlschlag(fehler instanceof InstagramFehler ? fehler.message : `Abruf fehlgeschlagen: ${String(fehler)}`)
  }
}

// ─── Verbindung trennen ──────────────────────────────────────────────────────

/** Entfernt Zugang, Beiträge und Bilder – die Startseite zeigt dann wieder Platzhalter. */
export function instagramTrennen(db: Schreibend): void {
  einstellungSchreiben(db, INSTAGRAM_ZUGANG_SCHLUESSEL, LEERER_ZUGANG)
  einstellungSchreiben(db, INSTAGRAM_FEED_SCHLUESSEL, LEERER_FEED)
  aufraeumen([])
}

/** Ab wann ein frisch eingetragener Schlüssel abläuft (die API verrät es erst beim Verlängern). */
export function geschaetzterAblauf(von = Date.now()): string {
  return new Date(von + GUELTIGKEIT_MS).toISOString()
}
