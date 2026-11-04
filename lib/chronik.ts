/**
 * lib/chronik.ts
 *
 * Aufbau der Förderverein-Chronik (/foerderverein/chronik): eine Einleitung und eine Folge von
 * Bausteinen – Zeitleiste, Text, Foto, Stichpunkte, Zahlen, Zitat –, jeder mit eigener
 * Darstellung. Gespeichert als JSON-Dokument in der Tabelle seiten, bearbeitet unter
 * /verwaltung/chronik von Admins und Zugängen mit Förderverein-Recht.
 *
 * Nur Typen und reine Funktionen ohne Datenbank und ohne Node-Module: nutzbar auf der Website,
 * im Editor (Client) und in der Speicherlogik (lib/verwaltung/inhalte/chronik.ts).
 */

export const CHRONIK_SCHLUESSEL = 'foerderverein-chronik'

/** Bild im gespeicherten Dokument: Pfad im Medienordner und Maße (für das Seitenverhältnis). */
export interface GespeichertesBild {
  pfad: string
  breite: number
  hoehe: number
}

/** Bild, wie es angezeigt wird: fertige Adresse (/medien/… oder im Editor eine lokale Vorschau). */
export interface AnzeigeBild {
  src: string
  breite?: number
  hoehe?: number
}

export const ZEITLEISTE_DARSTELLUNGEN = ['kacheln', 'zeitstrahl', 'gross'] as const
export const LISTEN_DARSTELLUNGEN = ['kaestchen', 'punkte'] as const
export const HINTERGRUENDE = ['hell', 'dunkel'] as const
export const BILD_POSITIONEN = ['rechts', 'links'] as const
export const BILD_BREITEN = ['normal', 'breit'] as const

export type ZeitleistenDarstellung = (typeof ZEITLEISTE_DARSTELLUNGEN)[number]
export type ListenDarstellung = (typeof LISTEN_DARSTELLUNGEN)[number]
export type Hintergrund = (typeof HINTERGRUENDE)[number]
export type BildPosition = (typeof BILD_POSITIONEN)[number]
export type BildBreite = (typeof BILD_BREITEN)[number]

export interface ZeitEintrag<B = GespeichertesBild> {
  /** Nur im Editor: stabiler Schlüssel (React, Dateifeld des Fotos). Wird nicht gespeichert. */
  schluessel?: string
  /** Frei, z. B. "2013", "Oktober 2017" oder "Heute". */
  zeit: string
  titel: string
  text: string
  bild: B | null
}

export interface ZahlEintrag {
  schluessel?: string
  zahl: string
  text: string
}

interface Basis {
  /** Nur im Editor, siehe ZeitEintrag. */
  schluessel?: string
  /** Ausgeblendete Bausteine bleiben gespeichert, erscheinen aber nicht auf der Website. */
  sichtbar: boolean
}

export type Baustein<B = GespeichertesBild> =
  | (Basis & { art: 'zeitleiste'; ueberschrift: string; darstellung: ZeitleistenDarstellung; eintraege: ZeitEintrag<B>[] })
  | (Basis & { art: 'text'; ueberschrift: string; text: string; bild: B | null; bildPosition: BildPosition; hintergrund: Hintergrund })
  | (Basis & { art: 'bild'; bild: B | null; unterschrift: string; breite: BildBreite })
  | (Basis & { art: 'liste'; ueberschrift: string; text: string; punkte: string[]; darstellung: ListenDarstellung })
  | (Basis & { art: 'zahlen'; ueberschrift: string; eintraege: ZahlEintrag[]; hintergrund: Hintergrund })
  | (Basis & { art: 'zitat'; text: string; quelle: string })

export type BausteinArt = Baustein['art']

export interface ChronikInhalt<B = GespeichertesBild> {
  /** Text unter der Überschrift CHRONIK. */
  einleitung: string
  bausteine: Baustein<B>[]
}

// ─── Namen für Editor und Verlauf ───────────────────────────────────────────

