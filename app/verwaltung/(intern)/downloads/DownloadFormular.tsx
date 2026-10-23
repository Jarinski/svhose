'use client'

import { useActionState, useState } from 'react'
import { ExternalLink, FileUp } from 'lucide-react'
import { neuererStand, type AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import LoeschenFormular from '@/components/verwaltung/inhalte/LoeschenFormular'
import { auswahlKlasse, eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { downloadEntfernen, downloadSichern } from './aktionen'

export interface DownloadFormDaten {
  id: number
  titel: string
  beschreibung: string
  kategorie: string
  datum: string
  sparteId: number | null
  /** URL der gespeicherten PDF-Datei */
  dateiUrl: string
  dateiName: string
  geaendertAm: string
}

const LEER_ERGEBNIS: AktionsErgebnis = {}

export default function DownloadFormular({
  download,
  sparten,
  kategorien,
  hinweis,
}: {
  /** null = neuer Download */
  download: DownloadFormDaten | null
  sparten: { id: number; name: string }[]
  kategorien: string[]
  hinweis?: string
}) {
  const [ergebnis, speichern] = useActionState(downloadSichern, LEER_ERGEBNIS)
  const [dateiname, setDateiname] = useState<string | null>(null)
  const f = ergebnis.felder ?? {}

  return (
    <div className="space-y-6">
      <form key={download?.geaendertAm ?? 'neu'} action={speichern} onReset={eingabenBehalten} className="space-y-6">
        {download && <input type="hidden" name="id" value={download.id} />}
        <input type="hidden" name="stand" value={neuererStand(download?.geaendertAm, ergebnis.stand)} />

        <Karte titel="PDF-Datei">
          <div className="space-y-3">
            {download && (
              <a href={download.dateiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4 break-all">
                {download.dateiName} <ExternalLink size={13} className="shrink-0" />
              </a>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <label className={`${knopfKlassen.sekundaer} cursor-pointer focus-within:ring-2 focus-within:ring-[#0a0a0a]`}>
                <FileUp size={15} />
                {download ? 'Datei ersetzen' : 'PDF auswählen'}
                <input
                  type="file"
                  name="datei"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={e => setDateiname(e.target.files?.[0]?.name ?? null)}
                />
              </label>
              {dateiname && <span className="text-sm text-[#4a4a4a] break-all">{dateiname}</span>}
            </div>
            {f.datei ? (
              <p className="text-sm text-red-700">{f.datei}</p>
            ) : (
              <p className="text-xs text-[#6b6b6b]">
                {download ? 'Die neue Datei ersetzt die bisherige beim Speichern.' : 'Nur PDF, höchstens 15 MB.'}
              </p>
            )}
          </div>
        </Karte>

        <Karte titel="Angaben">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Titel" htmlFor="titel" fehler={f.titel} className="sm:col-span-2">
              <input id="titel" name="titel" required maxLength={200} defaultValue={download?.titel ?? ''} className={`${eingabeKlasse} text-lg`} />
            </Feld>
            <Feld label="Beschreibung" htmlFor="beschreibung" className="sm:col-span-2">
              <textarea id="beschreibung" name="beschreibung" rows={3} defaultValue={download?.beschreibung ?? ''} className={eingabeKlasse} />
            </Feld>
            <Feld label="Kategorie" htmlFor="kategorie" hinweis="Zum Beispiel „Mitgliedschaft“ – eintippen oder Vorschlag wählen.">
              <input id="kategorie" name="kategorie" list="download-kategorien" defaultValue={download?.kategorie ?? ''} className={eingabeKlasse} />
              <datalist id="download-kategorien">
                {kategorien.map(k => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </Feld>
            <Feld label="Stand (Datum)" htmlFor="datum" fehler={f.datum} hinweis="Optional – z. B. das Datum der Fassung.">
              <input id="datum" name="datum" type="date" defaultValue={download?.datum ?? ''} className={eingabeKlasse} />
            </Feld>
            <Feld label="Sparte" htmlFor="sparteId" fehler={f.sparteId} hinweis="Optional – dann erscheint der Download auch auf der Seite der Sparte.">
              <select id="sparteId" name="sparteId" defaultValue={download?.sparteId != null ? String(download.sparteId) : ''} className={auswahlKlasse}>
                <option value="">Keine (ganzer Verein)</option>
                {sparten.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Feld>
          </div>
        </Karte>

        {hinweis && !ergebnis.meldung && <Meldung art="erfolg">{hinweis}</Meldung>}
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf className="w-full sm:w-auto py-3">Speichern</SpeichernKnopf>
      </form>

      {download && (
        <div className="pt-6 border-t border-[#0a0a0a]/10">
          <LoeschenFormular aktion={downloadEntfernen} id={download.id} frage={`Den Download „${download.titel}“ wirklich löschen? Die Datei verschwindet dann auch von der Website.`}>
            Download löschen
          </LoeschenFormular>
        </div>
      )}
    </div>
  )
}
