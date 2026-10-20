'use server'

/**
 * Server-Aktionen für Mannschaften und Gruppen. Jede Aktion prüft Sitzung und Rechte selbst;
 * die eigentliche Logik steckt in lib/verwaltung/team-bearbeiten.ts.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { fehler, jsonFeld, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { hatDatei } from '@/lib/verwaltung/medien-upload'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { istTeamArt, teamAnlegen, teamLoeschen, teamSpeichern } from '@/lib/verwaltung/team-bearbeiten'
import { textOderNull } from '@/lib/verwaltung/text'

const UNGUELTIG = 'Die Anfrage war unvollständig. Bitte die Seite neu laden und es noch einmal versuchen.'

/**
 * Speichert eine Mannschaft oder Gruppe komplett (Stammdaten, Foto, Trainingszeiten, Trainerteam).
 * Felder: art, id, daten (JSON), foto (Datei, optional), fotoEntfernen ("1"), geaendertAm (Stand beim Laden).
 */
export async function teamSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = sitzungErzwingen()
  const art = formData.get('art')
  const id = zahlFeld(formData, 'id')
  const daten = jsonFeld<unknown>(formData, 'daten')
  if (!istTeamArt(art) || id == null || daten == null) return fehler(UNGUELTIG)

  const foto = formData.get('foto')
  const ergebnis = await teamSpeichern(datenbank(), rechte, {
    art,
    id,
    daten,
    foto: hatDatei(foto) ? foto : null,
    fotoEntfernen: formData.get('fotoEntfernen') === '1',
    geaendertAm: textOderNull(formData.get('geaendertAm')),
  })
  if (ergebnis.ok) revalidatePath('/verwaltung', 'layout')
  return ergebnis
}

/** Legt eine Mannschaft oder Gruppe an und öffnet sie zum Bearbeiten. Felder: art, sparteId, name, bereich. */
export async function teamAnlegenAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = sitzungErzwingen()
  const art = formData.get('art')
  if (!istTeamArt(art)) return fehler(UNGUELTIG)
  const ergebnis = teamAnlegen(datenbank(), rechte, {
    art,
    sparteId: zahlFeld(formData, 'sparteId'),
    name: formData.get('name'),
    bereich: formData.get('bereich'),
  })
  if ('fehler' in ergebnis) return ergebnis.fehler
  revalidatePath('/verwaltung', 'layout')
  redirect(`/verwaltung/teams/${art}/${ergebnis.id}`)
}

/** Löscht eine Mannschaft oder Gruppe (nur Admins und Spartenleitung). Felder: art, id. */
export async function teamLoeschenAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = sitzungErzwingen()
  const art = formData.get('art')
  const id = zahlFeld(formData, 'id')
  if (!istTeamArt(art) || id == null) return fehler(UNGUELTIG)
  const ergebnis = teamLoeschen(datenbank(), rechte, art, id)
  if (!ergebnis.ok) return ergebnis
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/teams')
}
