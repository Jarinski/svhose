/**
 * lib/foerderverein.ts
 *
 * Kategorie, unter der News und Downloads des Fördervereins laufen. Was in der Verwaltung diese
 * Kategorie bekommt, erscheint zusätzlich auf den Seiten unter /foerderverein (News unter
 * "Aktuelles", Downloads unter "Mitglied werden").
 *
 * Außerdem die festen Angaben zum Verein und die Menüpunkte, die Navigation, Footer und
 * Unterseiten gemeinsam nutzen (Hauptdesign und Vorschau-Designs A und B).
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

/** Menüpunkt "Förderverein" in der Navigation: Name der Gruppe und ihre Unterpunkte (text: Kurzbeschreibung für Kacheln). */
export const FOERDERVEREIN_MENUE = {
  label: 'Förderverein',
  kinder: [
    { href: '/foerderverein/aktuelles', label: 'Aktuelles', text: 'Aktionen und Neuigkeiten aus dem Förderverein.' },
    { href: '/foerderverein/chronik', label: 'Chronik', text: 'Von der Idee der Eltern bis zum eigenen Platz am Tostedter Weg.' },
    { href: '/foerderverein/vorstand', label: 'Vorstand', text: 'Wer den Förderverein leitet und wie du ihn erreichst.' },
    { href: '/foerderverein/mitglied-werden', label: 'Mitglied werden', text: 'Beitreten, spenden, Bandenwerbung oder mit anpacken.' },
  ],
} as const

// Quellen: alte Website fshose.de (Impressum; Beitrag aus dem Artikel „Unsere Unterstützer“, 2014)
// und der SV-Artikel „Unsere 3 Vereinshelden!“ vom 23.08.2026 (Vorsitz). Beitrag vor der
// Veröffentlichung mit dem Förderverein abgleichen.
export const FOERDERVEREIN = {
  name: 'Förderverein Sportplatz des SV Holm-Seppensen e.V.',
  register: 'Amtsgericht Tostedt, VR 200219',
  email: 'info@fshose.de',
  vorsitz: 'Jörg Passlack',
  beitrag: 'zuletzt 24 € im Jahr, Kinder und Jugendliche bis 18 Jahre beitragsfrei',
} as const
