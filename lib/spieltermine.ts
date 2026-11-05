/**
 * lib/spieltermine.ts
 *
 * Aufbereitung synchronisierter Spieltermine (fussball.de, click-tt) für Listen:
 *
 * - Sportart und Mannschaft sichtbar machen. Der gespeicherte Titel lautet immer
 *   „Heimspiel: SV Holm-Seppensen – Gegner“; spielen zwei Jugendteams am selben Abend
 *   gegen denselben Verein, sehen beide Einträge gleich aus.
 * - Mehrere Spiele derselben Mannschaft an einem Tag (Kinderfußball-Festivals, Turniere)
 *   zu einem Eintrag bündeln, statt vier, fünf fast gleiche Zeilen zu zeigen.
 *
 * In der Datenbank bleibt jedes Spiel ein eigener Termin – der Abgleich mit fussball.de
 * und click-tt arbeitet pro Spiel. Gebündelt wird nur bei der Anzeige.
 *
 * Nur Typen und reine Funktionen – darf auch in Client-Komponenten.
 */

import type { Termin } from '@/lib/content'

export interface Spiel {
  termin: Termin
  art: 'heim' | 'auswaerts'
  /** Gegner ohne „SV Holm-Seppensen – “ und ohne die eigene Altersklasse („U10 FC Este“ → „FC Este“) */
  gegner: string
  /** Link zum Spiel auf fussball.de bzw. click-tt, sonst null */
  link: string | null
}

export interface TerminEintrag {
  /** Erster Termin des Eintrags – für Bild, Beschreibung und als Schlüssel */
  termin: Termin
  /** Die Spiele dieses Eintrags; leer bei Terminen, die kein Spiel sind (z. B. Vereinsfest) */
  spiele: Spiel[]
  /** „Fußball“, „Tischtennis“ – nur bei Spielen */
  sportart: string | null
  /** „U12 II“, „Jugend 13“, „Herren“ – nur bei Spielen */
  mannschaft: string | null
  /** „Heimspiel gegen TSV Elstorf“, „4 Heimspiele“ oder der Titel eines normalen Termins */
  titel: string
  /** Bei gebündelten Spielen die früheste Anstoßzeit */
  uhrzeit: string
  /** true, wenn die Spiele zu verschiedenen Zeiten beginnen („ab 10:00 Uhr“) */
  uhrzeitAb: boolean
  /** Leer, wenn der Ort nur der Platzhalter „Auswärtsspiel“ ist oder die Spiele an verschiedenen Orten sind */
  ort: string
  /** Tags aller Termine des Eintrags (bei Bündeln z. B. Heim- und Auswärtsspiel) */
  tags: string[]
}

const SPORTARTEN = ['Fußball', 'Tischtennis']
/** Der Sync schreibt bei Auswärtsspielen statt eines Orts nur dieses Wort. */
const ORT_PLATZHALTER = 'Auswärtsspiel'
const VEREIN = /^SV Holm-Seppensen( II| III)?\s*[–-]\s*/
const ALTERSKLASSE = /\bU\s?(\d{1,2})\b/
const NUMMER = /\s(II|III|IV|V|VI)(?=\s|\)|$)/

/**
 * Kurzname der eigenen Mannschaft.
 *
 * click-tt liefert ihn direkt („Jugend 13“). fussball.de liefert den vollen Teamnamen
 * („U12 SV Holm-Seppensen II“, „SG Buchholzer FC/SV Holm-S. II“) und als Bereich nur die
 * Mannschaftsart – „D-Junioren“ umfasst aber U12 und U13. Daraus wird „U12 II“ bzw.
 * „Frauen II“. Ältere Termine ohne „Mannschaft:“-Zeile fallen auf den Bereich zurück.
 */
function mannschaftsname(termin: Termin): string {
  const name = termin.beschreibung.match(/^Mannschaft:\s*(.+)$/m)?.[1]?.trim()
  if (!name) return termin.sparte
  if (!/holm/i.test(name)) return name

  const alter = name.match(ALTERSKLASSE)
  const basis = alter ? `U${alter[1].padStart(2, '0')}` : termin.sparte
  const nummer = name.match(NUMMER)?.[1]
  return nummer ? `${basis} ${nummer}` : basis
}

