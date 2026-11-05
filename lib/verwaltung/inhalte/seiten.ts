/**
 * lib/verwaltung/inhalte/seiten.ts
 *
 * Laden und Speichern der Förderverein-Seiten (Tabelle seiten, Aufbau in lib/seiten.ts, die Seiten
 * selbst in lib/foerderverein-seiten.ts) als reine Funktionen – genutzt von der Server-Aktion unter
 * /verwaltung/foerderverein-seiten und direkt testbar gegen eine Datenbankkopie. Bearbeiten dürfen
 * Admins und Zugänge mit Förderverein-Recht.
 *
 * Gespeichert wird immer die ganze Seite auf einmal. Fotos lädt die Server-Aktion vorher hoch;
 * hier kommen nur noch fertige Pfade an. Pflichtangaben und Längen prüfen seiteBereinigen und
 * seitePruefen aus lib/seiten.ts – dieselben Regeln nutzt die Übung in der Hilfe.
 */

import { eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import { istFoerderverein } from '@/lib/foerderverein'
import type { FoerdervereinSeite, VorlagenDownload } from '@/lib/foerderverein-seiten'
import {
  bausteinName,
  DARSTELLUNG_NAMEN,
  seiteBereinigen,
  seiteLesen,
  seitenBilder,
  seitePruefen,
  type Baustein,
  type GespeichertesBild,
  type SeitenInhalt,
} from '@/lib/seiten'
import { MeldungsFehler } from '@/lib/verwaltung/fehlermeldung'
import { darfFoerdervereinSeiten, type Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { KEINE_RECHTE } from './gemeinsam'

type Lesend = Pick<Datenbank, 'select'>

export const SEITEN_KONFLIKT = 'Inzwischen hat jemand anderes diese Seite gespeichert. Bitte Seite neu laden.'

/** Stand, solange noch nichts gespeichert ist (die Website zeigt dann die Vorlage). */
const STAND_VORLAGE = 'vorlage'

function seitenZeile(db: Lesend, seite: FoerdervereinSeite) {
  return db.select().from(schema.seiten).where(eq(schema.seiten.schluessel, seite.schluessel)).get()
}

/** Die Downloads des Fördervereins – Vorlage von "Mitglied werden" und Auswahl im Kasten mit Knopf. */
export function foerdervereinDownloads(db: Lesend): VorlagenDownload[] {
  return db
    .select({ id: schema.downloads.id, titel: schema.downloads.titel, kategorie: schema.downloads.kategorie })
    .from(schema.downloads)
    .all()
    .filter(d => istFoerderverein(d.kategorie))
    .map(d => ({ id: d.id, titel: d.titel }))
}

/**
 * Vorlage einer Seite – durch seiteLesen, damit sie genau so aussieht wie ein gespeicherter Stand
 * (gleiche Reihenfolge der Felder). Sonst gälte unverändertes Speichern als Änderung.
 */
function vorlage(db: Lesend, seite: FoerdervereinSeite): SeitenInhalt {
  return seiteLesen(seite.vorlage(foerdervereinDownloads(db)))
}

/** Gespeicherte Seite (oder ihre Vorlage) mit dem Stand für die optimistische Sperre. */
export function seiteLaden(db: Lesend, seite: FoerdervereinSeite): { inhalt: SeitenInhalt; stand: string; geaendertAm: string | null; id: number | null } {
  const zeile = seitenZeile(db, seite)
  if (!zeile) return { inhalt: vorlage(db, seite), stand: STAND_VORLAGE, geaendertAm: null, id: null }
  return { inhalt: seiteLesen(zeile.inhalt), stand: zeile.geaendertAm, geaendertAm: zeile.geaendertAm, id: zeile.id }
}

// ─── Verlauf ────────────────────────────────────────────────────────────────

function fotoName(bild: GespeichertesBild | null): string {
  return bild ? (bild.pfad.split('/').pop() ?? bild.pfad) : ''
}

function bausteinVerlauf(b: Baustein): Record<string, unknown> {
  const basis = b.sichtbar ? {} : { Ausgeblendet: true }
  switch (b.art) {
    case 'zeitleiste':
      return {
        ...basis,
        Überschrift: b.ueberschrift,
        Darstellung: DARSTELLUNG_NAMEN[b.darstellung],
        Stationen: b.eintraege.map(
          e => [e.zeit, e.titel].filter(Boolean).join(' · ') + (e.text ? `: ${e.text}` : '') + (e.bild ? ` [Foto ${fotoName(e.bild)}]` : ''),
        ),
      }
    case 'text':
      return {
        ...basis,
        Überschrift: b.ueberschrift,
        Text: b.text,
        Foto: fotoName(b.bild),
        Darstellung: [DARSTELLUNG_NAMEN[b.hintergrund], b.bild ? DARSTELLUNG_NAMEN[b.bildPosition] : ''].filter(Boolean).join(', '),
      }
    case 'bild':
      return { ...basis, Foto: fotoName(b.bild), Bildunterschrift: b.unterschrift, Breite: DARSTELLUNG_NAMEN[b.breite] }
    case 'galerie':
      return {
        ...basis,
        Überschrift: b.ueberschrift,
        Text: b.text,
        Darstellung: DARSTELLUNG_NAMEN[b.darstellung],
        Fotos: b.fotos.map(f => fotoName(f.bild) + (f.unterschrift ? `: ${f.unterschrift}` : '')),
      }
    case 'liste':
      return { ...basis, Überschrift: b.ueberschrift, Text: b.text, Darstellung: DARSTELLUNG_NAMEN[b.darstellung], Punkte: b.punkte }
    case 'zahlen':
      return { ...basis, Überschrift: b.ueberschrift, Hintergrund: DARSTELLUNG_NAMEN[b.hintergrund], Zahlen: b.eintraege.map(e => [e.zahl, e.text].filter(Boolean).join(' – ')) }
    case 'zitat':
      return { ...basis, Zitat: b.text, Quelle: b.quelle }
    case 'karten':
      return { ...basis, Überschrift: b.ueberschrift, Karten: b.eintraege.map(e => e.titel + (e.text ? `: ${e.text}` : '')) }
    case 'aufruf':
      return {
        ...basis,
        Überschrift: b.ueberschrift,
        Text: b.text,
        Hintergrund: DARSTELLUNG_NAMEN[b.hintergrund],
        'Downloads (Nr.)': b.downloads.join(', '),
        'Knopf „E-Mail schreiben“': b.email,
      }
    case 'meldungen':
      return {
        ...basis,
        Überschrift: b.ueberschrift,
        Darstellung: DARSTELLUNG_NAMEN[b.darstellung],
        Anzahl: b.anzahl === 0 ? 'alle' : b.anzahl,
        'Ohne Meldungen': [b.leerTitel, b.leerText].filter(Boolean).join(': '),
      }
    case 'unterlagen':
      return { ...basis, Überschrift: b.ueberschrift, Auswahl: DARSTELLUNG_NAMEN[b.auswahl] }
  }
}

/** Lesbarer Stand für den Verlauf: Einleitung und je Baustein ein Abschnitt, dazu die Rohdaten. */
function verlaufStand(inhalt: SeitenInhalt): Record<string, unknown> {
  const stand: Record<string, unknown> = { einleitung: inhalt.einleitung }
  inhalt.bausteine.forEach((b, i) => {
    stand[`${i + 1}. ${bausteinName(b.art)}`] = bausteinVerlauf(b)
  })
  // Rohdaten (für ein späteres Wiederherstellen); die Verlaufsansicht blendet "_"-Felder aus.
  stand._inhalt = inhalt
  return stand
}

/** Bezeichnung im Verlauf, z. B. "Förderverein: Mitglied werden". */
export function verlaufBezeichnung(seite: FoerdervereinSeite): string {
  return `Förderverein: ${seite.name}`
}

// ─── Speichern ──────────────────────────────────────────────────────────────

/** Editor-Schlüssel entfernen – sie gehören nicht ins gespeicherte Dokument. */
function ohneSchluessel(inhalt: SeitenInhalt): SeitenInhalt {
  return JSON.parse(JSON.stringify(inhalt, (k, v) => (k === 'schluessel' ? undefined : v)))
}

/**
 * Speichert eine Förderverein-Seite (bereinigt und geprüft). Liefert, ob sich etwas geändert hat,
 * und die Bildpfade, die vorher verwendet wurden und jetzt nicht mehr – die kann die Aktion freigeben.
 */
export function seiteSpeichern(
  db: Datenbank,
  wer: Rechte,
  seite: FoerdervereinSeite,
  eingabe: SeitenInhalt,
  stand: string,
): { geaendert: boolean; stand: string; entfernteBilder: string[] } {
  if (!darfFoerdervereinSeiten(wer)) throw new MeldungsFehler(KEINE_RECHTE)
  const inhalt = ohneSchluessel(seiteBereinigen(eingabe))
  const fehler = seitePruefen(inhalt)
  if (fehler) throw new MeldungsFehler(fehler)

  return db.transaction(tx => {
    const zeile = seitenZeile(tx, seite)
    const vorher = zeile ? seiteLesen(zeile.inhalt) : vorlage(tx, seite)
    if ((zeile?.geaendertAm ?? STAND_VORLAGE) !== stand) throw new MeldungsFehler(SEITEN_KONFLIKT)
    if (JSON.stringify(vorher) === JSON.stringify(inhalt)) return { geaendert: false, stand, entfernteBilder: [] }

    let neu: { id: number; geaendertAm: string }
    if (zeile) {
      neu = tx
        .update(schema.seiten)
        .set({ inhalt })
        .where(eq(schema.seiten.id, zeile.id))
        .returning({ id: schema.seiten.id, geaendertAm: schema.seiten.geaendertAm })
        .get()
    } else {
      neu = tx
        .insert(schema.seiten)
        .values({ schluessel: seite.schluessel, inhalt })
        .returning({ id: schema.seiten.id, geaendertAm: schema.seiten.geaendertAm })
        .get()
    }

    // Auch beim ersten Speichern "geändert": Die Seite gab es schon (als Vorlage), der Verlauf zeigt den Unterschied dazu.
    protokollieren(tx, wer, {
      aktion: 'geaendert',
      objektTyp: 'seiten',
      objektId: neu.id,
      bezeichnung: verlaufBezeichnung(seite),
      vorher: verlaufStand(vorher),
      nachher: verlaufStand(inhalt),
    })

    const jetzt = seitenBilder(inhalt)
    return { geaendert: true, stand: neu.geaendertAm, entfernteBilder: seitenBilder(vorher).filter(p => jetzt.indexOf(p) < 0) }
  })
}
