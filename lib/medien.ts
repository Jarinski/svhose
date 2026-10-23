/**
 * lib/medien.ts
 *
 * Bilder und Dateien liegen außerhalb von public/ im Medienordner (Standard: data/medien,
 * anpassbar über MEDIEN_PFAD), damit auch nach dem Build hochgeladene Dateien ausgeliefert
 * werden. In der Datenbank steht nur der relative Pfad, z. B. "personen/max-beispiel-1a2b3c4d.webp";
 * die Route app/medien/[...pfad]/route.ts liefert ihn unter /medien/<pfad> aus.
 */

import path from 'node:path'

// turbopackIgnore: Der Pfad steht erst zur Laufzeit fest; der Build soll nicht das ganze Projekt einsammeln.
export const MEDIEN_PFAD = path.resolve(/* turbopackIgnore: true */ process.env.MEDIEN_PFAD ?? path.join('data', 'medien'))

/** Öffentliche URL zu einem relativen Medienpfad – oder null, wenn kein Pfad gesetzt ist. */
export function medienUrl(pfad: string | null | undefined): string | null {
  if (!pfad) return null
  return '/medien/' + pfad.split('/').map(encodeURIComponent).join('/')
}

/**
 * Löst einen relativen Medienpfad sicher in einen absoluten Dateipfad auf.
 * Gibt null zurück, wenn der Pfad aus dem Medienordner herausführen würde.
 */
export function medienDatei(relativ: string): string | null {
  const ziel = path.resolve(MEDIEN_PFAD, relativ)
  if (ziel !== MEDIEN_PFAD && !ziel.startsWith(MEDIEN_PFAD + path.sep)) return null
  return ziel
}
