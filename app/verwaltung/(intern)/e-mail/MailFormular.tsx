'use client'

import { useActionState, useState } from 'react'
import { Send } from 'lucide-react'
import { LEER } from '@/lib/verwaltung/formular'
import { neuererStand, type AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { auswahlKlasse, eingabeKlasse, Feld, Karte } from '@/components/verwaltung/ui'
import { useFormularGeaendert, useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { mailEinstellungenSichern, testmailSenden } from './aktionen'

export interface MailFormDaten {
  aktiv: boolean
  host: string
  port: number
  benutzer: string
  absenderName: string
  postfach: string
  /** Ist ein Passwort gespeichert (und lesbar)? */
  passwortGespeichert: boolean
  geaendertAm: string | null
}

const PORTS = [
  { wert: 465, text: '465 – SSL/TLS (Strato, empfohlen)' },
  { wert: 587, text: '587 – STARTTLS' },
]

const LEER_ERGEBNIS: AktionsErgebnis = {}

export default function MailFormular({ daten }: { daten: MailFormDaten }) {
  const [ergebnis, speichern] = useActionState(mailEinstellungenSichern, LEER_ERGEBNIS)
  const stand = neuererStand(daten.geaendertAm, ergebnis.stand)
  const [geaendert, merken] = useFormularGeaendert(stand)
  useUngespeichertWarnung(geaendert)
  const [loeschen, setLoeschen] = useState(false)
  const [test, testen] = useActionState(testmailSenden, LEER)
  const f = ergebnis.felder ?? {}
  const ports = PORTS.some(p => p.wert === daten.port) ? PORTS : PORTS.concat({ wert: daten.port, text: String(daten.port) })

  return (
    <div className="space-y-6">
      <form key={stand} action={speichern} onReset={eingabenBehalten} onChange={merken} className="space-y-6">
        <input type="hidden" name="stand" value={stand} />
        <Karte titel="Postausgang (SMTP)" beschreibung="Vorbelegt mit den Werten von Strato. Absender der Mails ist immer dieses Postfach.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Server" htmlFor="host" fehler={f.host}>
              <input id="host" name="host" required defaultValue={daten.host} autoComplete="off" spellCheck={false} className={eingabeKlasse} />
            </Feld>
            <Feld label="Port" htmlFor="port" fehler={f.port}>
              <select id="port" name="port" defaultValue={String(daten.port)} className={auswahlKlasse}>
                {ports.map(p => (
                  <option key={p.wert} value={p.wert}>
                    {p.text}
                  </option>
                ))}
              </select>
            </Feld>
            <Feld label="Benutzer (E-Mail-Adresse des Postfachs)" htmlFor="benutzer" fehler={f.benutzer}>
              <input id="benutzer" name="benutzer" type="email" required defaultValue={daten.benutzer} autoComplete="username" className={eingabeKlasse} />
            </Feld>
            <Feld
              label="Passwort"
              htmlFor="passwort"
              fehler={f.passwort}
              hinweis={
                daten.passwortGespeichert
                  ? 'Ist gespeichert (verschlüsselt). Leer lassen, um es zu behalten – oder ein neues eintragen.'
                  : 'Das Passwort des Postfachs. Es wird verschlüsselt gespeichert und nie wieder angezeigt.'
              }
            >
              <input
                id="passwort"
                name="passwort"
                type="password"
                autoComplete="new-password"
                disabled={loeschen}
                placeholder={daten.passwortGespeichert ? '••••••••  (gespeichert)' : ''}
                className={eingabeKlasse}
              />
            </Feld>
            {daten.passwortGespeichert && (
              <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer text-sm">
                <input type="checkbox" name="passwortLoeschen" value="1" checked={loeschen} onChange={e => setLoeschen(e.target.checked)} className="w-5 h-5" />
                Gespeichertes Passwort löschen
              </label>
            )}
          </div>
        </Karte>

        <Karte titel="Absender und Empfänger">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Absendername" htmlFor="absenderName" fehler={f.absenderName} hinweis="So erscheint der Absender im Postfach der Empfänger.">
              <input id="absenderName" name="absenderName" maxLength={100} defaultValue={daten.absenderName} className={eingabeKlasse} />
            </Feld>
            <Feld label="Neue Anfragen melden an" htmlFor="postfach" fehler={f.postfach} hinweis="Leer = an das Postfach oben.">
              <input id="postfach" name="postfach" type="email" defaultValue={daten.postfach} placeholder={daten.benutzer} className={eingabeKlasse} />
            </Feld>
          </div>
        </Karte>

        <Karte titel="Versand">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="aktiv" value="1" defaultChecked={daten.aktiv} className="mt-0.5 w-5 h-5" />
            <span className="text-sm">
              <span className="block font-medium">E-Mails verschicken</span>
              <span className="block text-xs text-[#6b6b6b]">Ausschalten pausiert den Versand, ohne den Zugang zu löschen. Anfragen gehen dann trotzdem ein.</span>
            </span>
          </label>
        </Karte>

        <SpeicherLeiste geaendert={geaendert} ergebnis={ergebnis} />
      </form>

      <Karte titel="Testmail" beschreibung="Prüft den gespeicherten Zugang – erst speichern, dann testen.">
        <form action={testen} onReset={eingabenBehalten} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Feld label="An" htmlFor="an" fehler={test.felder?.an} className="flex-1 min-w-[14rem]">
              <input id="an" name="an" type="email" required defaultValue={daten.postfach || daten.benutzer} className={eingabeKlasse} />
            </Feld>
            <SpeichernKnopf art="sekundaer">
              <Send size={15} /> Testmail senden
            </SpeichernKnopf>
          </div>
          <FormMeldung ergebnis={test} />
        </form>
      </Karte>
    </div>
  )
}
