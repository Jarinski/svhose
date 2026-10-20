import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronRight, Lock, Plus, RefreshCw } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { heuteBerlin, namensVerzeichnis } from '@/lib/verwaltung/inhalte/gemeinsam'
import { darfTermineAnlegen, QUELLEN_NAMEN, terminBearbeitbar } from '@/lib/verwaltung/inhalte/termine'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Badge, Karte, knopfKlassen, LeerHinweis, Meldung, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'Termine' }

type Termin = typeof schema.termine.$inferSelect
type QuellenFilter = 'alle' | Termin['quelle']

const FILTER: { wert: QuellenFilter; text: string }[] = [
  { wert: 'alle', text: 'Alle' },
  { wert: 'manuell', text: 'Eigene Termine' },
  { wert: 'fussball-de', text: 'fussball.de' },
  { wert: 'click-tt', text: 'click-tt' },
]

const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function nachUhrzeit(a: Termin, b: Termin): number {
  // Uhrzeit ist Freitext ("9:00", "18:30", "ganztägig") – numerisch vergleichen, damit 9 vor 18 kommt
  return (a.uhrzeit ?? '').localeCompare(b.uhrzeit ?? '', 'de', { numeric: true }) || a.id - b.id
}

/** Termine nach Monat gruppieren, Reihenfolge bleibt erhalten. */
function nachMonat(termine: Termin[]): { monat: string; termine: Termin[] }[] {
  const gruppen: { monat: string; termine: Termin[] }[] = []
  termine.forEach(t => {
    const monat = `${MONATE[Number(t.datum.slice(5, 7)) - 1] ?? ''} ${t.datum.slice(0, 4)}`
    const letzte = gruppen[gruppen.length - 1]
    if (letzte && letzte.monat === monat) letzte.termine.push(t)
    else gruppen.push({ monat, termine: [t] })
  })
  return gruppen
}

