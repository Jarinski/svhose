'use client'

/**
 * Foto-Feld für Formulare der Verwaltung: Vorschau, neues Foto wählen, Foto entfernen.
 * Schickt die Datei im Feld `name` (Standard "foto") und "fotoEntfernen" = "1" mit.
 * Das Bild wird erst beim Speichern hochgeladen.
 *
 * Mit `ausschnitt` lässt sich zusätzlich wählen, welcher Teil des Fotos im Rahmen der Website zu
 * sehen ist (Feld "fotoAusschnitt", JSON aus lib/bild-ausschnitt.ts; leer = mittig). Das Foto selbst
 * bleibt dabei ganz.
 */

import { useEffect, useRef, useState } from 'react'
import { Crop, ImagePlus, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import AusschnittBild from '@/components/AusschnittBild'
import BildZuschnitt from '@/components/verwaltung/inhalte/BildZuschnitt'
import { ausschnittText, type Ausschnitt } from '@/lib/bild-ausschnitt'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { knopfKlassen } from './ui'

export default function FotoFeld({
  aktuell,
  name = 'foto',
  fehler,
  onAenderung,
  hochformat = false,
  ausschnitt,
}: {
  /** URL des gespeicherten Fotos oder null */
  aktuell: string | null
  name?: string
  fehler?: string
  /** Meldet, ob gegenüber dem gespeicherten Stand etwas geändert wurde. */
  onAenderung?: (geaendert: boolean) => void
  /** Hochkant-Vorschau (z. B. für Personenfotos) */
  hochformat?: boolean
  /** Ausschnitt für einen Rahmen mit festem Seitenverhältnis wählen lassen */
  ausschnitt?: {
    /** Breite / Höhe des Rahmens auf der Website */
    verhaeltnis: number
    /** Gespeicherter Ausschnitt oder null (mittig) */
    aktuell: Ausschnitt | null
    /** Wo der Ausschnitt zu sehen ist, z. B. "Der Rahmen zeigt das Foto auf der Spartenseite." */
    hinweis: string
  }
}) {
  const eingabe = useRef<HTMLInputElement>(null)
  const [neu, setNeu] = useState<{ url: string; name: string } | null>(null)
  const [vorschauKaputt, setVorschauKaputt] = useState(false)
  const [entfernen, setEntfernen] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [wahl, setWahl] = useState<Ausschnitt | null>(ausschnitt?.aktuell ?? null)
  const [dialogOffen, setDialogOffen] = useState(false)

  // Objekt-URL der Vorschau wieder freigeben
  useEffect(() => () => {
    if (neu) URL.revokeObjectURL(neu.url)
  }, [neu])

  const ausschnittGeaendert = ausschnitt != null && ausschnittText(wahl) !== ausschnittText(ausschnitt.aktuell)
  useEffect(() => {
    onAenderung?.(neu !== null || entfernen || ausschnittGeaendert)
  }, [neu, entfernen, ausschnittGeaendert, onAenderung])

  function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0]
    setHinweis(null)
    if (!datei) {
      setNeu(null)
      setWahl(ausschnitt?.aktuell ?? null)
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
    // Neues Foto: Ausschnitt gleich wählen lassen ("Abbrechen" = mittig)
    if (ausschnitt) {
      setWahl(null)
      // Formate, die der Browser nicht anzeigt (z. B. HEIC), wandelt erst der Server um
      if (/^image\/(jpeg|png|webp|gif|avif)$/.test(datei.type)) setDialogOffen(true)
    }
  }

  function auswahlZuruecknehmen() {
    if (eingabe.current) eingabe.current.value = ''
    setNeu(null)
    setWahl(ausschnitt?.aktuell ?? null)
  }

  const bild = neu ? neu.url : entfernen ? null : aktuell
  const vorschauMoeglich = bild != null && !(neu && vorschauKaputt)

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
      <div
        className={`${hochformat ? 'w-40 aspect-[3/4]' : ausschnitt ? 'w-full sm:w-64' : 'w-full sm:w-56 aspect-[4/3]'} shrink-0 bg-[#f0f0ea] border border-[#0a0a0a]/10 rounded-sm overflow-hidden flex items-center justify-center`}
        style={ausschnitt ? { aspectRatio: ausschnitt.verhaeltnis } : undefined}
      >
        {bild && vorschauMoeglich ? (
          <AusschnittBild src={bild} alt="Vorschau" ausschnitt={ausschnitt ? wahl : null} onError={() => neu && setVorschauKaputt(true)} />
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
          {ausschnitt && vorschauMoeglich && (
            <button type="button" className={knopfKlassen.sekundaer} onClick={() => setDialogOffen(true)}>
              <Crop size={15} /> Ausschnitt wählen
            </button>
          )}
          {ausschnitt && vorschauMoeglich && wahl && (
            <button type="button" className={knopfKlassen.leise} onClick={() => setWahl(null)}>
              <RotateCcw size={15} /> Mittig
            </button>
          )}
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
        {ausschnitt && <input type="hidden" name="fotoAusschnitt" value={bild ? (ausschnittText(wahl) ?? '') : ''} />}
        {ausschnitt && vorschauMoeglich && <p className="text-xs text-[#6b6b6b]">{ausschnitt.hinweis}</p>}
        {neu && <p className="text-sm text-[#0a0a0a]">Neues Foto ausgewählt – wird beim Speichern hochgeladen.</p>}
        {entfernen && !neu && <p className="text-sm text-[#0a0a0a]">Das Foto wird beim Speichern entfernt.</p>}
        {fehler || hinweis ? (
          <p className="text-sm text-red-700">{fehler ?? hinweis}</p>
        ) : (
          <p className="text-xs text-[#6b6b6b] leading-relaxed">JPG, PNG oder WebP bis 15 MB. Wird automatisch verkleinert; Standortdaten werden entfernt.</p>
        )}
      </div>
      {dialogOffen && ausschnitt && bild && (
        <BildZuschnitt
          key={bild}
          quelle={bild}
          verhaeltnis={ausschnitt.verhaeltnis}
          start={wahl}
          hinweis={ausschnitt.hinweis}
          onAusschnitt={a => {
            setWahl(a)
            setDialogOffen(false)
          }}
          onAbbrechen={() => setDialogOffen(false)}
        />
      )}
    </div>
  )
}
