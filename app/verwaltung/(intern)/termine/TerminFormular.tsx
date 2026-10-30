'use client'

import { useActionState } from 'react'
import { erfolg } from '@/lib/verwaltung/formular'
import { neuererStand, type AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import BildFeld from '@/components/verwaltung/inhalte/BildFeld'
import LoeschenFormular from '@/components/verwaltung/inhalte/LoeschenFormular'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { auswahlKlasse, eingabeKlasse, Feld, Karte } from '@/components/verwaltung/ui'
import { useFormularGeaendert, useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { terminEntfernen, terminSichern } from './aktionen'

export interface TerminFormDaten {
  id: number
  titel: string
  datum: string
  uhrzeit: string
  ort: string
  beschreibung: string
  bereich: string
  sparteId: number | null
  tags: string[]
  bildUrl: string | null
  geaendertAm: string
}

const LEER_ERGEBNIS: AktionsErgebnis = {}

export default function TerminFormular({
  termin,
  sparten,
  ohneSparteErlaubt,
  bereiche,
  tags,
  hinweis,
}: {
  /** null = neuer Termin */
  termin: TerminFormDaten | null
  /** Sparten, die der Zugang wählen darf */
  sparten: { id: number; name: string }[]
  /** Nur Admins dürfen Termine ohne Sparte (Gesamtverein) anlegen */
  ohneSparteErlaubt: boolean
  bereiche: string[]
  tags: string[]
  hinweis?: string
}) {
  const [ergebnis, speichern] = useActionState(terminSichern, LEER_ERGEBNIS)
  const stand = neuererStand(termin?.geaendertAm, ergebnis.stand)
  const [geaendert, merken] = useFormularGeaendert(stand)
  useUngespeichertWarnung(geaendert)
  const f = ergebnis.felder ?? {}

  return (
    <div className="space-y-6">
      <form key={termin?.geaendertAm ?? 'neu'} action={speichern} onReset={eingabenBehalten} onChange={merken} className="space-y-6">
        {termin && <input type="hidden" name="id" value={termin.id} />}
        <input type="hidden" name="stand" value={stand} />

        <Karte titel="Termin">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Titel" htmlFor="titel" fehler={f.titel} className="sm:col-span-2">
              <input id="titel" name="titel" required maxLength={200} defaultValue={termin?.titel ?? ''} className={`${eingabeKlasse} text-lg`} />
            </Feld>
            <Feld label="Datum" htmlFor="datum" fehler={f.datum}>
              <input id="datum" name="datum" type="date" required defaultValue={termin?.datum ?? ''} className={eingabeKlasse} />
            </Feld>
            <Feld label="Uhrzeit" htmlFor="uhrzeit" hinweis="Zum Beispiel „18:30“, „10:00–13:00“ oder „ganztägig“.">
              <input id="uhrzeit" name="uhrzeit" defaultValue={termin?.uhrzeit ?? ''} placeholder="18:30" className={eingabeKlasse} />
            </Feld>
            <Feld label="Ort" htmlFor="ort" className="sm:col-span-2">
              <input id="ort" name="ort" defaultValue={termin?.ort ?? ''} placeholder="z. B. Sportplatz Holm-Seppensen" className={eingabeKlasse} />
            </Feld>
            <Feld label="Beschreibung" htmlFor="beschreibung" className="sm:col-span-2">
              <textarea id="beschreibung" name="beschreibung" rows={5} defaultValue={termin?.beschreibung ?? ''} className={eingabeKlasse} />
            </Feld>
          </div>
        </Karte>

        <Karte titel="Einordnung">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Sparte" htmlFor="sparteId" fehler={f.sparteId} hinweis="Bestimmt, wer den Termin später bearbeiten darf.">
              <select
                id="sparteId"
                name="sparteId"
                defaultValue={termin?.sparteId != null ? String(termin.sparteId) : ohneSparteErlaubt ? '' : String(sparten[0]?.id ?? '')}
                className={auswahlKlasse}
              >
                {ohneSparteErlaubt && <option value="">Keine Sparte (ganzer Verein)</option>}
                {sparten.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Feld>
            <Feld label="Bereich (Anzeige auf der Website)" htmlFor="bereich" hinweis="Zum Beispiel „Gesamtverein“ oder „Herren“. Leer = Name der Sparte.">
              <input id="bereich" name="bereich" list="termin-bereiche" defaultValue={termin?.bereich ?? ''} className={eingabeKlasse} />
              <datalist id="termin-bereiche">
                {bereiche.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Feld>
            <Feld
              label="Stichwörter"
              htmlFor="tags"
              className="sm:col-span-2"
              hinweis={
                <>
                  Mehrere mit Komma trennen, z. B. „Familie, Kinder“.
                  {tags.length > 0 && <> Bisher verwendet: {tags.join(', ')}.</>}
                </>
              }
            >
              <input id="tags" name="tags" defaultValue={termin?.tags.join(', ') ?? ''} className={eingabeKlasse} />
            </Feld>
          </div>
        </Karte>

        <Karte titel="Bild" beschreibung="Optional, zum Beispiel ein Plakat oder Foto.">
          <BildFeld aktuell={termin?.bildUrl ?? null} onAenderung={merken} />
          {f.bild && <p className="mt-2 text-sm text-red-700">{f.bild}</p>}
        </Karte>

        <SpeicherLeiste geaendert={geaendert} ergebnis={hinweis && !ergebnis.meldung ? erfolg(hinweis) : ergebnis} />
      </form>

      {termin && (
        <div className="pt-6 border-t border-[#0a0a0a]/10">
          <LoeschenFormular aktion={terminEntfernen} id={termin.id} frage={`Den Termin „${termin.titel}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`}>
            Termin löschen
          </LoeschenFormular>
        </div>
      )}
    </div>
  )
}
