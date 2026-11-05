'use client'

/**
 * Schreiben im Kontaktverlauf: eine E-Mail (über das Buchungs-Postfach) oder ein Telefonat,
 * Gespräch bzw. eine Notiz. Nach dem Senden leert sich das Formular.
 */

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, StickyNote } from 'lucide-react'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { auswahlKlasse, eingabeKlasse, Feld } from '@/components/verwaltung/ui'
import { kontaktEintragen, mailSchreiben } from './kontakt-aktionen'

export interface MailVorlage {
  betreff: string
  text: string
  /** ID der Nachricht, auf die geantwortet wird */
  antwortAuf?: number
  /** z. B. „Antwort an Erika Mustermann auf ‚Frage zum Schlüssel'“ */
  antwortHinweis?: string
}

function MailTeil({ buchungId, an, vorlage, abbrechenHref }: { buchungId: number | null; an: string; vorlage: MailVorlage; abbrechenHref?: string }) {
  const [ergebnis, senden] = useActionState(mailSchreiben, LEER)
  const [runde, setRunde] = useState(0)
  // Nach erfolgreichem Senden ein frisches Formular
  useEffect(() => {
    if (ergebnis.ok) setRunde(r => r + 1)
  }, [ergebnis])
  const f = ergebnis.ok ? {} : (ergebnis.felder ?? {})
  return (
    <form key={`${runde}-${vorlage.antwortAuf ?? 'neu'}`} action={senden} onReset={eingabenBehalten} className="space-y-4">
      {buchungId != null && <input type="hidden" name="buchungId" value={buchungId} />}
      {buchungId == null && <input type="hidden" name="an" value={an} />}
      {vorlage.antwortAuf != null && <input type="hidden" name="antwortAuf" value={vorlage.antwortAuf} />}
      <p className="text-sm text-[#6b6b6b]">
        An <span className="text-[#0a0a0a] font-medium">{an}</span>
        {vorlage.antwortHinweis && <> · {vorlage.antwortHinweis}</>}
        {abbrechenHref && (
          <>
            {' '}
            ·{' '}
            <Link href={abbrechenHref} scroll={false} className="underline underline-offset-2">
              neue Mail statt Antwort
            </Link>
          </>
        )}
      </p>
      <Feld label="Betreff" htmlFor={`betreff-${buchungId ?? vorlage.antwortAuf}`} fehler={f.betreff}>
        <input id={`betreff-${buchungId ?? vorlage.antwortAuf}`} name="betreff" required maxLength={200} defaultValue={vorlage.betreff} className={eingabeKlasse} />
      </Feld>
      <Feld label="Text" htmlFor={`text-${buchungId ?? vorlage.antwortAuf}`} fehler={f.text}>
        <textarea id={`text-${buchungId ?? vorlage.antwortAuf}`} name="text" required rows={10} defaultValue={vorlage.text} className={`${eingabeKlasse} font-[inherit]`} />
      </Feld>
      <div className="flex flex-wrap items-center gap-3">
        <SpeichernKnopf>
          <Mail size={15} /> E-Mail senden
        </SpeichernKnopf>
        <span className="text-xs text-[#6b6b6b]">Absender ist das Buchungs-Postfach; Antworten landen wieder hier.</span>
      </div>
      <FormMeldung ergebnis={ergebnis} />
    </form>
  )
}

function NotizTeil({ buchungId }: { buchungId: number }) {
  const [ergebnis, eintragen] = useActionState(kontaktEintragen, LEER as FormErgebnis)
  const [runde, setRunde] = useState(0)
  useEffect(() => {
    if (ergebnis.ok) setRunde(r => r + 1)
  }, [ergebnis])
  return (
    <form key={runde} action={eintragen} onReset={eingabenBehalten} className="space-y-4">
      <input type="hidden" name="buchungId" value={buchungId} />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <Feld label="Was" htmlFor="kanal">
          <select id="kanal" name="kanal" defaultValue="telefon" className={auswahlKlasse}>
            <option value="telefon">Telefonat</option>
            <option value="persoenlich">Gespräch</option>
            <option value="notiz">Notiz</option>
          </select>
        </Feld>
        <Feld label="Worum ging es?" htmlFor="kontakt-text" fehler={ergebnis.ok ? undefined : ergebnis.felder?.text}>
          <textarea id="kontakt-text" name="text" required rows={3} maxLength={5000} className={eingabeKlasse} placeholder="z. B. Schlüsselübergabe am Freitag um 17 Uhr vereinbart" />
        </Feld>
      </div>
      <SpeichernKnopf>
        <StickyNote size={15} /> Eintragen
      </SpeichernKnopf>
      <FormMeldung ergebnis={ergebnis} />
    </form>
  )
}

export default function KontaktFormular({
  buchungId,
  an,
  mailMoeglich,
  mailHinweis,
  vorlage,
  abbrechenHref,
}: {
  buchungId: number
  an: string | null
  mailMoeglich: boolean
  /** Warum keine Mail geht (kein Versand eingerichtet, keine Adresse) */
  mailHinweis?: string
  vorlage: MailVorlage
  abbrechenHref?: string
}) {
  const [reiter, setReiter] = useState<'mail' | 'notiz'>(mailMoeglich ? 'mail' : 'notiz')
  const reiterKlasse = (aktiv: boolean) =>
    `px-3 py-2 text-sm border-b-2 -mb-px ${aktiv ? 'border-[#0a0a0a] font-medium' : 'border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]'}`
  return (
    <div>
      <div className="flex gap-2 border-b border-[#0a0a0a]/10 mb-4" role="tablist">
        <button type="button" role="tab" aria-selected={reiter === 'mail'} className={reiterKlasse(reiter === 'mail')} onClick={() => setReiter('mail')}>
          E-Mail schreiben
        </button>
        <button type="button" role="tab" aria-selected={reiter === 'notiz'} className={reiterKlasse(reiter === 'notiz')} onClick={() => setReiter('notiz')}>
          Telefonat oder Notiz
        </button>
      </div>
      {reiter === 'mail' ? (
        mailMoeglich && an ? (
          <MailTeil buchungId={buchungId} an={an} vorlage={vorlage} abbrechenHref={abbrechenHref} />
        ) : (
          <p className="text-sm text-[#6b6b6b]">{mailHinweis}</p>
        )
      ) : (
        <NotizTeil buchungId={buchungId} />
      )}
    </div>
  )
}

export { MailTeil }
