/**
 * lib/foerderverein.ts
 *
 * Kategorie, unter der News und Downloads des Fördervereins laufen. Was in der Verwaltung diese
 * Kategorie bekommt, erscheint zusätzlich auf der Seite /foerderverein.
 */

export const FOERDERVEREIN_KATEGORIE = 'Förderverein'

/** true für "Förderverein" in jeder Schreibweise (auch "foerderverein", "FÖRDERVEREIN"). */
export function istFoerderverein(kategorie: string | null | undefined): boolean {
  if (!kategorie) return false
  return kategorie.normalize('NFC').trim().toLowerCase().replace(/oe/g, 'ö') === 'förderverein'
}

/** Schreibvarianten beim Speichern vereinheitlichen, damit /downloads sie unter einer Überschrift zeigt. */
export function kategorieVereinheitlichen(kategorie: string | null): string | null {
  return istFoerderverein(kategorie) ? FOERDERVEREIN_KATEGORIE : kategorie
}
