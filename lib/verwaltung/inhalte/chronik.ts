/**
 * lib/verwaltung/inhalte/chronik.ts
 *
 * Laden, Prüfen und Speichern der Förderverein-Chronik (Tabelle seiten, Aufbau in lib/chronik.ts)
 * als reine Funktionen – genutzt von der Server-Aktion unter /verwaltung/chronik und direkt
 * testbar gegen eine Datenbankkopie. Bearbeiten dürfen Admins und Zugänge mit Förderverein-Recht.
 *
 * Gespeichert wird immer die ganze Seite auf einmal. Fotos lädt die Server-Aktion vorher hoch;
 * hier kommen nur noch fertige Pfade an. Pflichtangaben und Längen prüfen chronikBereinigen und
 * chronikPruefen aus lib/chronik.ts – dieselben Regeln nutzt die Übung in der Hilfe.
 */

import { eq } from 'drizzle-orm'
import type { Datenbank } from '@/lib/db'
import { schema } from '@/lib/db'
import {
  bausteinName,
  CHRONIK_SCHLUESSEL,
  CHRONIK_VORLAGE,
  chronikBereinigen,
  chronikBilder,
  chronikLesen,
  chronikPruefen,
  DARSTELLUNG_NAMEN,
  type Baustein,
  type ChronikInhalt,
  type GespeichertesBild,
} from '@/lib/chronik'
import { MeldungsFehler } from '@/lib/verwaltung/fehlermeldung'
import { darfChronik, type Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { KEINE_RECHTE } from './gemeinsam'

type Lesend = Pick<Datenbank, 'select'>

export const CHRONIK_KONFLIKT = 'Inzwischen hat jemand anderes die Chronik gespeichert. Bitte Seite neu laden.'

/** Stand, solange noch nichts gespeichert ist (die Website zeigt dann die Vorlage). */
const STAND_VORLAGE = 'vorlage'

function chronikZeile(db: Lesend) {
  return db.select().from(schema.seiten).where(eq(schema.seiten.schluessel, CHRONIK_SCHLUESSEL)).get()
}

/** Gespeicherte Chronik (oder die Vorlage) mit dem Stand für die optimistische Sperre. */
export function chronikLaden(db: Lesend): { inhalt: ChronikInhalt; stand: string; geaendertAm: string | null } {
  const zeile = chronikZeile(db)
  if (!zeile) return { inhalt: CHRONIK_VORLAGE, stand: STAND_VORLAGE, geaendertAm: null }
  return { inhalt: chronikLesen(zeile.inhalt), stand: zeile.geaendertAm, geaendertAm: zeile.geaendertAm }
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
    case 'liste':
      return { ...basis, Überschrift: b.ueberschrift, Text: b.text, Darstellung: DARSTELLUNG_NAMEN[b.darstellung], Punkte: b.punkte }
    case 'zahlen':
      return { ...basis, Überschrift: b.ueberschrift, Hintergrund: DARSTELLUNG_NAMEN[b.hintergrund], Zahlen: b.eintraege.map(e => [e.zahl, e.text].filter(Boolean).join(' – ')) }
    case 'zitat':
      return { ...basis, Zitat: b.text, Quelle: b.quelle }
  }
}

/** Lesbarer Stand für den Verlauf: Einleitung und je Baustein ein Abschnitt, dazu die Rohdaten. */
function verlaufStand(inhalt: ChronikInhalt): Record<string, unknown> {
  const stand: Record<string, unknown> = { einleitung: inhalt.einleitung }
  inhalt.bausteine.forEach((b, i) => {
    stand[`${i + 1}. ${bausteinName(b.art)}`] = bausteinVerlauf(b)
  })
  // Rohdaten (für ein späteres Wiederherstellen); die Verlaufsansicht blendet "_"-Felder aus.
  stand._inhalt = inhalt
  return stand
}

// ─── Speichern ──────────────────────────────────────────────────────────────

/** Editor-Schlüssel entfernen – sie gehören nicht ins gespeicherte Dokument. */
function ohneSchluessel(inhalt: ChronikInhalt): ChronikInhalt {
  return JSON.parse(JSON.stringify(inhalt, (k, v) => (k === 'schluessel' ? undefined : v)))
}

/**
 * Speichert die Chronik (bereinigt und geprüft). Liefert, ob sich etwas geändert hat, und die
 * Bildpfade, die vorher verwendet wurden und jetzt nicht mehr – die kann die Aktion freigeben.
 */
export function chronikSpeichern(
  db: Datenbank,
  wer: Rechte,
  eingabe: ChronikInhalt,
  stand: string,
): { geaendert: boolean; stand: string; entfernteBilder: string[] } {
  if (!darfChronik(wer)) throw new MeldungsFehler(KEINE_RECHTE)
  const inhalt = ohneSchluessel(chronikBereinigen(eingabe))
  const fehler = chronikPruefen(inhalt)
  if (fehler) throw new MeldungsFehler(fehler)

  return db.transaction(tx => {
    const zeile = chronikZeile(tx)
    const vorher = zeile ? chronikLesen(zeile.inhalt) : CHRONIK_VORLAGE
    if ((zeile?.geaendertAm ?? STAND_VORLAGE) !== stand) throw new MeldungsFehler(CHRONIK_KONFLIKT)
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
        .values({ schluessel: CHRONIK_SCHLUESSEL, inhalt })
        .returning({ id: schema.seiten.id, geaendertAm: schema.seiten.geaendertAm })
        .get()
    }

    // Auch beim ersten Speichern "geändert": Die Seite gab es schon (als Vorlage), der Verlauf zeigt den Unterschied dazu.
    protokollieren(tx, wer, {
      aktion: 'geaendert',
      objektTyp: 'seiten',
      objektId: neu.id,
      bezeichnung: 'Förderverein-Chronik',
      vorher: verlaufStand(vorher),
      nachher: verlaufStand(inhalt),
    })

    const jetzt = chronikBilder(inhalt)
    return { geaendert: true, stand: neu.geaendertAm, entfernteBilder: chronikBilder(vorher).filter(p => jetzt.indexOf(p) < 0) }
  })
}
