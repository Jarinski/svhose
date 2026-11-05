'use client'

import { useActionState, useState } from 'react'
import { ORT_NAMEN, ORTE, WOCHENTAGE_LANG, type BuchungOrt } from '@/lib/buchungen/zeit'
import { neuererStand, type AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import LoeschenFormular from '@/components/verwaltung/inhalte/LoeschenFormular'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { auswahlKlasse, eingabeKlasse, Feld, Karte } from '@/components/verwaltung/ui'
import { useFormularGeaendert, useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { regelEntfernen, regelSichern } from '../aktionen'

export interface RegelFormDaten {
  id: number
  titel: string
  ort: BuchungOrt
  wochentag: number
  beginn: string
  ende: string
  gueltigAb: string
  gueltigBis: string
  hinweis: string
  geaendertAm: string
}

const LEER_ERGEBNIS: AktionsErgebnis = {}

export default function RegelFormular({ regel }: { regel: RegelFormDaten | null }) {
  const [ergebnis, speichern] = useActionState(regelSichern, LEER_ERGEBNIS)
  const stand = neuererStand(regel?.geaendertAm, ergebnis.stand)
  const [geaendert, merken] = useFormularGeaendert(stand)
  useUngespeichertWarnung(geaendert)
  const [ganztaegig, setGanztaegig] = useState(!!regel && regel.beginn === '00:00' && regel.ende === '00:00')
  const f = ergebnis.felder ?? {}

  return (
    <div className="space-y-6">
      <form key={regel?.geaendertAm ?? 'neu'} action={speichern} onReset={eingabenBehalten} onChange={merken} className="space-y-6">
        {regel && <input type="hidden" name="id" value={regel.id} />}
        <input type="hidden" name="stand" value={stand} />
        <Karte titel="Jede Woche">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Was findet statt?" htmlFor="titel" fehler={f.titel} className="sm:col-span-2" hinweis="Zum Beispiel „Dart“, „Yoga“, „J4f“ oder „Fußball-Training“.">
              <input id="titel" name="titel" required maxLength={100} defaultValue={regel?.titel ?? ''} className={`${eingabeKlasse} text-lg`} />
            </Feld>
            <fieldset className="sm:col-span-2">
              <legend className="block text-sm font-medium mb-1.5">Ort</legend>
              <div className="flex flex-wrap gap-2">
                {ORTE.map(o => (
                  <label key={o} className="flex items-center gap-2 border border-[#0a0a0a]/15 rounded-sm px-3 py-2.5 cursor-pointer has-[:checked]:border-[#0a0a0a] has-[:checked]:bg-[#0a0a0a]/[0.03]">
                    <input type="radio" name="ort" value={o} defaultChecked={(regel?.ort ?? 'vereinsheim') === o} className="w-4 h-4" />
                    <span className="text-sm">{ORT_NAMEN[o]}</span>
                  </label>
                ))}
              </div>
              {f.ort && <p className="mt-1.5 text-sm text-red-700">{f.ort}</p>}
            </fieldset>
            <Feld label="Wochentag" htmlFor="wochentag" fehler={f.wochentag}>
              <select id="wochentag" name="wochentag" defaultValue={String(regel?.wochentag ?? 1)} className={auswahlKlasse}>
                {WOCHENTAGE_LANG.map((w, i) => (
                  <option key={w} value={i + 1}>
                    {w}
                  </option>
                ))}
              </select>
            </Feld>
            <label className="flex items-center gap-3 self-end pb-2.5 cursor-pointer">
              <input type="checkbox" name="ganztaegig" value="1" checked={ganztaegig} onChange={e => setGanztaegig(e.target.checked)} className="w-5 h-5" />
              <span className="text-sm">Ganztägig</span>
            </label>
            {!ganztaegig && (
              <>
                <Feld label="Beginn" htmlFor="beginn" fehler={f.beginn}>
                  <input id="beginn" name="beginn" type="time" required defaultValue={regel?.beginn ?? ''} className={eingabeKlasse} />
                </Feld>
                <Feld label="Ende" htmlFor="ende" fehler={f.ende} hinweis="„00:00“ = bis Mitternacht. Liegt das Ende vor dem Beginn, geht es bis in den nächsten Tag.">
                  <input id="ende" name="ende" type="time" required defaultValue={regel?.ende ?? ''} className={eingabeKlasse} />
                </Feld>
              </>
            )}
          </div>
        </Karte>
        <Karte titel="Gültig" beschreibung="Optional – z. B. nur in der Sommersaison. Leer = immer.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Ab" htmlFor="gueltigAb" fehler={f.gueltigAb}>
              <input id="gueltigAb" name="gueltigAb" type="date" defaultValue={regel?.gueltigAb ?? ''} className={eingabeKlasse} />
            </Feld>
            <Feld label="Bis" htmlFor="gueltigBis" fehler={f.gueltigBis}>
              <input id="gueltigBis" name="gueltigBis" type="date" defaultValue={regel?.gueltigBis ?? ''} className={eingabeKlasse} />
            </Feld>
            <Feld label="Hinweis (intern)" htmlFor="hinweis" fehler={f.hinweis} className="sm:col-span-2">
              <input id="hinweis" name="hinweis" maxLength={300} defaultValue={regel?.hinweis ?? ''} className={eingabeKlasse} />
            </Feld>
          </div>
        </Karte>
        <SpeicherLeiste geaendert={geaendert} ergebnis={ergebnis} knopfText={regel ? 'Speichern' : 'Regelbelegung anlegen'} />
      </form>
      {regel && (
        <div className="pt-6 border-t border-[#0a0a0a]/10">
          <LoeschenFormular aktion={regelEntfernen} id={regel.id} frage={`„${regel.titel}“ wirklich aus der Regelbelegung löschen? Auch die eingetragenen Ausfälle gehen verloren.`}>
            Regelbelegung löschen
          </LoeschenFormular>
        </div>
      )}
    </div>
  )
}
