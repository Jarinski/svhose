'use server'

/**
 * Server-Aktionen der Sparten-Verwaltung. Jede Aktion prüft Sitzung und Rechte selbst;
 * die eigentliche Speicherlogik steckt in ./logik.ts.
 */

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { datenbank, schema } from '@/lib/db'
import { erfolg, fehler, jsonFeld, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { fehlerErgebnis } from '@/lib/verwaltung/fehlermeldung'
import { bildSpeichern, hatDatei, medienFreigeben, UploadFehler } from '@/lib/verwaltung/medien-upload'
import { kannSparte } from '@/lib/verwaltung/rechte'
import { adminErzwingen, sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { textOderNull } from '@/lib/verwaltung/text'
import { sparteAnlegen, sparteLoeschen, sparteSpeichern, type AnsprechpartnerEingabe } from './logik'

const EINDEUTIG = 'Diese Adresse hat schon eine andere Sparte. Bitte eine andere wählen.'

export async function sparteAnlegenAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await adminErzwingen()
  let id: number
  try {
    id = sparteAnlegen(datenbank(), rechte, String(formData.get('name') ?? '')).id
  } catch (e) {
    return fehlerErgebnis(e, { eindeutig: EINDEUTIG })
  }
  revalidatePath('/verwaltung', 'layout')
  redirect(`/verwaltung/sparten/${id}`)
}

export async function sparteSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Diese Sparte gibt es nicht. Bitte die Seite neu laden.')
  if (!kannSparte(rechte, id)) return fehler('Dafür fehlen dir die Rechte.')

  const ansprechpartner = jsonFeld<AnsprechpartnerEingabe[]>(formData, 'ansprechpartner')
  if (!Array.isArray(ansprechpartner) || ansprechpartner.some(a => !Number.isInteger(a?.personId))) {
    return fehler('Die Ansprechpartner:innen konnten nicht gelesen werden. Bitte die Seite neu laden.')
  }

  const db = datenbank()
  const sparte = db.select({ slug: schema.sparten.slug }).from(schema.sparten).where(eq(schema.sparten.id, id)).get()
  if (!sparte) return fehler('Diese Sparte gibt es nicht mehr. Bitte die Seite neu laden.')

  // Upload VOR der Transaktion – schlägt das Speichern fehl, wird die Datei wieder freigegeben.
  let neuesFoto: string | null = null
  const datei = formData.get('foto')
  if (hatDatei(datei)) {
    try {
      neuesFoto = (await bildSpeichern(datei, 'sparten', sparte.slug)).pfad
    } catch (e) {
      if (e instanceof UploadFehler) return fehler(e.message, { foto: e.message })
      return fehlerErgebnis(e)
    }
  }

  let ergebnis: { geaendert: boolean; altesFoto: string | null }
  try {
    ergebnis = sparteSpeichern(db, rechte, id, {
      geaendertAm: String(formData.get('geaendertAm') ?? ''),
      name: String(formData.get('name') ?? ''),
      icon: textOderNull(formData.get('icon')),
      farbe: textOderNull(formData.get('farbe')),
      kurzbeschreibung: textOderNull(formData.get('kurzbeschreibung')),
      beschreibung: textOderNull(formData.get('beschreibung')),
      sichtbar: formData.get('sichtbar') === 'on',
      reihenfolge: zahlFeld(formData, 'reihenfolge') ?? 0,
      slug: rechte.istAdmin && formData.has('slug') ? String(formData.get('slug') ?? '') : undefined,
      fotoEntfernen: formData.get('fotoEntfernen') === 'on',
      neuesFoto,
      ansprechpartner: ansprechpartner.map(a => ({ personId: a.personId, rolle: String(a.rolle ?? '') })),
    })
  } catch (e) {
    medienFreigeben(neuesFoto)
    return fehlerErgebnis(e, { eindeutig: EINDEUTIG })
  }

  // Alte Datei erst NACH dem Speichern löschen (nur wenn nichts anderes mehr darauf verweist).
  medienFreigeben(ergebnis.altesFoto)
  if (!ergebnis.geaendert) return erfolg('Keine Änderungen – es war schon alles gespeichert.')
  revalidatePath('/verwaltung', 'layout')
  return erfolg('Gespeichert. Die Änderungen sind sofort auf der Website zu sehen.')
}

export async function sparteLoeschenAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await adminErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Diese Sparte gibt es nicht. Bitte die Seite neu laden.')
  let foto: string | null
  try {
    foto = sparteLoeschen(datenbank(), rechte, id).foto
  } catch (e) {
    return fehlerErgebnis(e, {
      verknuepft: 'Die Sparte hat noch Mannschaften oder Gruppen. Bitte diese zuerst löschen oder einer anderen Sparte zuordnen.',
    })
  }
  medienFreigeben(foto)
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/sparten')
}