export const BAUSTEIN_ARTEN: { art: BausteinArt; name: string; beschreibung: string }[] = [
  { art: 'zeitleiste', name: 'Zeitleiste', beschreibung: 'Stationen mit Jahr, Titel, Text und Foto' },
  { art: 'text', name: 'Textabschnitt', beschreibung: 'Überschrift und Fließtext, wahlweise mit Foto' },
  { art: 'bild', name: 'Foto', beschreibung: 'Ein großes Foto mit Bildunterschrift' },
  { art: 'liste', name: 'Stichpunkte', beschreibung: 'Kurze Punkte, z. B. Ideen oder Unterstützer' },
  { art: 'zahlen', name: 'Zahlen & Fakten', beschreibung: 'Große Zahlen mit kurzer Erklärung' },
  { art: 'zitat', name: 'Zitat', beschreibung: 'Ein hervorgehobener Satz mit Quelle' },
]

export function bausteinName(art: BausteinArt): string {
  return BAUSTEIN_ARTEN.filter(a => a.art === art)[0]?.name ?? art
}

export const DARSTELLUNG_NAMEN: Record<ZeitleistenDarstellung | ListenDarstellung | Hintergrund | BildPosition | BildBreite, string> = {
  kacheln: 'Kacheln',
  zeitstrahl: 'Zeitstrahl',
  gross: 'Groß mit Fotos',
  kaestchen: 'Kästchen',
  punkte: 'Aufzählung',
  hell: 'Hell',
  dunkel: 'Dunkel',
  rechts: 'Foto rechts',
  links: 'Foto links',
  normal: 'Normal',
  breit: 'Volle Breite',
}

// ─── Leere Bausteine (Editor) ───────────────────────────────────────────────

export function neuerBaustein(art: BausteinArt): Baustein<never> {
  switch (art) {
    case 'zeitleiste':
      return { art, sichtbar: true, ueberschrift: '', darstellung: 'kacheln', eintraege: [{ zeit: '', titel: '', text: '', bild: null }] }
    case 'text':
      return { art, sichtbar: true, ueberschrift: '', text: '', bild: null, bildPosition: 'rechts', hintergrund: 'hell' }
    case 'bild':
      return { art, sichtbar: true, bild: null, unterschrift: '', breite: 'normal' }
    case 'liste':
      return { art, sichtbar: true, ueberschrift: '', text: '', punkte: [''], darstellung: 'kaestchen' }
    case 'zahlen':
      return { art, sichtbar: true, ueberschrift: '', eintraege: [{ zahl: '', text: '' }], hintergrund: 'dunkel' }
    case 'zitat':
      return { art, sichtbar: true, text: '', quelle: '' }
  }
}

// ─── Vorlage ────────────────────────────────────────────────────────────────

/**
 * Stand der Chronik, solange in der Verwaltung noch nichts gespeichert wurde.
 * Quellen: alte Website fshose.de und der Artikel „Unsere Unterstützer“ (2014).
 */
export const CHRONIK_VORLAGE: ChronikInhalt = {
  einleitung: 'Von der Idee zum eigenen Platz – so ist der Sportplatz am Tostedter Weg entstanden.',
  bausteine: [
    {
      art: 'zeitleiste',
      sichtbar: true,
      ueberschrift: '',
      darstellung: 'kacheln',
      eintraege: [
        {
          zeit: 'Die Idee',
          titel: 'Eltern gründen den Förderverein',
          text: 'Eltern der damaligen E1-Jugend (U11) wollten ihren Kindern und den nächsten Jahrgängen ein besseres sportliches Umfeld bieten. Ihr Ziel: ein eigener Sportplatz für Holm-Seppensen.',
          bild: null,
        },
        {
          zeit: '2013',
          titel: 'Jeder Quadratmeter zählt',
          text: 'Brunsberglauf, Glühweinstand, Stadtfest und symbolische Patenschaften für Quadratmeter des künftigen Platzes: Allein 2013 kamen knapp 50 neue Mitglieder dazu.',
          bild: null,
        },
        {
          zeit: '2014',
          titel: 'Gemeinsam für Holm-Seppensen',
          text: 'Geschäfte im Ort spenden beim Kauf ausgewählter Produkte einen Teil des Erlöses für den Sportplatz. Bei der Baustellenbesichtigung des neuen REWE-Markts kamen in vier Stunden 400 € an Spenden zusammen.',
          bild: null,
        },
        {
          zeit: 'Oktober 2017',
          titel: 'Spatenstich am Tostedter Weg',
          text: 'Die Stadt Buchholz hat ein 2,9 Hektar großes Gelände gekauft und stellt es dem SV zur Verfügung. Am 27. Oktober 2017 ist Spatenstich – danach werden rund 12.000 m³ Erde bewegt.',
          bild: null,
        },
        {
          zeit: '2018',
          titel: 'Platz und Vereinshaus entstehen',
          text: 'Gebaut werden ein Naturrasenplatz mit Flutlicht und Beregnung und der erste Teil des Vereinshauses mit Umkleiden und Vereinsraum. Ehrenamtliche bepflanzen den Wall und setzen die Hecke – so bleiben die Kosten im Rahmen.',
          bild: null,
        },
        {
          zeit: 'Heute',
          titel: 'Der Platz ist da',
          text: 'Am Tostedter Weg hat der SV heute seine eigene Sportstätte mit Rasenplatz und Vereinsheim. Die Bandenwerbung rund um den Platz soll den weiteren Ausbau mitfinanzieren.',
          bild: null,
        },
      ],
    },
    {
      art: 'liste',
      sichtbar: true,
      ueberschrift: 'Ideen für die Zukunft',
      text: 'Auf dem Gelände ist Platz für mehr. Bei der Planung 2017 standen diese Ideen auf der Liste:',
      punkte: ['Größeres Vereinshaus mit vier Umkleiden und Gymnastikraum', 'Beachvolleyballfeld', 'Laufbahn', 'Bocciaanlage', 'Zusätzlicher Trainingsplatz'],
      darstellung: 'kaestchen',
    },
  ],
}

