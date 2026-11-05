'use server'

/**
 * Server-Aktionen für den Kontaktverlauf der Buchungen: Mails schreiben (auch auf nicht
 * zugeordnete Mails antworten), Telefonate und Notizen eintragen, eingegangene Mails zuordnen
 * oder lösen, Einträge löschen und das Postfach abrufen. Alles nur mit Buchungs-Recht.
 */

import { and, eq, isNull, like } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { datenbank, schema } from '@/lib/db'
import { buchungsMailSenden, messageIds, nachrichtEintragen } from '@/lib/buchungen/nachrichten'
import { postfachAbrufen } from '@/lib/buchungen/postfach'
import { nummerNormalisieren } from '@/lib/buchungen/zeit'
import { mailVersuchen } from '@/lib/mail'
import { erfolg, fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { mehrzeilig } from '@/lib/verwaltung/inhalte/gemeinsam'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { textOderNull } from '@/lib/verwaltung/text'

const KEIN_RECHT = 'Dafür fehlt dir das Recht „Buchungen“.'

async function rechtePruefen() {
  const { rechte } = await sitzungErzwingen()
  return darfBuchungen(rechte) ? rechte : null
}

function neuLaden() {
  revalidatePath('/verwaltung', 'layout')
}

/** Antwort-Kopfzeilen aus der Nachricht, auf die geantwortet wird. */
function antwortKopf(db: ReturnType<typeof datenbank>, nachrichtId: number | null) {
  if (nachrichtId == null) return {}
  const n = db.select().from(schema.buchungNachrichten).where(eq(schema.buchungNachrichten.id, nachrichtId)).get()
  if (!n?.messageId) return {}
  return { antwortAuf: n.messageId, verweise: messageIds(n.verweise).concat(n.messageId) }
}

/** E-Mail an die buchende Person – oder, ohne Buchung, an den Absender einer nicht zugeordneten Mail. */
export async function mailSchreiben(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const rechte = await rechtePruefen()
  if (!rechte) return fehler(KEIN_RECHT)
  const db = datenbank()
  const buchungId = zahlFeld(formData, 'buchungId')
  const antwortAufId = zahlFeld(formData, 'antwortAuf')
  const betreff = textOderNull(formData.get('betreff'))
  const text = mehrzeilig(String(formData.get('text') ?? ''))
  const an = textOderNull(formData.get('an'))
  const felder: Record<string, string> = {}
  if (!betreff) felder.betreff = 'Bitte einen Betreff eintragen.'
  if (!text) felder.text = 'Bitte einen Text schreiben.'
  if (text.length > 20_000) felder.text = 'Der Text ist zu lang.'
  if (Object.keys(felder).length) return fehler('Noch nicht gesendet. Bitte die markierten Felder prüfen.', felder)

  const kopf = antwortKopf(db, antwortAufId)
  const wer = { zugangId: rechte.zugangId, name: rechte.name }
  if (buchungId != null) {
    const b = db.select().from(schema.buchungen).where(eq(schema.buchungen.id, buchungId)).get()
    if (!b) return fehler('Diese Buchung gibt es nicht mehr.')
    const ergebnis = await buchungsMailSenden(db, b, { betreff: betreff as string, text, ...kopf }, wer)
    if (!ergebnis.ok) return fehler(`Nicht gesendet: ${ergebnis.fehler}`)
    neuLaden()
    return erfolg(`Gesendet an ${b.email}. Die Mail steht jetzt im Kontaktverlauf.`)
  }

  // Antwort auf eine nicht zugeordnete Mail
  if (!an || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(an)) return fehler('Keine gültige Empfängeradresse.')
  const ergebnis = await mailVersuchen({ an, betreff: betreff as string, text, ...kopf })
  if (!ergebnis.ok) return fehler(`Nicht gesendet: ${ergebnis.fehler}`)
  nachrichtEintragen(db, {
    buchungId: null,
    kanal: 'email',
    richtung: 'ausgang',
    zeitpunkt: new Date().toISOString(),
    von: ergebnis.von,
    an,
    betreff,
    text,
    messageId: ergebnis.messageId,
    verweise: kopf.verweise?.join(' ') ?? null,
    zugangId: rechte.zugangId,
    zugangName: rechte.name,
  })
  neuLaden()
  return erfolg(`Gesendet an ${an}.`)
}

/** Telefonat, Gespräch oder Notiz von Hand eintragen. */
export async function kontaktEintragen(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const rechte = await rechtePruefen()
  if (!rechte) return fehler(KEIN_RECHT)
  const buchungId = zahlFeld(formData, 'buchungId')
  const kanal = formData.get('kanal')
  const text = mehrzeilig(String(formData.get('text') ?? ''))
  if (buchungId == null) return fehler('Diese Buchung wurde nicht gefunden.')
  if (kanal !== 'telefon' && kanal !== 'persoenlich' && kanal !== 'notiz') return fehler('Bitte auswählen, was du einträgst.')
  if (!text) return fehler('Bitte kurz notieren, worum es ging.', { text: 'Bitte etwas eintragen.' })
  if (text.length > 5000) return fehler('Der Text ist zu lang.', { text: 'Höchstens 5000 Zeichen.' })
  const db = datenbank()
  if (!db.select({ id: schema.buchungen.id }).from(schema.buchungen).where(eq(schema.buchungen.id, buchungId)).get()) return fehler('Diese Buchung gibt es nicht mehr.')
  nachrichtEintragen(db, {
    buchungId,
    kanal,
    richtung: 'intern',
    zeitpunkt: new Date().toISOString(),
    text,
    zugangId: rechte.zugangId,
    zugangName: rechte.name,
  })
  neuLaden()
  return erfolg('Eingetragen.')
}

/** Eine eingegangene Mail einer Buchung zuordnen (per Buchungsnummer). Antworten aus der Verwaltung darauf wandern mit. */
export async function nachrichtZuordnen(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const rechte = await rechtePruefen()
  if (!rechte) return fehler(KEIN_RECHT)
  const db = datenbank()
  const id = zahlFeld(formData, 'nachrichtId')
  const nummer = nummerNormalisieren(formData.get('nummer'))
  if (id == null) return fehler('Diese Mail wurde nicht gefunden.')
  if (!nummer) return fehler('Bitte eine Buchungsnummer eintragen, z. B. K7M2-Q9XD.', { nummer: 'Bitte eine gültige Nummer eintragen.' })
  const b = db.select({ id: schema.buchungen.id }).from(schema.buchungen).where(eq(schema.buchungen.nummer, nummer)).get()
  if (!b) return fehler(`Eine Buchung ${nummer} gibt es nicht.`, { nummer: 'Nicht gefunden.' })
  const n = db.select().from(schema.buchungNachrichten).where(eq(schema.buchungNachrichten.id, id)).get()
  if (!n) return fehler('Diese Mail gibt es nicht mehr.')
  db.transaction(tx => {
    tx.update(schema.buchungNachrichten).set({ buchungId: b.id, zuordnung: 'hand', gelesenAm: n.gelesenAm ?? new Date().toISOString() }).where(eq(schema.buchungNachrichten.id, id)).run()
    if (n.messageId) {
      tx.update(schema.buchungNachrichten)
        .set({ buchungId: b.id })
        .where(and(isNull(schema.buchungNachrichten.buchungId), like(schema.buchungNachrichten.verweise, `%${n.messageId}%`)))
        .run()
    }
  })
  neuLaden()
  return erfolg(`Der Buchung ${nummer} zugeordnet.`)
}

/** Zuordnung lösen – die Mail wandert zurück in den Eingang. */
export async function nachrichtLoesen(formData: FormData): Promise<void> {
  const rechte = await rechtePruefen()
  if (!rechte) return
  const id = zahlFeld(formData, 'nachrichtId')
  if (id == null) return
  datenbank()
    .update(schema.buchungNachrichten)
    .set({ buchungId: null, zuordnung: null })
    .where(and(eq(schema.buchungNachrichten.id, id), eq(schema.buchungNachrichten.richtung, 'eingang')))
    .run()
  neuLaden()
}

/** Eintrag löschen: eigene Notizen/Telefonate und eingegangene Mails (z. B. Spam). Gesendete Mails bleiben. */
export async function nachrichtLoeschen(formData: FormData): Promise<void> {
  const rechte = await rechtePruefen()
  if (!rechte) return
  const id = zahlFeld(formData, 'nachrichtId')
  if (id == null) return
  const db = datenbank()
  const n = db.select().from(schema.buchungNachrichten).where(eq(schema.buchungNachrichten.id, id)).get()
  if (!n || n.richtung === 'ausgang') return
  // Eingegangene Mails nicht ganz löschen, sonst holt der nächste Abruf sie nicht wieder – nur der Inhalt verschwindet.
  if (n.richtung === 'eingang') {
    db.update(schema.buchungNachrichten)
      .set({ buchungId: null, text: '', betreff: '(gelöscht)', von: null, an: null, gelesenAm: n.gelesenAm ?? new Date().toISOString(), richtung: 'intern', kanal: 'notiz', zuordnung: null })
      .where(eq(schema.buchungNachrichten.id, id))
      .run()
  } else db.delete(schema.buchungNachrichten).where(eq(schema.buchungNachrichten.id, id)).run()
  neuLaden()
}

/** Postfach sofort abrufen. */
export async function jetztAbrufen(_vorher: FormErgebnis): Promise<FormErgebnis> {
  const rechte = await rechtePruefen()
  if (!rechte) return fehler(KEIN_RECHT)
  const ergebnis = await postfachAbrufen(datenbank())
  neuLaden()
  if (!ergebnis.ok) return fehler(`Abruf fehlgeschlagen: ${ergebnis.fehler}`)
  if (ergebnis.neu === 0) return erfolg('Abgerufen – keine neuen Mails.')
  const rest = ergebnis.neu - ergebnis.zugeordnet
  return erfolg(
    `${ergebnis.neu} neue Mail${ergebnis.neu === 1 ? '' : 's'} abgerufen, ${ergebnis.zugeordnet} zugeordnet${rest > 0 ? `, ${rest} im Eingang` : ''}.`,
  )
}
