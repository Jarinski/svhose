/**
 * lib/foerderverein-konto.ts
 *
 * Spendenkonto des Fördervereins für /foerderverein/spenden. Das Konto gehört dem Förderverein,
 * nicht dem SV Holm-Seppensen e.V. – deshalb steht es nur auf den Förderverein-Seiten.
 */

import { FOERDERVEREIN } from '@/lib/foerderverein'

// Kontoverbindung angegeben am 04.11.2026; Prüfziffer der IBAN nachgerechnet.
export const SPENDENKONTO = {
  inhaber: FOERDERVEREIN.name,
  bank: 'Sparkasse Harburg-Buxtehude',
  /** In Viererblöcken, wie man sie abtippt; zum Kopieren ohne Leerzeichen. */
  iban: 'DE18 2075 0000 0060 0809 83',
  bic: 'NOLADE21HAM',
  verwendungszweck: 'Spende',
} as const

/**
 * Inhalt des GiroCodes (EPC-QR-Code, Version 002): Banking-Apps füllen damit Empfänger, IBAN, BIC
 * und Verwendungszweck aus. Den Betrag lässt er offen – den wählt die spendende Person selbst.
 */
export function girocodeInhalt(): string {
  return [
    'BCD',
    '002',
    '1', // UTF-8, wegen „Förderverein“
    'SCT',
    SPENDENKONTO.bic,
    SPENDENKONTO.inhaber,
    SPENDENKONTO.iban.replace(/\s/g, ''),
    '', // Betrag
    '', // Zweck-Code
    '', // strukturierte Referenz
    SPENDENKONTO.verwendungszweck,
  ].join('\n')
}
