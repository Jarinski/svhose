/**
 * lib/suche/seiten.ts
 *
 * Die festen Seiten der Website für die Suche. Ihr Text steht im Code (Kinderschutz, Impressum,
 * Datenschutz …) oder kommt von außen (Spielpläne von fussball.de und click-tt). Damit die Suche
 * genau das findet, was dort zu lesen ist – auch nach jeder Änderung am Code –, ruft der Server
 * diese Seiten bei sich selbst ab (127.0.0.1) und nimmt den Text aus dem Inhaltsbereich <main>.
 *
 * Der eingelesene Stand gilt 30 Minuten (im Dev-Server 20 Sekunden); danach antwortet die Suche mit dem alten Stand weiter und
 * liest im Hintergrund neu ein. Klappt das Einlesen einer Seite nicht, findet die Suche sie
 * wenigstens über Titel und Stichworte.
 *
 * Seiten, deren Inhalt aus der Datenbank kommt (News, Termine, Sparten …), stehen hier nur mit Titel
 * und Stichworten – ihre Inhalte sind eigene Treffer (lib/suche/quellen.ts).
 */

import { FOERDERVEREIN_START } from '@/lib/foerderverein'
import type { Absatz, SuchDokument } from './quellen'

interface FesteSeite {
  pfad: string
  titel: string
  /** Begriffe, unter denen man die Seite auch findet, ohne dass sie dort stehen */
  stichworte?: string
  /** Text der Seite einlesen (sonst nur Titel und Stichworte) */
  einlesen?: boolean
}

const FESTE_SEITEN: FesteSeite[] = [
  { pfad: '/ueber-uns', titel: 'Über uns', stichworte: 'Verein Philosophie Gemeinschaft', einlesen: true },
  { pfad: '/sportplaetze', titel: 'Sportplätze', stichworte: 'Anfahrt Adresse Karte Halle Platz Turnhalle', einlesen: true },
  { pfad: '/trainingszeiten', titel: 'Trainingszeiten', stichworte: 'Training Zeiten wann Uhrzeit', einlesen: true },
  { pfad: '/kinderschutz', titel: 'Kinderschutz', stichworte: 'Schutzkonzept Vertrauensperson Prävention', einlesen: true },
  { pfad: '/vereinsheim', titel: 'Vereinsheim', stichworte: 'mieten buchen Raum Feier Anfrage Belegung', einlesen: true },
  { pfad: '/fussball', titel: 'Spielplan Fußball', stichworte: 'Spiele Ergebnisse Spieltag fussball.de', einlesen: true },
  { pfad: '/tischtennis', titel: 'Spielplan Tischtennis', stichworte: 'Spiele Ergebnisse Spieltag click-tt', einlesen: true },
  { pfad: '/foerderverein/spenden', titel: 'Spenden an den Förderverein', stichworte: 'Konto IBAN Bankverbindung Kontoverbindung Spendenbescheinigung Spendenquittung Zuwendungsbestätigung Steuer GiroCode', einlesen: true },
  { pfad: '/foerderverein/vorstand', titel: 'Vorstand des Fördervereins', stichworte: 'Förderverein Kontakt', einlesen: true },
  { pfad: '/ansprechpartner', titel: 'Kontakt & Ansprechpartner:innen', stichworte: 'Vorstand E-Mail Telefon Kontakt Ansprechpartner', einlesen: true },
  { pfad: '/downloads', titel: 'Downloads', stichworte: 'Aufnahmeantrag Formulare Mitglied werden Satzung', einlesen: true },
  { pfad: '/impressum', titel: 'Impressum', stichworte: 'Anbieter Verantwortlich', einlesen: true },
  { pfad: '/datenschutz', titel: 'Datenschutz', stichworte: 'Datenschutzerklärung Cookies DSGVO', einlesen: true },
  { pfad: '/news', titel: 'News', stichworte: 'Neuigkeiten Berichte Aktuelles Nachrichten' },
  { pfad: '/termine', titel: 'Termine', stichworte: 'Veranstaltungen Kalender Spiele' },
  { pfad: '/sparten', titel: 'Sparten', stichworte: 'Sportarten Angebot Abteilungen' },
  { pfad: FOERDERVEREIN_START, titel: 'Förderverein', stichworte: 'unterstützen Sportanlagen' },
  { pfad: '/vereinsheim/status', titel: 'Stand meiner Vereinsheim-Anfrage', stichworte: 'Buchung Anfrage Status' },
]