/** Zerlegt einen synchronisierten Spieltermin; null bei allen anderen Terminen. */
export function spielAusTermin(termin: Termin): (Spiel & { sportart: string | null; mannschaft: string }) | null {
  const tags = termin.tags.map(t => t.toLowerCase())
  const art =
    tags.includes('heimspiel') || /^heimspiel:/i.test(termin.titel)
      ? 'heim'
      : tags.includes('auswärtsspiel') || /^auswärtsspiel:/i.test(termin.titel)
        ? 'auswaerts'
        : null
  if (!art) return null

  const mannschaft = mannschaftsname(termin)
  let gegner = termin.titel.replace(/^(heimspiel|auswärtsspiel):\s*/i, '').replace(VEREIN, '')
  // „U10 FC Este 2012“ → „FC Este 2012“, wenn die eigene Mannschaft schon „U10 …“ heißt
  const eigeneAlter = mannschaft.match(/^U\d{2}\b/)?.[0]
  if (eigeneAlter && gegner.startsWith(`${eigeneAlter} `)) {
    gegner = gegner.slice(eigeneAlter.length + 1).replace(/^\(?\d{1,2}er\)?\s+/, '')
  }

  return {
    termin,
    art,
    gegner,
    link: termin.beschreibung.match(/^Details:\s*(https?:\/\/\S+)/m)?.[1] ?? null,
    sportart: termin.tags.find(t => SPORTARTEN.includes(t)) ?? null,
    mannschaft,
  }
}

/** „Heimspiel gegen X“ / „Auswärtsspiel bei X“ */
export function spielTitel(spiel: Pick<Spiel, 'art' | 'gegner'>): string {
  return spiel.art === 'heim' ? `Heimspiel gegen ${spiel.gegner}` : `Auswärtsspiel bei ${spiel.gegner}`
}

/** „A, B und C“ */
export function aufzaehlung(teile: string[]): string {
  return teile.length <= 1 ? (teile[0] ?? '') : `${teile.slice(0, -1).join(', ')} und ${teile[teile.length - 1]}`
}

/** Gegner eines gebündelten Eintrags, doppelte nur einmal: „gegen A, B und C“ */
export function gegnerText(eintrag: TerminEintrag): string {
  return `gegen ${aufzaehlung([...new Set(eintrag.spiele.map(s => s.gegner))])}`
}

/**
 * Bündelt Spiele derselben Mannschaft am selben Tag zu einem Eintrag.
 * Erwartet die Termine nach Datum und Uhrzeit sortiert (wie getTermine sie liefert);
 * die Reihenfolge bleibt erhalten, ein Bündel steht an der Stelle seines ersten Spiels.
 */
export function buendeleSpieltermine(termine: Termin[]): TerminEintrag[] {
  const eintraege: TerminEintrag[] = []
  const buendel = new Map<string, TerminEintrag>()

  for (const termin of termine) {
    const spiel = spielAusTermin(termin)
    const tags = termin.tags

    if (!spiel) {
      eintraege.push({
        termin,
        spiele: [],
        sportart: null,
        mannschaft: null,
        titel: termin.titel,
        uhrzeit: termin.uhrzeit,
        uhrzeitAb: false,
        ort: termin.ort,
        tags,
      })
      continue
    }

    const { sportart, mannschaft, ...einzel } = spiel
    const schluessel = `${termin.datum}|${sportart ?? termin.sparte}|${mannschaft}`
    const vorhanden = buendel.get(schluessel)
    if (vorhanden) {
      vorhanden.spiele.push(einzel)
      vorhanden.tags = [...new Set([...vorhanden.tags, ...tags])]
      continue
    }

    const eintrag: TerminEintrag = {
      termin,
      spiele: [einzel],
      sportart,
      mannschaft,
      titel: '',
      uhrzeit: termin.uhrzeit,
      uhrzeitAb: false,
      ort: '',
      tags: [...new Set(tags)],
    }
    buendel.set(schluessel, eintrag)
    eintraege.push(eintrag)
  }

  for (const eintrag of buendel.values()) {
    const { spiele } = eintrag
    const orte = new Set(spiele.map(s => s.termin.ort))
    const ort = orte.size === 1 ? spiele[0].termin.ort : ''
    eintrag.ort = ort === ORT_PLATZHALTER ? '' : ort
    eintrag.uhrzeitAb = new Set(spiele.map(s => s.termin.uhrzeit)).size > 1

    if (spiele.length === 1) {
      eintrag.titel = spielTitel(spiele[0])
    } else {
      const arten = new Set(spiele.map(s => s.art))
      const art = arten.size > 1 ? 'Spiele' : arten.has('heim') ? 'Heimspiele' : 'Auswärtsspiele'
      eintrag.titel = `${spiele.length} ${art}`
    }
  }

  return eintraege
}

/** „18:30“ → „18:30 Uhr“, bei Bündeln „ab 10:00 Uhr“; Freitext wie „ganztägig“ bleibt. */
export function uhrzeitText(eintrag: Pick<TerminEintrag, 'uhrzeit' | 'uhrzeitAb'>): string {
  const { uhrzeit } = eintrag
  const text = /^\d/.test(uhrzeit) && !/uhr/i.test(uhrzeit) ? `${uhrzeit} Uhr` : uhrzeit
  return eintrag.uhrzeitAb && text ? `ab ${text}` : text
}
