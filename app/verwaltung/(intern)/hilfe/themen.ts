/**
 * Alle Anleitungen der Hilfe in der Reihenfolge der Übersicht. Jede Anleitung steht in einer
 * eigenen Datei unter ./inhalte.
 */

import { datenbank } from '@/lib/db'
import { bearbeitbareTeams, type Rechte } from '@/lib/verwaltung/rechte'
import { anmelden } from './inhalte/anmelden'
import { downloads } from './inhalte/downloads'
import { grundlagen } from './inhalte/grundlagen'
import { kontaktseite } from './inhalte/kontaktseite'
import { mannschaften } from './inhalte/mannschaften'
import { news } from './inhalte/news'
import { personen } from './inhalte/personen'
import { sparte } from './inhalte/sparte'
import { termine } from './inhalte/termine'
import { trainerteam } from './inhalte/trainerteam'
import { trainingszeiten } from './inhalte/trainingszeiten'
import { verlauf } from './inhalte/verlauf'
import { zugaenge } from './inhalte/zugaenge'
import { zielgruppeErlaubt, type Bereich, type Thema } from './typen'

export const THEMEN: Thema[] = [
  grundlagen,
  anmelden,
  trainingszeiten,
  trainerteam,
  mannschaften,
  personen,
  news,
  termine,
  sparte,
  downloads,
  kontaktseite,
  zugaenge,
  verlauf,
]

export const BEREICHE: { bereich: Bereich; titel: string }[] = [
  { bereich: 'start', titel: 'Erste Schritte' },
  { bereich: 'teams', titel: 'Mannschaften & Gruppen' },
  { bereich: 'inhalte', titel: 'Inhalte der Website' },
  { bereich: 'verwaltung', titel: 'Für Admins' },
]

/** Die Anleitungen, die der Zugang sehen darf – in der Reihenfolge von THEMEN. */
export function sichtbareThemen(rechte: Rechte): Thema[] {
  const hatTeams = rechte.istAdmin || bearbeitbareTeams(datenbank(), rechte).length > 0
  return THEMEN.filter(t => zielgruppeErlaubt(t.zielgruppe, rechte, hatTeams))
}
