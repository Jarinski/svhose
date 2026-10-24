'use server'

/**
 * Server-Aktionen für Termine: speichern (anlegen oder ändern) und löschen – nur manuelle Termine.
 * Jede Aktion prüft Sitzung und Rechte selbst (in terminSpeichern/terminLoeschen).
 * Bilder werden VOR der Transaktion hochgeladen, alte Bilder NACH erfolgreichem Speichern freigegeben.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { erfolg, fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { FELDER_PRUEFEN, mehrzeilig } from '@/lib/verwaltung/inhalte/gemeinsam'
import type { AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { terminLoeschen, terminPruefen, terminSpeichern, type TerminEingabe } from '@/lib/verwaltung/inhalte/termine'
import { bildSpeichern, hatDatei, medienFreigeben, UploadFehler } from '@/lib/verwaltung/medien-upload'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { kannSparte } from '@/lib/verwaltung/rechte'
import { textOderNull } from '@/lib/verwaltung/text'

export async function terminSichern(_vorher: AktionsErgebnis, formData: FormData): Promise<AktionsErgebnis> {
  const { rechte } = await sitzungErzwingen()

  const roh = (name: string) => {
    const wert = formData.get(name)
    return typeof wert === 'string' ? wert : null
  }
  const eingabe: TerminEingabe = {
    id: zahlFeld(formData, 'id'),
    titel: textOderNull(roh('titel')),
    datum: textOderNull(roh('datum')),
    uhrzeit: textOderNull(roh('uhrzeit')),
    ort: textOderNull(roh('ort')),
    beschreibung: textOderNull(mehrzeilig(roh('beschreibung'))),
    bereich: textOderNull(roh('bereich')),
    sparteId: zahlFeld(formData, 'sparteId'),
    tags: roh('tags'),
    stand: textOderNull(roh('stand')),
  }

  // Bei Fehlern den mitgeschickten Stand zurückgeben, damit das Formular ihn behält
  const abbruch = (meldung: string, f?: Record<string, string>): AktionsErgebnis => ({ ...fehler(meldung, f), stand: eingabe.stand ?? undefined })

  const felder = terminPruefen(eingabe)
  if (Object.keys(felder).length > 0) return abbruch(FELDER_PRUEFEN, felder)

  // Rechte VOR dem Hochladen prüfen – manuelle Termine: Admins, sonst nur mit Recht auf die Sparte.
  if (!rechte.istAdmin && (eingabe.sparteId == null || !kannSparte(rechte, eingabe.sparteId))) {
    return abbruch(FELDER_PRUEFEN, { sparteId: 'Für diese Sparte darfst du keine Termine bearbeiten.' })
  }

  // Bild hochladen (vor der Transaktion)
  const datei = formData.get('bild')
  let neuesBild: string | null = null
  if (hatDatei(datei)) {
    try {
      neuesBild = (await bildSpeichern(datei, 'termine', eingabe.titel as string)).pfad
      eingabe.bild = neuesBild
    } catch (e) {
      if (e instanceof UploadFehler) return abbruch(e.message, { bild: e.message })
      throw e
    }
  } else if (roh('bildEntfernen') === '1') {
    eingabe.bild = null
  }

  const ergebnis = terminSpeichern(datenbank(), rechte, eingabe)
  if (!ergebnis.ok) {
    medienFreigeben(neuesBild)
    return abbruch(ergebnis.meldung, ergebnis.felder)
  }
  medienFreigeben(ergebnis.alteDatei)
  revalidatePath('/verwaltung', 'layout')

  if (eingabe.id == null) redirect(`/verwaltung/termine/${ergebnis.id}?neu=1`)
  return { ...erfolg('Gespeichert – der Termin ist auf der Website zu sehen.'), stand: ergebnis.stand }
}

export async function terminEntfernen(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Dieser Termin wurde nicht gefunden.')
  const ergebnis = terminLoeschen(datenbank(), rechte, id)
  if (!ergebnis.ok) return fehler(ergebnis.meldung)
  medienFreigeben(ergebnis.alteDatei)
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/termine?geloescht=1')
}
