'use server'

/**
 * Server-Aktionen für News: speichern (anlegen oder ändern) und löschen.
 * Jede Aktion prüft Sitzung und Rechte selbst (in newsSpeichern/newsLoeschen).
 * Bilder werden VOR der Datenbank-Transaktion hochgeladen; alte Bilder erst NACH erfolgreichem
 * Speichern freigegeben – schlägt das Speichern fehl, wird das neue Bild wieder entfernt.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { erfolg, fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { FELDER_PRUEFEN, mehrzeilig, zuordnungAufloesen } from '@/lib/verwaltung/inhalte/gemeinsam'
import { newsLoeschen, newsPruefen, newsSpeichern, type NewsEingabe } from '@/lib/verwaltung/inhalte/news'
import type { AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { bildSpeichern, hatDatei, medienFreigeben, UploadFehler } from '@/lib/verwaltung/medien-upload'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { kannZuordnung } from '@/lib/verwaltung/rechte'
import { textOderNull } from '@/lib/verwaltung/text'

export async function newsSichern(_vorher: AktionsErgebnis, formData: FormData): Promise<AktionsErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const db = datenbank()

  const roh = (name: string) => {
    const wert = formData.get(name)
    return typeof wert === 'string' ? wert : null
  }
  const eingabe: NewsEingabe = {
    id: zahlFeld(formData, 'id'),
    titel: textOderNull(roh('titel')),
    slug: textOderNull(roh('slug')),
    datum: textOderNull(roh('datum')),
    kategorie: textOderNull(roh('kategorie')),
    teaser: textOderNull(mehrzeilig(roh('teaser'))),
    inhalt: roh('inhalt'),
    zuordnung: textOderNull(roh('zuordnung')),
    veroeffentlicht: roh('veroeffentlicht') === '1',
    stand: textOderNull(roh('stand')),
  }

  // Bei Fehlern den mitgeschickten Stand zurückgeben, damit das Formular ihn behält
  const abbruch = (meldung: string, f?: Record<string, string>): AktionsErgebnis => ({ ...fehler(meldung, f), stand: eingabe.stand ?? undefined })

  const felder = newsPruefen(eingabe)
  if (Object.keys(felder).length > 0) return abbruch(FELDER_PRUEFEN, felder)

  // Rechte VOR dem Hochladen prüfen – sonst könnte jede:r Angemeldete Bilder verarbeiten lassen.
  const ziel = zuordnungAufloesen(db, eingabe.zuordnung)
  if (!ziel) return abbruch(FELDER_PRUEFEN, { zuordnung: 'Diese Auswahl gibt es nicht mehr. Bitte Seite neu laden.' })
  if (!kannZuordnung(db, rechte, ziel)) return abbruch(FELDER_PRUEFEN, { zuordnung: 'Für diese Auswahl hast du keine Berechtigung.' })

  // Bild hochladen (vor der Transaktion)
  const datei = formData.get('bild')
  let neuesBild: string | null = null
  if (hatDatei(datei)) {
    try {
      const bild = await bildSpeichern(datei, 'news', eingabe.slug || (eingabe.titel as string))
      eingabe.bild = bild
      neuesBild = bild.pfad
    } catch (e) {
      if (e instanceof UploadFehler) return abbruch(e.message, { bild: e.message })
      throw e
    }
  } else if (roh('bildEntfernen') === '1') {
    eingabe.bild = null
  }

  const ergebnis = newsSpeichern(db, rechte, eingabe)
  if (!ergebnis.ok) {
    medienFreigeben(neuesBild)
    return abbruch(ergebnis.meldung, ergebnis.felder)
  }
  medienFreigeben(ergebnis.alteDatei)
  revalidatePath('/verwaltung', 'layout')

  if (eingabe.id == null) redirect(`/verwaltung/news/${ergebnis.id}?neu=1`)
  return {
    ...erfolg(
      eingabe.veroeffentlicht ? 'Gespeichert – die News ist auf der Website zu sehen.' : 'Gespeichert – als Entwurf, noch nicht auf der Website.',
    ),
    stand: ergebnis.stand,
  }
}

export async function newsEntfernen(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Diese News wurde nicht gefunden.')
  const ergebnis = newsLoeschen(datenbank(), rechte, id)
  if (!ergebnis.ok) return fehler(ergebnis.meldung)
  medienFreigeben(ergebnis.alteDatei)
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/news?geloescht=1')
}
