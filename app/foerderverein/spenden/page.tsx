import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Mail } from 'lucide-react'
import KopierKnopf from '@/components/foerderverein/KopierKnopf'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import { FOERDERVEREIN } from '@/lib/foerderverein'
import { SPENDENKONTO, girocodeInhalt } from '@/lib/foerderverein-konto'
import { qrSvg } from '@/lib/verwaltung/qr'

// Spendenkonto des Fördervereins (lib/foerderverein-konto.ts) mit Kopierknöpfen und GiroCode.
// Das Konto gehört dem Förderverein, nicht dem SV – die Seite steht deshalb nur hier.

export const metadata: Metadata = {
  title: 'Spenden – Förderverein',
  description:
    'Kontoverbindung des Fördervereins Sportplatz des SV Holm-Seppensen e.V. für Spenden an die Sportanlage am Tostedter Weg – mit Spendenbescheinigung.',
}

export default async function FoerdervereinSpendenPage() {
  const girocode = await qrSvg(girocodeInhalt())

  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Förderverein</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">SPENDEN</h1>
        <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed">
          Jede Spende hilft dem Förderverein, die Sportanlage des SV am Tostedter Weg weiter auszubauen – egal wie groß.
        </p>
      </div>

      <Unternavigation aktiv="/foerderverein/spenden" />

      <div className="px-6 max-w-7xl mx-auto space-y-16 md:space-y-20">
        <section aria-labelledby="kontoverbindung" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-px bg-[#0a0a0a]/10">
          <div className="bg-[#0a0a0a] text-[#f5f5f0] p-8 md:p-12 min-w-0">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#f5f5f0]/50 mb-3">Spendenkonto</div>
            <h2 id="kontoverbindung" className="font-display text-3xl md:text-4xl tracking-tight mb-10">KONTOVERBINDUNG</h2>
            <dl className="space-y-7">
              <Angabe name="Kontoinhaber" wert={SPENDENKONTO.inhaber} />
              <Angabe name="Bank" wert={SPENDENKONTO.bank} />
              <Angabe name="IBAN" wert={SPENDENKONTO.iban} kopieren={SPENDENKONTO.iban.replace(/\s/g, '')} gross />
              <Angabe name="BIC" wert={SPENDENKONTO.bic} kopieren={SPENDENKONTO.bic} />
              <Angabe name="Verwendungszweck" wert={SPENDENKONTO.verwendungszweck} />
            </dl>
          </div>

          <div className="bg-[#f5f5f0] p-8 md:p-12 flex flex-col items-center justify-center text-center">
            <div
              role="img"
              aria-label="GiroCode mit der Kontoverbindung des Fördervereins"
              className="w-44 h-44 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: girocode }}
            />
            <h3 className="font-display text-2xl tracking-tight mt-6 mb-2">GIROCODE</h3>
            <p className="text-sm text-[#6b6b6b] leading-relaxed">
              Mit der Banking-App scannen: Empfänger, IBAN und Verwendungszweck sind dann schon ausgefüllt. Den Betrag wählst du selbst.
            </p>
          </div>
        </section>

        <section aria-label="Gut zu wissen" className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          <div className="bg-[#f5f5f0] p-8">
            <h2 className="font-display text-2xl tracking-tight mb-4">Nur für den Förderverein</h2>
            <p className="text-sm text-[#6b6b6b] leading-relaxed">
              Das Konto gehört dem Förderverein, nicht dem SV Holm-Seppensen e.V. Beiträge und andere Zahlungen an den SV laufen weiter über den
              SV.
            </p>
          </div>
          <div className="bg-[#f5f5f0] p-8">
            <h2 className="font-display text-2xl tracking-tight mb-4">Spendenbescheinigung</h2>
            <p className="text-sm text-[#6b6b6b] leading-relaxed mb-4">
              Eine Spendenbescheinigung bekommst du schon ab dem ersten Euro. Ab 300&nbsp;€ erhältst du sie automatisch. Für kleinere Beträge
              schick dem Förderverein einfach deinen Namen und deine Anschrift per E-Mail – auch Fragen zur Spende beantwortet er dort gern.
            </p>
            <a href={`mailto:${FOERDERVEREIN.email}`} className="inline-flex items-center gap-2 text-sm hover:underline underline-offset-4">
              <Mail size={14} className="shrink-0" />
              {/* Wird es eng, bricht die Adresse nach dem @ um statt mitten im Namen */}
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {FOERDERVEREIN.email.split('@')[0]}@<wbr />
                {FOERDERVEREIN.email.split('@')[1]}
              </span>
            </a>
          </div>
          <div className="bg-[#f5f5f0] p-8">
            <h2 className="font-display text-2xl tracking-tight mb-4">Lieber regelmäßig?</h2>
            <p className="text-sm text-[#6b6b6b] leading-relaxed mb-4">Als Mitglied unterstützt du den Förderverein jedes Jahr.</p>
            <Link
              href="/foerderverein/mitglied-werden"
              className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]"
            >
              Mitglied werden <ArrowRight size={12} className="shrink-0" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * IBAN in zwei Hälften, die jeweils zusammenbleiben: Wird es zu eng, bricht sie in der Mitte um
 * ("DE18 2075 0000 / 0060 0809 83") statt einen einzelnen Block in die nächste Zeile zu schieben.
 */
function Haelften({ text }: { text: string }) {
  const bloecke = text.split(' ')
  const mitte = Math.ceil(bloecke.length / 2)
  return (
    <>
      <span className="whitespace-nowrap">{bloecke.slice(0, mitte).join(' ')}</span>{' '}
      <span className="whitespace-nowrap">{bloecke.slice(mitte).join(' ')}</span>
    </>
  )
}

/** Eine Zeile der Kontoverbindung; mit `kopieren` steht ein Kopierknopf daneben. */
function Angabe({ name, wert, kopieren, gross }: { name: string; wert: string; kopieren?: string; gross?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.2em] uppercase text-[#f5f5f0]/50 mb-1.5">{name}</dt>
      <dd className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {gross ? (
          <span className="text-2xl md:text-4xl font-medium tracking-wide tabular-nums">
            <Haelften text={wert} />
          </span>
        ) : (
          <span className="text-lg break-words min-w-0">{wert}</span>
        )}
        {kopieren && <KopierKnopf text={kopieren} name={name} />}
      </dd>
    </div>
  )
}
