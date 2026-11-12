/**
 * lib/seiten.ts
 *
 * Aufbau der frei gestalteten Seiten (heute die Förderverein-Seiten Über den Förderverein,
 * Aktuelles, Chronik und Mitglied werden, siehe lib/foerderverein-seiten.ts): eine Einleitung und
 * eine Folge von Bausteinen, jeder mit eigener Darstellung. Die meisten Bausteine tragen ihren Inhalt selbst
 * (Zeitleiste, Text, Foto, Bildergalerie, Karten …); "Meldungen" und "Unterlagen" zeigen automatisch die News und
 * Downloads des Fördervereins. Gespeichert als JSON-Dokument in der Tabelle seiten, bearbeitet unter
 * /verwaltung/foerderverein-seiten von Admins und Zugängen mit Förderverein-Recht.
 *
 * Nur Typen und reine Funktionen ohne Datenbank und ohne Node-Module: nutzbar auf der Website,
 * im Editor (Client) und in der Speicherlogik (lib/verwaltung/inhalte/seiten.ts).
 */

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

/** zahlenstrahl: Jahre auf einem Zahlenstrahl, beim Scrollen wird in jede Station hineingezoomt (Jahr aus der Zeitangabe). */
export const ZEITLEISTE_DARSTELLUNGEN = ['kacheln', 'zeitstrahl', 'gross', 'zahlenstrahl'] as const
export const LISTEN_DARSTELLUNGEN = ['kaestchen', 'punkte'] as const
export const HINTERGRUENDE = ['hell', 'dunkel'] as const
export const BILD_POSITIONEN = ['rechts', 'links'] as const
export const BILD_BREITEN = ['normal', 'breit'] as const
export const MELDUNGEN_DARSTELLUNGEN = ['kacheln', 'zeilen'] as const
/** kacheln: gleich große Fotos im Raster; mosaik: jedes Foto in seinem Format, in Spalten. */
export const GALERIE_DARSTELLUNGEN = ['kacheln', 'mosaik'] as const
/** Wie viele Meldungen höchstens – 0 = alle. */
export const MELDUNGEN_ANZAHLEN = [0, 3, 6] as const
/** "uebrige": ohne die Downloads, die schon in einem Kasten mit Knopf stehen. */
export const UNTERLAGEN_AUSWAHL = ['uebrige', 'alle'] as const

export type ZeitleistenDarstellung = (typeof ZEITLEISTE_DARSTELLUNGEN)[number]
export type ListenDarstellung = (typeof LISTEN_DARSTELLUNGEN)[number]
export type Hintergrund = (typeof HINTERGRUENDE)[number]
export type BildPosition = (typeof BILD_POSITIONEN)[number]
export type BildBreite = (typeof BILD_BREITEN)[number]
export type MeldungenDarstellung = (typeof MELDUNGEN_DARSTELLUNGEN)[number]
export type GalerieDarstellung = (typeof GALERIE_DARSTELLUNGEN)[number]
export type UnterlagenAuswahl = (typeof UNTERLAGEN_AUSWAHL)[number]

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

export interface GalerieFoto<B = GespeichertesBild> {
  schluessel?: string
  bild: B | null
  unterschrift: string
}

