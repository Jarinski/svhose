/**
 * lib/suche/suchen.ts
 *
 * Volltextsuche über die ganze Website: Datenbankinhalte (lib/suche/quellen.ts) und feste Seiten
 * (lib/suche/seiten.ts). Genutzt von der Seite /suche und der Schnellsuche (/api/suche).
 *
 * So wird gesucht:
 *   - Jedes Suchwort muss vorkommen – im Titel, in den Stichworten oder im Text (Füllwörter wie
 *     "der" oder "wann" fallen weg). Ein Wort passt auch als Wortteil: "zeugnis" findet
 *     "Führungszeugnis". Schreibweisen von Umlauten und Groß-/Kleinschreibung sind egal.
 *   - Rangfolge: Treffer im Titel zählen am meisten, dann Stichworte, dann der Text; ganze Wörter mehr
 *     als Wortanfänge, diese mehr als Wortteile. Neue News und kommende Termine rücken nach oben,
 *     vergangene Termine nach unten.
 *   - Findet sich nichts, korrigiert die Suche Tippfehler anhand der Wörter, die auf der Website
 *     vorkommen ("Tischtenis" → "Tischtennis"), und zeigt sonst Treffer, die nur einen Teil der
 *     Wörter enthalten.
 */

import { datenbankDokumente, type SuchDokument } from './quellen'
import { seitenDokumente } from './seiten'
import { abstand, ausschnitt, finde, markieren, suchNormal, suchWoerter, textFragment } from './text'
import { ART_NAMEN, SUCH_ARTEN, type SuchArt, type SuchErgebnis, type SuchTreffer } from './typen'

// ─── Vorbereiteter Bestand ──────────────────────────────────────────────────

interface Vorbereitet {
  dok: SuchDokument
  titel: string
  stichworte: string
  absaetze: string[]
}

interface Bestand {
  dokumente: Vorbereitet[]
  /** Wörter der Website in Normalform → Häufigkeit und häufigste Schreibweise (für Korrekturen) */
  woerter: Map<string, { anzahl: number; schreibweise: string }>
}

function vorbereiten(dokumente: SuchDokument[]): Bestand {
  const woerter = new Map<string, { anzahl: number; schreibweise: string; formen: Map<string, number> }>()
  const merken = (text: string) => {
    for (const roh of text.split(/[^\p{L}\p{N}]+/u)) {
      if (roh.length < 4 || /^\d+$/.test(roh)) continue
      const norm = suchNormal(roh)
      const eintrag = woerter.get(norm) ?? { anzahl: 0, schreibweise: roh, formen: new Map<string, number>() }
      eintrag.anzahl++
      eintrag.formen.set(roh, (eintrag.formen.get(roh) ?? 0) + 1)
      woerter.set(norm, eintrag)
    }
  }

  const vorbereitet = dokumente.map(dok => {
    merken(dok.titel)
    dok.absaetze.forEach(a => merken(a.text))
    // Zwischenüberschriften zählen wie Stichworte: Worum es in einem Abschnitt geht, steht dort
    const ueberschriften = new Set(dok.absaetze.map(a => a.ueberschrift).filter(Boolean))
    return {
      dok,
      titel: suchNormal(dok.titel),
      stichworte: suchNormal([dok.zusatz, dok.stichworte, ...ueberschriften].filter(Boolean).join(' ')),
      absaetze: dok.absaetze.map(a => suchNormal(a.text)),
    }
  })

  const ergebnis = new Map<string, { anzahl: number; schreibweise: string }>()
  for (const [norm, e] of woerter) {
    // Schreibweise für "Meintest du": die häufigste, kleingeschrieben außer bei Substantiven
    const form = [...e.formen].sort((a, b) => b[1] - a[1])[0][0]
    ergebnis.set(norm, { anzahl: e.anzahl, schreibweise: form === form.toUpperCase() && form.length > 1 ? form.toLowerCase() : form })
  }
  return { dokumente: vorbereitet, woerter: ergebnis }
}

