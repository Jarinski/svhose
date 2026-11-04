'use server'

/**
 * Server-Aktion des Chronik-Editors (Admins und Zugänge mit Förderverein-Recht). Prüft Sitzung und
 * Recht selbst; die Logik steckt in lib/verwaltung/inhalte/chronik.ts.
 *
 * Fotos kommen als Dateifelder "bild:<schlüssel>" (Schlüssel aus dem Editor), "Foto entfernen" als
 * "bildEntfernen:<schlüssel>". Neue Fotos werden VOR dem Speichern hochgeladen und bei einem Fehler
 * wieder entfernt; Fotos, die danach nicht mehr vorkommen, werden NACH dem Speichern freigegeben.
 */

import { revalidatePath } from 'next/cache'
import { bilderUmwandeln, chronikBereinigen, chronikLesen, chronikPruefen, type GespeichertesBild } from '@/lib/chronik'
import { datenbank } from '@/lib/db'
import { erfolg, fehler, jsonFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { fehlerErgebnis } from '@/lib/verwaltung/fehlermeldung'
import { chronikLaden, chronikSpeichern } from '@/lib/verwaltung/inhalte/chronik'
import { KEINE_RECHTE } from '@/lib/verwaltung/inhalte/gemeinsam'
import { bildSpeichern, hatDatei, medienFreigeben, UploadFehler } from '@/lib/verwaltung/medien-upload'
import { darfChronik } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'

export async function chronikSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  // Rechte VOR dem Hochladen prüfen – sonst könnte jede:r Angemeldete Bilder ablegen.
  if (!darfChronik(rechte)) return fehler(KEINE_RECHTE)

  const roh = jsonFeld<unknown>(formData, 'daten')
  if (!roh || typeof roh !== 'object') return fehler('Die Eingaben konnten nicht gelesen werden. Bitte die Seite neu laden.')
  const eingabe = chronikLesen(roh)
  const stand = String(formData.get('stand') ?? '')
  const db = datenbank()

  // Ohne neue Datei bleibt nur ein Foto stehen, das schon gespeichert war – keine fremden Pfade aus dem Browser.
  const bisher = new Map<string, GespeichertesBild>()
  bilderUmwandeln(chronikLaden(db).inhalt, bild => {
    if (bild) bisher.set(bild.pfad, bild)
    return null
  })

  const dateien = new Map<string, File>()
  bilderUmwandeln(eingabe, (_bild, schluessel) => {
    const datei = schluessel ? formData.get(`bild:${schluessel}`) : null
    if (schluessel && hatDatei(datei)) dateien.set(schluessel, datei)
    return null
  })

  /** Bilder der Eingabe festlegen; ohne `neu` stehen neue Dateien als Platzhalter (zum Prüfen vor dem Hochladen). */
  const aufloesen = (neu?: Map<string, GespeichertesBild>) =>
    bilderUmwandeln(eingabe, (bild, schluessel) => {
      if (schluessel && dateien.has(schluessel)) return neu ? (neu.get(schluessel) ?? null) : { pfad: '', breite: 0, hoehe: 0 }
      if (schluessel && formData.get(`bildEntfernen:${schluessel}`) === '1') return null
      return bild ? (bisher.get(bild.pfad) ?? null) : null
    })

  // Erst prüfen, dann hochladen – bei einem Fehler im Text bleibt kein Foto liegen.
  const vorab = chronikPruefen(chronikBereinigen(aufloesen()))
  if (vorab) return fehler(vorab)

  const hochgeladen = new Map<string, GespeichertesBild>()
  const aufraeumen = () => hochgeladen.forEach(b => medienFreigeben(b.pfad))
  try {
    for (const [schluessel, datei] of Array.from(dateien)) {
      const b = await bildSpeichern(datei, 'chronik', 'chronik')
      hochgeladen.set(schluessel, { pfad: b.pfad, breite: b.breite, hoehe: b.hoehe })
    }
  } catch (e) {
    aufraeumen()
    if (e instanceof UploadFehler) return fehler(e.message)
    throw e
  }

  let ergebnis: ReturnType<typeof chronikSpeichern>
  try {
    ergebnis = chronikSpeichern(db, rechte, aufloesen(hochgeladen), stand)
  } catch (e) {
    aufraeumen()
    return fehlerErgebnis(e)
  }
  ergebnis.entfernteBilder.forEach(medienFreigeben)

  if (!ergebnis.geaendert) return erfolg('Keine Änderungen – es war schon alles gespeichert.')
  revalidatePath('/verwaltung', 'layout')
  revalidatePath('/foerderverein/chronik')
  return erfolg('Gespeichert. Die Chronik ist sofort auf der Website zu sehen.')
}