export interface KartenEintrag {
  schluessel?: string
  titel: string
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
  /** Viele Fotos; auf der Website öffnet ein Klick die Großansicht zum Durchblättern. */
  | (Basis & { art: 'galerie'; ueberschrift: string; text: string; darstellung: GalerieDarstellung; fotos: GalerieFoto<B>[] })
  | (Basis & { art: 'liste'; ueberschrift: string; text: string; punkte: string[]; darstellung: ListenDarstellung })
  | (Basis & { art: 'zahlen'; ueberschrift: string; eintraege: ZahlEintrag[]; hintergrund: Hintergrund })
  | (Basis & { art: 'zitat'; text: string; quelle: string })
  | (Basis & { art: 'karten'; ueberschrift: string; eintraege: KartenEintrag[] })
  /** Hervorgehobener Kasten; Knöpfe für die gewählten Downloads (ids) und auf Wunsch "E-Mail schreiben". */
  | (Basis & { art: 'aufruf'; ueberschrift: string; text: string; hintergrund: Hintergrund; downloads: number[]; email: boolean })
  /** Die News mit der Kategorie "Förderverein"; ohne News steht dort leerTitel/leerText (Markdown). */
  | (Basis & { art: 'meldungen'; ueberschrift: string; darstellung: MeldungenDarstellung; anzahl: number; leerTitel: string; leerText: string })
  /** Die Downloads mit der Kategorie "Förderverein". */
  | (Basis & { art: 'unterlagen'; ueberschrift: string; auswahl: UnterlagenAuswahl })

export type BausteinArt = Baustein['art']

export interface SeitenInhalt<B = GespeichertesBild> {
  /** Text unter der großen Überschrift der Seite. */
  einleitung: string
  bausteine: Baustein<B>[]
}

// ─── Namen für Editor und Verlauf ───────────────────────────────────────────

/** automatisch: zeigt Inhalte, die anderswo in der Verwaltung gepflegt werden (News, Downloads). */
export const BAUSTEIN_ARTEN: { art: BausteinArt; name: string; beschreibung: string; automatisch?: boolean }[] = [
  { art: 'text', name: 'Textabschnitt', beschreibung: 'Überschrift und Fließtext, wahlweise mit Foto' },
  { art: 'karten', name: 'Karten', beschreibung: 'Kästen nebeneinander mit Titel und kurzem Text' },
  { art: 'aufruf', name: 'Kasten mit Knopf', beschreibung: 'Hervorgehoben, mit Knopf zum Herunterladen oder Mailen' },
  { art: 'zeitleiste', name: 'Zeitleiste', beschreibung: 'Stationen mit Jahr, Titel, Text und Foto' },
  { art: 'bild', name: 'Foto', beschreibung: 'Ein großes Foto mit Bildunterschrift' },
  { art: 'galerie', name: 'Bildergalerie', beschreibung: 'Viele Fotos; ein Klick zeigt sie groß zum Durchblättern' },
  { art: 'liste', name: 'Stichpunkte', beschreibung: 'Kurze Punkte, z. B. Ideen oder Unterstützer' },
  { art: 'zahlen', name: 'Zahlen & Fakten', beschreibung: 'Große Zahlen mit kurzer Erklärung' },
  { art: 'zitat', name: 'Zitat', beschreibung: 'Ein hervorgehobener Satz mit Quelle' },
  { art: 'meldungen', name: 'Meldungen', beschreibung: 'Die News mit der Kategorie „Förderverein“', automatisch: true },
  { art: 'unterlagen', name: 'Unterlagen', beschreibung: 'Die Downloads des Fördervereins', automatisch: true },
]

export function bausteinName(art: BausteinArt): string {
  return BAUSTEIN_ARTEN.filter(a => a.art === art)[0]?.name ?? art
}

export const DARSTELLUNG_NAMEN: Record<
  ZeitleistenDarstellung | ListenDarstellung | Hintergrund | BildPosition | BildBreite | MeldungenDarstellung | UnterlagenAuswahl | GalerieDarstellung,
  string
> = {
  kacheln: 'Kacheln',
  zeitstrahl: 'Zeitstrahl',
  gross: 'Groß mit Fotos',
  zahlenstrahl: 'Zahlenstrahl mit Zoom',
  kaestchen: 'Kästchen',
  punkte: 'Aufzählung',
  hell: 'Hell',
  dunkel: 'Dunkel',
  rechts: 'Foto rechts',
  links: 'Foto links',
  normal: 'Normal',
  breit: 'Volle Breite',
  zeilen: 'Zeilen',
  mosaik: 'Mosaik',
  uebrige: 'Nur die übrigen',
  alle: 'Alle',
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
    case 'galerie':
      return { art, sichtbar: true, ueberschrift: '', text: '', darstellung: 'kacheln', fotos: [] }
    case 'liste':
      return { art, sichtbar: true, ueberschrift: '', text: '', punkte: [''], darstellung: 'kaestchen' }
    case 'zahlen':
      return { art, sichtbar: true, ueberschrift: '', eintraege: [{ zahl: '', text: '' }], hintergrund: 'dunkel' }
    case 'zitat':
      return { art, sichtbar: true, text: '', quelle: '' }
    case 'karten':
      return { art, sichtbar: true, ueberschrift: '', eintraege: [{ titel: '', text: '' }] }
    case 'aufruf':
      return { art, sichtbar: true, ueberschrift: '', text: '', hintergrund: 'dunkel', downloads: [], email: true }
    case 'meldungen':
      return { art, sichtbar: true, ueberschrift: '', darstellung: 'kacheln', anzahl: 0, leerTitel: 'Noch keine Meldungen', leerText: '' }
    case 'unterlagen':
      return { art, sichtbar: true, ueberschrift: 'Unterlagen', auswahl: 'uebrige' }
  }
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
  karten: 12,
  downloads: 20,
  fotos: 80,
}