/** Zusatzzeile der Seitentreffer */
function zusatzFuer(pfad: string): string {
  return pfad.startsWith('/foerderverein') ? 'Förderverein' : ''
}

function nurTitel(seite: FesteSeite): SuchDokument {
  return {
    id: `seite:${seite.pfad}`,
    art: 'seite',
    titel: seite.titel,
    url: seite.pfad,
    zusatz: zusatzFuer(seite.pfad),
    stichworte: seite.stichworte,
    absaetze: [],
  }
}

// ─── HTML lesen ─────────────────────────────────────────────────────────────

/**
 * Elemente ohne lesbaren Inhalt oder nur mit Bedienelementen (Filterknöpfe, Formularauswahl) –
 * und die Seitenüberschrift h1, die schon als Titel des Treffers dasteht.
 */
const UEBERSPRINGEN = new Set(['script', 'style', 'svg', 'noscript', 'template', 'iframe', 'canvas', 'video', 'audio', 'select', 'button', 'nav', 'dialog', 'h1'])
/** Elemente, an denen ein neuer Absatz beginnt. */
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'label', 'legend', 'li', 'main', 'ol', 'p', 'pre',
  'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
])
const LEER = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const ZWISCHENUEBERSCHRIFT = new Set(['h2', 'h3'])

const ENTITAETEN: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '' }

function entschluesseln(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, code: string) => {
    if (code[0] === '#') {
      const zahl = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(zahl) ? String.fromCodePoint(zahl) : ganz
    }
    return ENTITAETEN[code.toLowerCase()] ?? ganz
  })
}

/**
 * Der lesbare Text des Inhaltsbereichs als Absätze, jeder mit der Zwischenüberschrift (h2/h3), unter
 * der er steht. Gelesen wird <main> und, was React nachgeschoben hat (<div hidden id="S:…">).
 * Navigationen, Knöpfe, Grafiken und alles mit aria-hidden="true" oder data-suche="aus" bleiben
 * draußen. Wiederholungen (z. B. dieselbe Karte für Handy und Rechner) zählen einmal.
 */
export function htmlAbsaetze(html: string): Absatz[] {
  const absaetze: Absatz[] = []
  const gesehen = new Set<string>()
  const stapel: { name: string; lesen: boolean; aus: boolean }[] = []
  let puffer = ''
  let ueberschrift: string | undefined

  const abschliessen = (alsUeberschrift = false) => {
    const text = puffer.replace(/\s+/g, ' ').trim()
    puffer = ''
    if (!text) return
    if (alsUeberschrift) ueberschrift = text
    if (gesehen.has(text)) return
    gesehen.add(text)
    absaetze.push({ text, ueberschrift })
  }

  const teile = /<!--[\s\S]*?-->|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)|</g
  for (const m of html.matchAll(teile)) {
    const [, schliessend, rohName, attribute = '', text] = m
    const oben = stapel[stapel.length - 1]

    if (text !== undefined) {
      if (oben?.lesen && !oben.aus) puffer += entschluesseln(text)
      continue
    }
    if (!rohName) continue
    const name = rohName.toLowerCase()

    if (schliessend) {
      const stelle = stapel.map(e => e.name).lastIndexOf(name)
      if (stelle === -1) continue
      const element = stapel[stelle]
      if (element.lesen && !element.aus && BLOCK.has(name)) abschliessen(ZWISCHENUEBERSCHRIFT.has(name))
      stapel.length = stelle
      continue
    }

    const lesen =
      (oben?.lesen ?? false) || name === 'main' || (name === 'div' && /(^|\s)hidden(\s|=|$)/.test(attribute) && /\bid="S:/.test(attribute))
    const aus =
      (oben?.aus ?? false) ||
      UEBERSPRINGEN.has(name) ||
      /\baria-hidden="true"/.test(attribute) ||
      /\bdata-suche="aus"/.test(attribute)
    if (lesen && !aus && BLOCK.has(name)) abschliessen()
    if (LEER.has(name) || attribute.trimEnd().endsWith('/')) continue
    stapel.push({ name, lesen, aus })
  }
  abschliessen()
  return absaetze
}

