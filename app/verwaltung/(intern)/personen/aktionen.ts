'use server'

/**
 * Server-Aktionen für Personen. Jede Aktion prüft Sitzung und Rechte selbst;
 * die eigentliche Logik steckt in lib/verwaltung/person-bearbeiten.ts.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { hatDatei } from '@/lib/verwaltung/medien-upload'
import { kannPerson } from '@/lib/verwaltung/rechte'
import { personAnlegen, personLoeschen, personSpeichern } from '@/lib/verwaltung/person-bearbeiten'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { istTeamArt } from '@/lib/verwaltung/team-bearbeiten'
import { textOderNull } from '@/lib/verwaltung/text'

const UNGUELTIG = 'Die Anfrage war unvollständig. Bitte die Seite neu laden und es noch einmal versuchen.'

function kontaktFelder(formData: FormData): Record<string, unknown> {
  return {
    name: formData.get('name'),
    email: formData.get('email'),
    telefon: formData.get('telefon'),
    whatsapp: formData.get('whatsapp'),
    notiz: formData.get('notiz'),
  }
}

/** Speichert eine Person. Felder: id, name, email, telefon, whatsapp, notiz, foto, fotoEntfernen, geaendertAm. */
export async function personSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler(UNGUELTIG)
  const foto = formData.get('foto')
  const ergebnis = await personSpeichern(datenbank(), rechte, {
    id,
    roh: kontaktFelder(formData),
    foto: hatDatei(foto) ? foto : null,
    fotoEntfernen: formData.get('fotoEntfernen') === '1',
    geaendertAm: textOderNull(formData.get('geaendertAm')),
  })
  if (ergebnis.ok) revalidatePath('/verwaltung', 'layout')
  return ergebnis
}

/**
 * Legt eine Person an (jeder angemeldete Zugang). Felder: name, telefon, email und optional
 * team ("mannschaft-6" / "gruppe-3") mit rolle.
 */
export async function personAnlegenAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const db = datenbank()
  const team = textOderNull(formData.get('team'))
  let zuordnung: { art: 'mannschaft' | 'gruppe'; id: number; rolle: string | null } | null = null
  if (team) {
    const [art, idText] = team.split('-')
    const id = Number(idText)
    if (!istTeamArt(art) || !Number.isInteger(id)) return fehler(UNGUELTIG)
    zuordnung = { art, id, rolle: textOderNull(formData.get('rolle')) }
  }
  const ergebnis = personAnlegen(db, rechte, {
    roh: { name: formData.get('name'), telefon: formData.get('telefon'), email: formData.get('email') },
    zuordnung,
  })
  if ('fehler' in ergebnis) return ergebnis.fehler
  revalidatePath('/verwaltung', 'layout')
  redirect(kannPerson(db, rechte, ergebnis.id) ? `/verwaltung/personen/${ergebnis.id}?neu=1` : '/verwaltung/personen')
}

/** Löscht eine Person samt aller Zuordnungen (nur Admins). Felder: id. */
export async function personLoeschenAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler(UNGUELTIG)
  const ergebnis = personLoeschen(datenbank(), rechte, id)
  if (!ergebnis.ok) return ergebnis
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/personen')
}