/** Ränder abschneiden und leere Einträge weglassen – so, wie die Seite gespeichert wird. */
export function seiteBereinigen<B>(inhalt: SeitenInhalt<B>): SeitenInhalt<B> {
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
        case 'galerie':
          // Ein Platz ohne Foto (z. B. nach "Foto entfernen") fällt weg – die Unterschrift allein zeigt nichts
          return { ...b, ueberschrift: t(b.ueberschrift), text: t(b.text), fotos: b.fotos.map(f => ({ ...f, unterschrift: t(f.unterschrift) })).filter(f => f.bild) }
        case 'liste':
          return { ...b, ueberschrift: t(b.ueberschrift), text: t(b.text), punkte: b.punkte.map(t).filter(Boolean) }
        case 'zahlen':
          return { ...b, ueberschrift: t(b.ueberschrift), eintraege: b.eintraege.map(e => ({ ...e, zahl: t(e.zahl), text: t(e.text) })).filter(e => e.zahl || e.text) }
        case 'zitat':
          return { ...b, text: t(b.text), quelle: t(b.quelle) }
        case 'karten':
          return { ...b, ueberschrift: t(b.ueberschrift), eintraege: b.eintraege.map(e => ({ ...e, titel: t(e.titel), text: t(e.text) })).filter(e => e.titel || e.text) }
        case 'aufruf':
          return { ...b, ueberschrift: t(b.ueberschrift), text: t(b.text), downloads: b.downloads.filter((id, i) => b.downloads.indexOf(id) === i) }
        case 'meldungen':
          return { ...b, ueberschrift: t(b.ueberschrift), leerTitel: t(b.leerTitel), leerText: t(b.leerText) }
        case 'unterlagen':
          return { ...b, ueberschrift: t(b.ueberschrift) }
      }
    }),
  }
}

/**
 * Prüft Pflichtangaben und Längen einer bereinigten Seite. Liefert die erste Unstimmigkeit
 * als Satz für die Person am Bildschirm – oder null, wenn alles passt.
 */
