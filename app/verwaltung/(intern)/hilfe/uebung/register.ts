/**
 * Alle Übungen nach Thema (slug wie in ../themen.ts). Jede Übung steht in einer eigenen
 * Datei unter ./lektionen.
 */

import type { Lektion } from './typen'
import { lektionen as anmelden } from './lektionen/anmelden'
import { lektionen as downloads } from './lektionen/downloads'
import { lektionen as grundlagen } from './lektionen/grundlagen'
import { lektionen as kontaktseite } from './lektionen/kontaktseite'
import { lektionen as mannschaften } from './lektionen/mannschaften'
import { lektionen as news } from './lektionen/news'
import { lektionen as personen } from './lektionen/personen'
import { lektionen as sparte } from './lektionen/sparte'
import { lektionen as termine } from './lektionen/termine'
import { lektionen as trainerteam } from './lektionen/trainerteam'
import { lektionen as trainingszeiten } from './lektionen/trainingszeiten'
import { lektionen as verlauf } from './lektionen/verlauf'
import { lektionen as zugaenge } from './lektionen/zugaenge'

export const UEBUNGEN: Record<string, Lektion[]> = {
  grundlagen,
  anmelden,
  trainingszeiten,
  trainerteam,
  'mannschaften-und-gruppen': mannschaften,
  personen,
  news,
  termine,
  sparte,
  downloads,
  kontaktseite,
  zugaenge,
  verlauf,
}