// ─── Prüfen (Speichern in der Verwaltung und Übung in der Hilfe) ─────────────

const GRENZEN = {
  bausteine: 40,
  eintraege: 60,
  zahlen: 12,
  einleitung: 600,
  ueberschrift: 120,
  zeit: 60,
  titel: 160,
  kurztext: 2000,
  langtext: 10000,
  punkt: 200,
  zahl: 40,
  zahltext: 120,
  unterschrift: 300,
  zitat: 1000,
  quelle: 160,
}

/** Ränder abschneiden und leere Einträge weglassen – so, wie die Chronik gespeichert wird. */
export function chronikBereinigen<B>(inhalt: ChronikInhalt<B>): ChronikInhalt<B> {
  const t = (s: string) => s.trim()
  return {
    einleitung: t(inhalt.einleitung),
    bausteine: inhalt.bausteine.map((b): Baustein<B> => {
      switch (b.art) {
        case 'zeitleiste':
          return {
            ...b,
            ueberschrift: t(b.ueberschrift),
            eintraege: b.eintraege
              .map(e => ({ ...e, zeit: t(e.zeit), titel: t(e.titel), text: t(e.text) }))
              .filter(e => e.zeit || e.titel || e.text || e.bild),
          }
        case 'text':
          return { ...b, ueberschrift: t(b.ueberschrift), text: t(b.text) }
        case 'bild':
          return { ...b, unterschrift: t(b.unterschrift) }
        case 'liste':
          return { ...b, ueberschrift: t(b.ueberschrift), text: t(b.text), punkte: b.punkte.map(t).filter(Boolean) }
        case 'zahlen':
          return { ...b, ueberschrift: t(b.ueberschrift), eintraege: b.eintraege.map(e => ({ ...e, zahl: t(e.zahl), text: t(e.text) })).filter(e => e.zahl || e.text) }
        case 'zitat':
          return { ...b, text: t(b.text), quelle: t(b.quelle) }
      }
    }),
  }
}

/**
 * Prüft Pflichtangaben und Längen einer bereinigten Chronik. Liefert die erste Unstimmigkeit
 * als Satz für die Person am Bildschirm – oder null, wenn alles passt.
 */
