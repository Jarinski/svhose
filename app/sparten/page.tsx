import { getSparten } from '@/lib/content'
import SpartenClient from './SpartenClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sparten' }

// Liest bei jedem Aufruf direkt aus der Datenbank – Änderungen sind sofort sichtbar.
export const dynamic = 'force-dynamic'

export default async function SpartenPage() {
  const sparten = await getSparten()

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

      {/* ── Kopfbereich ── */}
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">
          Was wir anbieten
        </div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">SPARTEN</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6b6b6b]">
          Entdecke unser vielfältiges Sportangebot und finde die Sparte, die zu dir passt.
        </p>
      </div>

      {/* ── Spartenkarten ── */}
      <SpartenClient sparten={sparten} />

    </div>
  )
}
