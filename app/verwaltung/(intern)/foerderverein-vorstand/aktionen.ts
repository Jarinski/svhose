'use server'

/**
 * Server-Aktion für den Vorstand des Fördervereins. Prüft Sitzung und Recht selbst; die Logik steckt in ./logik.ts.
 */

import { revalidatePath } from 'next/cache'
import { datenbank } from '@/lib/db'
import { erfolg, fehler, jsonFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { fehlerErgebnis } from '@/lib/verwaltung/fehlermeldung'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { vorstandAbgleichen, type VorstandEingabe } from './logik'

export async function vorstandSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const eingabe = jsonFeld<VorstandEingabe[]>(formData, 'daten')
  if (!Array.isArray(eingabe)) return fehler('Die Eingaben konnten nicht gelesen werden. Bitte die Seite neu laden.')

  let ergebnis: { neu: number; geaendert: number; entfernt: number }
  try {
    ergebnis = vorstandAbgleichen(datenbank(), rechte, eingabe, String(formData.get('stand') ?? ''))
  } catch (e) {
    return fehlerErgebnis(e)
  }
  if (ergebnis.neu + ergebnis.geaendert + ergebnis.entfernt === 0) return erfolg('Keine Änderungen – es war schon alles gespeichert.')
  revalidatePath('/verwaltung', 'layout')
  return erfolg('Gespeichert. Die Vorstandsseite des Fördervereins ist sofort aktuell.')
}
