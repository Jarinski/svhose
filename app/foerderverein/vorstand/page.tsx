import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Mail } from 'lucide-react'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import { FOERDERVEREIN } from '@/lib/foerderverein'

export const metadata: Metadata = {
  title: 'Vorstand – Förderverein',
  description: 'Vorstand und Kontakt des Fördervereins Sportplatz des SV Holm-Seppensen e.V.',
}

export default function FoerdervereinVorstandPage() {
  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Förderverein</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">VORSTAND</h1>
        <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed">Wer den Förderverein leitet und wie du ihn erreichst.</p>
      </div>

      <Unternavigation aktiv="/foerderverein/vorstand" />

      <div className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          <div className="bg-[#f5f5f0] p-8">
            <h2 className="font-display text-2xl tracking-tight mb-4">Vorstand</h2>
            <p className="text-sm">
              <span className="text-[#6b6b6b]">Vorsitzender:</span> {FOERDERVEREIN.vorsitz}
            </p>
            <p className="mt-3 text-sm text-[#6b6b6b] leading-relaxed">Den ganzen Vorstand nennt dir der Förderverein gern per E-Mail.</p>
          </div>
          <div className="bg-[#f5f5f0] p-8">
            <h2 className="font-display text-2xl tracking-tight mb-4">E-Mail</h2>
            <a href={`mailto:${FOERDERVEREIN.email}`} className="inline-flex items-center gap-2 text-sm underline underline-offset-4 break-all hover:text-[#6b6b6b]">
              <Mail size={14} className="shrink-0" /> {FOERDERVEREIN.email}
            </a>
            <p className="mt-4 text-sm text-[#6b6b6b] leading-relaxed">Oder sprich die Ansprechpartner:innen des SV an – sie stellen gern den Kontakt her.</p>
            <Link href="/ansprechpartner" className="mt-3 inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]">
              Zu den Ansprechpartner:innen <ArrowRight size={12} className="shrink-0" />
            </Link>
          </div>
          <div className="bg-[#f5f5f0] p-8">
            <h2 className="font-display text-2xl tracking-tight mb-4">Der Verein</h2>
            <p className="text-sm leading-relaxed">{FOERDERVEREIN.name}</p>
            <p className="mt-2 text-sm text-[#6b6b6b] leading-relaxed">Eingetragen beim {FOERDERVEREIN.register}.</p>
            <p className="mt-4 text-sm text-[#6b6b6b] leading-relaxed">
              Diese Seite stellt der SV Holm-Seppensen e.V. für den Förderverein bereit. Mitgliedschaft und Spenden laufen direkt über den
              Förderverein.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
