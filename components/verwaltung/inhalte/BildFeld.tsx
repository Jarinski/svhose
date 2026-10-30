'use client'

/**
 * Bild auswählen, ansehen und entfernen – für News und Termine.
 * Schickt die Datei im Feld `name` mit; "Bild entfernen" setzt das versteckte Feld `entfernenName` auf "1".
 * Hochgeladen wird erst beim Speichern des Formulars.
 */

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Undo2 } from 'lucide-react'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { knopfKlassen } from '@/components/verwaltung/ui'

export default function BildFeld({
  aktuell,
  name = 'bild',
  entfernenName = 'bildEntfernen',
  id,
  onAenderung,
}: {
  /** URL des gespeicherten Bildes oder null */
  aktuell: string | null
  name?: string
  entfernenName?: string
  id?: string
  /** Meldet Änderungen ohne Eingabe-Ereignis ("Bild entfernen", "Rückgängig") – z. B. für useFormularGeaendert. */
  onAenderung?: () => void
}) {
  const eingabe = useRef<HTMLInputElement>(null)
  const [vorschau, setVorschau] = useState<string | null>(null)
  const [entfernt, setEntfernt] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)

  // Lokale Vorschau-Adresse wieder freigeben
  useEffect(() => {
    return () => {
      if (vorschau) URL.revokeObjectURL(vorschau)
    }
  }, [vorschau])

  const angezeigt = vorschau ?? (entfernt ? null : aktuell)

  function auswahlLeeren() {
    if (eingabe.current) eingabe.current.value = ''
    setVorschau(null)
  }

  function dateiGewaehlt(ev: React.ChangeEvent<HTMLInputElement>) {
    const datei = ev.target.files?.[0]
    setHinweis(null)
    // Größere Dateien nimmt der Server nicht an – sofort verwerfen statt beim Speichern abzubrechen
    if (datei && datei.size > MAX_UPLOAD_BYTES) {
      ev.target.value = ''
      setVorschau(null)
      setHinweis('Das Bild ist größer als 15 MB. Bitte ein kleineres Bild wählen.')
      // Verworfene Datei zählt nicht als Änderung (das Formular hört auf onChange)
      ev.stopPropagation()
      return
    }
    setVorschau(datei ? URL.createObjectURL(datei) : null)
  }

  return (
    <div className="space-y-3">
      {angezeigt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={angezeigt} alt="Vorschau des Bildes" className="block max-h-72 w-auto max-w-full rounded-sm border border-[#0a0a0a]/10" />
      ) : (
        <div className="flex items-center justify-center h-32 rounded-sm border border-dashed border-[#0a0a0a]/20 text-sm text-[#6b6b6b]">
          Kein Bild
        </div>
      )}

      <input type="hidden" name={entfernenName} value={entfernt && !vorschau ? '1' : ''} />

      <div className="flex flex-wrap items-center gap-2">
        <label className={`${knopfKlassen.sekundaer} cursor-pointer focus-within:ring-2 focus-within:ring-[#0a0a0a]`}>
          <ImagePlus size={15} />
          {angezeigt ? 'Anderes Bild wählen' : 'Bild auswählen'}
          <input
            ref={eingabe}
            id={id}
            type="file"
            name={name}
            accept="image/*"
            className="sr-only"
            onChange={dateiGewaehlt}
          />
        </label>
        {angezeigt && (
          <button
            type="button"
            className={knopfKlassen.leise}
            onClick={() => {
              auswahlLeeren()
              setHinweis(null)
              if (aktuell) setEntfernt(true)
              onAenderung?.()
            }}
          >
            <Trash2 size={15} /> Bild entfernen
          </button>
        )}
        {entfernt && !vorschau && aktuell && (
          <button
            type="button"
            className={knopfKlassen.leise}
            onClick={() => {
              setEntfernt(false)
              onAenderung?.()
            }}
          >
            <Undo2 size={15} /> Rückgängig
          </button>
        )}
      </div>

      {vorschau && <p className="text-xs text-[#6b6b6b]">Neues Bild – wird beim Speichern hochgeladen.</p>}
      {entfernt && !vorschau && aktuell && <p className="text-xs text-[#6b6b6b]">Das Bild wird beim Speichern entfernt.</p>}
      {hinweis && <p className="text-sm text-red-700">{hinweis}</p>}
    </div>
  )
}
