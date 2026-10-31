import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import NewsKarten from '@/components/foerderverein/NewsKarten'
import { getAllNews } from '@/lib/content'
import { FOERDERVEREIN, FOERDERVEREIN_MENUE, istFoerderverein } from '@/lib/foerderverein'

// ─── Förderverein Sportplatz des SV Holm-Seppensen e.V. – Übersicht ──────────
// Seine alte Website (fshose.de) wird nicht mehr gepflegt; der SV stellt den Förderverein hier
// vor. Die Unterseiten (Aktuelles, Chronik, Vorstand, Mitglied werden) liegen daneben. Was sich
// öfter ändert, kommt aus der Verwaltung: News mit der Kategorie "Förderverein" erscheinen
// automatisch (lib/foerderverein.ts).

export const metadata: Metadata = {
  title: 'Förderverein',
  description: 'Der Förderverein Sportplatz des SV Holm-Seppensen e.V. unterstützt den Verein beim Bau und Ausbau der Sportanlage am Tostedter Weg.',
}

// News frisch aus der Datenbank
export const dynamic = 'force-dynamic'

// Geschützte Leerzeichen ( ), damit Zahl und Einheit nicht getrennt umbrechen
const ZAHLEN = [
  { zahl: '2,9 ha', text: 'Gelände am Tostedter Weg' },
  { zahl: 'ca. 12.000 m³', text: 'Erde bewegt' },
  { zahl: '2017', text: 'Spatenstich' },
  { zahl: 'knapp 50', text: 'neue Mitglieder allein 2013' },
]

export default async function FoerdervereinPage() {
  const news = (await getAllNews()).filter(n => istFoerderverein(n.category)).slice(0, 3)

  return (
    <div className="pt-32 pb-24">
      {/* Hero */}
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Gemeinsam für Holm-Seppensen</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12 break-words hyphens-auto">FÖRDERVEREIN</h1>
        <div className="max-w-2xl space-y-8">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            Der {FOERDERVEREIN.name} sammelt Geld, Ideen und helfende Hände für die Sportanlage des SV. Sein großes Ziel ist erreicht: Am Tostedter
            Weg hat der SV heute seinen eigenen Rasenplatz – geschafft mit der Stadt Buchholz, vielen Spender:innen und Helfer:innen. Und es geht
            weiter.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/foerderverein/mitglied-werden"
              className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Mitglied werden <ArrowRight size={16} className="shrink-0" />
            </Link>
            <Link
              href="/foerderverein/vorstand"
              className="inline-flex items-center gap-2 border border-[#0a0a0a]/20 px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:border-[#0a0a0a] transition-colors"
            >
              Kontakt
            </Link>
          </div>
        </div>
      </div>

      <Unternavigation aktiv="/foerderverein" />

      {/* Wer wir sind */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#f5f5f0]/60 mb-6">Über den Förderverein</div>
            <h2 className="font-display text-5xl tracking-tight mb-8">EIN PLATZ FÜR UNSER DORF.</h2>
            <p className="text-[#f5f5f0]/70 leading-relaxed mb-6">
              Holm-Seppensen hatte Schule, Kindergärten und Kulturbahnhof – aber keinen eigenen Sportplatz. Der Platz an der Mühlenschule stand dem
              Verein nur eingeschränkt zur Verfügung, während die Kinder- und Jugendfußballsparte immer weiter wuchs.
            </p>
            <p className="text-[#f5f5f0]/70 leading-relaxed">
              Der Förderverein ist ein eigenständiger, eingetragener Verein. Über Jahre hat er Spenden gesammelt, Patenschaften vermittelt und mit
              angepackt, damit der SV seine Sportanlage bekommt.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#f5f5f0]/10">
            {ZAHLEN.map(item => (
              <div key={item.text} className="bg-[#0a0a0a] p-6 md:p-8 text-center">
                <div className="font-display text-3xl md:text-4xl lg:text-5xl whitespace-nowrap text-[#f5f5f0] mb-2">{item.zahl}</div>
                <div className="text-[11px] tracking-[0.15em] uppercase text-[#f5f5f0]/60">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wegweiser zu den Unterseiten */}
      <div className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Mehr zum Förderverein</div>
        <h2 className="font-display text-5xl tracking-tight mb-12">HIER GEHT’S WEITER</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#0a0a0a]/10">
          {FOERDERVEREIN_MENUE.kinder.map(k => (
            <Link key={k.href} href={k.href} className="bg-[#f5f5f0] p-8 group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-300 flex flex-col">
              <h3 className="font-display text-2xl tracking-tight mb-3">{k.label}</h3>
              <p className="text-sm text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 leading-relaxed flex-1">{k.text}</p>
              <ArrowRight size={16} className="mt-6 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Neuigkeiten – nur, wenn es News mit der Kategorie "Förderverein" gibt */}
      {news.length > 0 && (
        <div className="pb-24 px-6 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Aktionen & Neuigkeiten</div>
              <h2 className="font-display text-5xl tracking-tight">AUS DEM FÖRDERVEREIN</h2>
            </div>
            <Link href="/foerderverein/aktuelles" className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]">
              Alle Meldungen <ArrowRight size={14} className="shrink-0" />
            </Link>
          </div>
          <NewsKarten news={news} />
        </div>
      )}
    </div>
  )
}
