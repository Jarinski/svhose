/**
 * Lesbare Gegenüberstellung von Vorher/Nachher-Ständen im Verlauf: nur Felder, die sich
 * unterscheiden; verschachtelte Werte als eingerückter Text.
 */

/** Deutsche Namen bekannter Felder – unbekannte erscheinen mit ihrem technischen Namen. */
const FELD_NAMEN: Record<string, string> = {
  id: 'Nr.',
  name: 'Name',
  slug: 'Adresse (Slug)',
  icon: 'Icon',
  farbe: 'Farbe',
  kurzbeschreibung: 'Kurzbeschreibung',
  beschreibung: 'Beschreibung',
  foto: 'Foto',
  bild: 'Bild',
  bildBreite: 'Bildbreite',
  bildHoehe: 'Bildhöhe',
  sichtbar: 'Auf der Website sichtbar',
  reihenfolge: 'Reihenfolge',
  ansprechpartner: 'Ansprechpartner:innen',
  istAdmin: 'Admin',
  aktiv: 'Aktiv',
  personId: 'Person (Nr.)',
  person: 'Person',
  personen: 'Personen',
  bereiche: 'Darf bearbeiten',
  email: 'E-Mail',
  telefon: 'Telefon',
  whatsapp: 'WhatsApp',
  notiz: 'Interne Notiz',
  rolle: 'Rolle',
  titel: 'Titel',
  teaser: 'Vorschautext',
  inhalt: 'Inhalt',
  datum: 'Datum',
  uhrzeit: 'Uhrzeit',
  ort: 'Ort',
  veroeffentlicht: 'Veröffentlicht',
  kategorie: 'Kategorie',
  tags: 'Schlagworte',
  datei: 'Datei',
  sparteId: 'Sparte (Nr.)',
  sparte: 'Sparte',
  mannschaftId: 'Mannschaft (Nr.)',
  mannschaft: 'Mannschaft',
  gruppeId: 'Gruppe (Nr.)',
  gruppe: 'Gruppe',
  bereich: 'Bereich',
  altersklasse: 'Altersklasse',
  trainingszeiten: 'Trainingszeiten',
  trainerteam: 'Trainerteam',
  wochentag: 'Wochentag',
  beginn: 'Beginn',
  ende: 'Ende',
  saison: 'Saison',
  rhythmus: 'Rhythmus',
  hinweis: 'Hinweis',
  bezeichnung: 'Bezeichnung',
  quelle: 'Quelle',
  externeId: 'Externe Nr.',
}

/** Felder, die bei jeder Änderung anders sind und nur ablenken. */
const AUSGEBLENDET = ['erstelltAm', 'geaendertAm']

export function feldName(schluessel: string): string {
  return FELD_NAMEN[schluessel] ?? schluessel
}

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istLeer(wert: unknown): boolean {
  return wert === null || wert === undefined || wert === '' || (Array.isArray(wert) && wert.length === 0)
}

/** Feld ausblenden? Technische Zeitstempel und Rohdaten-Felder ("_…"). */
function ausgeblendet(schluessel: string): boolean {
  return AUSGEBLENDET.indexOf(schluessel) >= 0 || schluessel.charAt(0) === '_'
}

/** Vergleicht zwei Werte inhaltlich (Objekte unabhängig von der Reihenfolge der Schlüssel). */
export function gleich(a: unknown, b: unknown): boolean {
  if (istLeer(a) && istLeer(b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => gleich(x, b[i]))
  if (istObjekt(a) && istObjekt(b)) {
    const schluessel = Object.keys(a).concat(Object.keys(b).filter(k => !(k in a)))
    return schluessel.every(k => gleich(a[k], b[k]))
  }
  return a === b
}

/** Wert als lesbarer, ggf. mehrzeiliger Text. */
export function wertAlsText(wert: unknown, einrueckung = ''): string {
  if (istLeer(wert)) return '—'
  if (typeof wert === 'boolean') return wert ? 'ja' : 'nein'
  if (typeof wert === 'string' || typeof wert === 'number') return String(wert)
  if (Array.isArray(wert)) {
    return wert
      .map(x => {
        const text = wertAlsText(x, einrueckung + '  ')
        return `${einrueckung}• ${text.replace(/^\s+/, '')}`
      })
      .join('\n')
  }
  if (istObjekt(wert)) {
    const zeilen = Object.keys(wert)
      .filter(k => !ausgeblendet(k) && !istLeer(wert[k]))
      .map(k => {
        const inhalt = wert[k]
        const verschachtelt = Array.isArray(inhalt) || istObjekt(inhalt)
        return verschachtelt
          ? `${einrueckung}${feldName(k)}:\n${wertAlsText(inhalt, einrueckung + '  ')}`
          : `${einrueckung}${feldName(k)}: ${wertAlsText(inhalt)}`
      })
    return zeilen.length ? zeilen.join('\n') : '—'
  }
  try {
    return JSON.stringify(wert)
  } catch {
    return String(wert)
  }
}

export interface FeldAenderung {
  feld: string
  vorher: string
  nachher: string
}

/**
 * Gegenüberstellung der geänderten Felder. Bei Anlegen (kein Vorher) bzw. Löschen (kein Nachher)
 * erscheinen alle gefüllten Felder.
 */
export function geaenderteFelder(vorher: unknown, nachher: unknown): FeldAenderung[] {
  if (istLeer(vorher) && istLeer(nachher)) return []
  const v = istObjekt(vorher) ? vorher : istLeer(vorher) ? {} : null
  const n = istObjekt(nachher) ? nachher : istLeer(nachher) ? {} : null
  if (!v || !n) {
    // Keine Objekte (z. B. Listen oder einzelne Werte): als Ganzes gegenüberstellen
    return gleich(vorher, nachher) ? [] : [{ feld: 'Wert', vorher: wertAlsText(vorher), nachher: wertAlsText(nachher) }]
  }
  const schluessel = Object.keys(v).concat(Object.keys(n).filter(k => !(k in v)))
  return schluessel
    .filter(k => !ausgeblendet(k) && !gleich(v[k], n[k]))
    .map(k => ({ feld: feldName(k), vorher: wertAlsText(v[k]), nachher: wertAlsText(n[k]) }))
}
