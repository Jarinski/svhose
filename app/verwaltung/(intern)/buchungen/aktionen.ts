'use server'

/**
 * Server-Aktionen für Buchungen und Regelbelegung von Vereinsheim und Gelände. Sitzung und
 * Buchungs-Recht prüfen die Funktionen in lib/verwaltung/inhalte/buchungen.ts selbst.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { datenbank, schema } from '@/lib/db'
import { rueckmeldungsMail } from '@/lib/buchungen/mails'
import { buchungsMailSenden } from '@/lib/buchungen/nachrichten'
import { fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { ausfallSetzen, buchungLoeschen, buchungSpeichern, regelLoeschen, regelSpeichern, type BuchungEingabe, type RegelEingabe } from '@/lib/verwaltung/inhalte/buchungen'
import { mehrzeilig } from '@/lib/verwaltung/inhalte/gemeinsam'
import type { AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { basisUrl, sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { textOderNull } from '@/lib/verwaltung/text'

function leser(formData: FormData) {
  return (name: string) => {
    const wert = formData.get(name)
    return typeof wert === 'string' ? textOderNull(wert) : null
  }
}

export async function buchungSichern(_vorher: AktionsErgebnis, formData: FormData): Promise<AktionsErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const roh = leser(formData)
  const eingabe: BuchungEingabe = {
    id: zahlFeld(formData, 'id'),
    stand: roh('stand'),
    art: roh('art'),
    ort: roh('ort'),
    status: roh('status'),
    titel: roh('titel'),
    datum: roh('datum'),
    beginn: roh('beginn'),
    ende: roh('ende'),
    bisDatum: roh('bisDatum'),
    ganztaegig: formData.get('ganztaegig') === '1',
    personenzahl: roh('personenzahl'),
    bereich: roh('bereich'),
    name: roh('name'),
    email: roh('email'),
    telefon: roh('telefon'),
    nachricht: textOderNull(mehrzeilig(roh('nachricht'))),
    rueckmeldung: textOderNull(mehrzeilig(roh('rueckmeldung'))),
    notiz: textOderNull(mehrzeilig(roh('notiz'))),
  }
  const db = datenbank()
  const ergebnis = buchungSpeichern(db, rechte, eingabe)
  if (!ergebnis.ok) return { ...fehler(ergebnis.meldung, ergebnis.felder), stand: eingabe.stand ?? undefined }
  revalidatePath('/verwaltung', 'layout')
  if (eingabe.id == null) redirect(`/verwaltung/buchungen/${ergebnis.id}?neu=1`)

  // Auf Wunsch Status und Rückmeldung per E-Mail an die buchende Person
  let mailText = ''
  if (formData.get('benachrichtigen') === '1') {
    const b = db.select().from(schema.buchungen).where(eq(schema.buchungen.id, ergebnis.id)).get()
    if (b?.email) {
      const mail = rueckmeldungsMail(b, rechte.name, `${await basisUrl()}/vereinsheim/status`)
      const gesendet = await buchungsMailSenden(db, b, mail, { zugangId: rechte.zugangId, name: rechte.name })
      mailText = gesendet.ok
        ? ` E-Mail an ${b.email} ist raus.`
        : ` Die E-Mail ging nicht raus (${gesendet.fehler}) – bitte über „E-Mail schreiben“ selbst Bescheid geben.`
    }
  }
  return { ok: true, meldung: ergebnis.meldung + mailText, stand: ergebnis.stand }
}

export async function buchungEntfernen(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Diese Buchung wurde nicht gefunden.')
  const ergebnis = buchungLoeschen(datenbank(), rechte, id)
  if (!ergebnis.ok) return fehler(ergebnis.meldung)
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/buchungen?geloescht=1')
}

export async function regelSichern(_vorher: AktionsErgebnis, formData: FormData): Promise<AktionsErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const roh = leser(formData)
  const eingabe: RegelEingabe = {
    id: zahlFeld(formData, 'id'),
    stand: roh('stand'),
    titel: roh('titel'),
    ort: roh('ort'),
    wochentag: zahlFeld(formData, 'wochentag'),
    beginn: roh('beginn'),
    ende: roh('ende'),
    ganztaegig: formData.get('ganztaegig') === '1',
    gueltigAb: roh('gueltigAb'),
    gueltigBis: roh('gueltigBis'),
    hinweis: roh('hinweis'),
  }
  const ergebnis = regelSpeichern(datenbank(), rechte, eingabe)
  if (!ergebnis.ok) return { ...fehler(ergebnis.meldung, ergebnis.felder), stand: eingabe.stand ?? undefined }
  revalidatePath('/verwaltung', 'layout')
  if (eingabe.id == null) redirect('/verwaltung/buchungen/regeln?angelegt=1')
  return { ok: true, meldung: 'Gespeichert.', stand: ergebnis.stand }
}

export async function regelEntfernen(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await sitzungErzwingen()
  const id = zahlFeld(formData, 'id')
  if (id == null) return fehler('Dieser Eintrag wurde nicht gefunden.')
  const ergebnis = regelLoeschen(datenbank(), rechte, id)
  if (!ergebnis.ok) return fehler(ergebnis.meldung)
  revalidatePath('/verwaltung', 'layout')
  redirect('/verwaltung/buchungen/regeln?geloescht=1')
}

/** Aus dem Kalender: Regelbelegung an einem Tag ausfallen lassen bzw. wieder stattfinden lassen. */
export async function ausfallUmschalten(formData: FormData): Promise<void> {
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  const regelId = zahlFeld(formData, 'regelId')
  const datum = String(formData.get('datum') ?? '')
  if (regelId != null) ausfallSetzen(datenbank(), rechte, regelId, datum, formData.get('ausgefallen') === '1')
  revalidatePath('/verwaltung', 'layout')
}
