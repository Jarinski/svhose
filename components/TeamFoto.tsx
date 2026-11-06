'use client'

/**
 * components/TeamFoto.tsx
 *
 * Mannschafts- bzw. Gruppenfoto auf der Spartenseite. Ein Klick öffnet es in der Großansicht
 * (components/Grossansicht.tsx), damit man die Gesichter erkennt – auf der Karte ist es auf 16:10 beschnitten,
 * entweder mittig oder auf den in der Verwaltung gewählten Ausschnitt.
 */

import { useState } from 'react'
import AusschnittBild from '@/components/AusschnittBild'
import Grossansicht from '@/components/Grossansicht'
import type { Ausschnitt } from '@/lib/bild-ausschnitt'

export default function TeamFoto({
  src,
  name,
  unterschrift,
  ausschnitt,
}: {
  src: string
  name: string
  unterschrift: string
  ausschnitt: Ausschnitt | null
}) {
  const [offen, setOffen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label={`Foto ${name} groß anzeigen`}
        className="group block w-full h-full overflow-hidden cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0a0a0a]"
      >
        {/* Bilder liegen schon verkleinert im Medienordner – normales <img> wie im übrigen Seitenaufbau */}
        <span className="block w-full h-full transition-transform duration-500 group-hover:scale-[1.03]">
          <AusschnittBild src={src} alt={name} ausschnitt={ausschnitt} />
        </span>
      </button>
      {offen && <Grossansicht fotos={[{ bild: { src }, unterschrift }]} index={0} onIndex={() => {}} onSchliessen={() => setOffen(false)} />}
    </>
  )
}
