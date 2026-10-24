import { getDownloads, type Download } from '@/lib/content'
import { FileText, Download as DownloadIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Downloads' }

// Bei jedem Aufruf frisch aus der Datenbank lesen → Änderungen erscheinen sofort
export const dynamic = 'force-dynamic'

/** Überschrift für Downloads ohne Kategorie */
const OHNE_KATEGORIE = 'Sonstiges'

export default async function DownloadsPage() {
  const downloads = await getDownloads()
  const kategorieVon = (d: Download) => d.kategorie || OHNE_KATEGORIE
  const kategorien = Array.from(new Set(downloads.map(kategorieVon)))

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Formulare & Dokumente</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">DOWNLOADS</h1>
      </div>

      {kategorien.map(kategorie => {
        const gruppe = downloads.filter(d => kategorieVon(d) === kategorie)
        return (
          <div key={kategorie} className="mb-12">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-4 pb-3 border-b border-[#0a0a0a]/10">
              {kategorie}
            </div>
            <div className="space-y-px bg-[#0a0a0a]/10">
              {gruppe.map(d => (
                <a
                  key={d.id}
                  href={d.datei}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#f5f5f0] p-6 flex items-center gap-4 group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-200"
                >
                  <FileText size={20} className="text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{d.titel}</div>
                    {d.beschreibung && (
                      <div className="text-xs text-[#6b6b6b] group-hover:text-[#f5f5f0]/50 mt-0.5">{d.beschreibung}</div>
                    )}
                  </div>
                  <DownloadIcon size={16} className="text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )
      })}

      <div className="mt-16 border border-[#0a0a0a]/10 p-6">
        <p className="text-sm text-[#6b6b6b]">
          Du vermisst ein Dokument? Wende dich an{' '}
          <a href="mailto:info@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">
            info@sv-holm-seppensen.de
          </a>
        </p>
      </div>
    </div>
  )
}
