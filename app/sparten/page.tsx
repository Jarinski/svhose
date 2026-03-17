import { getSparten, getTrainingszeiten } from '@/lib/content'
import SpartenClient from './SpartenClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sparten' }

export default async function SpartenPage() {
  const [sparten, trainingszeiten] = await Promise.all([
    getSparten(),
    getTrainingszeiten(),
  ])

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">
          Was wir anbieten
        </div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">SPARTEN</h1>
        <p className="mt-4 text-sm text-[#6b6b6b]">
          <span className="font-medium text-[#0a0a0a]">{sparten.length}</span>{' '}
          Abteilungen – für jedes Alter und jedes Niveau
        </p>
        <p className="mt-2 text-xs text-[#6b6b6b]">
          Klicke auf eine Sparte, um Gruppen, Trainingszeiten und Ansprechpartner zu sehen.
        </p>
      </div>

      {/* ── Accordion list ── */}
      <SpartenClient sparten={sparten} trainingszeiten={trainingszeiten} />

    </div>
  )
}
