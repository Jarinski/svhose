'use server'

/**
 * Server-Aktionen für Downloads (nur Admins): speichern (anlegen oder ändern) und löschen.
 * Die PDF-Datei wird VOR der Transaktion gespeichert; eine ersetzte Datei wird NACH erfolgreichem
 * Speichern freigegeben – schlägt das Speichern fehl, wird die neue Datei wieder entfernt.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { erfolg, fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { downloadLoeschen, downloadPruefen, downloadSpeichern, type DownloadEingabe } from '@/lib/verwaltung/inhalte/downloads'
import { FELDER_PRUEFEN, mehrzeilig } from '@/lib/verwaltung/inhalte/gemeinsam'
import type { AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { hatDatei, medienFreigeben, pdfSpeichern, UploadFehler } from '@/lib/verwaltung/medien-upload'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { textOderNull } from '@/lib/verwaltung/text'

export async function downloadSichern(_vorher: AktionsErgebnis, formData: FormData): Promise<AktionsErgebnis> {
  const { rechte } = adminErzwingen()

  const roh = (name: string) => {
    const wert = formData.get(name)
    return typeof wert === 'string' ? wert : null
  }
  const eingabe: DownloadEingabe = {
    id: zahlFeld(formData, 'id'),
    titel: textOderNull(roh('titel')),
    beschreibung: textOderNull(mehrzeilig(roh('beschreibung'))),
    kategorie: textOderNull(roh('kategorie')),
    datum: textOderNull(roh('datum')),
    sparteId: zahlFeld(formData, 'sparteId'),
    stand: textOderNull(roh('stand')),
  }

  // Bei Fehlern den mitgeschickten Stand zurückgeben, damit das Formular ihn behält
  const abbruch = (meldung: string, f?: Record<string, string>): AktionsErgebnis => ({ ...fehler(meldung, f), stand: eingabe.stand ?? undefined })

  const datei = formData.get('datei')
  const felder = downloadPruefen(eingabe, hatDatei(datei))
  if (Object.keys(felder).length > 0) return abbruch(FELDER_PRUEFEN, felder)

  // PDF speichern (vor der Transaktion)
  let neueDatei: string | null = null
  if (hatDatei(datei)) {
    try {
      neueDatei = await pdfSpeichern(datei, eingabe.titel as string)
      eingabe.datei = neueDatei
    } catch (e) {
      if (e instanceof UploadFehler) return abbruch(e.message, { datei: e.message })
      throw e
    }
  }

  const ergebnis = downloadSpeichern(datenbank(), rechte, eingabe)
  if (!ergebnis.ok) {
    medienFreigeben(neueDatei)
    return abbruch(ergebnis.meldung, ergebnis.felder)
  }
  medienFreigeben(ergebnis.alteDatei)
  revalidatePath('/verwaltung', 'layout')

  if (eingabe.id == null) redirect(`/verwaltung/downloads/${ergebnis.id}?neu=1`)
  return { ...erfolg('Gespeichert – der Download ist auf der Website zu sehen.'), stand: ergebnis.stand }
}

export async function downloadEntfernen(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = adminErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Dieser Download wurde nicht gefunden.')
  const ergebnis = downloadLoeschen(datenbank(), rechte, id)
  if (!ergebnis.ok) return fehler(ergebnis.meldung)
  medienFreigeben(ergebnis.alteDatei)
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/downloads?geloescht=1')
}