export function chronikPruefen<B>(inhalt: ChronikInhalt<B>): string | null {
  const zuLang = (wert: string, grenze: number) => wert.length > grenze
  if (zuLang(inhalt.einleitung, GRENZEN.einleitung)) return `Die Einleitung ist zu lang (höchstens ${GRENZEN.einleitung} Zeichen).`
  if (inhalt.bausteine.length > GRENZEN.bausteine) return `Die Chronik hat zu viele Bausteine (höchstens ${GRENZEN.bausteine}).`

  for (let i = 0; i < inhalt.bausteine.length; i++) {
    const b = inhalt.bausteine[i]
    const wo = `Baustein ${i + 1} (${bausteinName(b.art)})`
    const laenge = (feld: string, wert: string, grenze: number) => (zuLang(wert, grenze) ? `${wo}: ${feld} ist zu lang (höchstens ${grenze} Zeichen).` : null)
    let meldung: string | null = null

    switch (b.art) {
      case 'zeitleiste': {
        if (b.eintraege.length === 0) return `${wo}: Bitte mindestens eine Station eintragen – oder den Baustein entfernen.`
        if (b.eintraege.length > GRENZEN.eintraege) return `${wo}: zu viele Stationen (höchstens ${GRENZEN.eintraege}).`
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift)
        for (let j = 0; !meldung && j < b.eintraege.length; j++) {
          const e = b.eintraege[j]
          if (!e.titel) meldung = `${wo}: Bei Station ${j + 1} fehlt der Titel.`
          else
            meldung =
              laenge(`Bei Station ${j + 1} die Zeitangabe`, e.zeit, GRENZEN.zeit) ??
              laenge(`Bei Station ${j + 1} der Titel`, e.titel, GRENZEN.titel) ??
              laenge(`Bei Station ${j + 1} der Text`, e.text, GRENZEN.kurztext)
        }
        break
      }
      case 'text':
        if (!b.ueberschrift && !b.text) return `${wo}: Bitte eine Überschrift oder einen Text eintragen – oder den Baustein entfernen.`
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift) ?? laenge('Der Text', b.text, GRENZEN.langtext)
        break
      case 'bild':
        if (!b.bild) return `${wo}: Bitte ein Foto auswählen – oder den Baustein entfernen.`
        meldung = laenge('Die Bildunterschrift', b.unterschrift, GRENZEN.unterschrift)
        break
      case 'liste':
        if (b.punkte.length === 0) return `${wo}: Bitte mindestens einen Punkt eintragen – oder den Baustein entfernen.`
        if (b.punkte.length > GRENZEN.eintraege) return `${wo}: zu viele Punkte (höchstens ${GRENZEN.eintraege}).`
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift) ?? laenge('Der Text', b.text, GRENZEN.kurztext)
        for (let j = 0; !meldung && j < b.punkte.length; j++) meldung = laenge(`Punkt ${j + 1}`, b.punkte[j], GRENZEN.punkt)
        break
      case 'zahlen':
        if (b.eintraege.length === 0) return `${wo}: Bitte mindestens eine Zahl eintragen – oder den Baustein entfernen.`
        if (b.eintraege.length > GRENZEN.zahlen) return `${wo}: zu viele Zahlen (höchstens ${GRENZEN.zahlen}).`
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift)
        for (let j = 0; !meldung && j < b.eintraege.length; j++) {
          const e = b.eintraege[j]
          if (!e.zahl) meldung = `${wo}: Bei Eintrag ${j + 1} fehlt die Zahl.`
          else meldung = laenge(`Bei Eintrag ${j + 1} die Zahl`, e.zahl, GRENZEN.zahl) ?? laenge(`Bei Eintrag ${j + 1} der Text`, e.text, GRENZEN.zahltext)
        }
        break
      case 'zitat':
        if (!b.text) return `${wo}: Bitte das Zitat eintragen – oder den Baustein entfernen.`
        meldung = laenge('Das Zitat', b.text, GRENZEN.zitat) ?? laenge('Die Quelle', b.quelle, GRENZEN.quelle)
        break
    }
    if (meldung) return meldung
  }
  return null
}

// ─── Einlesen ───────────────────────────────────────────────────────────────

function text(wert: unknown): string {
  return typeof wert === 'string' ? wert : ''
}

function wahl<T extends string>(wert: unknown, erlaubt: readonly T[]): T {
  return erlaubt.indexOf(wert as T) >= 0 ? (wert as T) : erlaubt[0]
}

function liste(wert: unknown): unknown[] {
  return Array.isArray(wert) ? wert : []
}

function objekt(wert: unknown): Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert) ? (wert as Record<string, unknown>) : {}
}

function bildLesen(wert: unknown): GespeichertesBild | null {
  const b = objekt(wert)
  if (typeof b.pfad !== 'string' || !b.pfad) return null
  const breite = typeof b.breite === 'number' && b.breite > 0 ? Math.round(b.breite) : 0
  const hoehe = typeof b.hoehe === 'number' && b.hoehe > 0 ? Math.round(b.hoehe) : 0
  return { pfad: b.pfad, breite, hoehe }
}

