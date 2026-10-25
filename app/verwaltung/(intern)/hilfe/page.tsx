import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Badge, Seitenkopf } from '@/components/verwaltung/ui'
import { BEREICHE, sichtbareThemen } from './themen'
import { ZIELGRUPPEN_TEXT } from './typen'
import { ErledigtHaken } from './uebung/fortschritt'

export const metadata: Metadata = { title: 'Hilfe' }

export default async function HilfeUebersicht() {
  const { rechte } = await sitzungErzwingen()
  const themen = sichtbareThemen(rechte)

  return (
    <>
      <Seitenkopf
        titel="Hilfe"
        untertitel="Probier es aus: In jeder Übung löst du kleine Aufgaben in nachgebauten Formularen – es wird nichts gespeichert, du kannst nichts kaputt machen. Du siehst nur die Übungen, die zu deinen Rechten passen."
      />

      <div className="space-y-10">
        {BEREICHE.map(({ bereich, titel }) => {
          const kacheln = themen.filter(t => t.bereich === bereich)
          if (kacheln.length === 0) return null
          return (
            <section key={bereich}>
              <h2 className="text-[11px] tracking-[0.18em] uppercase font-semibold text-[#0a0a0a] mb-3">{titel}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kacheln.map(t => {
                  const Symbol = t.icon
                  const fuer = rechte.istAdmin ? ZIELGRUPPEN_TEXT[t.zielgruppe] : null
                  return (
                    <li key={t.slug}>
                      <Link
                        href={`/verwaltung/hilfe/${t.slug}`}
                        className="group flex h-full flex-col rounded-sm border border-[#0a0a0a]/10 bg-white p-5 transition-colors hover:border-[#0a0a0a]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]"
                      >
                        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-sm bg-[#0a0a0a] text-[#f5f5f0]">
                          <Symbol size={20} aria-hidden="true" />
                        </span>
                        <span className="font-display text-2xl tracking-tight leading-none">{t.titel}</span>
                        <span className="mt-2 flex-1 text-sm leading-relaxed text-[#6b6b6b]">{t.kurz}</span>
                        <span className="mt-4 flex flex-wrap items-center justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-2">
                            {fuer && <Badge>{fuer}</Badge>}
                            <ErledigtHaken slug={t.slug} />
                          </span>
                          <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium">
                            Üben <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
