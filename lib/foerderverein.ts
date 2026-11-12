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

/**
 * Einstieg in den Förderverein: Links auf "den Förderverein" (Startseite, Footer, Suche) führen
 * zum ersten Reiter "Über den Förderverein"; /foerderverein leitet hierher um.
 */
export const FOERDERVEREIN_START = '/foerderverein/ueber-uns'

/** Menüpunkt "Förderverein" in der Navigation: Name der Gruppe und ihre Unterpunkte (text: Kurzbeschreibung für Kacheln). */
export const FOERDERVEREIN_MENUE = {
  label: 'Förderverein',
  kinder: [
    { href: '/foerderverein/ueber-uns', label: 'Über den Förderverein', text: 'Warum es den Förderverein gibt und was er für den Sport im Ort tut.' },
    { href: '/foerderverein/aktuelles', label: 'Aktuelles', text: 'Aktionen und Neuigkeiten aus dem Förderverein.' },
    { href: '/foerderverein/chronik', label: 'Chronik', text: 'Von der Idee der Eltern bis zum eigenen Platz am Tostedter Weg.' },
    { href: '/foerderverein/vorstand', label: 'Vorstand', text: 'Wer den Förderverein leitet und wie du ihn erreichst.' },
    { href: '/foerderverein/mitglied-werden', label: 'Mitglied werden', text: 'Beitreten, spenden, Bandenwerbung oder mit anpacken.' },
    { href: '/foerderverein/spenden', label: 'Spenden', text: 'Das Spendenkonto des Fördervereins – mit GiroCode für die Banking-App.' },
  ],
} as const

// Quellen: alte Website fshose.de (Impressum; Beitrag aus dem Artikel „Unsere Unterstützer“, 2014)
// und der SV-Artikel „Unsere 3 Vereinshelden!“ vom 23.08.2026 (Vorsitz). E-Mail-Adresse vom
// Förderverein (Christian Junge, 04.11.2026). Beitrag vor der Veröffentlichung mit dem
// Förderverein abgleichen.
export const FOERDERVEREIN = {
  name: 'Förderverein Sportanlagen des SV Holm-Seppensen e.V.',
  register: 'Amtsgericht Tostedt, VR 200219',
  email: 'foerderverein@sv-holm-seppensen.de',
  /** Nur noch Rückfall für /foerderverein/vorstand, solange in der Verwaltung kein Vorstand eingetragen ist. */
  vorsitz: 'Jörg Passlack',
  beitrag: 'zuletzt 24 € im Jahr, Kinder und Jugendliche bis 18 Jahre beitragsfrei',
} as const
