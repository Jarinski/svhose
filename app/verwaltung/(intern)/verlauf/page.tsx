import Link from 'next/link'
import type { Metadata } from 'next'
import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { auswahlKlasse, Badge, Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'
import { geaenderteFelder } from './vergleich'

export const metadata: Metadata = { title: 'Verlauf' }

const PRO_SEITE = 50

const TYP_NAMEN: Record<string, string> = {
  sparten: 'Sparten',
  mannschaften: 'Mannschaften',
  gruppen: 'Gruppen',
  personen: 'Personen',
  funktionen: 'Kontaktseite',
  sparte_ansprechpartner: 'Ansprechpartner:innen',
  mannschaft_personen: 'Trainerteams',
  gruppe_personen: 'Trainerteams (Gruppen)',
  trainingszeiten: 'Trainingszeiten',
  news: 'News',
  termine: 'Termine',
  downloads: 'Downloads',
  zugaenge: 'Zugänge',
  geraete: 'Anmeldungen & Geräte',
  anmelde_codes: 'Anmelde-Codes',
}

const QUELLEN: Record<string, string> = { verwaltung: 'Verwaltung', api: 'API', telegram: 'Telegram', system: 'System' }

const AKTIONEN: Record<string, { text: string; ton: 'neutral' | 'warnung' | 'erfolg' }> = {
  angelegt: { text: 'angelegt', ton: 'erfolg' },
  geaendert: { text: 'geändert', ton: 'neutral' },
  geloescht: { text: 'gelöscht', ton: 'warnung' },
  anmeldung: { text: 'Anmeldung', ton: 'neutral' },
  abmeldung: { text: 'Abmeldung', ton: 'neutral' },
}

function typName(typ: string) {
  return TYP_NAMEN[typ] ?? typ
}

function einzeln(wert: string | string[] | undefined): string {
  return (Array.isArray(wert) ? wert[0] : wert)?.trim() ?? ''
}

type Suche = { seite?: string | string[]; typ?: string | string[]; zugang?: string | string[] }

export default async function VerlaufSeite(props: { searchParams: Promise<Suche> }) {
  const searchParams = await props.searchParams
  await adminErzwingen()
  const db = datenbank()
  const typ = einzeln(searchParams.typ)
  const zugang = einzeln(searchParams.zugang)

  const bedingungen: SQL[] = []
  if (typ) bedingungen.push(eq(schema.verlauf.objektTyp, typ))
  if (zugang === 'ohne') bedingungen.push(isNull(schema.verlauf.zugangId))
  else if (/^\d+$/.test(zugang)) bedingungen.push(eq(schema.verlauf.zugangId, Number(zugang)))
  const filter = bedingungen.length ? and(...bedingungen) : undefined

  const gesamt = db.select({ n: sql<number>`count(*)` }).from(schema.verlauf).where(filter).get()?.n ?? 0
  const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE))
  const seiteRoh = Number(einzeln(searchParams.seite))
  const seite = Number.isInteger(seiteRoh) && seiteRoh >= 1 ? Math.min(seiteRoh, seiten) : 1
  const eintraege = db
    .select()
    .from(schema.verlauf)
    .where(filter)
    .orderBy(desc(schema.verlauf.zeitpunkt), desc(schema.verlauf.id))
    .limit(PRO_SEITE)
    .offset((seite - 1) * PRO_SEITE)
    .all()

  // Auswahllisten für die Filter
  const typen = db
    .selectDistinct({ typ: schema.verlauf.objektTyp })
    .from(schema.verlauf)
    .all()
    .map(t => t.typ)
    .sort((a, b) => typName(a).localeCompare(typName(b), 'de'))
  const zugaenge = db.select({ id: schema.zugaenge.id, name: schema.zugaenge.name }).from(schema.zugaenge).orderBy(asc(schema.zugaenge.name)).all()

  const link = (s: number) => {
    const p = new URLSearchParams()
    if (typ) p.set('typ', typ)
    if (zugang) p.set('zugang', zugang)
    if (s > 1) p.set('seite', String(s))
    const q = p.toString()
    return `/verwaltung/verlauf${q ? `?${q}` : ''}`
  }

  return (
    <>
      <Seitenkopf titel="VERLAUF" untertitel="Wer hat wann was geändert? Zum Aufklappen auf einen Eintrag tippen." />

      <div className="space-y-6">
        <Karte>
          <form method="get" action="/verwaltung/verlauf" className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label htmlFor="typ" className="block text-sm font-medium mb-1.5">
                Was
              </label>
              <select id="typ" name="typ" defaultValue={typ} className={auswahlKlasse}>
                <option value="">Alles</option>
                {typen.map(t => (
                  <option key={t} value={t}>
                    {typName(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="zugang" className="block text-sm font-medium mb-1.5">
                Wer
              </label>
              <select id="zugang" name="zugang" defaultValue={zugang} className={auswahlKlasse}>
                <option value="">Alle</option>
                {zugaenge.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
                <option value="ohne">System / gelöschte Zugänge</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={knopfKlassen.primaer}>
                Anzeigen
              </button>
              {(typ || zugang) && (
                <Link href="/verwaltung/verlauf" className={knopfKlassen.sekundaer}>
                  Zurücksetzen
                </Link>
              )}
            </div>
          </form>
        </Karte>

        <Karte titel={`${gesamt} ${gesamt === 1 ? 'Eintrag' : 'Einträge'}`} beschreibung={seiten > 1 ? `Seite ${seite} von ${seiten} · neueste zuerst` : 'Neueste zuerst'}>
          {eintraege.length === 0 ? (
            <LeerHinweis>Keine Einträge gefunden.</LeerHinweis>
          ) : (
            <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
              <li className="hidden md:grid grid-cols-[9.5rem_11rem_6.5rem_minmax(0,1fr)] gap-3 px-2 pl-7 py-2 text-[11px] uppercase tracking-[0.12em] text-[#6b6b6b]">
                <span>Zeitpunkt</span>
                <span>Wer · Quelle</span>
                <span>Was</span>
                <span>Bezeichnung</span>
              </li>
              {eintraege.map(v => {
                const felder = geaenderteFelder(v.vorher, v.nachher)
                // Beim Anlegen bzw. Löschen gibt es nur eine Seite – dann eine Spalte statt "—" überall.
                const ohneVorher = v.vorher == null
                const ohneNachher = v.nachher == null
                const aktion = AKTIONEN[v.aktion] ?? { text: v.aktion, ton: 'neutral' as const }
                const kopf = (
                  <div className="grid grid-cols-1 md:grid-cols-[9.5rem_11rem_6.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 items-baseline text-sm">
                    <span className="text-[#6b6b6b] tabular-nums text-xs md:text-sm">{zeitpunktDeutsch(v.zeitpunkt)}</span>
                    <span className="truncate">
                      {v.zugangName ?? 'System'}
                      <span className="text-xs text-[#6b6b6b]"> · {QUELLEN[v.quelle] ?? v.quelle}</span>
                    </span>
                    <span>
                      <Badge ton={aktion.ton}>{aktion.text}</Badge>
                    </span>
                    <span className="min-w-0">
                      <span className="text-xs text-[#6b6b6b] mr-1.5">{typName(v.objektTyp)}:</span>
                      <span className="break-words">{v.bezeichnung}</span>
                    </span>
                  </div>
                )
                return (
                  <li key={v.id}>
                    {felder.length === 0 ? (
                      <div className="px-2 py-3 pl-7">{kopf}</div>
                    ) : (
                      <details className="group">
                        <summary className="list-none cursor-pointer px-2 py-3 hover:bg-[#0a0a0a]/[0.03] flex gap-2 [&::-webkit-details-marker]:hidden">
                          <ChevronRight size={15} className="mt-0.5 shrink-0 text-[#6b6b6b] transition-transform group-open:rotate-90" />
                          <div className="flex-1 min-w-0">{kopf}</div>
                        </summary>
                        <div className="px-2 pb-4 pl-7 space-y-3">
                          {felder.map((f, i) => (
                            <div key={i} className="text-sm">
                              <div className="font-medium mb-1">{f.feld}</div>
                              {/* grid-cols-* = minmax(0, 1fr): lange Werte ohne Leerzeichen dürfen die Kästen nicht verbreitern */}
                              <div className={`grid grid-cols-1 gap-2 ${ohneVorher || ohneNachher ? '' : 'sm:grid-cols-2'}`}>
                                {!ohneVorher && (
                                  <div className="min-w-0 rounded-sm bg-red-50 border border-red-200 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.14em] text-red-800 mb-1">{ohneNachher ? 'Vor dem Löschen' : 'Vorher'}</div>
                                    <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] font-sans text-[13px] leading-relaxed max-h-72 overflow-y-auto">{f.vorher}</pre>
                                  </div>
                                )}
                                {!ohneNachher && (
                                  <div className="min-w-0 rounded-sm bg-emerald-50 border border-emerald-200 px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-800 mb-1">{ohneVorher ? 'Angelegt mit' : 'Nachher'}</div>
                                    <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] font-sans text-[13px] leading-relaxed max-h-72 overflow-y-auto">{f.nachher}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {seiten > 1 && (
            <nav className="flex items-center justify-between gap-3 mt-5" aria-label="Seiten">
              {seite > 1 ? (
                <Link href={link(seite - 1)} className={knopfKlassen.sekundaer}>
                  <ChevronLeft size={15} /> Neuere
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-[#6b6b6b]">
                Seite {seite} von {seiten}
              </span>
              {seite < seiten ? (
                <Link href={link(seite + 1)} className={knopfKlassen.sekundaer}>
                  Ältere <ChevronRight size={15} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </Karte>
      </div>
    </>
  )
}
