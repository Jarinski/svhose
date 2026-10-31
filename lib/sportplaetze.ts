/**
 * lib/sportplaetze.ts
 *
 * Die Sportstätten des Vereins für die Seite /sportplaetze. Die Angaben sind fest im Code;
 * welche Sparten dort trainieren, kommt aus den Trainingszeiten (Feld "Ort").
 */

import type { TrainingsEintrag } from '@/lib/content'

export interface Sportplatz {
  id: string
  /** Ortsteil bzw. Schule, nach der die Plätze gruppiert sind */
  standort: string
  name: string
  art: string
  adresse?: string
  beschreibung: string
  /** Lage für die Karte (Quelle: OpenStreetMap) */
  lat: number
  lon: number
  /** Zoomstufe der Karte (Standard 18; kleiner, wenn Halle und Platz weiter auseinanderliegen) */
  zoom?: number
  /** Schreibweisen des Orts in den Trainingszeiten (klein geschrieben, Teilstück genügt) */
  ortsnamen: string[]
}

export const SPORTPLAETZE: Sportplatz[] = [
  {
    id: 'muehlenschule-sportplatz',
    standort: 'Mühlenschule',
    name: 'Sportplatz Mühlenschule',
    art: 'Sportplatz',
    adresse: 'Jungfernstieg 6, Holm-Seppensen',
    beschreibung: 'Der Platz an der Mühlenschule: Trainingsort vieler Fußballmannschaften im Sommer.',
    lat: 53.28222,
    lon: 9.87421,
    ortsnamen: ['sportplatz mühlenschule'],
  },
  {
    id: 'muehlenschule-halle',
    standort: 'Mühlenschule',
    name: 'Halle Mühlenschule',
    art: 'Turnhalle',
    adresse: 'Jungfernstieg 6, Holm-Seppensen',
    beschreibung:
      'Unsere Halle für den Hallensport, von Kinderturnen und Judo bis Volleyball und Badminton. Im Winter ziehen auch die Fußballmannschaften hinein.',
    lat: 53.28255,
    lon: 9.8737,
    ortsnamen: ['turnhalle mühlenschule', 'halle mühlenschule'],
  },
  {
    id: 'tostedter-weg-hauptplatz',
    standort: 'Tostedter Weg',
    name: 'Hauptplatz Tostedter Weg',
    art: 'Rasenplatz mit Vereinsheim',
    adresse: 'Tostedter Weg 1, Holm-Seppensen',
    beschreibung: 'Unsere eigene Sportanlage mit Rasenplatz und Vereinsheim. Hier finden die Heimspiele statt.',
    lat: 53.29695,
    lon: 9.86917,
    ortsnamen: ['sportanlage tostedter weg', 'sportplatz tostedter weg', 'hauptplatz tostedter weg'],
  },
  {
    id: 'tostedter-weg-trainingsplatz',
    standort: 'Tostedter Weg',
    name: 'Trainingsplatz Tostedter Weg',
    art: 'Trainingsplatz',
    adresse: 'Tostedter Weg, Holm-Seppensen',
    beschreibung: 'Ergänzt den Hauptplatz am Tostedter Weg als Platz zum Trainieren und Bewegen.',
    lat: 53.29757,
    lon: 9.86986,
    ortsnamen: ['trainingsplatz tostedter weg'],
  },
  {
    id: 'wiesenschule',
    standort: 'Wiesenschule',
    name: 'Wiesenschule',
    art: 'Turnhalle und Sportplatz',
    adresse: 'Wiesenweg, Seppensen',
    beschreibung: 'Im Winter weichen unsere Fußballmannschaften in die Turnhalle und auf den Platz der Wiesenschule aus.',
    lat: 53.31923,
    lon: 9.87127,
    zoom: 17,
    ortsnamen: ['wiesenschule'],
  },
]

export interface SparteAmPlatz {
  name: string
  slug: string
}

/** Sparten, die laut Trainingszeiten auf dem Platz trainieren (ohne Doppelte, nach Name sortiert). */
export function spartenAmPlatz(platz: Sportplatz, trainingszeiten: TrainingsEintrag[]): SparteAmPlatz[] {
  const gefunden = new Map<string, SparteAmPlatz>()
  for (const eintrag of trainingszeiten) {
    const ort = eintrag.ort.normalize('NFC').toLowerCase()
    if (!platz.ortsnamen.some(name => ort.includes(name))) continue
    gefunden.set(eintrag.sparteSlug, { name: eintrag.sparte, slug: eintrag.sparteSlug })
  }
  return [...gefunden.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
