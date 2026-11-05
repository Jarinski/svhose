import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react'
import { datenbank } from '@/lib/db'
import { belegung, eintragSchluessel, ueberschneidungenInListe, type BelegungsEintrag } from '@/lib/buchungen/belegung'
import {
  amTag,
  datumMitTag,
  heute,
  istMonat,
  MONATE,
  monatPlus,
  monatsRaster,
  ORT_NAMEN,
  orteUeberschneiden,
  tagPlus,
  uhrzeitAmTag,
  WOCHENTAGE_KURZ,
  type BuchungOrt,
} from '@/lib/buchungen/zeit'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Legende, REGEL_FARBE, STATUS_FARBEN, StatusMarke } from '@/components/verwaltung/buchungen/Anzeige'
import { Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'
import { ausfallUmschalten } from '../aktionen'

export const metadata: Metadata = { title: 'Belegungskalender' }

const ORT_FILTER = { alle: 'Alles', vereinsheim: 'Vereinsheim', gelaende: 'Gelände' } as const
type OrtFilter = keyof typeof ORT_FILTER
const MAX_IN_ZELLE = 4

function farbe(e: BelegungsEintrag): string {
  return e.typ === 'regel' ? REGEL_FARBE : STATUS_FARBEN[e.status]
}

export default async function KalenderSeite(props: { searchParams: Promise<{ monat?: string; ort?: string; tag?: string }> }) {
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  const db = datenbank()

  const heuteDatum = heute()
  const monat = istMonat(searchParams.monat) ? searchParams.monat : heuteDatum.slice(0, 7)
  const ort: OrtFilter = searchParams.ort === 'vereinsheim' || searchParams.ort === 'gelaende' ? searchParams.ort : 'alle'
  const tage = monatsRaster(monat)
  const rasterStart = tage[0]
  const rasterEnde = tage[tage.length - 1] // Sonntag der letzten Woche
  const tag = searchParams.tag && searchParams.tag >= rasterStart && searchParams.tag <= rasterEnde ? searchParams.tag : null

  const alle = belegung(db, rasterStart, tagPlus(rasterEnde, 1)).filter(e => ort === 'alle' || orteUeberschneiden(e.ort, ort as BuchungOrt))
  // Überschneidungen immer über alle Orte prüfen, damit "beides" auch im gefilterten Kalender auffällt
  const konflikte = ueberschneidungenInListe(belegung(db, rasterStart, tagPlus(rasterEnde, 1)))

  const amDatum = (d: string) => alle.filter(e => amTag(e, d))

  const link = (werte: { monat?: string; ort?: OrtFilter; tag?: string | null }) => {
    const p = new URLSearchParams()
    p.set('monat', werte.monat ?? monat)
    const o = werte.ort ?? ort
    if (o !== 'alle') p.set('ort', o)
    const t = werte.tag === undefined ? tag : werte.tag
    if (t) p.set('tag', t)
    return `/verwaltung/buchungen/kalender?${p.toString()}${t ? '#tag' : ''}`
  }
  const [jahrZahl, monatZahl] = monat.split('-').map(Number)

  const eintragZeile = (e: BelegungsEintrag, d: string, kompakt: boolean) => {
    const konflikt = (konflikte.get(eintragSchluessel(e)) ?? []).length > 0
    const ausgefallen = e.typ === 'regel' && e.ausgefallen
    const inhalt = (
      <>
        <span className="tabular-nums">{uhrzeitAmTag(e, d)}</span> <span className={kompakt ? '' : 'font-medium'}>{e.titel}</span>
        {ort === 'alle' && e.ort !== 'vereinsheim' && <span className="opacity-70"> · {e.ort === 'gelaende' ? 'Gelände' : 'Heim + Gelände'}</span>}
      </>
    )
    const klassen = `block truncate rounded-sm px-1.5 py-0.5 ${farbe(e)} ${konflikt ? 'ring-2 ring-red-500' : ''} ${ausgefallen ? 'line-through opacity-50' : ''}`
    return e.typ === 'buchung' ? (
      <Link href={`/verwaltung/buchungen/${e.buchung.id}`} className={`${klassen} hover:brightness-95`} title={`${e.titel} (${uhrzeitAmTag(e, d)})`}>
        {inhalt}
      </Link>
    ) : (
      <span className={klassen} title={`${e.titel} (${uhrzeitAmTag(e, d)}, Regelbelegung${ausgefallen ? ', fällt aus' : ''})`}>
        {inhalt}
      </span>
    )
  }

  const tagesEintraege = tag ? amDatum(tag) : []

  return (
    <>
      <Seitenkopf
        titel="KALENDER"
        zurueck={{ href: '/verwaltung/buchungen', text: 'Buchungen' }}
        untertitel="Regelbelegung und Buchungen von Vereinsheim und Gelände. Abgelehnte und stornierte Buchungen stehen nicht im Kalender."
        aktionen={
          <>
            <Link href="/verwaltung/buchungen/regeln" className={knopfKlassen.sekundaer}>
              <Repeat size={15} /> Regelbelegung
            </Link>
            <Link href={`/verwaltung/buchungen/neu${tag ? `?datum=${tag}` : ''}`} className={knopfKlassen.primaer}>
              <Plus size={15} /> Belegung eintragen
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={link({ monat: monatPlus(monat, -1), tag: null })} className={knopfKlassen.leise} aria-label="Vorheriger Monat">
              <ChevronLeft size={18} />
            </Link>
            <h2 className="font-display text-3xl tracking-tight min-w-[11ch] text-center">
              {MONATE[monatZahl - 1].toUpperCase()} {jahrZahl}
            </h2>
            <Link href={link({ monat: monatPlus(monat, 1), tag: null })} className={knopfKlassen.leise} aria-label="Nächster Monat">
              <ChevronRight size={18} />
            </Link>
            {monat !== heuteDatum.slice(0, 7) && (
              <Link href={link({ monat: heuteDatum.slice(0, 7), tag: heuteDatum })} className="ml-2 text-sm underline underline-offset-4 text-[#6b6b6b] hover:text-[#0a0a0a]">
                Heute
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ORT_FILTER) as OrtFilter[]).map(o => (
              <Link
                key={o}
                href={link({ ort: o })}
                className={`rounded-full px-3 py-1.5 text-sm border ${ort === o ? 'bg-[#0a0a0a] text-[#f5f5f0] border-[#0a0a0a]' : 'bg-white border-[#0a0a0a]/15 hover:border-[#0a0a0a]/40'}`}
              >
                {ORT_FILTER[o]}
              </Link>
            ))}
          </div>
        </div>
        <Legende />

        {/* Monatsraster ab Tablet */}
        <div className="hidden md:block bg-white border border-[#0a0a0a]/10 rounded-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#0a0a0a]/10 bg-[#f5f5f0]">
            {WOCHENTAGE_KURZ.map(w => (
              <div key={w} className="px-2 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6b6b6b]">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {tage.map(d => {
              const eintraege = amDatum(d)
              const imMonat = d.slice(0, 7) === monat
              const gewaehlt = d === tag
              return (
                <div
                  key={d}
                  className={`min-h-[7.5rem] border-b border-r border-[#0a0a0a]/[0.07] p-1.5 text-[11px] leading-tight ${imMonat ? '' : 'bg-[#f5f5f0]/60'} ${
                    gewaehlt ? 'outline outline-2 -outline-offset-2 outline-[#0a0a0a]' : ''
                  }`}
                >
                  <Link
                    href={link({ monat, tag: d })}
                    className={`inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 mb-1 rounded-full text-xs tabular-nums hover:bg-[#0a0a0a]/[0.08] ${
                      d === heuteDatum ? 'bg-[#0a0a0a] text-[#f5f5f0] hover:bg-[#2a2a2a]' : imMonat ? 'text-[#0a0a0a]' : 'text-[#6b6b6b]'
                    }`}
                    aria-label={`${datumMitTag(d)} öffnen`}
                  >
                    {Number(d.slice(8))}
                  </Link>
                  <div className="space-y-0.5">
                    {eintraege.slice(0, MAX_IN_ZELLE).map(e => (
                      <div key={eintragSchluessel(e)}>{eintragZeile(e, d, true)}</div>
                    ))}
                    {eintraege.length > MAX_IN_ZELLE && (
                      <Link href={link({ monat, tag: d })} className="block px-1.5 text-[#6b6b6b] hover:text-[#0a0a0a]">
                        + {eintraege.length - MAX_IN_ZELLE} weitere
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Liste auf dem Handy: nur Tage mit Einträgen */}
        <div className="md:hidden space-y-3">
          {tage
            .filter(d => d.slice(0, 7) === monat && amDatum(d).length > 0)
            .map(d => (
              <div key={d} className="bg-white border border-[#0a0a0a]/10 rounded-sm p-3">
                <Link href={link({ monat, tag: d })} className={`text-sm font-medium ${d === heuteDatum ? 'underline underline-offset-4' : ''}`}>
                  {datumMitTag(d)}
                </Link>
                <div className="mt-2 space-y-1 text-xs">
                  {amDatum(d).map(e => (
                    <div key={eintragSchluessel(e)}>{eintragZeile(e, d, false)}</div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {tag && (
          <div id="tag" className="scroll-mt-20">
            <Karte
              titel={datumMitTag(tag)}
              aktionen={
                <Link href={`/verwaltung/buchungen/neu?datum=${tag}`} className={knopfKlassen.sekundaer}>
                  <Plus size={15} /> An diesem Tag eintragen
                </Link>
              }
            >
              {tagesEintraege.length === 0 ? (
                <LeerHinweis>{ort === 'alle' ? 'An diesem Tag ist nichts belegt.' : `${ORT_FILTER[ort]}: an diesem Tag frei.`}</LeerHinweis>
              ) : (
                <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
                  {tagesEintraege.map(e => {
                    const konflikt = (konflikte.get(eintragSchluessel(e)) ?? []).length > 0
                    return (
                      <li key={eintragSchluessel(e)} className="flex flex-wrap items-center gap-3 py-3">
                        <span className={`w-1.5 self-stretch rounded-sm ${farbe(e)}`} aria-hidden="true" />
                        <span className="flex-1 min-w-[12rem]">
                          <span className="flex flex-wrap items-center gap-2">
                            {e.typ === 'buchung' ? (
                              <Link href={`/verwaltung/buchungen/${e.buchung.id}`} className="font-medium underline-offset-4 hover:underline">
                                {e.titel}
                              </Link>
                            ) : (
                              <span className={`font-medium ${e.ausgefallen ? 'line-through text-[#6b6b6b]' : ''}`}>{e.titel}</span>
                            )}
                            {e.typ === 'buchung' ? <StatusMarke status={e.status} /> : <span className="text-[11px] text-[#6b6b6b]">Regelbelegung</span>}
                            {e.typ === 'regel' && e.ausgefallen && <span className="text-[11px] font-medium text-[#6b6b6b]">fällt aus</span>}
                            {konflikt && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700">
                                <AlertTriangle size={12} /> Überschneidung
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-[#6b6b6b] mt-0.5">
                            {uhrzeitAmTag(e, tag)} · {ORT_NAMEN[e.ort]}
                            {e.typ === 'buchung' && [e.buchung.name, e.buchung.bereich, e.buchung.nummer].filter(Boolean).map(t => ` · ${t}`)}
                          </span>
                        </span>
                        {e.typ === 'regel' && (
                          <form action={ausfallUmschalten}>
                            <input type="hidden" name="regelId" value={e.regelId} />
                            <input type="hidden" name="datum" value={e.datum} />
                            <input type="hidden" name="ausgefallen" value={e.ausgefallen ? '0' : '1'} />
                            <button type="submit" className={knopfKlassen.sekundaer}>
                              {e.ausgefallen ? 'Findet doch statt' : 'Fällt an diesem Tag aus'}
                            </button>
                          </form>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Karte>
          </div>
        )}
      </div>
    </>
  )
}
