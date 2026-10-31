'use client'

import { useActionState, useState } from 'react'
import { ExternalLink, FileUp } from 'lucide-react'
import { erfolg } from '@/lib/verwaltung/formular'
import { neuererStand, type AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import LoeschenFormular from '@/components/verwaltung/inhalte/LoeschenFormular'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { auswahlKlasse, eingabeKlasse, Feld, Karte, knopfKlassen } from '@/components/verwaltung/ui'
import { useFormularGeaendert, useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
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
  const stand = neuererStand(download?.geaendertAm, ergebnis.stand)
  const [geaendert, merken] = useFormularGeaendert(stand)
  useUngespeichertWarnung(geaendert)
  const f = ergebnis.felder ?? {}

  return (
    <div className="space-y-6">
      <form key={download?.geaendertAm ?? 'neu'} action={speichern} onReset={eingabenBehalten} onChange={merken} className="space-y-6">
        {download && <input type="hidden" name="id" value={download.id} />}
        <input type="hidden" name="stand" value={stand} />

        <Karte titel="PDF-Datei">
          <PdfFeld download={download} fehler={f.datei} />
        </Karte>

        <Karte titel="Angaben">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Titel" htmlFor="titel" fehler={f.titel} className="sm:col-span-2">
              <input id="titel" name="titel" required maxLength={200} defaultValue={download?.titel ?? ''} className={`${eingabeKlasse} text-lg`} />
            </Feld>
            <Feld label="Beschreibung" htmlFor="beschreibung" className="sm:col-span-2">
              <textarea id="beschreibung" name="beschreibung" rows={3} defaultValue={download?.beschreibung ?? ''} className={eingabeKlasse} />
            </Feld>
            <Feld label="Kategorie" htmlFor="kategorie" hinweis="Zum Beispiel „Mitgliedschaft“ – eintippen oder Vorschlag wählen. Mit „Förderverein“ erscheint der Download auch unter Förderverein → Mitglied werden.">
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

        <SpeicherLeiste geaendert={geaendert} ergebnis={hinweis && !ergebnis.meldung ? erfolg(hinweis) : ergebnis} />
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

/** PDF wählen oder ersetzen. Steht im Formular und startet mit ihm nach dem Speichern frisch (key). */
function PdfFeld({ download, fehler }: { download: DownloadFormDaten | null; fehler?: string }) {
  const [dateiname, setDateiname] = useState<string | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)

  function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0]
    setHinweis(null)
    // Größere Dateien nimmt der Server nicht an – sofort verwerfen statt beim Speichern abzubrechen
    if (datei && datei.size > MAX_UPLOAD_BYTES) {
      e.target.value = ''
      setDateiname(null)
      setHinweis('Die Datei ist größer als 15 MB. Bitte eine kleinere Datei wählen.')
      // Verworfene Datei zählt nicht als Änderung (das Formular hört auf onChange)
      e.stopPropagation()
      return
    }
    setDateiname(datei?.name ?? null)
  }

  return (
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
          <input type="file" name="datei" accept="application/pdf,.pdf" className="sr-only" onChange={dateiGewaehlt} />
        </label>
        {dateiname && <span className="text-sm text-[#4a4a4a] break-all">{dateiname}</span>}
      </div>
      {hinweis || fehler ? (
        <p className="text-sm text-red-700">{hinweis ?? fehler}</p>
      ) : (
        <p className="text-xs text-[#6b6b6b]">
          {download ? 'Die neue Datei ersetzt die bisherige beim Speichern.' : 'Nur PDF, höchstens 15 MB.'}
        </p>
      )}
    </div>
  )
}
