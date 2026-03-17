import { getTermine } from '@/lib/content'
import TermineClient from './TermineClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Termine' }
export const revalidate = 60

export default async function TerminePage() {
  const termine = await getTermine()

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Kalender</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">TERMINE</h1>
      </div>

      <TermineClient termine={termine} />
    </div>
  )
}
