import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Mail, Phone } from 'lucide-react'
import TeamFoto from '@/components/TeamFoto'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import { VORSTAND_FOTO_VERHAELTNIS } from '@/lib/bild-ausschnitt'
import { getFoerdervereinGruppenfoto, getFoerdervereinVorstand } from '@/lib/content'
import { FOERDERVEREIN } from '@/lib/foerderverein'

// Bei jedem Aufruf frisch aus der Datenbank lesen → Änderungen aus der Verwaltung erscheinen sofort
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vorstand – Förderverein',
  description: 'Vorstand und Kontakt des Fördervereins Sportplatz des SV Holm-Seppensen e.V.',
}

export default async function FoerdervereinVorstandPage() {
  // Leer, solange in der Verwaltung niemand eingetragen ist → dann nur der Vorsitz aus lib/foerderverein.ts
  const [vorstand, gruppenfoto] = await Promise.all([getFoerdervereinVorstand(), getFoerdervereinGruppenfoto()])

  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Förderverein</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">VORSTAND</h1>
        <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed">Wer den Förderverein leitet und wie du ihn erreichst.</p>
      </div>

      <Unternavigation aktiv="/foerderverein/vorstand" />

      <div className="px-6 max-w-7xl mx-auto">
        {gruppenfoto && (
          // Seitenverhältnis wie beim Ausschnitt in der Verwaltung; ein Klick zeigt das ganze Foto
          <div className="mb-12 overflow-hidden bg-[#0a0a0a]/5" style={{ aspectRatio: VORSTAND_FOTO_VERHAELTNIS }}>
            <TeamFoto
              src={gruppenfoto.src}
              ausschnitt={gruppenfoto.ausschnitt}
              name="Vorstand des Fördervereins"
              unterschrift={vorstand.length > 0 ? `Vorstand des Fördervereins: ${vorstand.map(p => p.name).join(', ')}` : 'Vorstand des Fördervereins'}
            />
          </div>
        )}

        {vorstand.length > 0 && (
          <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
            {vorstand.map(p => (
              <div key={p.id} className="bg-[#f5f5f0] p-8 flex items-start gap-5">
                {p.foto && (
                  <Image src={p.foto} alt={p.name} width={72} height={72} className="w-[72px] h-[72px] rounded-full object-cover grayscale shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-2">{p.funktion}</div>
                  <h2 className="font-display text-2xl tracking-tight">{p.name}</h2>
                  {(p.email || p.telefon) && (
                    <div className="mt-4 flex flex-col gap-2 text-sm">
                      {p.email && (
                        <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors break-all">
                          <Mail size={13} className="shrink-0" /> {p.email}
                        </a>
                      )}
                      {p.telefon && (
                        <a href={`tel:${p.telefon}`} className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                          <Phone size={13} className="shrink-0" /> {p.telefon}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Leere Felder füllen die letzte Reihe auf – sonst scheint dort die Linienfarbe als graue Fläche durch */}
            {Array.from({ length: vorstand.length % 2 }, (_, i) => (
              <div key={`luecke2-${i}`} aria-hidden="true" className="hidden sm:block lg:hidden bg-[#f5f5f0]" />
            ))}
            {Array.from({ length: (3 - (vorstand.length % 3)) % 3 }, (_, i) => (
              <div key={`luecke3-${i}`} aria-hidden="true" className="hidden lg:block bg-[#f5f5f0]" />
            ))}
          </div>
        )}

        <div className={`grid grid-cols-1 gap-px bg-[#0a0a0a]/10 ${vorstand.length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {vorstand.length === 0 && (
            <div className="bg-[#f5f5f0] p-8">
              <h2 className="font-display text-2xl tracking-tight mb-4">Vorstand</h2>
              <p className="text-sm">
                <span className="text-[#6b6b6b]">Vorsitzender:</span> {FOERDERVEREIN.vorsitz}
              </p>
              <p className="mt-3 text-sm text-[#6b6b6b] leading-relaxed">Den ganzen Vorstand nennt dir der Förderverein gern per E-Mail.</p>
            </div>
          )}
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
