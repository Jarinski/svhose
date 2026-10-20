import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronRight, ExternalLink, FileText, Plus } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { namensVerzeichnis } from '@/lib/verwaltung/inhalte/gemeinsam'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { datumDeutsch } from '@/lib/verwaltung/text'
import { Karte, knopfKlassen, LeerHinweis, Meldung, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'Downloads' }

const OHNE_KATEGORIE = 'Ohne Kategorie'

export default function DownloadsListe({ searchParams }: { searchParams: { geloescht?: string } }) {
  adminErzwingen()
  const db = datenbank()
  const namen = namensVerzeichnis(db)

  const downloads = db
    .select()
    .from(schema.downloads)
    .all()
    .sort((a, b) => a.reihenfolge - b.reihenfolge || a.titel.localeCompare(b.titel, 'de', { numeric: true }))

  // Nach Kategorie gruppieren, "Ohne Kategorie" ans Ende
  const kategorien = Array.from(new Set(downloads.map(d => d.kategorie?.trim() || OHNE_KATEGORIE))).sort((a, b) =>
    a === OHNE_KATEGORIE ? 1 : b === OHNE_KATEGORIE ? -1 : a.localeCompare(b, 'de'),
  )

  return (
    <>
      <Seitenkopf
        titel="DOWNLOADS"
        untertitel="Formulare und Dokumente (PDF) auf der Download-Seite der Website."
        aktionen={
          <Link href="/verwaltung/downloads/neu" className={knopfKlassen.primaer}>
            <Plus size={15} /> Neuer Download
          </Link>
        }
      />

      <div className="space-y-6">
        {searchParams.geloescht && <Meldung art="erfolg">Der Download wurde gelöscht.</Meldung>}

        {downloads.length === 0 && (
          <Karte>
            <LeerHinweis>Noch keine Downloads.</LeerHinweis>
          </Karte>
        )}

        {kategorien.map(kategorie => (
          <Karte key={kategorie} titel={kategorie}>
            <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
              {downloads
                .filter(d => (d.kategorie?.trim() || OHNE_KATEGORIE) === kategorie)
                .map(d => (
                  <li key={d.id} className="flex items-center gap-2">
                    <Link href={`/verwaltung/downloads/${d.id}`} className="flex flex-1 min-w-0 items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03]">
                      <FileText size={18} className="text-[#6b6b6b] shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium">{d.titel}</span>
                        <span className="block text-xs text-[#6b6b6b] mt-0.5">
                          {[d.datum ? `Stand ${datumDeutsch(d.datum)}` : null, d.sparteId != null ? namen.sparten.get(d.sparteId) : null]
                            .filter(Boolean)
                            .join(' · ') || 'ohne Datum'}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                    </Link>
                    <a
                      href={medienUrl(d.datei) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${knopfKlassen.leise} shrink-0`}
                      title="PDF öffnen"
                      aria-label={`${d.titel} als PDF öffnen`}
                    >
                      <ExternalLink size={15} />
                    </a>
                  </li>
                ))}
            </ul>
          </Karte>
        ))}
      </div>
    </>
  )
}
