/**
 * lib/buchungen/mails.ts
 *
 * Texte der E-Mails rund um Buchungen (ohne Versand – der liegt in lib/mail.ts):
 *   - Eingangsbestätigung an die buchende Person
 *   - Meldung einer neuen Anfrage an das Postfach der Buchungen
 *   - Rückmeldung zu Status und Rückmeldung (aus der Verwaltung)
 */

import type { schema } from '@/lib/db'
import { ART_NAMEN, ORT_NAMEN, STATUS_ERKLAERUNG, STATUS_NAMEN, zeitraumText } from './zeit'

type Buchung = typeof schema.buchungen.$inferSelect

export interface MailText {
  betreff: string
  text: string
}

function wasWo(b: Buchung): string {
  return b.ort === 'beides' ? 'Vereinsheim und Gelände' : `das ${ORT_NAMEN[b.ort]}`
}

function anrede(b: Buchung): string {
  return b.name ? `Hallo ${b.name.trim().split(/\s+/)[0]},` : 'Hallo,'
}

const GRUSS = ['Viele Grüße', 'SV Holm-Seppensen e.V.']

/** An die buchende Person, direkt nach der Anfrage über die Website. */
export function eingangsMail(b: Buchung, statusAdresse: string): MailText {
  return {
    betreff: `Deine Anfrage für das Vereinsheim – Buchungsnummer ${b.nummer}`,
    text: [
      anrede(b),
      '',
      `danke für deine Anfrage für ${wasWo(b)}. Sie ist bei uns eingegangen, wir melden uns so bald wie möglich.`,
      '',
      `Buchungsnummer: ${b.nummer}`,
      `Wann: ${zeitraumText(b)}`,
      `Anlass: ${b.titel}`,
      '',
      `Den aktuellen Stand findest du jederzeit unter ${statusAdresse} – mit der Buchungsnummer und dem Datum.`,
      '',
      'Bei Fragen antworte einfach auf diese E-Mail.',
      '',
      ...GRUSS,
    ].join('\n'),
  }
}

/** An das Postfach der Buchungen: eine neue Anfrage ist da. Antworten gehen direkt an die buchende Person. */
export function vereinsMail(b: Buchung, verwaltungsAdresse: string): MailText {
  const zeilen = [
    `Neue Anfrage über die Website (${ART_NAMEN[b.art]}):`,
    '',
    `Anlass:   ${b.titel}`,
    `Ort:      ${ORT_NAMEN[b.ort]}`,
    `Wann:     ${zeitraumText(b)}`,
  ]
  if (b.personenzahl) zeilen.push(`Personen: ${b.personenzahl}`)
  if (b.bereich) zeilen.push(`${b.art === 'extern' ? 'Verein/Firma' : 'Sparte/Team'}: ${b.bereich}`)
  zeilen.push('', `Name:     ${b.name ?? '–'}`, `E-Mail:   ${b.email ?? '–'}`, `Telefon:  ${b.telefon ?? '–'}`)
  if (b.nachricht) zeilen.push('', 'Nachricht:', b.nachricht)
  zeilen.push('', `Bestätigen oder ablehnen: ${verwaltungsAdresse}`, '', `Buchungsnummer ${b.nummer}. Eine Antwort auf diese E-Mail geht direkt an ${b.name ?? 'die buchende Person'}.`)
  return { betreff: `Neue Anfrage Vereinsheim: ${b.titel} (${zeitraumText(b)})`, text: zeilen.join('\n') }
}

/** Status und Rückmeldung an die buchende Person – als E-Mail oder als Vorlage für einen mailto-Link. */
export function rueckmeldungsMail(b: Buchung, absender: string, statusAdresse: string): MailText {
  const stand =
    b.status === 'bestaetigt'
      ? 'ist bestätigt.'
      : b.status === 'abgelehnt'
        ? 'können wir leider nicht annehmen.'
        : b.status === 'storniert'
          ? 'ist storniert.'
          : b.status === 'rueckfrage'
            ? 'haben wir noch eine Frage.'
            : 'ist bei uns eingegangen.'
  const zeilen = [anrede(b), '', `deine Anfrage für ${wasWo(b)} am ${zeitraumText(b)} (Buchungsnummer ${b.nummer}) ${stand}`]
  if (b.rueckmeldung) zeilen.push('', b.rueckmeldung)
  else zeilen.push('', STATUS_ERKLAERUNG[b.status])
  zeilen.push(
    '',
    `Den aktuellen Stand findest du jederzeit unter ${statusAdresse} – mit Buchungsnummer und Datum.`,
    '',
    'Viele Grüße',
    absender,
    'SV Holm-Seppensen e.V.',
  )
  return { betreff: `Vereinsheim – Buchung ${b.nummer}: ${STATUS_NAMEN[b.status]}`, text: zeilen.join('\n') }
}
