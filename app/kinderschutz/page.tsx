import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Shield, Mail } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kinderschutz – SV Holm-Seppensen',
  description:
    'Der Schutz von Kindern und Jugendlichen hat beim SV Holm-Seppensen höchste Priorität. Hier findest du unser Schutzkonzept und Ansprechpartner.',
}

export default function KinderschutzPage() {
  return (
    <div className="pt-32 pb-24">
      {/* Hero */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-[#6b6b6b]" />
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b]">Unser Versprechen</div>
        </div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-10">
          KINDER-<br />SCHUTZ
        </h1>
        <div className="w-16 h-px bg-[#0a0a0a] mb-10" />
        <div className="max-w-2xl">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            Der Schutz von Kindern und Jugendlichen hat beim SV Holm-Seppensen höchste Priorität.
            Wir setzen uns aktiv für einen sicheren und respektvollen Umgang miteinander ein.
          </p>
        </div>
      </div>

      {/* Intro text */}
      <div className="px-6 max-w-4xl mx-auto mb-20 space-y-5 text-[#6b6b6b] leading-relaxed">
        <p>
          Alle ehren- und hauptamtlichen Mitarbeiter*innen, die mit Kindern und Jugendlichen arbeiten,
          verpflichten sich zur Einhaltung unserer Schutzstandards. Wir haben dafür ein umfassendes
          Schutzkonzept erarbeitet, das verbindlich für den gesamten Verein gilt.
        </p>
        <p>
          Unser Schutzkonzept beschreibt konkrete Maßnahmen, Verhaltensregeln und Anlaufstellen, damit
          sich jedes Kind und jeder Jugendliche in unserem Verein sicher und wohl fühlt. Es bildet die
          Grundlage für einen wertschätzenden und grenzachtenden Umgang im Sport.
        </p>
        <p>
          Wir orientieren uns dabei an den Empfehlungen des Deutschen Olympischen Sportbundes (DOSB)
          sowie den Leitlinien des Landessportverbandes Niedersachsen.
        </p>
      </div>

      {/* Schutzkonzept images */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-6">
          Unser Schutzkonzept
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-[#0a0a0a]/10 overflow-hidden">
            <Image
              src="/images/Schutzkonzepte1.png"
              alt="Schutzkonzept SV Holm-Seppensen – Seite 1"
              width={800}
              height={1100}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
          <div className="border border-[#0a0a0a]/10 overflow-hidden">
            <Image
              src="/images/Schutzkonzepte2.jpg"
              alt="Schutzkonzept SV Holm-Seppensen – Seite 2"
              width={800}
              height={1100}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* Verhaltenskodex / Grundsätze */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] py-20 px-6 mb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Unsere Grundsätze</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-12">SELBSTVERPFLICHTUNG</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#f5f5f0]/10">
            {[
              {
                titel: 'Sicherheit',
                text: 'Wir sorgen für sichere Räume und Strukturen, in denen sich Kinder und Jugendliche frei entfalten können – ohne Angst vor Grenzüberschreitungen.',
              },
              {
                titel: 'Respekt',
                text: 'Wir behandeln alle Kinder und Jugendlichen mit Würde und Respekt. Diskriminierung, Demütigung oder körperliche Bestrafung haben bei uns keinen Platz.',
              },
              {
                titel: 'Vertrauen',
                text: 'Wir nehmen Signale und Berichte von Betroffenen ernst, handeln konsequent und schützen Hinweisgeber*innen.',
              },
            ].map(item => (
              <div key={item.titel} className="bg-[#0a0a0a] p-8">
                <div className="font-display text-2xl tracking-tight mb-4">{item.titel.toUpperCase()}</div>
                <p className="text-[#6b6b6b] text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dokument / Selbstverpflichtungserklärung */}
      <div className="px-6 max-w-4xl mx-auto mb-20">
        <div className="bg-[#f5f5f0] border border-[#0a0a0a]/10 p-8 md:p-10">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Dokument</div>
          <h3 className="font-display text-3xl tracking-tight mb-4">SELBSTVERPFLICHTUNGSERKLÄRUNG</h3>
          <p className="text-[#6b6b6b] text-sm leading-relaxed mb-6">
            Alle Trainer*innen, Betreuer*innen und ehrenamtlich Tätigen im SV Holm-Seppensen, die mit
            Kindern und Jugendlichen arbeiten, unterzeichnen unsere Selbstverpflichtungserklärung.
            Sie beschreibt das gemeinsame Verständnis und die Haltung aller Beteiligten im Umgang
            mit Minderjährigen.
          </p>
          <a
            href="/pdfs/Selbstverpflichtungserklaerung.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-6 py-3 text-sm tracking-[0.1em] uppercase hover:bg-[#1a1a1a] transition-colors"
          >
            PDF herunterladen <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* Ansprechpartner / Kontakt */}
      <div className="px-6 max-w-4xl mx-auto">
        <div className="border border-[#0a0a0a]/10 p-8 md:p-10">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Ansprechpartner</div>
          <h3 className="font-display text-3xl tracking-tight mb-4">FRAGEN & ANLIEGEN</h3>
          <p className="text-[#6b6b6b] text-sm leading-relaxed mb-6">
            Wenn du Fragen zu unserem Kinderschutzkonzept hast oder ein Anliegen melden möchtest,
            wende dich bitte vertrauensvoll an uns. Wir nehmen alle Hinweise ernst und behandeln
            sie selbstverständlich vertraulich.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:info@sv-holm-seppensen.de"
              className="inline-flex items-center gap-2 border border-[#0a0a0a] px-6 py-3 text-sm tracking-[0.1em] uppercase hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-colors"
            >
              <Mail size={14} /> E-Mail schreiben
            </a>
            <Link
              href="/ansprechpartner"
              className="inline-flex items-center gap-2 border border-[#0a0a0a]/20 px-6 py-3 text-sm tracking-[0.1em] uppercase text-[#6b6b6b] hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition-colors"
            >
              Alle Ansprechpartner <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
