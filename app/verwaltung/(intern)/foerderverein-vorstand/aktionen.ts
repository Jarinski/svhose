'use server'

/**
 * Server-Aktion für den Vorstand des Fördervereins. Prüft Sitzung und Recht selbst; die Logik steckt in ./logik.ts.
 */

import { revalidatePath } from 'next/cache'
import { datenbank } from '@/lib/db'
import { erfolg, fehler, jsonFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { fehlerErgebnis } from '@/lib/verwaltung/fehlermeldung'
import { bildSpeichern, hatDatei, medienFreigeben, UploadFehler } from '@/lib/verwaltung/medien-upload'
import { darfFoerdervereinVorstand } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { vorstandAbgleichen, type VorstandEingabe } from './logik'

/**
 * Felder: stand, daten (JSON), foto (Gruppenfoto, optional), fotoEntfernen ("1"), fotoAusschnitt (JSON, leer = mittig).
 */
export async function vorstandSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const eingabe = jsonFeld<VorstandEingabe[]>(formData, 'daten')
  if (!Array.isArray(eingabe)) return fehler('Die Eingaben konnten nicht gelesen werden. Bitte die Seite neu laden.')
  if (!darfFoerdervereinVorstand(rechte)) return fehler('Den Vorstand des Fördervereins pflegen nur Admins und Zugänge mit Förderverein-Recht.')

  // Upload VOR der Transaktion – schlägt das Speichern fehl, wird die Datei wieder freigegeben.
  let neuesFoto: string | null = null
  const datei = formData.get('foto')
  if (hatDatei(datei)) {
    try {
      neuesFoto = (await bildSpeichern(datei, 'foerderverein', 'vorstand-gruppenfoto')).pfad
    } catch (e) {
      if (e instanceof UploadFehler) return fehler(e.message, { foto: e.message })
      return fehlerErgebnis(e)
    }
  }

  let ergebnis: ReturnType<typeof vorstandAbgleichen>
  try {
    ergebnis = vorstandAbgleichen(datenbank(), rechte, eingabe, String(formData.get('stand') ?? ''), {
      neu: neuesFoto,
      entfernen: formData.get('fotoEntfernen') === '1',
      ausschnitt: formData.get('fotoAusschnitt'),
    })
  } catch (e) {
    medienFreigeben(neuesFoto)
    return fehlerErgebnis(e)
  }
  // Ersetztes oder entferntes Foto erst NACH dem Speichern löschen (nur wenn nichts anderes mehr darauf verweist).
  medienFreigeben(ergebnis.altesFoto)
  if (ergebnis.neu + ergebnis.geaendert + ergebnis.entfernt === 0 && !ergebnis.gruppenfoto) {
    return erfolg('Keine Änderungen – es war schon alles gespeichert.')
  }
  revalidatePath('/verwaltung', 'layout')
  return erfolg('Gespeichert. Die Vorstandsseite des Fördervereins ist sofort aktuell.')
}
