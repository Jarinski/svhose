'use server'

/**
 * Server-Aktionen der Zugangsverwaltung. Jede Aktion prüft selbst, dass ein Admin angemeldet ist;
 * die Logik steckt in ./logik.ts. Einladungs-Codes stehen nur in der Antwort der jeweiligen Aktion –
 * nie in der URL, nie in der Datenbank (dort nur als Hash), nie im Verlauf. Passwort-Hashes und
 * App-Geheimnisse verlassen den Server nie.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { datenbank } from '@/lib/db'
import type { AnmeldeCodeDaten } from '@/components/verwaltung/AnmeldeCodeKarte'
import { benutzernameVorschlag } from '@/lib/verwaltung/anmeldung'
import { anmeldeCodeMitQr } from '@/lib/verwaltung/code-anzeige'
import { erfolg, fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { fehlerErgebnis, verstaendlicheMeldung } from '@/lib/verwaltung/fehlermeldung'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { geraeteAbmelden, zugangAendern, zugangAktivSetzen, zugangAnlegen, zugangLoeschen, zugangZuruecksetzen, type ZugangEingabe } from './logik'

export interface ZugangErgebnis extends FormErgebnis {
  /** Nur direkt nach dem Anlegen: der Einladungs-Code zum Anzeigen. */
  code?: AnmeldeCodeDaten
  zugangId?: number
  benutzername?: string
}

function eingabeLesen(formData: FormData): ZugangEingabe {
  const zahlen = (name: string) =>
    formData
      .getAll(name)
      .map(Number)
      .filter(n => Number.isInteger(n))
  return {
    name: String(formData.get('name') ?? ''),
    benutzername: String(formData.get('benutzername') ?? ''),
    personId: zahlFeld(formData, 'personId'),
    istAdmin: formData.get('rolle') === 'admin',
    sparten: zahlen('sparte'),
    mannschaften: zahlen('mannschaft'),
    gruppen: zahlen('gruppe'),
  }
}

export async function zugangAnlegenAktion(_vorher: ZugangErgebnis, formData: FormData): Promise<ZugangErgebnis> {
  const { rechte } = adminErzwingen()
  const db = datenbank()
  let zugang: { id: number; name: string; benutzername: string }
  try {
    zugang = zugangAnlegen(db, rechte, eingabeLesen(formData))
  } catch (e) {
    return fehlerErgebnis(e)
  }
  revalidatePath('/verwaltung', 'layout')
  try {
    const code = await anmeldeCodeMitQr(db, { id: zugang.id, name: zugang.name }, 'einladung', rechte.zugangId)
    return { ok: true, meldung: `Zugang für ${zugang.name} angelegt.`, code, zugangId: zugang.id, benutzername: zugang.benutzername }
  } catch (e) {
    console.error(e)
    return {
      ok: true,
      zugangId: zugang.id,
      benutzername: zugang.benutzername,
      meldung: `Zugang für ${zugang.name} angelegt – der Einladungs-Code konnte aber nicht erstellt werden. Bitte beim Zugang „Neuen Einladungs-Code erstellen“ wählen.`,
    }
  }
}

export async function zugangSpeichernAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = adminErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Diesen Zugang gibt es nicht. Bitte die Seite neu laden.')
  let geaendert: boolean
  try {
    geaendert = zugangAendern(datenbank(), rechte, id, eingabeLesen(formData)).geaendert
  } catch (e) {
    return fehlerErgebnis(e)
  }
  if (!geaendert) return erfolg('Keine Änderungen – es war schon alles gespeichert.')
  revalidatePath('/verwaltung', 'layout')
  return erfolg('Gespeichert. Die neuen Rechte gelten sofort auf allen Geräten.')
}

