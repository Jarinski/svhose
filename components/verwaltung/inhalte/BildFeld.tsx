'use client'

/**
 * Bild auswählen, zuschneiden, ansehen und entfernen – für News, Termine und die Chronik.
 * Schickt die Datei im Feld `name` mit; "Bild entfernen" setzt das versteckte Feld `entfernenName` auf "1".
 * Hochgeladen wird erst beim Speichern des Formulars.
 * Mit `zuschnitt` öffnet sich nach der Auswahl ein Dialog, in dem das Bild auf dieses Seitenverhältnis
 * zugeschnitten wird; die zugeschnittene Datei ersetzt dann die gewählte im Dateifeld.
 */

import { useEffect, useRef, useState } from 'react'
import { Crop, ImagePlus, Trash2, Undo2 } from 'lucide-react'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { knopfKlassen } from '@/components/verwaltung/ui'
import BildZuschnitt from './BildZuschnitt'

export default function BildFeld({
  aktuell,
  name = 'bild',
  entfernenName = 'bildEntfernen',
  id,
  zuschnitt,
  onAenderung,
  onAnzeige,
}: {
  /** URL des gespeicherten Bildes oder null */
  aktuell: string | null
  name?: string
  entfernenName?: string
  id?: string
  /** Seitenverhältnis (Breite / Höhe), auf das sich das Bild zuschneiden lässt. Ohne Angabe gibt es keinen Zuschnitt. */
  zuschnitt?: number
  /** Meldet Änderungen ohne Eingabe-Ereignis ("Bild entfernen", "Rückgängig", Zuschnitt) – z. B. für useFormularGeaendert. */
  onAenderung?: () => void
  /** Meldet die Adresse des angezeigten Bildes (gespeichert, neu gewählt oder null) – z. B. für eine Vorschau der Seite. */
  onAnzeige?: (url: string | null) => void
}) {
  const eingabe = useRef<HTMLInputElement>(null)
  /** Die Datei, die gerade im Dateifeld steckt – um sie wiederherzustellen, wenn ein Zuschnitt abgebrochen wird. */
  const imFeld = useRef<File | null>(null)
  const [vorschau, setVorschau] = useState<string | null>(null)
  /** Das gewählte Bild vor dem Zuschnitt – damit sich der Zuschnitt später noch einmal ändern lässt. */
  const [original, setOriginal] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ quelle: string; neu: boolean } | null>(null)
  const [entfernt, setEntfernt] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)

  // Lokale Vorschau-Adressen wieder freigeben
  useEffect(() => {
    return () => {
      if (vorschau) URL.revokeObjectURL(vorschau)
    }
  }, [vorschau])
  useEffect(() => {
    return () => {
      if (original) URL.revokeObjectURL(original)
    }
  }, [original])

  const angezeigt = vorschau ?? (entfernt ? null : aktuell)

  // Nur bei einer neuen Adresse melden – der Aufrufer übergibt meist bei jedem Rendern eine neue Funktion.
  const anzeigeMelden = useRef(onAnzeige)
  anzeigeMelden.current = onAnzeige
  useEffect(() => {
    anzeigeMelden.current?.(angezeigt)
  }, [angezeigt])

  /** Legt eine Datei ins Dateifeld (null leert es). */
  function dateiSetzen(datei: File | null) {
    const feld = eingabe.current
    if (!feld) return
    if (datei) {
      const liste = new DataTransfer()
      liste.items.add(datei)
      feld.files = liste.files
    } else {
      feld.value = ''
    }
    imFeld.current = datei
  }

  function auswahlLeeren() {
    dateiSetzen(null)
    setVorschau(null)
    setOriginal(null)
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
    if (datei && zuschnitt) {
      // Erst mit dem Zuschnitt (oder "Ohne Zuschneiden") zählt das Bild als Änderung
      ev.stopPropagation()
      setDialog({ quelle: URL.createObjectURL(datei), neu: true })
      return
    }
    imFeld.current = datei ?? null
    setVorschau(datei ? URL.createObjectURL(datei) : null)
  }

  function zugeschnitten(datei: File) {
    if (!dialog) return
    dateiSetzen(datei)
    // Neu gewähltes Bild als Quelle für einen späteren Zuschnitt merken
    if (dialog.neu) setOriginal(dialog.quelle)
    setVorschau(URL.createObjectURL(datei))
    setDialog(null)
    onAenderung?.()
  }

  function ohneZuschnitt() {
    // Die frisch gewählte Datei steckt noch im Dateifeld (imFeld hält erst die Datei davor)
    const datei = eingabe.current?.files?.[0]
    if (!dialog || !datei) return
    imFeld.current = datei
    setOriginal(dialog.quelle)
    setVorschau(URL.createObjectURL(datei))
    setDialog(null)
    onAenderung?.()
  }

  function zuschnittAbbrechen() {
    if (!dialog) return
    if (dialog.neu) {
      // Die frisch gewählte Datei verwerfen, vorher Gewähltes bleibt im Feld
      URL.revokeObjectURL(dialog.quelle)
      dateiSetzen(imFeld.current)
    }
    setDialog(null)
  }

  return (
    <div className="space-y-3">
      {angezeigt ? (
        zuschnitt ? (
          // So wie die News-Übersicht das Bild zeigt: auf das Seitenverhältnis zugeschnitten
          <div className="w-full max-w-md overflow-hidden rounded-sm border border-[#0a0a0a]/10" style={{ aspectRatio: zuschnitt }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={angezeigt} alt="Vorschau des Bildes" className="block h-full w-full object-cover" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={angezeigt} alt="Vorschau des Bildes" className="block max-h-72 w-auto max-w-full rounded-sm border border-[#0a0a0a]/10" />
        )
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
        {zuschnitt && angezeigt && (original ?? aktuell) && (
          <button type="button" className={knopfKlassen.sekundaer} onClick={() => setDialog({ quelle: (original ?? aktuell) as string, neu: false })}>
            <Crop size={15} /> Zuschneiden
          </button>
        )}
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

      {zuschnitt && angezeigt && <p className="text-xs text-[#6b6b6b]">So erscheint das Bild in der News-Übersicht.</p>}
      {vorschau && <p className="text-xs text-[#6b6b6b]">Neues Bild – wird beim Speichern hochgeladen.</p>}
      {entfernt && !vorschau && aktuell && <p className="text-xs text-[#6b6b6b]">Das Bild wird beim Speichern entfernt.</p>}
      {hinweis && <p className="text-sm text-red-700">{hinweis}</p>}

      {dialog && zuschnitt && (
        <BildZuschnitt
          key={dialog.quelle}
          quelle={dialog.quelle}
          verhaeltnis={zuschnitt}
          onUebernehmen={zugeschnitten}
          onOriginal={dialog.neu ? ohneZuschnitt : undefined}
          onAbbrechen={zuschnittAbbrechen}
        />
      )}
    </div>
  )
}
