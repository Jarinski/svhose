/**
 * lib/foerderverein-seiten.ts
 *
 * Die Seiten des Fördervereins, die er selbst gestaltet (Aufbau in lib/seiten.ts): Chronik,
 * Aktuelles und Mitglied werden. Je Seite Adresse, Überschrift und die Vorlage – der Stand vor der
 * Verwaltung, den die Website zeigt, solange für die Seite noch nichts gespeichert ist.
 *
 * Ohne Datenbank: nutzbar auf der Website, im Editor (Client) und in der Speicherlogik.
 */

import { FOERDERVEREIN } from '@/lib/foerderverein'
import type { SeitenInhalt } from '@/lib/seiten'

export const FOERDERVEREIN_SEITEN_SLUGS = ['chronik', 'aktuelles', 'mitglied-werden'] as const
export type FoerdervereinSeitenSlug = (typeof FOERDERVEREIN_SEITEN_SLUGS)[number]

/** Was eine Vorlage über die Downloads des Fördervereins wissen muss. */
export type VorlagenDownload = { id: number; titel: string }

export interface FoerdervereinSeite {
  slug: FoerdervereinSeitenSlug
  /** Zeile in der Tabelle seiten. */
  schluessel: string
  /** Name in der Verwaltung, z. B. "Chronik". */
  name: string
  /** Wofür die Seite da ist – für die Übersicht in der Verwaltung. */
  beschreibung: string
  pfad: string
  /** Kleine Zeile über der Überschrift. */
  kicker: string
  /** Große Überschrift (fest, damit sie zum Menü passt). */
  titel: string
  vorlage: (downloads: VorlagenDownload[]) => SeitenInhalt
}

/** Downloads, die früher automatisch in den Kasten "Beitrittserklärung" kamen. */
const BEITRITT = /beitritt|mitglied|aufnahme/i

// ─── Vorlagen ───────────────────────────────────────────────────────────────

/**
 * Chronik vor der Verwaltung.
 * Quellen: alte Website fshose.de und der Artikel „Unsere Unterstützer“ (2014).
 */
const CHRONIK: SeitenInhalt = {
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

const HELFEN = [
  {
    titel: 'Mitglied werden',
    text: `Der Jahresbeitrag ist klein (${FOERDERVEREIN.beitrag}). Den aktuellen Stand nennt dir der Förderverein. Jedes Mitglied stärkt ihn.`,
  },
  {
    titel: 'Spenden',
    text: 'Spenden helfen beim weiteren Ausbau der Sportanlage. Schreib dem Förderverein – du bekommst die Kontoverbindung.',
  },
  {
    titel: 'Bandenwerbung',
    text: 'Unternehmen können Werbeflächen an den Banden rund um den Fußballplatz mieten. Der Förderverein stellt gern den Kontakt her.',
  },
  {
    titel: 'Mit anpacken',
    text: 'Ob Stand beim Fest, Arbeitseinsatz auf dem Gelände oder eine gute Idee: Helfende Hände sind immer willkommen.',
  },
]

/** Wie die Seite vor der Verwaltung: Beitrittserklärung als Knopf, wenn es sie als Download gibt, sonst "E-Mail schreiben". */
function mitgliedWerden(downloads: VorlagenDownload[]): SeitenInhalt {
  const beitritt = downloads.filter(d => BEITRITT.test(d.titel)).map(d => d.id)
  return {
    einleitung: 'Es gibt viele Wege, den Förderverein und damit die Sportanlage des SV zu unterstützen.',
    bausteine: [
      { art: 'karten', sichtbar: true, ueberschrift: '', eintraege: HELFEN },
      {
        art: 'aufruf',
        sichtbar: true,
        ueberschrift: 'Beitrittserklärung',
        text:
          beitritt.length > 0
            ? `Herunterladen, ausfüllen, unterschreiben und per E-Mail an ${FOERDERVEREIN.email} schicken.`
            : 'Schreib dem Förderverein eine kurze E-Mail – du bekommst die Beitrittserklärung zugeschickt.',
        hintergrund: 'dunkel',
        downloads: beitritt,
        email: beitritt.length === 0,
      },
      { art: 'unterlagen', sichtbar: true, ueberschrift: 'Unterlagen', auswahl: 'uebrige' },
    ],
  }
}

const AKTUELLES: SeitenInhalt = {
  einleitung: 'Aktionen und Neuigkeiten aus dem Förderverein.',
  bausteine: [
    {
      art: 'meldungen',
      sichtbar: true,
      ueberschrift: '',
      darstellung: 'kacheln',
      anzahl: 0,
      leerTitel: 'Noch keine Meldungen',
      leerText: `Sobald es Neuigkeiten gibt, stehen sie hier. Fragen an den Förderverein beantwortet er gern per E-Mail an [${FOERDERVEREIN.email}](mailto:${FOERDERVEREIN.email}).`,
    },
  ],
}

export const FOERDERVEREIN_SEITEN: FoerdervereinSeite[] = [
  {
    slug: 'aktuelles',
    schluessel: 'foerderverein-aktuelles',
    name: 'Aktuelles',
    beschreibung: 'Aktionen und Neuigkeiten. Die Meldungen selbst kommen aus den News mit der Kategorie „Förderverein“.',
    pfad: '/foerderverein/aktuelles',
    kicker: 'Förderverein',
    titel: 'AKTUELLES',
    vorlage: () => AKTUELLES,
  },
  {
    slug: 'chronik',
    // Seit der ersten Fassung (Migration 0003) – nicht ändern, sonst ist der gespeicherte Stand weg.
    schluessel: 'foerderverein-chronik',
    name: 'Chronik',
    beschreibung: 'Von der Idee der Eltern bis zum eigenen Platz am Tostedter Weg.',
    pfad: '/foerderverein/chronik',
    kicker: 'Förderverein',
    titel: 'CHRONIK',
    vorlage: () => CHRONIK,
  },
  {
    slug: 'mitglied-werden',
    schluessel: 'foerderverein-mitglied-werden',
    name: 'Mitglied werden',
    beschreibung: 'Wege zu helfen, Beitrittserklärung und Unterlagen. Die PDFs kommen aus den Downloads des Fördervereins.',
    pfad: '/foerderverein/mitglied-werden',
    kicker: 'Mitglied werden & spenden',
    titel: 'MITGLIED WERDEN',
    vorlage: mitgliedWerden,
  },
]

export function foerdervereinSeite(slug: string): FoerdervereinSeite | null {
  return FOERDERVEREIN_SEITEN.filter(s => s.slug === slug)[0] ?? null
}

/** Die Chronik-Vorlage – auch Startstand der Übung in der Hilfe. */
export const CHRONIK_VORLAGE = CHRONIK
