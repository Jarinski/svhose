import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ChevronRight, Plus } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { datumText, heute, ORT_NAMEN, ORTE, WOCHENTAGE_LANG } from '@/lib/buchungen/zeit'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Badge, Karte, knopfKlassen, LeerHinweis, Meldung, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'Regelbelegung' }

function zeitText(beginn: string, ende: string): string {
  if (beginn === '00:00' && ende === '00:00') return 'ganztägig'
  return `${beginn}–${ende === '00:00' ? '24:00' : ende}${ende !== '00:00' && ende <= beginn ? ' (Folgetag)' : ''}`
}

export default async function RegelnSeite(props: { searchParams: Promise<{ angelegt?: string; geloescht?: string }> }) {
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  const regeln = datenbank()
    .select()
    .from(schema.belegungRegeln)
    .all()
    .sort((a, b) => a.wochentag - b.wochentag || a.beginn.localeCompare(b.beginn) || a.titel.localeCompare(b.titel, 'de'))
  const heuteDatum = heute()

  return (
    <>
      <Seitenkopf
        titel="REGELBELEGUNG"
        zurueck={{ href: '/verwaltung/buchungen', text: 'Buchungen' }}
        untertitel="Was jede Woche zur selben Zeit stattfindet. Steht automatisch im Kalender; einzelne Tage lassen sich dort ausfallen lassen."
        aktionen={
          <Link href="/verwaltung/buchungen/regeln/neu" className={knopfKlassen.primaer}>
            <Plus size={15} /> Regelbelegung
          </Link>
        }
      />
      <div className="space-y-6">
        {searchParams.angelegt && <Meldung art="erfolg">Angelegt – die Regelbelegung steht jetzt im Kalender.</Meldung>}
        {searchParams.geloescht && <Meldung art="erfolg">Die Regelbelegung wurde gelöscht.</Meldung>}
        {ORTE.map(ort => {
          const liste = regeln.filter(r => r.ort === ort)
          if (ort === 'beides' && liste.length === 0) return null
          return (
            <Karte key={ort} titel={ORT_NAMEN[ort]}>
              {liste.length === 0 ? (
                <LeerHinweis>Noch keine Regelbelegung.</LeerHinweis>
              ) : (
                <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
                  {liste.map(r => {
                    const vorbei = !!r.gueltigBis && r.gueltigBis < heuteDatum
                    return (
                      <li key={r.id}>
                        <Link href={`/verwaltung/buchungen/regeln/${r.id}`} className="flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03]">
                          <span className="w-24 shrink-0 text-sm text-[#6b6b6b]">{WOCHENTAGE_LANG[r.wochentag - 1]}</span>
                          <span className="flex-1 min-w-0">
                            <span className={`font-medium ${vorbei ? 'text-[#6b6b6b]' : ''}`}>{r.titel}</span>
                            <span className="block text-xs text-[#6b6b6b] mt-0.5">
                              {zeitText(r.beginn, r.ende)}
                              {r.gueltigAb && ` · ab ${datumText(r.gueltigAb)}`}
                              {r.gueltigBis && ` · bis ${datumText(r.gueltigBis)}`}
                              {r.hinweis && ` · ${r.hinweis}`}
                            </span>
                          </span>
                          {vorbei && <Badge>abgelaufen</Badge>}
                          <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Karte>
          )
        })}
      </div>
    </>
  )
}
