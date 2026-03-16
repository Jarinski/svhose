import Link from 'next/link'
import { ArrowRight, Shield } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kinderschutz' }

export default function KinderschutzPage() {
  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Shield size={32} />
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b]">Unser Versprechen</div>
      </div>
      <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">KINDER-<br />SCHUTZ</h1>

      <div className="w-16 h-px bg-[#0a0a0a] mb-12" />

      <div className="prose max-w-none space-y-6 text-[#6b6b6b] leading-relaxed">
        <p className="text-xl text-[#0a0a0a] font-light">
          Der Schutz von Kindern und Jugendlichen hat beim SV Holm-Seppensen höchste Priorität.
        </p>
        <p>
          Wir setzen uns aktiv für einen sicheren und respektvollen Umgang miteinander ein. Alle ehren- und hauptamtlichen Mitarbeiter*innen, die mit Kindern und Jugendlichen arbeiten, verpflichten sich zur Einhaltung unserer Schutzstandards.
        </p>
        <p>
          Unser Verein hat eine Selbstverpflichtungserklärung erarbeitet, die das gemeinsame Verständnis und die Haltung aller Beteiligten beschreibt.
        </p>
      </div>

      <div className="mt-12 bg-[#0a0a0a] text-[#f5f5f0] p-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-4">Dokument</div>
        <a
          href="/pdfs/Selbstverpflichtungserklaerung.pdf"
          target="_blank"
          className="inline-flex items-center gap-2 text-[#f5f5f0] border border-[#f5f5f0]/30 px-6 py-3 text-sm tracking-[0.1em] uppercase hover:border-[#f5f5f0] transition-colors"
        >
          Selbstverpflichtungserklärung <ArrowRight size={14} />
        </a>
      </div>

      <div className="mt-8 border border-[#0a0a0a]/10 p-6">
        <p className="text-sm text-[#6b6b6b]">
          Bei Fragen oder Anliegen wende dich vertrauensvoll an{' '}
          <a href="mailto:info@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">
            info@sv-holm-seppensen.de
          </a>
        </p>
      </div>
    </div>
  )
}