export function seitePruefen<B>(inhalt: SeitenInhalt<B>): string | null {
  const zuLang = (wert: string, grenze: number) => wert.length > grenze
  if (zuLang(inhalt.einleitung, GRENZEN.einleitung)) return `Die Einleitung ist zu lang (höchstens ${GRENZEN.einleitung} Zeichen).`
  if (inhalt.bausteine.length > GRENZEN.bausteine) return `Die Seite hat zu viele Bausteine (höchstens ${GRENZEN.bausteine}).`

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
      case 'galerie':
        if (b.fotos.length === 0) return `${wo}: Bitte mindestens ein Foto hinzufügen – oder den Baustein entfernen.`
        if (b.fotos.length > GRENZEN.fotos) return `${wo}: zu viele Fotos (höchstens ${GRENZEN.fotos}). Für mehr Fotos einfach eine zweite Galerie anlegen.`
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift) ?? laenge('Der Text', b.text, GRENZEN.kurztext)
        for (let j = 0; !meldung && j < b.fotos.length; j++) meldung = laenge(`Bei Foto ${j + 1} die Bildunterschrift`, b.fotos[j].unterschrift, GRENZEN.unterschrift)
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
      case 'karten':
        if (b.eintraege.length === 0) return `${wo}: Bitte mindestens eine Karte eintragen – oder den Baustein entfernen.`
        if (b.eintraege.length > GRENZEN.karten) return `${wo}: zu viele Karten (höchstens ${GRENZEN.karten}).`
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift)
        for (let j = 0; !meldung && j < b.eintraege.length; j++) {
          const e = b.eintraege[j]
          if (!e.titel) meldung = `${wo}: Bei Karte ${j + 1} fehlt der Titel.`
          else meldung = laenge(`Bei Karte ${j + 1} der Titel`, e.titel, GRENZEN.titel) ?? laenge(`Bei Karte ${j + 1} der Text`, e.text, GRENZEN.kurztext)
        }
        break
      case 'aufruf':
        if (!b.ueberschrift && !b.text) return `${wo}: Bitte eine Überschrift oder einen Text eintragen – oder den Baustein entfernen.`
        if (b.downloads.length > GRENZEN.downloads) return `${wo}: zu viele Downloads (höchstens ${GRENZEN.downloads}).`
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift) ?? laenge('Der Text', b.text, GRENZEN.kurztext)
        break
      case 'meldungen':
        meldung =
          laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift) ??
          laenge('Die Überschrift für „keine Meldungen“', b.leerTitel, GRENZEN.ueberschrift) ??
          laenge('Der Text für „keine Meldungen“', b.leerText, GRENZEN.kurztext)
        break
      case 'unterlagen':
        meldung = laenge('Die Überschrift', b.ueberschrift, GRENZEN.ueberschrift)
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
    case 'galerie':
      return {
        ...basis,
        art: 'galerie',
        ueberschrift: text(b.ueberschrift),
        text: text(b.text),
        darstellung: wahl(b.darstellung, GALERIE_DARSTELLUNGEN),
        fotos: liste(b.fotos).map(roh => {
          const f = objekt(roh)
          return { ...schluesselLesen(f.schluessel), bild: bildLesen(f.bild), unterschrift: text(f.unterschrift) }
        }),
      }
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
    case 'karten':
      return {
        ...basis,
        art: 'karten',
        ueberschrift: text(b.ueberschrift),
        eintraege: liste(b.eintraege).map(roh => {
          const e = objekt(roh)
          return { ...schluesselLesen(e.schluessel), titel: text(e.titel), text: text(e.text) }
        }),
      }
    case 'aufruf':
      return {
        ...basis,
        art: 'aufruf',
        ueberschrift: text(b.ueberschrift),
        text: text(b.text),
        hintergrund: wahl(b.hintergrund, HINTERGRUENDE),
        downloads: liste(b.downloads).filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0),
        email: b.email === true,
      }
    case 'meldungen':
      return {
        ...basis,
        art: 'meldungen',
        ueberschrift: text(b.ueberschrift),
        darstellung: wahl(b.darstellung, MELDUNGEN_DARSTELLUNGEN),
        anzahl: MELDUNGEN_ANZAHLEN.indexOf(b.anzahl as 0) >= 0 ? (b.anzahl as number) : 0,
        leerTitel: text(b.leerTitel),
        leerText: text(b.leerText),
      }
    case 'unterlagen':
      return { ...basis, art: 'unterlagen', ueberschrift: text(b.ueberschrift), auswahl: wahl(b.auswahl, UNTERLAGEN_AUSWAHL) }
    default:
      return null
  }
}

/**
 * Bringt ein beliebiges JSON (aus der Datenbank oder vom Editor) in die erwartete Form:
 * fehlende Felder leer, unbekannte Darstellungen auf den Standard, unbekannte Bausteine weg.
 * Prüft keine Pflichtfelder – das macht die Speicherlogik.
 */
export function seiteLesen(roh: unknown): SeitenInhalt {
  const d = objekt(roh)
  return {
    einleitung: text(d.einleitung),
    bausteine: liste(d.bausteine)
      .map(bausteinLesen)
      .filter((b): b is Baustein => b !== null),
  }
}

/** Ersetzt jedes Bild des Dokuments – auch leere Bildplätze (Wert null) mit ihrem Editor-Schlüssel. */
export function bilderUmwandeln<A, B>(inhalt: SeitenInhalt<A>, f: (bild: A | null, schluessel: string | undefined) => B | null): SeitenInhalt<B> {
  return {
    einleitung: inhalt.einleitung,
    bausteine: inhalt.bausteine.map((b): Baustein<B> => {
      if (b.art === 'zeitleiste') return { ...b, eintraege: b.eintraege.map(e => ({ ...e, bild: f(e.bild, e.schluessel) })) }
      if (b.art === 'text' || b.art === 'bild') return { ...b, bild: f(b.bild, b.schluessel) }
      if (b.art === 'galerie') return { ...b, fotos: b.fotos.map(foto => ({ ...foto, bild: f(foto.bild, foto.schluessel) })) }
      return b
    }),
  }
}

/** Alle Bildpfade des Dokuments. */
export function seitenBilder(inhalt: SeitenInhalt): string[] {
  const pfade: string[] = []
  bilderUmwandeln(inhalt, bild => {
    if (bild) pfade.push(bild.pfad)
    return null
  })
  return pfade
}
