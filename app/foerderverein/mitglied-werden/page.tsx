import type { Metadata } from 'next'
import { Download, FileText, Mail } from 'lucide-react'
import Unternavigation from '@/components/foerderverein/Unternavigation'
import { getDownloads } from '@/lib/content'
import { FOERDERVEREIN, istFoerderverein } from '@/lib/foerderverein'

// Downloads mit der Kategorie "Förderverein" (lib/foerderverein.ts) erscheinen hier automatisch.

export const metadata: Metadata = {
  title: 'Mitglied werden – Förderverein',
  description: 'Mitglied im Förderverein Sportplatz werden, spenden, Bandenwerbung buchen oder mit anpacken.',
}

// Downloads frisch aus der Datenbank
export const dynamic = 'force-dynamic'

const HELFEN = [
  {
    titel: 'Mitglied werden',
    text: `Der Jahresbeitrag ist klein (${FOERDERVEREIN.beitrag}). Den aktuellen Stand nennt dir der Förderverein. Jedes Mitglied stärkt ihn.`,
  },
  {
    titel: 'Spenden',
    text: 'Spenden helfen beim weiteren Ausbau der Sportanlage. Schreib dem Förderverein – du bekommst die Kontoverbindung.',
  },
  {
    titel: 'Bandenwerbung',
    text: 'Unternehmen können Werbeflächen an den Banden rund um den Fußballplatz mieten. Der Förderverein stellt gern den Kontakt her.',
  },
  {
    titel: 'Mit anpacken',
    text: 'Ob Stand beim Fest, Arbeitseinsatz auf dem Gelände oder eine gute Idee: Helfende Hände sind immer willkommen.',
  },
]

/** Downloads, die in den Kasten "Beitrittserklärung" gehören – alle anderen stehen unter "Unterlagen". */
const BEITRITT = /beitritt|mitglied|aufnahme/i

const KNOPF_HELL =
  'inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-6 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white transition-colors'

export default async function FoerdervereinMitgliedWerdenPage() {
  const fvDownloads = (await getDownloads()).filter(d => istFoerderverein(d.kategorie))
  const beitritt = fvDownloads.filter(d => BEITRITT.test(d.titel))
  const unterlagen = fvDownloads.filter(d => !BEITRITT.test(d.titel))

  return (
    <div className="pt-32 pb-24">
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Mitglied werden & spenden</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12 break-words hyphens-auto">MITGLIED WERDEN</h1>
        <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed">Es gibt viele Wege, den Förderverein und damit die Sportanlage des SV zu unterstützen.</p>
      </div>

      <Unternavigation aktiv="/foerderverein/mitglied-werden" />

      <div className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#0a0a0a]/10">
          {HELFEN.map(weg => (
            <div key={weg.titel} className="bg-[#f5f5f0] p-8">
              <h2 className="font-display text-2xl tracking-tight mb-3">{weg.titel}</h2>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">{weg.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#0a0a0a] text-[#f5f5f0] p-8 md:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="min-w-0">
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-2 break-words">BEITRITTS&shy;ERKLÄRUNG</h2>
            <p className="text-[#f5f5f0]/70">
              {beitritt.length > 0
                ? `Herunterladen, ausfüllen, unterschreiben und per E-Mail an ${FOERDERVEREIN.email} schicken.`
                : 'Schreib dem Förderverein eine kurze E-Mail – du bekommst die Beitrittserklärung zugeschickt.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 min-w-0 lg:max-w-sm">
            {beitritt.length > 0 ? (
              beitritt.map(d => (
                <a key={d.id} href={d.datei} target="_blank" rel="noopener noreferrer" className={KNOPF_HELL}>
                  <Download size={16} className="shrink-0" /> <span className="min-w-0 break-words">{d.titel}</span>
                </a>
              ))
            ) : (
              <a href={`mailto:${FOERDERVEREIN.email}?subject=${encodeURIComponent('Mitgliedschaft im Förderverein')}`} className={KNOPF_HELL}>
                <Mail size={16} className="shrink-0" /> E-Mail schreiben
              </a>
            )}
          </div>
        </div>

        {unterlagen.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-2xl tracking-tight mb-4">UNTERLAGEN</h2>
            <ul className="divide-y divide-[#0a0a0a]/10 border-y border-[#0a0a0a]/10">
              {unterlagen.map(d => (
                <li key={d.id}>
                  <a href={d.datei} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 py-4 hover:text-[#6b6b6b] transition-colors">
                    <FileText size={18} className="shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium break-words">{d.titel}</span>
                      {d.beschreibung && <span className="block text-sm text-[#6b6b6b]">{d.beschreibung}</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
