'use server'

/**
 * Server-Aktion der Kontaktseite. Prüft Sitzung und Admin-Recht selbst; die Logik steckt in ./logik.ts.
 */

import { revalidatePath } from 'next/cache'
import { datenbank } from '@/lib/db'
import { erfolg, fehler, jsonFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { fehlerErgebnis } from '@/lib/verwaltung/fehlermeldung'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { funktionenAbgleichen, type KontakteEingabe } from './logik'

export async function kontakteSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = adminErzwingen()
  const eingabe = jsonFeld<KontakteEingabe>(formData, 'daten')
  if (!eingabe || typeof eingabe !== 'object') return fehler('Die Eingaben konnten nicht gelesen werden. Bitte die Seite neu laden.')

  let ergebnis: { neu: number; geaendert: number; entfernt: number }
  try {
    ergebnis = funktionenAbgleichen(datenbank(), rechte, eingabe, String(formData.get('stand') ?? ''))
  } catch (e) {
    return fehlerErgebnis(e)
  }
  if (ergebnis.neu + ergebnis.geaendert + ergebnis.entfernt === 0) return erfolg('Keine Änderungen – es war schon alles gespeichert.')
  revalidatePath('/verwaltung', 'layout')
  return erfolg('Gespeichert. Die Kontaktseite ist sofort aktuell.')
}
