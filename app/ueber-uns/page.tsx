import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Über uns' }

export default function UeberUnsPage() {
  return (
    <div className="pt-32 pb-24">
      {/* Hero */}
      <div className="px-6 max-w-7xl mx-auto mb-24">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Wer wir sind</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">ÜBER UNS</h1>
        <div className="max-w-2xl">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            In unserem herzlichen Verein inmitten der malerischen Landschaft der Lüneburger Heide steht der Spaß an Bewegung und Gemeinschaft an erster Stelle.
          </p>
        </div>
      </div>

      {/* Philosophy */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Unsere Philosophie</div>
            <h2 className="font-display text-5xl tracking-tight mb-8">SPORT VERBINDET.</h2>
            <p className="text-[#6b6b6b] leading-relaxed mb-6">
              Bei uns geht es nicht nur um Siege und Trophäen, sondern vor allem um das Miteinander und die Freude am Sport. Wir sind überzeugt: Sport ist für alle da – jung und alt, Einsteiger und Fortgeschrittene.
            </p>
            <p className="text-[#6b6b6b] leading-relaxed">
              Mit 14 Sparten bieten wir für jeden das Richtige – von Fußball und Judo bis hin zu Yoga und Nordic-Walking.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#f5f5f0]/10">
            {[
              { zahl: '14', text: 'Aktive Sparten' },
              { zahl: '100%', text: 'Ehrenamt' },
              { zahl: '∞', text: 'Gemeinschaft' },
              { zahl: '1', text: 'Team' },
            ].map(item => (
              <div key={item.text} className="bg-[#0a0a0a] p-8 text-center">
                <div className="font-display text-5xl text-[#f5f5f0] mb-2">{item.zahl}</div>
                <div className="text-[11px] tracking-[0.15em] uppercase text-[#6b6b6b]">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sportplätze */}
      <div className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Unsere Anlagen</div>
        <h2 className="font-display text-5xl tracking-tight mb-12">SPORTPLÄTZE</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#0a0a0a]/10">
          {[
            {
              name: 'Sportplatz Tostedter Weg',
              adresse: 'Tostedter Weg 1, Holm-Seppensen',
              beschreibung: 'Unser Hauptplatz mit Rasenplatz für den Fußballbetrieb.',
            },
            {
              name: 'Sportplatz Mühlenschule',
              adresse: 'Holm-Seppensen',
              beschreibung: 'Sporthalle für Indoor-Sportarten wie Judo, Volleyball und Kinderturnen.',
            },
          ].map(platz => (
            <div key={platz.name} className="bg-[#f5f5f0] p-8">
              <h3 className="font-display text-2xl tracking-tight mb-2">{platz.name}</h3>
              <div className="text-xs tracking-[0.1em] text-[#6b6b6b] mb-4">{platz.adresse}</div>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">{platz.beschreibung}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Mitglied werden */}
      <div className="px-6 max-w-7xl mx-auto">
        <div className="bg-[#0a0a0a] text-[#f5f5f0] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-4xl tracking-tight mb-2">MITGLIED WERDEN</h2>
            <p className="text-[#6b6b6b]">Lade den Aufnahmeantrag herunter und werde Teil unserer Gemeinschaft.</p>
          </div>
          <Link href="/downloads" className="shrink-0 inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white transition-colors">
            Zum Antrag <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
