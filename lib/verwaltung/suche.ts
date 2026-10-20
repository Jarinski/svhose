/**
 * lib/verwaltung/suche.ts
 *
 * Einfache Suche für Listen in der Verwaltung (läuft im Browser): Groß-/Kleinschreibung,
 * Akzente und Umlaut-Schreibweisen ("ü" = "ue") spielen keine Rolle, mehrere Wörter
 * müssen alle irgendwo vorkommen.
 */

export function suchNormal(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

/** Baut den Suchtext aus mehreren Teilen (leere werden übersprungen). */
export function suchtext(...teile: (string | null | undefined)[]): string {
  return suchNormal(teile.filter(Boolean).join(' '))
}

/** Passt der vorbereitete Suchtext zur Eingabe? Leere Eingabe passt immer. */
export function passtZurSuche(vorbereitet: string, eingabe: string): boolean {
  const woerter = suchNormal(eingabe).split(/\s+/).filter(Boolean)
  return woerter.every(w => vorbereitet.indexOf(w) >= 0)
}
