/**
 * lib/verwaltung/inhalte/gemeinsam.ts
 *
 * Gemeinsame Helfer für die Pflege von News, Terminen und Downloads in der Verwaltung:
 * Datum, Zuordnung (Verein / Sparte / Mannschaft / Gruppe), Ergebnisformat der
 * Speicherfunktionen und verständliche Meldungen bei Datenbankfehlern.
 *
 * Die Speicherfunktionen in news.ts, termine.ts und downloads.ts sind bewusst reine Funktionen
 * (Datenbank und Rechte werden übergeben) – so lassen sie sich ohne Next.js testen.
 */

import { eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { bearbeitbareTeams, kannSparte, type Rechte } from '@/lib/verwaltung/rechte'

// ─── Ergebnis der Speicherfunktionen ────────────────────────────────────────

export type SpeicherErgebnis =
  | {
      ok: true
      id: number
      /** Neuer Wert von geaendertAm – für die optimistische Sperre beim nächsten Speichern. */
      stand: string
      /** Datei, auf die vorher verwiesen wurde und die jetzt freigegeben werden kann. */
      alteDatei: string | null
    }
  | { ok: false; meldung: string; felder?: Record<string, string> }

export function abgelehnt(meldung: string, felder?: Record<string, string>): SpeicherErgebnis {
  return { ok: false, meldung, felder }
}

export type LoeschErgebnis = { ok: true; alteDatei: string | null } | { ok: false; meldung: string }

export const KONFLIKT = 'Inzwischen hat jemand anderes gespeichert. Bitte Seite neu laden.'
export const FELDER_PRUEFEN = 'Bitte die markierten Felder prüfen.'
export const KEINE_RECHTE = 'Dafür fehlt dir die Berechtigung.'

// ─── Datum ──────────────────────────────────────────────────────────────────

/** Heutiges Datum in deutscher Zeit als "YYYY-MM-DD". */
export function heuteBerlin(jetzt: Date = new Date()): string {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(jetzt)
  const teil = (typ: string) => teile.find(t => t.type === typ)?.value ?? ''
  return `${teil('year')}-${teil('month')}-${teil('day')}`
}

/** true für ein gültiges Datum im Format "YYYY-MM-DD". */
export function istDatum(wert: string | null | undefined): wert is string {
  if (!wert || !/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false
  const d = new Date(wert + 'T12:00:00Z')
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert
}

// ─── Text ───────────────────────────────────────────────────────────────────

/** Mehrzeiliger Text aus einer Textarea: Zeilenumbrüche vereinheitlichen, Ränder abschneiden. */
export function mehrzeilig(wert: string | null | undefined): string {
  return (wert ?? '').replace(/\r\n?/g, '\n').trim()
}

/** "Familie, Kinder ,, Fest" → ["Familie", "Kinder", "Fest"] (ohne Doppelte). */
export function kommaListe(wert: string | null | undefined): string[] {
  const ergebnis: string[] = []
  ;(wert ?? '').split(',').forEach(teil => {
    const t = teil.trim()
    if (t && !ergebnis.some(e => e.toLowerCase() === t.toLowerCase())) ergebnis.push(t)
  })
  return ergebnis
}

/** Sortierte, eindeutige, nicht leere Werte – z. B. für Vorschlagslisten. */
export function vorschlaege(werte: (string | null | undefined)[]): string[] {
  const ergebnis: string[] = []
  werte.forEach(w => {
    const t = (w ?? '').trim()
    if (t && ergebnis.indexOf(t) < 0) ergebnis.push(t)
  })
  return ergebnis.sort((a, b) => a.localeCompare(b, 'de'))
}

// ─── Zuordnung (Verein / Sparte / Mannschaft / Gruppe) ──────────────────────

export interface Zuordnung {
  sparteId: number | null
  mannschaftId: number | null
  gruppeId: number | null
}

/**
 * Wert für das Auswahlfeld: "verein", "sparte:7", "mannschaft:6" oder "gruppe:3".
 * Mannschaft bzw. Gruppe hat Vorrang vor der Sparte (die dann nur deren Sparte ist).
 */
export function zuordnungWert(z: Zuordnung): string {
  if (z.mannschaftId != null) return `mannschaft:${z.mannschaftId}`
  if (z.gruppeId != null) return `gruppe:${z.gruppeId}`
  if (z.sparteId != null) return `sparte:${z.sparteId}`
  return 'verein'
}

/**
 * Wert aus dem Auswahlfeld → Zuordnung. Bei Mannschaft/Gruppe wird die Sparte automatisch
 * auf deren Sparte gesetzt. null, wenn der Wert ungültig ist oder das Ziel nicht (mehr) existiert.
 */
export function zuordnungAufloesen(db: Datenbank, wert: string | null | undefined): Zuordnung | null {
  if (wert === 'verein') return { sparteId: null, mannschaftId: null, gruppeId: null }
  const treffer = /^(sparte|mannschaft|gruppe):(\d+)$/.exec(wert ?? '')
  if (!treffer) return null
  const id = Number(treffer[2])
  if (treffer[1] === 'sparte') {
    const s = db.select({ id: schema.sparten.id }).from(schema.sparten).where(eq(schema.sparten.id, id)).get()
    return s ? { sparteId: s.id, mannschaftId: null, gruppeId: null } : null
  }
  if (treffer[1] === 'mannschaft') {
    const m = db.select().from(schema.mannschaften).where(eq(schema.mannschaften.id, id)).get()
    return m ? { sparteId: m.sparteId, mannschaftId: m.id, gruppeId: null } : null
  }
  const g = db.select().from(schema.gruppen).where(eq(schema.gruppen.id, id)).get()
  return g ? { sparteId: g.sparteId, mannschaftId: null, gruppeId: g.id } : null
}

export interface AuswahlOption {
  wert: string
  text: string
}

export interface AuswahlGruppe {
  titel: string
  optionen: AuswahlOption[]
}

/** Alle Zuordnungen, die der Zugang wählen darf – gruppiert nach Sparte, für ein <select> mit <optgroup>. */
export function zuordnungsOptionen(db: Datenbank, r: Rechte): AuswahlGruppe[] {
  const gruppen: AuswahlGruppe[] = []
  if (r.istAdmin) gruppen.push({ titel: 'Verein', optionen: [{ wert: 'verein', text: 'Ganzer Verein' }] })

  const teams = bearbeitbareTeams(db, r)
  db.select()
    .from(schema.sparten)
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .forEach(s => {
      const optionen: AuswahlOption[] = []
      if (kannSparte(r, s.id)) optionen.push({ wert: `sparte:${s.id}`, text: `Ganze Sparte ${s.name}` })
      teams
        .filter(t => t.sparteId === s.id)
        .forEach(t =>
          optionen.push({
            wert: `${t.art}:${t.id}`,
            text: `${t.name} (${t.art === 'mannschaft' ? 'Mannschaft' : 'Gruppe'})`,
          }),
        )
      if (optionen.length > 0) gruppen.push({ titel: s.name, optionen })
    })
  return gruppen
}

/** Namen von Sparten, Mannschaften und Gruppen – für lesbare Zuordnungen in Listen. */
export function namensVerzeichnis(db: Datenbank) {
  const sparten = new Map<number, string>()
  db.select({ id: schema.sparten.id, name: schema.sparten.name }).from(schema.sparten).all().forEach(s => sparten.set(s.id, s.name))
  const mannschaften = new Map<number, string>()
  db.select({ id: schema.mannschaften.id, name: schema.mannschaften.name }).from(schema.mannschaften).all().forEach(m => mannschaften.set(m.id, m.name))
  const gruppen = new Map<number, string>()
  db.select({ id: schema.gruppen.id, name: schema.gruppen.name }).from(schema.gruppen).all().forEach(g => gruppen.set(g.id, g.name))
  return { sparten, mannschaften, gruppen }
}

/** Lesbare Zuordnung, z. B. { art: 'Mannschaft', text: 'Fußball · U13' }. */
export function zuordnungText(
  z: Zuordnung,
  namen: ReturnType<typeof namensVerzeichnis>,
): { art: 'Verein' | 'Sparte' | 'Mannschaft' | 'Gruppe'; text: string } {
  const sparte = z.sparteId != null ? namen.sparten.get(z.sparteId) ?? 'Sparte' : null
  if (z.mannschaftId != null) {
    const name = namen.mannschaften.get(z.mannschaftId) ?? 'Mannschaft'
    return { art: 'Mannschaft', text: sparte ? `${sparte} · ${name}` : name }
  }
  if (z.gruppeId != null) {
    const name = namen.gruppen.get(z.gruppeId) ?? 'Gruppe'
    return { art: 'Gruppe', text: sparte ? `${sparte} · ${name}` : name }
  }
  if (sparte) return { art: 'Sparte', text: sparte }
  return { art: 'Verein', text: 'Ganzer Verein' }
}

// ─── Datenbankfehler ────────────────────────────────────────────────────────

/** better-sqlite3 wirft SqliteError mit einem Code wie "SQLITE_CONSTRAINT_UNIQUE". */
function sqliteCode(e: unknown): string | null {
  if (typeof e !== 'object' || e === null || !('code' in e)) return null
  const code = (e as { code: unknown }).code
  return typeof code === 'string' && code.startsWith('SQLITE_') ? code : null
}

/**
 * Übersetzt Datenbankfehler in verständliche Meldungen. Unbekannte Fehler werden
 * protokolliert und mit einer allgemeinen Meldung beantwortet.
 * @param eindeutig Meldungen für Unique-Verletzungen je Spaltenname, z. B. { slug: { feld: 'slug', meldung: '…' } }
 */
export function datenbankFehler(
  e: unknown,
  eindeutig: Record<string, { feld: string; meldung: string }> = {},
): SpeicherErgebnis {
  const code = sqliteCode(e)
  const text = e instanceof Error ? e.message : String(e)
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    const spalte = Object.keys(eindeutig).find(s => text.indexOf(`.${s}`) >= 0)
    if (spalte) return abgelehnt(eindeutig[spalte].meldung, { [eindeutig[spalte].feld]: eindeutig[spalte].meldung })
    return abgelehnt('Diesen Eintrag gibt es so schon. Bitte einen anderen Namen wählen.')
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return abgelehnt('Die gewählte Sparte, Mannschaft oder Gruppe gibt es nicht mehr. Bitte Seite neu laden.')
  }
  if (code === 'SQLITE_CONSTRAINT_CHECK' || code === 'SQLITE_CONSTRAINT_NOTNULL') {
    return abgelehnt('Einige Angaben passen nicht zusammen. Bitte die Eingaben prüfen.')
  }
  if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
    return abgelehnt('Die Datenbank ist gerade beschäftigt. Bitte in ein paar Sekunden noch einmal speichern.')
  }
  console.error('[verwaltung] Speichern fehlgeschlagen:', e)
  return abgelehnt('Speichern hat leider nicht geklappt. Bitte noch einmal versuchen – sonst beim Vorstand melden.')
}
