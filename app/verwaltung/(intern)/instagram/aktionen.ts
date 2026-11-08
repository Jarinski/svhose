'use server'

/** Server-Aktionen für die Instagram-Kachel (/verwaltung/instagram) – nur Admins. */

import { revalidatePath } from 'next/cache'
import { datenbank } from '@/lib/db'
import { instagramAbgleichen, type InstagramAbgleich } from '@/lib/instagram'
import { erfolg, fehler, type FormErgebnis } from '@/lib/verwaltung/formular'
import type { AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { instagramVerbindungTrennen, instagramZugangSpeichern } from '@/lib/verwaltung/inhalte/instagram'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'

function neuLaden() {
  revalidatePath('/verwaltung/instagram')
  revalidatePath('/')
}

function abgleichText(ergebnis: InstagramAbgleich): string {
  if (!ergebnis.ok) return ergebnis.fehler
  if (ergebnis.anzahl === 0) return 'Abgerufen – auf dem Konto gibt es noch keine Beiträge mit Bild.'
  const neu = ergebnis.neu === 0 ? 'keine neuen Bilder' : ergebnis.neu === 1 ? '1 neues Bild' : `${ergebnis.neu} neue Bilder`
  return `Abgerufen: Die Startseite zeigt die ${ergebnis.anzahl} neuesten Beiträge (${neu}).`
}

/** Liefert bei Erfolg einen neuen stand – das Formular leert sich damit (neuer key). */
export async function zugangSichern(_vorher: AktionsErgebnis, formData: FormData): Promise<AktionsErgebnis> {
  const { rechte } = await adminErzwingen()
  const eingabe = formData.get('token')
  const gespeichert = await instagramZugangSpeichern(datenbank(), rechte, typeof eingabe === 'string' ? eingabe : null)
  if (!gespeichert.ok) return fehler(gespeichert.meldung, gespeichert.felder)
  const abgleich = await instagramAbgleichen()
  neuLaden()
  const stand = new Date().toISOString()
  return abgleich.ok
    ? { ...erfolg(`Verbunden mit @${gespeichert.benutzername}. ${abgleichText(abgleich)}`), stand }
    : { ...fehler(`Verbunden mit @${gespeichert.benutzername}, aber der erste Abruf hat nicht geklappt: ${abgleich.fehler}`), stand }
}

export async function jetztAbrufen(_vorher: FormErgebnis): Promise<FormErgebnis> {
  await adminErzwingen()
  const ergebnis = await instagramAbgleichen()
  neuLaden()
  return ergebnis.ok ? erfolg(abgleichText(ergebnis)) : fehler(ergebnis.fehler)
}

export async function verbindungTrennen(_vorher: FormErgebnis): Promise<FormErgebnis> {
  const { rechte } = await adminErzwingen()
  const ergebnis = instagramVerbindungTrennen(datenbank(), rechte)
  if (!ergebnis.ok) return fehler(ergebnis.meldung)
  neuLaden()
  return erfolg('Verbindung getrennt. Die Startseite zeigt wieder die Platzhalterfotos.')
}
