/**
 * lib/verwaltung/code-anzeige.ts
 *
 * Erstellt einen Einladungs-Code samt QR-Code und Anzeigetexten (neuer Zugang oder Zurücksetzen).
 */

import type { Datenbank } from '@/lib/db'
import type { AnmeldeCodeDaten } from '@/components/verwaltung/AnmeldeCodeKarte'
import { anmeldeCodeErstellen, anmeldeLink } from './anmeldung'
import { codeFormatieren } from './codes'
import { qrSvg } from './qr'
import { basisUrl } from './sitzung'
import { zeitpunktDeutsch } from './text'

export async function anmeldeCodeMitQr(
  db: Datenbank,
  zugang: { id: number; name: string },
  zweck: 'einladung',
  erstelltVon: number | null,
): Promise<AnmeldeCodeDaten> {
  const { code, laeuftAb } = anmeldeCodeErstellen(db, zugang.id, zweck, erstelltVon)
  const link = anmeldeLink(await basisUrl(), code)
  return {
    name: zugang.name,
    code,
    codeAnzeige: codeFormatieren(code),
    link,
    laeuftAbText: `gültig bis ${zeitpunktDeutsch(laeuftAb)} Uhr`,
    qrSvg: await qrSvg(link),
  }
}