/** Datenbankinhalte kurz zwischenspeichern: Beim Tippen in der Schnellsuche kommen viele Anfragen kurz hintereinander. */
const DB_GUELTIG_MS = 10_000
const speicher = globalThis as unknown as {
  __svhsSucheBestand?: { zeit: number; seiten: SuchDokument[]; laeuft: Promise<Bestand> }
}

async function bestand(): Promise<Bestand> {
  const seiten = await seitenDokumente()
  const s = speicher.__svhsSucheBestand
  if (s && s.seiten === seiten && Date.now() - s.zeit < DB_GUELTIG_MS) return s.laeuft

  const laeuft = datenbankDokumente().then(db => vorbereiten([...seiten, ...db]))
  speicher.__svhsSucheBestand = { zeit: Date.now(), seiten, laeuft }
  laeuft.catch(() => {
    if (speicher.__svhsSucheBestand?.laeuft === laeuft) speicher.__svhsSucheBestand = undefined
  })
  return laeuft
}

// ─── Bewertung ──────────────────────────────────────────────────────────────

const GEWICHT: Record<SuchArt, number> = {
  seite: 1.15,
  sparte: 1.3,
  team: 1.1,
  news: 1,
  // Abgeglichene Spiele sind zahlreich und ähnlich – sie sollen Sparten und Mannschaften nicht verdrängen
  termin: 0.85,
  person: 1.05,
  download: 1,
}

const TAG_MS = 86_400_000

/** Neue News und bald anstehende Termine sind wichtiger als alte. */
function zeitFaktor(dok: SuchDokument, heute: string): number {
  if (!dok.datum) return 1
  const tage = (Date.parse(dok.datum) - Date.parse(heute)) / TAG_MS
  if (Number.isNaN(tage)) return 1
  if (dok.art === 'termin') {
    if (tage < 0) return 0.5
    return tage <= 30 ? 1.15 : 1
  }
  // Höchstens 15 % für ganz neue News, nach zwei Jahren nichts mehr
  if (dok.art === 'news') return 1 + 0.15 * Math.max(0, 1 + tage / 730)
  return 1
}

interface Bewertung {
  v: Vorbereitet
  punkte: number
  /** Wie viele Suchwörter vorkommen */
  gefunden: number
}

function bewerten(v: Vorbereitet, woerter: string[], heute: string): Bewertung {
  let punkte = 0
  let gefunden = 0
  for (const wort of woerter) {
    const titel = finde(v.titel, wort)
    const stichworte = finde(v.stichworte, wort)
    let text = { guete: 0, anzahl: 0 }
    for (const a of v.absaetze) {
      const f = finde(a, wort)
      text = { guete: Math.max(text.guete, f.guete), anzahl: text.anzahl + f.anzahl }
      if (text.anzahl >= 20) break
    }
    const wert = Math.max(titel.guete * 10, stichworte.guete * 4, text.guete * 1.5 * (1 + 0.1 * Math.min(text.anzahl - 1, 5)))
    if (wert > 0) {
      gefunden++
      punkte += wert
    }
  }

  if (gefunden > 0 && woerter.length > 1) {
    // Wörter direkt hintereinander, wie eingegeben ("Erste Herren", "Tostedter Weg")
    const folge = woerter.join(' ')
    const ohneZeichen = (t: string) => t.replace(/[^\p{L}\p{N}]+/gu, ' ')
    if (ohneZeichen(v.titel).includes(folge)) punkte += 8
    else if (v.absaetze.some(a => ohneZeichen(a).includes(folge))) punkte += 3
  }
  if (v.titel === woerter.join(' ')) punkte += 10

  return { v, punkte: punkte * GEWICHT[v.dok.art] * zeitFaktor(v.dok, heute), gefunden }
}

// ─── Treffer aufbereiten ────────────────────────────────────────────────────

