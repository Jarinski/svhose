'use client'

/**
 * Belegungskalender und Anfrageformular der Vereinsheim-Seite. Datum und Ort liegen hier, damit
 * ein im Kalender gewählter Tag gleich im Formular steht.
 */

import { useState } from 'react'
import AnfrageFormular from './AnfrageFormular'
import BelegungsKalender, { type KalenderOrt, type MonatsDaten } from './BelegungsKalender'

export default function Buchungsbereich({ heute, max, start }: { heute: string; max: string; start: { monat: string; tage: MonatsDaten } }) {
  const [datum, setDatum] = useState('')
  const [ort, setOrt] = useState<string | null>('vereinsheim')

  function anfragen(tag: string, kalenderOrt: KalenderOrt) {
    setDatum(tag)
    // "Beides" schließt den Ort aus dem Kalender schon ein.
    if (ort !== 'beides') setOrt(kalenderOrt)
    document.getElementById('anfrage')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <section id="belegung" aria-labelledby="belegung-titel" className="scroll-mt-28">
        <h2 id="belegung-titel" className="font-display text-4xl md:text-5xl tracking-tight mb-4">
          BELEGUNG
        </h2>
        <p className="max-w-2xl text-[#6b6b6b] leading-relaxed mb-10">
          Hier siehst du, wann Vereinsheim und Gelände schon belegt sind – nur die Zeiten, nicht wer gebucht hat. Tipp einen Tag an, um die genauen Zeiten zu
          sehen und ihn gleich in deine Anfrage zu übernehmen.
        </p>
        <BelegungsKalender heute={heute} max={max} start={start} anfragen={anfragen} />
      </section>

      <section id="anfrage" aria-labelledby="anfrage-titel" className="scroll-mt-28">
        <h2 id="anfrage-titel" className="font-display text-4xl md:text-5xl tracking-tight mb-10">
          ANFRAGE STELLEN
        </h2>
        <AnfrageFormular heute={heute} max={max} datum={datum} setDatum={setDatum} ort={ort} setOrt={setOrt} />
      </section>
    </>
  )
}
