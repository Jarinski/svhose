/**
 * Texte und Farben für die öffentliche Belegung – gemeinsam für Kalender und Buchungsformular.
 */

import type { FreiBelegt } from '@/lib/buchungen/belegung'

type Art = FreiBelegt['art']

/** Reihenfolge in der Legende */
export const ARTEN: readonly Art[] = ['belegt', 'regel', 'angefragt']

export const ART_TEXT: Record<Art, string> = { regel: 'regelmäßig belegt', belegt: 'belegt', angefragt: 'angefragt' }

export const ART_LEGENDE: Record<Art, string> = {
  belegt: 'Belegt',
  regel: 'Regelmäßig belegt (Training, Kurse)',
  angefragt: 'Angefragt, noch nicht entschieden',
}

/** Zeit-Marken mit Text */
export const ART_MARKE: Record<Art, string> = {
  regel: 'bg-[#0a0a0a]/[0.1] text-[#0a0a0a]',
  belegt: 'bg-[#0a0a0a] text-[#f5f5f0]',
  angefragt: 'bg-amber-100 text-amber-950',
}

/** Kräftige Füllung für Zeitleiste und Legende */
export const ART_FUELLUNG: Record<Art, string> = {
  regel: 'bg-[#0a0a0a]/35',
  belegt: 'bg-[#0a0a0a]',
  angefragt: 'bg-amber-400',
}