export default function TermineListe({ searchParams }: { searchParams: { quelle?: string; vergangene?: string; geloescht?: string } }) {
  const { rechte } = sitzungErzwingen()
  const db = datenbank()
  const heute = heuteBerlin()
  const quelle: QuellenFilter = FILTER.some(f => f.wert === searchParams.quelle) ? (searchParams.quelle as QuellenFilter) : 'alle'
  const mitVergangenen = searchParams.vergangene === '1'

  const imZeitraum = db
    .select()
    .from(schema.termine)
    .all()
    .filter(t => mitVergangenen || t.datum >= heute)
  const anzahl = (q: QuellenFilter) => (q === 'alle' ? imZeitraum.length : imZeitraum.filter(t => t.quelle === q).length)
  const gefiltert = imZeitraum.filter(t => quelle === 'alle' || t.quelle === quelle)

  const kommende = gefiltert.filter(t => t.datum >= heute).sort((a, b) => a.datum.localeCompare(b.datum) || nachUhrzeit(a, b))
  // Vergangene: die jüngsten zuerst
  const vergangene = gefiltert.filter(t => t.datum < heute).sort((a, b) => b.datum.localeCompare(a.datum) || nachUhrzeit(a, b))
  const namen = namensVerzeichnis(db)
  const zeigtSync = gefiltert.some(t => t.quelle !== 'manuell')

  const link = (q: QuellenFilter, v: boolean) => {
    const teile: string[] = []
    if (q !== 'alle') teile.push(`quelle=${q}`)
    if (v) teile.push('vergangene=1')
    return '/verwaltung/termine' + (teile.length ? `?${teile.join('&')}` : '')
  }

  const liste = (termine: Termin[]) => (
    <div className="space-y-6">
      {nachMonat(termine).map(gruppe => (
        <div key={gruppe.monat}>
          <h3 className="text-xs text-[#6b6b6b] mb-1.5">{gruppe.monat}</h3>
          <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
            {gruppe.termine.map(t => {
              const bearbeitbar = terminBearbeitbar(rechte, t)
              const tag = new Date(t.datum + 'T12:00:00Z')
              const bereich = t.bereich || (t.sparteId != null ? namen.sparten.get(t.sparteId) : null) || 'Allgemein'
              return (
                <li key={t.id}>
                  <Link href={`/verwaltung/termine/${t.id}`} className="flex items-center gap-3 py-2.5 px-1 hover:bg-[#0a0a0a]/[0.03]">
                    <span className="w-11 shrink-0 text-center leading-tight">
                      <span className="block text-[11px] uppercase text-[#6b6b6b]">{WOCHENTAGE_KURZ[tag.getUTCDay()]}</span>
                      <span className="block font-display text-2xl tabular-nums">{t.datum.slice(8, 10)}</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{t.titel}</span>
                        {t.quelle !== 'manuell' && <Badge>{QUELLEN_NAMEN[t.quelle]}</Badge>}
                      </span>
                      <span className="block text-xs text-[#6b6b6b] mt-0.5">
                        {[t.uhrzeit, t.ort, bereich].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {bearbeitbar ? (
                      <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                    ) : (
                      <span className="shrink-0 text-[#6b6b6b]" title={t.quelle === 'manuell' ? 'Nur ansehen' : 'Wird automatisch abgeglichen'}>
                        {t.quelle === 'manuell' ? <Lock size={15} /> : <RefreshCw size={15} />}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <Seitenkopf
        titel="TERMINE"
        untertitel="Vereinstermine und Spiele, wie sie auf der Website erscheinen."
        aktionen={
          darfTermineAnlegen(rechte) && (
            <Link href="/verwaltung/termine/neu" className={knopfKlassen.primaer}>
              <Plus size={15} /> Neuer Termin
            </Link>
          )
        }
      />

      <div className="space-y-6">
        {searchParams.geloescht && <Meldung art="erfolg">Der Termin wurde gelöscht.</Meldung>}

        <div className="flex flex-wrap items-center gap-2">
          {FILTER.map(f => (
            <Link
              key={f.wert}
              href={link(f.wert, mitVergangenen)}
              className={`rounded-sm px-3 py-1.5 text-sm border transition-colors ${
                f.wert === quelle ? 'bg-[#0a0a0a] text-[#f5f5f0] border-[#0a0a0a]' : 'bg-white border-[#0a0a0a]/20 hover:border-[#0a0a0a]/50'
              }`}
            >
              {f.text} <span className="opacity-60 tabular-nums">{anzahl(f.wert)}</span>
            </Link>
          ))}
          <Link
            href={link(quelle, !mitVergangenen)}
            className="ml-auto inline-flex items-center gap-2 text-sm text-[#4a4a4a] hover:text-[#0a0a0a]"
            role="switch"
            aria-checked={mitVergangenen}
          >
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border ${mitVergangenen ? 'bg-[#0a0a0a] border-[#0a0a0a] text-white' : 'border-[#0a0a0a]/40 bg-white'}`}>
              {mitVergangenen && '✓'}
            </span>
            auch vergangene
          </Link>
        </div>

        {zeigtSync && (
          <Meldung art="hinweis">
            <span className="inline-flex items-start gap-2">
              <RefreshCw size={15} className="mt-0.5 shrink-0" />
              <span>
                Spiele von fussball.de und click-tt lassen sich hier nur ansehen: Sie werden jede Nacht automatisch abgeglichen –
                Änderungen hier würden überschrieben.
              </span>
            </span>
          </Meldung>
        )}

        <Karte titel="Kommende Termine">
          {kommende.length === 0 ? <LeerHinweis>Keine kommenden Termine.</LeerHinweis> : liste(kommende)}
        </Karte>

        {mitVergangenen && (
          <Karte titel="Vergangene Termine">
            {vergangene.length === 0 ? <LeerHinweis>Keine vergangenen Termine.</LeerHinweis> : liste(vergangene)}
          </Karte>
        )}
      </div>
    </>
  )
}
