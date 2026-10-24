/**
 * lib/vorschau.ts
 *
 * Design-Vorschau: Neue Gestaltungen der Website lassen sich über /vorschau/<wahl> einschalten,
 * ohne dass sich für andere Besucher*innen etwas ändert. Die Wahl liegt in einem Cookie.
 *
 * - Ein kleines Skript im <head> (designSkript) setzt daraus data-design am <html>-Element,
 *   bevor die Seite gezeichnet wird, und lädt die Schriften des Designs nach.
 * - Navigation und Footer sind für jedes Design vorgerendert und werden per CSS (app/vorschau.css)
 *   ein- und ausgeblendet; die Unterseiten passen sich über app/vorschau-a.css bzw. -b.css an.
 * - Die Startseite wählt ihr Design serverseitig (lib/vorschau-server.ts).
 *
 * Diese Datei enthält nur Typen und reine Hilfsfunktionen – sie darf auch in Client-Komponenten.
 */

import type { NewsPost, SparteUebersicht, Termin } from '@/lib/content'

// ─── Designs ─────────────────────────────────────────────────────────────────

export const DESIGNS = {
  a: {
    name: 'Matchday',
    beschreibung: 'Dunkel und sportlich – wie die Website eines Profivereins in Schwarz-Weiß.',
    schriften:
      'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,300..900;1,62..125,300..900&display=swap',
  },
  b: {
    name: 'Bento',
    beschreibung: 'Hell und freundlich – abgerundete Kacheln für Familien und Breitensport.',
    schriften:
      'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Plus+Jakarta+Sans:wght@400..800&display=swap',
  },
} as const

export type Design = keyof typeof DESIGNS

/** "aktuell" = Vorschau-Modus an, aber mit dem bisherigen Design (zum Vergleichen). */
export type VorschauWahl = Design | 'aktuell'

export const DESIGN_COOKIE = 'svhs_design_vorschau'

/** Wie lange die Wahl gilt: 30 Tage. */
export const DESIGN_COOKIE_MAX_ALTER = 60 * 60 * 24 * 30

export function alsDesign(wert: string | null | undefined): Design | null {
  return wert === 'a' || wert === 'b' ? wert : null
}

export function alsVorschauWahl(wert: string | null | undefined): VorschauWahl | null {
  return wert === 'aktuell' ? 'aktuell' : alsDesign(wert)
}

/** Wahl aus document.cookie lesen (im Browser). */
export function wahlAusCookieText(cookieText: string): VorschauWahl | null {
  const treffer = cookieText.match(new RegExp(`(?:^|; )${DESIGN_COOKIE}=([^;]*)`))
  return alsVorschauWahl(treffer?.[1])
}

/** Link zum Umschalten; zurueck ist der Pfad, auf dem man danach landen soll. */
export function umschaltLink(wahl: VorschauWahl | 'aus', zurueck?: string): string {
  return zurueck && zurueck !== '/' ? `/vorschau/${wahl}?zurueck=${encodeURIComponent(zurueck)}` : `/vorschau/${wahl}`
}

/**
 * Inline-Skript für den <head>: Liest das Cookie, setzt data-design und lädt die Schriften.
 * Läuft vor dem ersten Zeichnen, damit nichts aufflackert. In der Verwaltung bleibt alles aus.
 */
export function designSkript(): string {
  const schriften = Object.fromEntries(Object.entries(DESIGNS).map(([d, info]) => [d, info.schriften]))
  return `(function(){try{
if(location.pathname.indexOf('/verwaltung')===0)return;
var m=document.cookie.match(/(?:^|; )${DESIGN_COOKIE}=(a|b|aktuell)(?:;|$)/);
if(!m)return;
document.documentElement.setAttribute('data-design',m[1]);
var s=${JSON.stringify(schriften)}[m[1]];
if(s){
var p=document.createElement('link');p.rel='preconnect';p.href='https://fonts.gstatic.com';p.crossOrigin='';document.head.appendChild(p);
var l=document.createElement('link');l.rel='stylesheet';l.href=s;document.head.appendChild(l);}
}catch(e){}})()`
}

// ─── Daten für die Startseiten ───────────────────────────────────────────────

export interface StartseitenDaten {
  /** Alle veröffentlichten News, neueste zuerst */
  news: NewsPost[]
  /** Termine ab heute, chronologisch */
  termine: Termin[]
  /** Sichtbare Sparten in gepflegter Reihenfolge */
  sparten: SparteUebersicht[]
  zahlen: { sparten: number; mannschaften: number }
  /** Heutiges Datum in Europe/Berlin, "YYYY-MM-DD" */
  heute: string
}

/** Heutiges Datum in Europe/Berlin als "YYYY-MM-DD". */
export function heuteInBerlin(jetzt = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(jetzt)
}

/** "Heute", "Morgen", "in 3 Tagen" – datum und heute als "YYYY-MM-DD". */
export function tageLabel(datum: string, heute: string): string {
  const tage = Math.round((Date.parse(datum) - Date.parse(heute)) / 86_400_000)
  if (tage <= 0) return 'Heute'
  if (tage === 1) return 'Morgen'
  return `in ${tage} Tagen`
}

/** "18:30" → "18:30 Uhr"; Freitext wie "ganztägig" bleibt unverändert. */
export function uhrzeitLabel(uhrzeit: string): string {
  return /^\d/.test(uhrzeit) && !/uhr/i.test(uhrzeit) ? `${uhrzeit} Uhr` : uhrzeit
}

// ─── Spiele aus Terminen ─────────────────────────────────────────────────────

export interface SpielInfo {
  /** null bei Terminen, die kein Spiel sind (z. B. Vereinsfest) */
  art: 'heim' | 'auswaerts' | null
  /** "Fußball", "Tischtennis" o. Ä. aus den Tags, sonst null */
  sportart: string | null
  /** Gegner ohne "SV Holm-Seppensen – "; bei Nicht-Spielen der Titel */
  gegner: string
  /** Aus der Beschreibung ("Liga: 2.Kreisklasse"), sonst null */
  liga: string | null
}

const SPORTARTEN = ['Fußball', 'Tischtennis']
const VEREIN = /^SV Holm-Seppensen( II| III)?\s*[–-]\s*/

/**
 * Zerlegt einen synchronisierten Spieltermin ("Heimspiel: SV Holm-Seppensen – TSV Eintr. Hittfeld",
 * Tags ["Fußball", "Herren", "Heimspiel"], Beschreibung "Liga: 2.Kreisklasse …").
 */
export function spielInfo(termin: Termin): SpielInfo {
  const tags = termin.tags.map(t => t.toLowerCase())
  const titel = termin.titel
  const art =
    tags.includes('heimspiel') || /^heimspiel:/i.test(titel)
      ? 'heim'
      : tags.includes('auswärtsspiel') || /^auswärtsspiel:/i.test(titel)
        ? 'auswaerts'
        : null
  const ohnePraefix = titel.replace(/^(heimspiel|auswärtsspiel):\s*/i, '')
  const liga = termin.beschreibung.match(/^Liga:\s*(.+)$/m)?.[1]?.trim() ?? null
  return {
    art,
    sportart: termin.tags.find(t => SPORTARTEN.includes(t)) ?? null,
    gegner: art ? ohnePraefix.replace(VEREIN, '') : titel,
    liga,
  }
}
