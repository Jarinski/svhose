import type { LucideIcon } from 'lucide-react'
import type { Rechte } from '@/lib/verwaltung/rechte'

/**
 * Für wen eine Anleitung gedacht ist – entspricht den Menüpunkten, die der Zugang sieht
 * (app/verwaltung/(intern)/layout.tsx):
 * - alle: jeder Zugang
 * - teams: wer Mannschaften oder Gruppen bearbeiten darf (Trainer:innen, Spartenleitung, Admins)
 * - sparte: Spartenleitung und Admins
 * - admin: nur Admins
 */
export type Zielgruppe = 'alle' | 'teams' | 'sparte' | 'admin'

/** Abschnitt der Übersicht, in dem die Kachel steht. */
export type Bereich = 'start' | 'teams' | 'inhalte' | 'verwaltung'

export interface Thema {
  /** Teil der Adresse: /verwaltung/hilfe/<slug> */
  slug: string
  titel: string
  /** Ein Satz für die Kachel. */
  kurz: string
  icon: LucideIcon
  zielgruppe: Zielgruppe
  bereich: Bereich
  /** Seite der Verwaltung, auf der man das Gelernte gleich ausprobiert. */
  ziel?: { href: string; text: string }
  /** Wo das Ergebnis auf der Website erscheint. */
  website?: { href: string; text: string }
  /** Die Anleitung selbst (Bausteine aus ./bausteine). */
  inhalt: React.ReactNode
}

export const ZIELGRUPPEN_TEXT: Record<Zielgruppe, string | null> = {
  alle: null,
  teams: 'Mannschaften & Gruppen',
  sparte: 'Spartenleitung & Admins',
  admin: 'Nur Admins',
}

/** Darf der Zugang die Anleitung sehen? Gleiche Regeln wie das Menü. */
export function zielgruppeErlaubt(z: Zielgruppe, rechte: Rechte, hatTeams: boolean): boolean {
  if (rechte.istAdmin || z === 'alle') return true
  if (z === 'teams') return hatTeams
  if (z === 'sparte') return rechte.sparten.length > 0
  return false
}