/** Editor-Schlüssel nur übernehmen, wenn er harmlos ist (er wird Teil eines Feldnamens). */
function schluesselLesen(wert: unknown): { schluessel?: string } {
  return typeof wert === 'string' && /^[a-z0-9]{1,24}$/.test(wert) ? { schluessel: wert } : {}
}

function bausteinLesen(roh: unknown): Baustein | null {
  const b = objekt(roh)
  const basis = { ...schluesselLesen(b.schluessel), sichtbar: b.sichtbar !== false }
  switch (b.art) {
    case 'zeitleiste':
      return {
        ...basis,
        art: 'zeitleiste',
        ueberschrift: text(b.ueberschrift),
        darstellung: wahl(b.darstellung, ZEITLEISTE_DARSTELLUNGEN),
        eintraege: liste(b.eintraege).map(roh => {
          const e = objekt(roh)
          return { ...schluesselLesen(e.schluessel), zeit: text(e.zeit), titel: text(e.titel), text: text(e.text), bild: bildLesen(e.bild) }
        }),
      }
    case 'text':
      return {
        ...basis,
        art: 'text',
        ueberschrift: text(b.ueberschrift),
        text: text(b.text),
        bild: bildLesen(b.bild),
        bildPosition: wahl(b.bildPosition, BILD_POSITIONEN),
        hintergrund: wahl(b.hintergrund, HINTERGRUENDE),
      }
    case 'bild':
      return { ...basis, art: 'bild', bild: bildLesen(b.bild), unterschrift: text(b.unterschrift), breite: wahl(b.breite, BILD_BREITEN) }
    case 'liste':
      return {
        ...basis,
        art: 'liste',
        ueberschrift: text(b.ueberschrift),
        text: text(b.text),
        punkte: liste(b.punkte).map(text),
        darstellung: wahl(b.darstellung, LISTEN_DARSTELLUNGEN),
      }
    case 'zahlen':
      return {
        ...basis,
        art: 'zahlen',
        ueberschrift: text(b.ueberschrift),
        eintraege: liste(b.eintraege).map(roh => {
          const e = objekt(roh)
          return { ...schluesselLesen(e.schluessel), zahl: text(e.zahl), text: text(e.text) }
        }),
        hintergrund: wahl(b.hintergrund, HINTERGRUENDE),
      }
    case 'zitat':
      return { ...basis, art: 'zitat', text: text(b.text), quelle: text(b.quelle) }
    default:
      return null
  }
}

/**
 * Bringt ein beliebiges JSON (aus der Datenbank oder vom Editor) in die erwartete Form:
 * fehlende Felder leer, unbekannte Darstellungen auf den Standard, unbekannte Bausteine weg.
 * Prüft keine Pflichtfelder – das macht die Speicherlogik.
 */
export function chronikLesen(roh: unknown): ChronikInhalt {
  const d = objekt(roh)
  return {
    einleitung: text(d.einleitung),
    bausteine: liste(d.bausteine)
      .map(bausteinLesen)
      .filter((b): b is Baustein => b !== null),
  }
}

/** Ersetzt jedes Bild des Dokuments – auch leere Bildplätze (Wert null) mit ihrem Editor-Schlüssel. */
export function bilderUmwandeln<A, B>(inhalt: ChronikInhalt<A>, f: (bild: A | null, schluessel: string | undefined) => B | null): ChronikInhalt<B> {
  return {
    einleitung: inhalt.einleitung,
    bausteine: inhalt.bausteine.map((b): Baustein<B> => {
      if (b.art === 'zeitleiste') return { ...b, eintraege: b.eintraege.map(e => ({ ...e, bild: f(e.bild, e.schluessel) })) }
      if (b.art === 'text' || b.art === 'bild') return { ...b, bild: f(b.bild, b.schluessel) }
      return b
    }),
  }
}

/** Alle Bildpfade des Dokuments. */
export function chronikBilder(inhalt: ChronikInhalt): string[] {
  const pfade: string[] = []
  bilderUmwandeln(inhalt, bild => {
    if (bild) pfade.push(bild.pfad)
    return null
  })
  return pfade
}
