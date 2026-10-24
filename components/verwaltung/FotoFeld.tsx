'use client'

/**
 * Foto-Feld für Formulare der Verwaltung: Vorschau, neues Foto wählen, Foto entfernen.
 * Schickt die Datei im Feld `name` (Standard "foto") und "fotoEntfernen" = "1" mit.
 * Das Bild wird erst beim Speichern hochgeladen.
 */

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Undo2 } from 'lucide-react'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { knopfKlassen } from './ui'

export default function FotoFeld({
  aktuell,
  name = 'foto',
  fehler,
  onAenderung,
  hochformat = false,
}: {
  /** URL des gespeicherten Fotos oder null */
  aktuell: string | null
  name?: string
  fehler?: string
  /** Meldet, ob gegenüber dem gespeicherten Stand etwas geändert wurde. */
  onAenderung?: (geaendert: boolean) => void
  /** Hochkant-Vorschau (z. B. für Personenfotos) */
  hochformat?: boolean
}) {
  const eingabe = useRef<HTMLInputElement>(null)
  const [neu, setNeu] = useState<{ url: string; name: string } | null>(null)
  const [vorschauKaputt, setVorschauKaputt] = useState(false)
  const [entfernen, setEntfernen] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)

  // Objekt-URL der Vorschau wieder freigeben
  useEffect(() => () => {
    if (neu) URL.revokeObjectURL(neu.url)
  }, [neu])

  useEffect(() => {
    onAenderung?.(neu !== null || entfernen)
  }, [neu, entfernen, onAenderung])

  function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0]
    setHinweis(null)
    if (!datei) {
      setNeu(null)
      return
    }
    if (datei.size > MAX_UPLOAD_BYTES) {
      e.target.value = ''
      setNeu(null)
      setHinweis('Das Bild ist größer als 15 MB. Bitte ein kleineres Bild wählen.')
      return
    }
    setVorschauKaputt(false)
    setEntfernen(false)
    setNeu({ url: URL.createObjectURL(datei), name: datei.name })
  }

  function auswahlZuruecknehmen() {
    if (eingabe.current) eingabe.current.value = ''
    setNeu(null)
  }

  const bild = neu ? neu.url : entfernen ? null : aktuell

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
      <div
        className={`${hochformat ? 'w-40 aspect-[3/4]' : 'w-full sm:w-56 aspect-[4/3]'} shrink-0 bg-[#f0f0ea] border border-[#0a0a0a]/10 rounded-sm overflow-hidden flex items-center justify-center`}
      >
        {bild && !(neu && vorschauKaputt) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bild} alt="Vorschau" className="w-full h-full object-cover" onError={() => neu && setVorschauKaputt(true)} />
        ) : (
          <span className="text-sm text-[#6b6b6b] px-3 text-center">
            {neu ? `Vorschau nicht möglich – „${neu.name}“ wird beim Speichern umgewandelt.` : entfernen ? 'Foto wird entfernt' : 'Kein Foto'}
          </span>
        )}
      </div>
      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap gap-2">
          <label className={`${knopfKlassen.sekundaer} cursor-pointer focus-within:ring-2 focus-within:ring-[#0a0a0a]`}>
            <ImagePlus size={16} />
            {bild || neu ? 'Anderes Foto wählen' : 'Foto hochladen'}
            <input ref={eingabe} type="file" name={name} accept="image/*" className="sr-only" onChange={dateiGewaehlt} />
          </label>
          {neu && (
            <button type="button" className={knopfKlassen.leise} onClick={auswahlZuruecknehmen}>
              <Undo2 size={15} /> Auswahl zurücknehmen
            </button>
          )}
          {!neu && aktuell && !entfernen && (
            <button type="button" className={knopfKlassen.leise} onClick={() => setEntfernen(true)}>
              <Trash2 size={15} /> Foto entfernen
            </button>
          )}
          {!neu && entfernen && (
            <button type="button" className={knopfKlassen.leise} onClick={() => setEntfernen(false)}>
              <Undo2 size={15} /> Doch behalten
            </button>
          )}
        </div>
        <input type="hidden" name="fotoEntfernen" value={entfernen && !neu ? '1' : ''} />
        {neu && <p className="text-sm text-[#0a0a0a]">Neues Foto ausgewählt – wird beim Speichern hochgeladen.</p>}
        {entfernen && !neu && <p className="text-sm text-[#0a0a0a]">Das Foto wird beim Speichern entfernt.</p>}
        {fehler || hinweis ? (
          <p className="text-sm text-red-700">{fehler ?? hinweis}</p>
        ) : (
          <p className="text-xs text-[#6b6b6b] leading-relaxed">JPG, PNG oder WebP bis 15 MB. Wird automatisch verkleinert; Standortdaten werden entfernt.</p>
        )}
      </div>
    </div>
  )
}
