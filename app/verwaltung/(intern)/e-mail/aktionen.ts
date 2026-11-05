'use server'

/** Server-Aktionen für den SMTP-Zugang (/verwaltung/e-mail) – nur Admins. */

import { revalidatePath } from 'next/cache'
import { datenbank } from '@/lib/db'
import { fehler, zahlFeld, type FormErgebnis } from '@/lib/verwaltung/formular'
import { mailEinstellungenSpeichern } from '@/lib/verwaltung/inhalte/mail'
import type { AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { mailVersuchen, mailZugang } from '@/lib/mail'
import { adminErzwingen, basisUrl } from '@/lib/verwaltung/sitzung'
import { textOderNull } from '@/lib/verwaltung/text'

export async function mailEinstellungenSichern(_vorher: AktionsErgebnis, formData: FormData): Promise<AktionsErgebnis> {
  const { rechte } = await adminErzwingen()
  const text = (name: string) => textOderNull(formData.get(name))
  const passwort = formData.get('passwort')
  const stand = text('stand')
  const ergebnis = mailEinstellungenSpeichern(datenbank(), rechte, {
    aktiv: formData.get('aktiv') === '1',
    host: text('host'),
    port: zahlFeld(formData, 'port'),
    benutzer: text('benutzer'),
    // Passwörter nicht trimmen – Leerzeichen können dazugehören
    passwort: typeof passwort === 'string' && passwort !== '' ? passwort : null,
    passwortLoeschen: formData.get('passwortLoeschen') === '1',
    absenderName: text('absenderName'),
    postfach: text('postfach'),
    stand,
  })
  if (!ergebnis.ok) return { ...fehler(ergebnis.meldung, ergebnis.felder), stand: stand ?? undefined }
  revalidatePath('/verwaltung', 'layout')
  return { ok: true, meldung: 'Gespeichert. Mit „Testmail senden“ prüfst du, ob der Zugang klappt.', stand: ergebnis.stand }
}

export async function testmailSenden(_vorher: FormErgebnis, formData: FormData): Promise<FormErgebnis> {
  const { rechte } = await adminErzwingen()
  const an = textOderNull(formData.get('an'))
  if (!an || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(an)) return fehler('Bitte eine E-Mail-Adresse für die Testmail eintragen.', { an: 'Bitte eine gültige Adresse eintragen.' })
  const zugang = mailZugang()
  if (!zugang) return fehler('Der Versand ist noch nicht eingerichtet: Bitte erst Zugang und Passwort speichern und den Versand einschalten.')
  const ergebnis = await mailVersuchen(
    {
      an,
      betreff: 'Testmail vom Buchungssystem des SV Holm-Seppensen',
      text: [
        'Hallo,',
        '',
        `diese Testmail hat ${rechte.name} in der Verwaltung (${await basisUrl()}/verwaltung/e-mail) verschickt.`,
        `Server ${zugang.host}, Port ${zugang.port}, Postfach ${zugang.benutzer}.`,
        '',
        'Wenn sie angekommen ist, funktioniert der Versand der Buchungs-Mails.',
      ].join('\n'),
    },
    zugang,
  )
  return ergebnis.ok ? { ok: true, meldung: `Testmail an ${an} ist raus – schau ins Postfach (auch in den Spam-Ordner).` } : fehler(`Testmail ging nicht raus: ${ergebnis.fehler}`)
}
