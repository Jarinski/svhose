import {
  getFussballKommendeSpiele,
  getFussballVergangeneSpiele,
} from '@/lib/fussball-de'
import FussballSpieleClient from './FussballSpieleClient'
import type { Metadata } from 'next'
import { ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Fußball – Spielplan',
  description:
    'Alle kommenden und vergangenen Spiele der Fußballabteilung des SV Holm-Seppensen – live synchronisiert von fussball.de.',
}

// Revalidate the page every hour so data stays fresh
export const revalidate = 3600

export default async function FussballPage() {
  const [kommend, vergangen] = await Promise.all([
    getFussballKommendeSpiele(),
    getFussballVergangeneSpiele(),
  ])

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      {/* ── Page header ── */}
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">
          Fußballabteilung
        </div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">SPIELPLAN</h1>
        <p className="mt-4 text-sm text-[#6b6b6b] max-w-lg leading-relaxed">
          Alle Spiele aller Mannschaften – automatisch synchronisiert von{' '}
          <a
            href="https://www.fussball.de/verein/sv-holm-seppensen-niedersachsen/-/id/00ES8GN7RK00006QVV0AG08LVUPGND5I"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#0a0a0a] transition-colors inline-flex items-center gap-1"
          >
            fussball.de <ExternalLink size={11} />
          </a>
        </p>
      </div>

      {/* ── Source hint banner ── */}
      {kommend.length === 0 && vergangen.length === 0 && (
        <div className="bg-[#0a0a0a]/5 border border-[#0a0a0a]/10 p-6 mb-10 text-sm text-[#6b6b6b]">
          Die Spielplandaten konnten gerade nicht geladen werden. Bitte direkt auf{' '}
          <a
            href="https://www.fussball.de/verein/sv-holm-seppensen-niedersachsen/-/id/00ES8GN7RK00006QVV0AG08LVUPGND5I"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#0a0a0a] transition-colors"
          >
            fussball.de
          </a>{' '}
          nachschauen.
        </div>
      )}

      {/* ── Games list ── */}
      <FussballSpieleClient kommend={kommend} vergangen={vergangen} />
    </div>
  )
}
