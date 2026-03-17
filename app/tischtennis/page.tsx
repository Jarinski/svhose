import {
  getTischtennisKommendeSpiele,
  getTischtennisVergangeneSpiele,
} from '@/lib/click-tt'
import TischtennisSpieleClient from './TischtennisSpieleClient'
import type { Metadata } from 'next'
import { ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tischtennis – Spielplan',
  description:
    'Alle kommenden und vergangenen Spiele der Tischtennisabteilung des SV Holm-Seppensen – live synchronisiert von click-tt.',
}

// Revalidate the page every hour so data stays fresh
export const revalidate = 3600

export default async function TischtennisPage() {
  const [kommend, vergangen] = await Promise.all([
    getTischtennisKommendeSpiele(),
    getTischtennisVergangeneSpiele(),
  ])

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      {/* ── Page header ── */}
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">
          Tischtennisabteilung
        </div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">SPIELPLAN</h1>
        <p className="mt-4 text-sm text-[#6b6b6b] max-w-lg leading-relaxed">
          Alle Spiele aller Mannschaften – automatisch synchronisiert von{' '}
          <a
            href="https://ttvn.click-tt.de/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/clubInfoDisplay?club=5504"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#0a0a0a] transition-colors inline-flex items-center gap-1"
          >
            click-tt <ExternalLink size={11} />
          </a>
        </p>
      </div>

      {/* ── Fallback banner when data unavailable ── */}
      {kommend.length === 0 && vergangen.length === 0 && (
        <div className="bg-[#0a0a0a]/5 border border-[#0a0a0a]/10 p-6 mb-10 text-sm text-[#6b6b6b]">
          Die Spielplandaten konnten gerade nicht geladen werden. Bitte direkt auf{' '}
          <a
            href="https://ttvn.click-tt.de/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/clubInfoDisplay?club=5504"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#0a0a0a] transition-colors"
          >
            click-tt
          </a>{' '}
          nachschauen.
        </div>
      )}

      {/* ── Games list ── */}
      <TischtennisSpieleClient kommend={kommend} vergangen={vergangen} />
    </div>
  )
}