// ─── Einlesen ───────────────────────────────────────────────────────────────

/** Eigene Adresse des Servers – Next.js legt sie beim Start ab (http://127.0.0.1:3000 o. ä.). */
function eigeneAdresse(): string {
  return process.env.__NEXT_PRIVATE_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3000}`
}

async function seiteEinlesen(seite: FesteSeite): Promise<{ dokument: SuchDokument; ok: boolean }> {
  try {
    const antwort = await fetch(new URL(seite.pfad, eigeneAdresse()), {
      cache: 'no-store',
      headers: { 'user-agent': 'svhs-suchindex', accept: 'text/html' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
    return { dokument: { ...nurTitel(seite), absaetze: htmlAbsaetze(await antwort.text()) }, ok: true }
  } catch (fehler) {
    console.error(`Suche: ${seite.pfad} nicht einlesbar`, fehler instanceof Error ? fehler.message : fehler)
    return { dokument: nurTitel(seite), ok: false }
  }
}

/** Im Dev-Server ändern sich die Seiten ständig – dort nur kurz merken */
const GUELTIG_MS = process.env.NODE_ENV === 'development' ? 20_000 : 30 * 60_000
/** Nach einem Fehler früher neu versuchen */
const GUELTIG_NACH_FEHLER_MS = 2 * 60_000
/** So lange wartet die allererste Suche nach dem Start aufs Einlesen, danach antwortet sie ohne */
const ERSTES_WARTEN_MS = 4_000
/** Gleichzeitige Abrufe – der Server bedient nebenher Besucher*innen */
const GLEICHZEITIG = 3

interface Stand {
  dokumente: SuchDokument[]
  zeit: number
  gueltigMs: number
}

const speicher = globalThis as unknown as { __svhsSucheSeiten?: { stand?: Stand; laeuft?: Promise<Stand> } }

async function allesEinlesen(): Promise<Stand> {
  const ergebnisse: { dokument: SuchDokument; ok: boolean }[] = new Array(FESTE_SEITEN.length)
  let naechste = 0
  await Promise.all(
    Array.from({ length: GLEICHZEITIG }, async () => {
      while (naechste < FESTE_SEITEN.length) {
        const i = naechste++
        const seite = FESTE_SEITEN[i]
        ergebnisse[i] = seite.einlesen ? await seiteEinlesen(seite) : { dokument: nurTitel(seite), ok: true }
      }
    }),
  )
  return {
    dokumente: ergebnisse.map(e => e.dokument),
    zeit: Date.now(),
    gueltigMs: ergebnisse.every(e => e.ok) ? GUELTIG_MS : GUELTIG_NACH_FEHLER_MS,
  }
}

/** Dokumente der festen Seiten – sofort aus dem Speicher, nach Ablauf im Hintergrund neu eingelesen. */
export async function seitenDokumente(): Promise<SuchDokument[]> {
  const s = (speicher.__svhsSucheSeiten ??= {})
  const abgelaufen = !s.stand || Date.now() - s.stand.zeit > Math.min(s.stand.gueltigMs, GUELTIG_MS)
  if (abgelaufen && !s.laeuft) {
    s.laeuft = allesEinlesen()
      .then(stand => (s.stand = stand))
      .finally(() => (s.laeuft = undefined))
  }
  if (s.stand) return s.stand.dokumente

  const zuerst = await Promise.race([s.laeuft, new Promise<null>(fertig => setTimeout(() => fertig(null), ERSTES_WARTEN_MS))])
  return zuerst ? zuerst.dokumente : FESTE_SEITEN.map(nurTitel)
}
