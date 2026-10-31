import type { Metadata } from 'next'
import Unternavigation from '@/components/foerderverein/Unternavigation'

// Chronik des Fördervereins: wie aus der Elterninitiative der eigene Sportplatz wurde.
// Quellen: alte Website fshose.de und der Artikel „Unsere Unterstützer“ (2014).

export const metadata: Metadata = {
  title: 'Chronik – Förderverein',
  description: 'Von der Idee der Eltern bis zum eigenen Rasenplatz am Tostedter Weg: die Geschichte des Fördervereins Sportplatz.',
}

const GESCHICHTE = [
  {
    zeit: 'Die Idee',
    titel: 'Eltern gründen den Förderverein',
    text: 'Eltern der damaligen E1-Jugend (U11) wollten ihren Kindern und den nächsten Jahrgängen ein besseres sportliches Umfeld bieten. Ihr Ziel: ein eigener Sportplatz für Holm-Seppensen.',
  },
  {
    zeit: '2013',
    titel: 'Jeder Quadratmeter zählt',
    text: 'Brunsberglauf, Glühweinstand, Stadtfest und symbolische Patenschaften für Quadratmeter des künftigen Platzes: Allein 2013 kamen knapp 50 neue Mitglieder dazu.',
  },
  {
    zeit: '2014',
    titel: 'Gemeinsam für Holm-Seppensen',
    text: 'Geschäfte im Ort spenden beim Kauf ausgewählter Produkte einen Teil des Erlöses für den Sportplatz. Bei der Baustellenbesichtigung des neuen REWE-Markts kamen in vier Stunden 400 € an Spenden zusammen.',
  },
  {
    zeit: 'Oktober 2017',
    titel: 'Spatenstich am Tostedter Weg',
    text: 'Die Stadt Buchholz hat ein 2,9 Hektar großes Gelände gekauft und stellt es dem SV zur Verfügung. Am 27. Oktober 2017 ist Spatenstich – danach werden rund 12.000 m³ Erde bewegt.',
  },
  {
    zeit: '2018',
    titel: 'Platz und Vereinshaus entstehen',
    text: 'Gebaut werden ein Naturrasenplatz mit Flutlicht und Beregnung und der erste Teil des Vereinshauses mit Umkleiden und Vereinsraum. Ehrenamtliche bepflanzen den Wall und setzen die Hecke – so bleiben die Kosten im Rahmen.',
  },
  {
    zeit: 'Heute',
    titel: 'Der Platz ist da',
    text: 'Am Tostedter Weg hat der SV heute seine eigene Sportstätte mit Rasenplatz und Vereinsheim. Die Bandenwerbung rund um den Platz soll den weiteren Ausbau mitfinanzieren.',
  },
]

const IDEEN = ['Größeres Vereinshaus mit vier Umkleiden und Gymnastikraum', 'Beachvolleyballfeld', 'Laufbahn', 'Bocciaanlage', 'Zusätzlicher Trainingsplatz']

export default function FoerdervereinChronikPage() {
  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Förderverein</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">CHRONIK</h1>
        <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed">Von der Idee zum eigenen Platz – so ist der Sportplatz am Tostedter Weg entstanden.</p>
      </div>

      <Unternavigation aktiv="/foerderverein/chronik" />

      <div className="px-6 max-w-7xl mx-auto">
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          {GESCHICHTE.map(schritt => (
            <li key={schritt.titel} className="bg-[#f5f5f0] p-8">
              <div className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">{schritt.zeit}</div>
              <h2 className="font-display text-2xl tracking-tight mb-3">{schritt.titel}</h2>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">{schritt.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div>
            <h2 className="font-display text-2xl tracking-tight mb-2">IDEEN FÜR DIE ZUKUNFT</h2>
            <p className="text-sm text-[#6b6b6b] leading-relaxed">Auf dem Gelände ist Platz für mehr. Bei der Planung 2017 standen diese Ideen auf der Liste:</p>
          </div>
          <ul className="md:col-span-2 flex flex-wrap gap-2">
            {IDEEN.map(idee => (
              <li key={idee} className="border border-[#0a0a0a]/15 px-4 py-2 text-sm">
                {idee}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
