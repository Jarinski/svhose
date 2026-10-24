/**
 * lib/verwaltung/text.ts
 *
 * Kleine Text- und Formularhelfer für die Verwaltung (ohne Datenbank, auch im Browser nutzbar).
 */

/** URL-tauglicher Name: Umlaute ausgeschrieben, nur a–z, 0–9 und Bindestriche. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Getrimmter Text oder null, wenn leer. */
export function textOderNull(wert: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof wert !== 'string') return null
  const t = wert.trim()
  return t === '' ? null : t
}

/** Datum "YYYY-MM-DD" → "03.10.2026". */
export function datumDeutsch(iso: string | null | undefined): string {
  if (!iso) return ''
  const [j, m, t] = iso.slice(0, 10).split('-')
  return t && m && j ? `${t}.${m}.${j}` : iso
}

/** ISO-Zeitstempel → "03.10.2026, 14:12" in deutscher Zeit. */
export function zeitpunktDeutsch(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const
