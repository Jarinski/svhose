import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { DESIGNS, umschaltLink, type Design } from '@/lib/vorschau'

export const metadata: Metadata = {
  title: 'Design-Vorschau',
  robots: { index: false, follow: false },
}

// Einstieg in die Design-Vorschau (lib/vorschau.ts): Link hierher schicken, Design wählen, durchklicken.
export default function VorschauPage() {
  const designs = Object.entries(DESIGNS) as [Design, (typeof DESIGNS)[Design]][]

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Neue Website</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">DESIGN-VORSCHAU</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6b6b6b]">
          Zwei Entwürfe in unseren Vereinsfarben Schwarz-Weiß. Wähle ein Design und klick dich durch die ganze
          Website – mit allen echten Inhalten. Unten auf jeder Seite kannst du jederzeit zwischen den Entwürfen und
          dem aktuellen Design wechseln. Für alle anderen Besucher*innen ändert sich nichts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#0a0a0a]/10">
        {designs.map(([design, info]) => (
          // Normaler Link statt next/link: Das Umschalten braucht einen vollen Seitenaufruf.
          <a
            key={design}
            href={umschaltLink(design)}
            className="bg-[#f5f5f0] group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-colors duration-300 p-10 flex flex-col gap-6"
          >
            <div className="font-display text-8xl leading-none">{design.toUpperCase()}</div>
            <div>
              <h2 className="font-display text-3xl tracking-tight mb-2">{info.name.toUpperCase()}</h2>
              <p className="text-sm text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 leading-relaxed">{info.beschreibung}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase">
              Ansehen <ArrowRight size={14} />
            </span>
          </a>
        ))}
      </div>

      <p className="mt-8 text-sm text-[#6b6b6b]">
        <a href={umschaltLink('aus')} className="underline underline-offset-4 hover:text-[#0a0a0a]">
          Vorschau beenden und zum aktuellen Design zurück
        </a>
      </p>
    </div>
  )
}
