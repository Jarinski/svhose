'use client'

/**
 * components/TeamFoto.tsx
 *
 * Mannschafts- bzw. Gruppenfoto auf der Spartenseite. Ein Klick öffnet es in der Großansicht
 * (components/Grossansicht.tsx), damit man die Gesichter erkennt – auf der Karte ist es auf 16:10 beschnitten.
 */

import { useState } from 'react'
import Grossansicht from '@/components/Grossansicht'

export default function TeamFoto({ src, name, unterschrift }: { src: string; name: string; unterschrift: string }) {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </button>
      {offen && <Grossansicht fotos={[{ bild: { src }, unterschrift }]} index={0} onIndex={() => {}} onSchliessen={() => setOffen(false)} />}
    </>
  )
}