export async function zugangStatusAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = adminErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Diesen Zugang gibt es nicht. Bitte die Seite neu laden.')
  const aktiv = formData.get('aktiv') === '1'
  try {
    zugangAktivSetzen(datenbank(), rechte, id, aktiv)
  } catch (e) {
    return fehlerErgebnis(e)
  }
  revalidatePath('/verwaltung', 'layout')
  return erfolg(
    aktiv
      ? 'Zugang wieder aktiviert. Die Person kann sich wieder anmelden – ist die Einrichtung noch offen, bitte einen neuen Einladungs-Code erstellen.'
      : 'Zugang deaktiviert. Alle Geräte sind abgemeldet, eine offene Einladung ist gelöscht.',
  )
}

export async function zugangLoeschenAktion(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = adminErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Diesen Zugang gibt es nicht. Bitte die Seite neu laden.')
  try {
    zugangLoeschen(datenbank(), rechte, id)
  } catch (e) {
    return fehlerErgebnis(e)
  }
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/zugaenge')
}

/** Vorschlag für den Benutzernamen aus dem Namen (eindeutig gemacht), z. B. "max.beispiel". */
export async function benutzernameVorschlagAktion(name: string): Promise<string> {
  adminErzwingen()
  if (typeof name !== 'string' || !name.trim()) return ''
  return benutzernameVorschlag(datenbank(), name.slice(0, 80))
}

/**
 * "Zugang zurücksetzen": Passwort und App-Kopplung löschen, alle Geräte abmelden und einen neuen
 * Einladungs-Code erstellen (der alte, unbenutzte wird ungültig). Der Code steht nur in dieser Antwort.
 */
export async function zugangZuruecksetzenAktion(
  zugangId: number,
): Promise<{ daten?: AnmeldeCodeDaten; fehler?: string; selbstAbgemeldet?: boolean }> {
  const { rechte } = adminErzwingen()
  if (!Number.isInteger(zugangId)) return { fehler: 'Diesen Zugang gibt es nicht. Bitte die Seite neu laden.' }
  const db = datenbank()
  let zugang: { id: number; name: string }
  try {
    zugang = zugangZuruecksetzen(db, rechte, zugangId)
  } catch (e) {
    return { fehler: verstaendlicheMeldung(e) }
  }
  const selbst = zugangId === rechte.zugangId
  // Beim eigenen Zugang ist diese Sitzung jetzt beendet – ein Neuladen der Seite würde zur
  // Anmeldung umleiten und den Code verschlucken. Deshalb dann ohne revalidatePath.
  if (!selbst) revalidatePath('/verwaltung', 'layout')
  try {
    const daten = await anmeldeCodeMitQr(db, { id: zugang.id, name: zugang.name }, 'einladung', rechte.zugangId)
    return { daten, selbstAbgemeldet: selbst }
  } catch (e) {
    return { fehler: `Der Zugang wurde zurückgesetzt, aber der Einladungs-Code konnte nicht erstellt werden: ${verstaendlicheMeldung(e)}` }
  }
}

/** Meldet ein Gerät eines Zugangs ab (nie das Gerät, an dem gerade gearbeitet wird). */
export async function zugangGeraetAbmeldenAktion(formData: FormData): Promise<void> {
  const { rechte, geraetId } = adminErzwingen()
  const zugangId = zahlFeld(formData, 'zugangId')
  const id = zahlFeld(formData, 'geraetId')
  if (zugangId == null || id == null) return
  try {
    geraeteAbmelden(datenbank(), rechte, zugangId, { geraetId: id }, geraetId)
  } catch (e) {
    verstaendlicheMeldung(e)
  }
  revalidatePath('/verwaltung', 'layout')
}

/** Meldet alle Geräte eines Zugangs ab (beim eigenen Zugang: alle außer diesem). */
export async function zugangAlleGeraeteAbmeldenAktion(formData: FormData): Promise<void> {
  const { rechte, geraetId } = adminErzwingen()
  const zugangId = zahlFeld(formData, 'zugangId')
  if (zugangId == null) return
  try {
    geraeteAbmelden(datenbank(), rechte, zugangId, { alle: true }, geraetId)
  } catch (e) {
    verstaendlicheMeldung(e)
  }
  revalidatePath('/verwaltung', 'layout')
}
