'use server'

/**
 * Server-Aktion des Editors für die Förderverein-Seiten (Admins und Zugänge mit Förderverein-Recht).
 * Prüft Sitzung und Recht selbst; die Logik steckt in lib/verwaltung/inhalte/seiten.ts. Welche Seite,
 * steht im Feld "seite" (Slug aus lib/foerderverein-seiten.ts).
 *
 * Fotos kommen als Dateifelder "bild:<schlüssel>" (Schlüssel aus dem Editor), "Foto entfernen" als
 * "bildEntfernen:<schlüssel>". Neue Fotos werden VOR dem Speichern hochgeladen und bei einem Fehler
 * wieder entfernt; Fotos, die danach nicht mehr vorkommen, werden NACH dem Speichern freigegeben.
 */

import { revalidatePath } from 'next/cache'
import { bilderUmwandeln, seiteBereinigen, seiteLesen, seitePruefen, type GespeichertesBild } from '@/lib/seiten'
import { datenbank } from '@/lib/db'
import { foerdervereinSeite } from '@/lib/foerderverein-seiten'
import { erfolg, fehler, jsonFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { fehlerErgebnis } from '@/lib/verwaltung/fehlermeldung'
import { seiteLaden, seiteSpeichern } from '@/lib/verwaltung/inhalte/seiten'
import { KEINE_RECHTE } from '@/lib/verwaltung/inhalte/gemeinsam'
import { bildSpeichern, hatDatei, medienFreigeben, UploadFehler } from '@/lib/verwaltung/medien-upload'
import { darfFoerdervereinSeiten } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'

export async function seiteSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  // Rechte VOR dem Hochladen prüfen – sonst könnte jede:r Angemeldete Bilder ablegen.
  if (!darfFoerdervereinSeiten(rechte)) return fehler(KEINE_RECHTE)

  const seite = foerdervereinSeite(String(formData.get('seite') ?? ''))
  if (!seite) return fehler('Diese Seite gibt es nicht. Bitte die Seite neu laden.')
  const roh = jsonFeld<unknown>(formData, 'daten')
  if (!roh || typeof roh !== 'object') return fehler('Die Eingaben konnten nicht gelesen werden. Bitte die Seite neu laden.')
  const eingabe = seiteLesen(roh)
  const stand = String(formData.get('stand') ?? '')
  const db = datenbank()

  // Ohne neue Datei bleibt nur ein Foto stehen, das schon gespeichert war – keine fremden Pfade aus dem Browser.
  const bisher = new Map<string, GespeichertesBild>()
  bilderUmwandeln(seiteLaden(db, seite).inhalt, bild => {
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
  const vorab = seitePruefen(seiteBereinigen(aufloesen()))
  if (vorab) return fehler(vorab)

  const hochgeladen = new Map<string, GespeichertesBild>()
  const aufraeumen = () => hochgeladen.forEach(b => medienFreigeben(b.pfad))
  try {
    for (const [schluessel, datei] of Array.from(dateien)) {
      const b = await bildSpeichern(datei, 'foerderverein', seite.slug)
      hochgeladen.set(schluessel, { pfad: b.pfad, breite: b.breite, hoehe: b.hoehe })
    }
  } catch (e) {
    aufraeumen()
    if (e instanceof UploadFehler) return fehler(e.message)
    throw e
  }

  let ergebnis: ReturnType<typeof seiteSpeichern>
  try {
    ergebnis = seiteSpeichern(db, rechte, seite, aufloesen(hochgeladen), stand)
  } catch (e) {
    aufraeumen()
    return fehlerErgebnis(e)
  }
  ergebnis.entfernteBilder.forEach(medienFreigeben)

  if (!ergebnis.geaendert) return erfolg('Keine Änderungen – es war schon alles gespeichert.')
  revalidatePath('/verwaltung', 'layout')
  revalidatePath(seite.pfad)
  return erfolg(`Gespeichert. Die Seite „${seite.name}“ ist sofort auf der Website zu sehen.`)
}
