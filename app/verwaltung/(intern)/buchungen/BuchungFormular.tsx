'use client'

import { useActionState, useState } from 'react'
import { ART_NAMEN, ARTEN, ORT_NAMEN, ORTE, STATUS, STATUS_NAMEN, type BuchungArt, type BuchungOrt, type BuchungStatus } from '@/lib/buchungen/zeit'
import { erfolg } from '@/lib/verwaltung/formular'
import { neuererStand, type AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { STATUS_FARBEN } from '@/components/verwaltung/buchungen/Anzeige'
import { auswahlKlasse, eingabeKlasse, Feld, Karte } from '@/components/verwaltung/ui'
import { useFormularGeaendert, useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { buchungSichern } from './aktionen'

export interface BuchungFormDaten {
  id: number
  status: BuchungStatus
  art: BuchungArt
  ort: BuchungOrt
  titel: string
  datum: string
  beginn: string
  ende: string
  bisDatum: string
  ganztaegig: boolean
  personenzahl: number | null
  bereich: string
  name: string
  email: string
  telefon: string
  nachricht: string
  rueckmeldung: string
  notiz: string
  /** Kontaktdaten wurden ein Jahr nach der Belegung gelöscht */
  anonymisiert: boolean
  geaendertAm: string
}

const LEER_ERGEBNIS: AktionsErgebnis = {}

const STATUS_HINWEIS: Record<BuchungStatus, string> = {
  angefragt: 'Neu, noch nicht entschieden',
  rueckfrage: 'Wir klären noch etwas',
  bestaetigt: 'Zugesagt',
  abgelehnt: 'Abgesagt, findet nicht statt',
  storniert: 'Abgesagt nach Zusage',
}

export default function BuchungFormular({
  buchung,
  datumVorschlag,
  hinweis,
  mailEingerichtet = false,
}: {
  /** null = neue Belegung */
  buchung: BuchungFormDaten | null
  /** Vorbelegung für neue Belegungen, z. B. aus dem Kalender */
  datumVorschlag?: string
  hinweis?: string
  /** Ist der E-Mail-Versand (SMTP) eingerichtet? Dann kann die buchende Person benachrichtigt werden. */
  mailEingerichtet?: boolean
}) {
  const [ergebnis, speichern] = useActionState(buchungSichern, LEER_ERGEBNIS)
  const stand = neuererStand(buchung?.geaendertAm, ergebnis.stand)
  const [geaendert, merken] = useFormularGeaendert(stand)
  useUngespeichertWarnung(geaendert)
  const [ganztaegig, setGanztaegig] = useState(buchung?.ganztaegig ?? false)
  const [art, setArt] = useState<BuchungArt>(buchung?.art ?? 'verein')
  const [status, setStatus] = useState<BuchungStatus>(buchung?.status ?? 'bestaetigt')
  const [benachrichtigen, setBenachrichtigen] = useState(true)
  // Benachrichtigen geht nur bei bestehenden Buchungen mit E-Mail-Adresse – und ist vorausgewählt, sobald sich der Status ändert.
  const kannBenachrichtigen = mailEingerichtet && !!buchung?.email && !buchung.anonymisiert
  const statusGeaendert = !!buchung && status !== buchung.status
  const f = ergebnis.felder ?? {}

  return (
    <form key={buchung?.geaendertAm ?? 'neu'} action={speichern} onReset={eingabenBehalten} onChange={merken} className="space-y-6">
      {buchung && <input type="hidden" name="id" value={buchung.id} />}
      <input type="hidden" name="stand" value={stand} />

      <Karte titel="Status" beschreibung="Die Rückmeldung steht zusammen mit dem Status auf der öffentlichen Statusseite.">
        <fieldset>
          <legend className="sr-only">Status</legend>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
            {STATUS.map(s => (
              <label
                key={s}
                className={`flex flex-col gap-0.5 border rounded-sm p-3 cursor-pointer ${
                  status === s ? `border-[#0a0a0a] ${STATUS_FARBEN[s].replace('line-through', '')}` : 'border-[#0a0a0a]/15 hover:border-[#0a0a0a]/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="w-4 h-4" />
                  <span className="font-medium text-sm">{STATUS_NAMEN[s]}</span>
                </span>
                <span className="text-xs opacity-75">{STATUS_HINWEIS[s]}</span>
              </label>
            ))}
          </div>
          {f.status && <p className="mt-1.5 text-sm text-red-700">{f.status}</p>}
        </fieldset>
        <Feld
          label="Rückmeldung an die buchende Person"
          htmlFor="rueckmeldung"
          fehler={f.rueckmeldung}
          className="mt-5"
          hinweis="Zum Beispiel „Schlüssel bitte am Vortag abholen“ oder „An dem Tag ist leider schon Heimspiel“. Die Statusseite kann jede:r mit Nummer und Datum öffnen – deshalb hier keine Namen, Telefonnummern oder Adressen."
        >
          <textarea id="rueckmeldung" name="rueckmeldung" rows={3} maxLength={2000} defaultValue={buchung?.rueckmeldung ?? ''} className={eingabeKlasse} />
        </Feld>
        {kannBenachrichtigen && (
          <label className="mt-4 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="benachrichtigen"
              value="1"
              checked={statusGeaendert && benachrichtigen}
              disabled={!statusGeaendert}
              onChange={e => setBenachrichtigen(e.target.checked)}
              className="mt-0.5 w-5 h-5"
            />
            <span className="text-sm">
              Beim Speichern eine E-Mail mit Status und Rückmeldung an {buchung?.email} schicken
              <span className="block text-xs text-[#6b6b6b]">
                {statusGeaendert ? 'Absender ist das Postfach der Buchungen; Antworten landen dort.' : 'Geht, sobald du den Status änderst.'}
              </span>
            </span>
          </label>
        )}
      </Karte>

      <Karte titel="Belegung">
        <div className="grid gap-5 sm:grid-cols-2">
          <Feld label="Anlass" htmlFor="titel" fehler={f.titel} className="sm:col-span-2" hinweis="Steht im Kalender, z. B. „Elternabend U11“ oder „Geburtstagsfeier“.">
            <input id="titel" name="titel" required maxLength={150} defaultValue={buchung?.titel ?? ''} className={`${eingabeKlasse} text-lg`} />
          </Feld>

          <fieldset className="sm:col-span-2">
            <legend className="block text-sm font-medium mb-1.5">Ort</legend>
            <div className="flex flex-wrap gap-2">
              {ORTE.map(o => (
                <label key={o} className="flex items-center gap-2 border border-[#0a0a0a]/15 rounded-sm px-3 py-2.5 cursor-pointer has-[:checked]:border-[#0a0a0a] has-[:checked]:bg-[#0a0a0a]/[0.03]">
                  <input type="radio" name="ort" value={o} defaultChecked={(buchung?.ort ?? 'vereinsheim') === o} className="w-4 h-4" />
                  <span className="text-sm">{ORT_NAMEN[o]}</span>
                </label>
              ))}
            </div>
            {f.ort && <p className="mt-1.5 text-sm text-red-700">{f.ort}</p>}
          </fieldset>

          <Feld label="Datum" htmlFor="datum" fehler={f.datum}>
            <input id="datum" name="datum" type="date" required defaultValue={buchung?.datum ?? datumVorschlag ?? ''} className={eingabeKlasse} />
          </Feld>
          <label className="flex items-center gap-3 self-end pb-2.5 cursor-pointer">
            <input type="checkbox" name="ganztaegig" value="1" checked={ganztaegig} onChange={e => setGanztaegig(e.target.checked)} className="w-5 h-5" />
            <span className="text-sm">Ganztägig</span>
          </label>

          {!ganztaegig && (
            <>
              <Feld label="Beginn" htmlFor="beginn" fehler={f.beginn}>
                <input id="beginn" name="beginn" type="time" required defaultValue={buchung?.beginn ?? ''} className={eingabeKlasse} />
              </Feld>
              <Feld label="Ende" htmlFor="ende" fehler={f.ende} hinweis="Liegt das Ende vor dem Beginn (z. B. 20:00–02:00), endet die Belegung am nächsten Tag.">
                <input id="ende" name="ende" type="time" required defaultValue={buchung?.ende ?? ''} className={eingabeKlasse} />
              </Feld>
            </>
          )}
          <Feld
            label="Endet am (nur bei mehreren Tagen)"
            htmlFor="bisDatum"
            fehler={f.bisDatum}
            hinweis={ganztaegig ? 'Letzter Tag, z. B. bei einem Camp von Montag bis Freitag.' : 'Leer lassen, wenn die Belegung am selben Tag (oder in der Nacht danach) endet.'}
          >
            <input id="bisDatum" name="bisDatum" type="date" defaultValue={buchung?.bisDatum ?? ''} className={eingabeKlasse} />
          </Feld>
          <Feld label="Personen (ungefähr)" htmlFor="personenzahl" fehler={f.personenzahl}>
            <input
              id="personenzahl"
              name="personenzahl"
              type="number"
              min={1}
              inputMode="numeric"
              defaultValue={buchung?.personenzahl ?? ''}
              className={eingabeKlasse}
            />
          </Feld>
        </div>
      </Karte>

      <Karte titel="Wer bucht?">
        <div className="grid gap-5 sm:grid-cols-2">
          <Feld label="Art" htmlFor="art" fehler={f.art} hinweis="„Verein (intern)“ für Belegungen des Vereins selbst – Vorstandssitzung, Lehrgang, Saisonabschluss.">
            <select id="art" name="art" value={art} onChange={e => setArt(e.target.value as BuchungArt)} className={auswahlKlasse}>
              {ARTEN.map(a => (
                <option key={a} value={a}>
                  {ART_NAMEN[a]}
                </option>
              ))}
            </select>
          </Feld>
          <Feld label={art === 'extern' ? 'Verein oder Firma' : 'Sparte oder Mannschaft'} htmlFor="bereich" fehler={f.bereich}>
            <input id="bereich" name="bereich" maxLength={150} defaultValue={buchung?.bereich ?? ''} className={eingabeKlasse} />
          </Feld>
          {buchung?.anonymisiert ? (
            <p className="sm:col-span-2 text-sm text-[#6b6b6b]">Name, E-Mail, Telefon und Nachricht wurden ein Jahr nach der Belegung gelöscht.</p>
          ) : (
            <>
              <Feld label={art === 'verein' ? 'Ansprechperson (optional)' : 'Name'} htmlFor="name" fehler={f.name}>
                <input id="name" name="name" maxLength={150} required={art !== 'verein'} defaultValue={buchung?.name ?? ''} className={eingabeKlasse} />
              </Feld>
              <Feld label="E-Mail" htmlFor="email" fehler={f.email}>
                <input id="email" name="email" type="email" maxLength={200} defaultValue={buchung?.email ?? ''} className={eingabeKlasse} />
              </Feld>
              <Feld label="Telefon" htmlFor="telefon" fehler={f.telefon}>
                <input id="telefon" name="telefon" type="tel" maxLength={50} defaultValue={buchung?.telefon ?? ''} className={eingabeKlasse} />
              </Feld>
              <Feld label="Nachricht der buchenden Person" htmlFor="nachricht" fehler={f.nachricht} className="sm:col-span-2">
                <textarea id="nachricht" name="nachricht" rows={3} maxLength={3000} defaultValue={buchung?.nachricht ?? ''} className={eingabeKlasse} />
              </Feld>
            </>
          )}
        </div>
      </Karte>

      <Karte titel="Interne Notiz" beschreibung="Nur hier in der Verwaltung sichtbar – z. B. Miete, Kaution, Schlüsselübergabe.">
        <textarea id="notiz" name="notiz" aria-label="Interne Notiz" rows={3} maxLength={3000} defaultValue={buchung?.notiz ?? ''} className={eingabeKlasse} />
        {f.notiz && <p className="mt-1.5 text-sm text-red-700">{f.notiz}</p>}
      </Karte>

      <SpeicherLeiste
        geaendert={geaendert}
        ergebnis={hinweis && !ergebnis.meldung ? erfolg(hinweis) : ergebnis}
        knopfText={buchung ? 'Speichern' : 'Belegung eintragen'}
      />
    </form>
  )
}