function treffer(v: Vorbereitet, woerter: string[]): SuchTreffer {
  const { dok } = v

  // Der Absatz mit den meisten verschiedenen Suchwörtern, dann der besten Güte, bei Gleichstand der erste
  let bester = -1
  let besterWert = 0
  v.absaetze.forEach((a, i) => {
    let wert = 0
    for (const w of woerter) {
      const g = finde(a, w).guete
      if (g > 0) wert += 10 + g
    }
    if (wert > besterWert) {
      bester = i
      besterWert = wert
    }
  })
  // Steht die Suche ganz im Titel ("Kinderschutz") und im Text nur als Wortteil, erklärt der
  // Anfang der Seite mehr als "Kinderschutzbeauftragter" – und der Link führt nach oben.
  if (woerter.every(w => finde(v.titel, w).guete === 1) && besterWert < woerter.length * 11) bester = -1

  const absatz = bester >= 0 ? dok.absaetze[bester] : null
  let url = dok.url
  if (!dok.extern) {
    // Hat die Adresse schon ein genaues Ziel (#termin-12), würde ein einzelnes Wort wie "U12" eher
    // eine frühere Stelle der Seite treffen – dann nur Wortgruppen
    const min = url.includes('#') ? 2 : 1
    const sprung = absatz ? textFragment(absatz.text, woerter, min) : dok.titelSprung ? textFragment(dok.titel, woerter, min) : null
    if (sprung) url = url.includes('#') ? url.replace(/#.*$/, m => `${m}${sprung.slice(1)}`) : url + sprung
  }

  // Ohne Fundstelle im Text: der Anfang, damit man weiß, worum es geht – lieber ein ganzer Satz
  // als eine Zeile wie "E-Mail: …"
  const zeigen = absatz ?? dok.absaetze.find(a => a.text.length >= 60) ?? dok.absaetze.find(a => a.text.length > 30) ?? null
  const abschnitt = absatz?.ueberschrift && suchNormal(absatz.ueberschrift) !== v.titel ? absatz.ueberschrift : null

  return {
    id: dok.id,
    art: dok.art,
    artName: dok.artName ?? ART_NAMEN[dok.art].einzeln,
    titel: markieren(dok.titel, woerter),
    url,
    extern: !!dok.extern,
    zusatz: [dok.zusatz, abschnitt].filter(Boolean).join(' · '),
    ausschnitt: zeigen && zeigen.text !== abschnitt ? ausschnitt(zeigen.text, woerter) : null,
  }
}

/**
 * Seitentreffer, die nur wegen eines Eintrags auf der Seite passen, sind doppelt: Wer "Passlack"
 * sucht, bekommt die Person – nicht zusätzlich die ganze Kontaktseite. Passt der Titel der Seite
 * selbst, bleibt sie.
 */
function ohneDoppelte(liste: Bewertung[], woerter: string[]): Bewertung[] {
  const eintraege = new Set(liste.map(b => b.v.dok.gehoertZu).filter(Boolean))
  return liste.filter(
    b => !(b.v.dok.art === 'seite' && eintraege.has(b.v.dok.url) && !woerter.some(w => finde(b.v.titel, w).guete > 0)),
  )
}

// ─── Tippfehler ─────────────────────────────────────────────────────────────

/** Ähnlichstes Wort der Website für ein Suchwort, das nirgends vorkommt – oder null. */
function korrigieren(wort: string, b: Bestand): string | null {
  if (wort.length < 4 || /^\d+$/.test(wort)) return null
  const grenze = wort.length >= 6 ? 2 : 1
  let bestes: { wort: string; abstand: number; anzahl: number } | null = null
  for (const [kandidat, { anzahl }] of b.woerter) {
    const d = abstand(wort, kandidat, grenze)
    if (d > grenze) continue
    if (!bestes || d < bestes.abstand || (d === bestes.abstand && anzahl > bestes.anzahl)) bestes = { wort: kandidat, abstand: d, anzahl }
  }
  return bestes?.wort ?? null
}

// ─── Suchen ─────────────────────────────────────────────────────────────────

function durchsuchen(b: Bestand, woerter: string[], alle: boolean): Bewertung[] {
  const heute = new Date().toISOString().slice(0, 10)
  const jetzt = Date.parse(heute)
  // Bei gleicher Punktzahl: was zeitlich am nächsten liegt (neueste News, nächster Termin)
  const naehe = (x: Bewertung) => (x.v.dok.datum ? Math.abs(Date.parse(x.v.dok.datum) - jetzt) || 0 : Infinity)
  const noetig = alle ? woerter.length : 1
  const liste = b.dokumente
    .map(v => bewerten(v, woerter, heute))
    .filter(x => x.gefunden >= noetig)
    .sort((x, y) => y.gefunden - x.gefunden || y.punkte - x.punkte || naehe(x) - naehe(y))
  return ohneDoppelte(liste, woerter)
}

/** Schreibt das Wort in der Eingabe so, wie es auf der Website steht ("tischtenis" → "Tischtennis"). */
function korrekturText(eingabe: string, ersetzungen: Map<string, string>, b: Bestand): string {
  return eingabe
    .split(/(\s+)/)
    .map(teil => {
      const norm = suchNormal(teil).replace(/[^\p{L}\p{N}]+/gu, '')
      const neu = ersetzungen.get(norm)
      return neu ? (b.woerter.get(neu)?.schreibweise ?? neu) : teil
    })
    .join('')
}

/**
 * art      nur Treffer dieser Art
 * grenze   höchstens so viele Treffer (Standard 30)
 * jeArt    gruppiert: je Art höchstens so viele, die Arten in der Reihenfolge ihres besten Treffers
 *          (Schnellsuche – sonst verdrängen z. B. 40 Spiele alle anderen Treffer)
 */
export async function suchen(
  eingabe: string,
  optionen: { art?: SuchArt | null; grenze?: number; jeArt?: number } = {},
): Promise<SuchErgebnis> {
  const leer: SuchErgebnis = { eingabe, korrektur: null, teilweise: false, treffer: [], anzahl: 0, proArt: {} }
  let woerter = suchWoerter(eingabe)
  // Einzelne Buchstaben ergeben keine sinnvolle Suche
  if (woerter.length === 0 || woerter.every(w => w.length < 2)) return leer

  const b = await bestand()
  let liste = durchsuchen(b, woerter, true)
  let korrektur: string | null = null
  let teilweise = false

  if (liste.length === 0) {
    const ersetzungen = new Map<string, string>()
    for (const w of woerter) {
      if (b.dokumente.some(v => v.titel.includes(w) || v.stichworte.includes(w) || v.absaetze.some(a => a.includes(w)))) continue
      const neu = korrigieren(w, b)
      if (neu) ersetzungen.set(w, neu)
    }
    if (ersetzungen.size > 0) {
      const neueWoerter = woerter.map(w => ersetzungen.get(w) ?? w)
      const neueListe = durchsuchen(b, neueWoerter, true)
      if (neueListe.length > 0) {
        woerter = neueWoerter
        liste = neueListe
        korrektur = korrekturText(eingabe, ersetzungen, b)
      }
    }
  }
  if (liste.length === 0 && woerter.length > 1) {
    liste = durchsuchen(b, woerter, false)
    teilweise = liste.length > 0
  }

  const proArt: Partial<Record<SuchArt, number>> = {}
  for (const x of liste) proArt[x.v.dok.art] = (proArt[x.v.dok.art] ?? 0) + 1
  const gefiltert = optionen.art ? liste.filter(x => x.v.dok.art === optionen.art) : liste

  let auswahl = gefiltert
  if (optionen.jeArt && !optionen.art) {
    const gruppen = new Map<SuchArt, Bewertung[]>()
    for (const x of gefiltert) {
      const gruppe = gruppen.get(x.v.dok.art) ?? []
      if (gruppe.length < optionen.jeArt) gruppe.push(x)
      gruppen.set(x.v.dok.art, gruppe)
    }
    auswahl = [...gruppen.values()].flat()
  }

  return {
    eingabe,
    korrektur,
    teilweise,
    treffer: auswahl.slice(0, optionen.grenze ?? 30).map(x => treffer(x.v, woerter)),
    anzahl: gefiltert.length,
    proArt: Object.fromEntries(SUCH_ARTEN.filter(a => proArt[a]).map(a => [a, proArt[a]])),
  }
}
