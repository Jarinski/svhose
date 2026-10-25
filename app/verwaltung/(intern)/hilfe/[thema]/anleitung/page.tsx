import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, ExternalLink, FlaskConical } from 'lucide-react'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Badge, knopfKlassen, Seitenkopf } from '@/components/verwaltung/ui'
import { sichtbareThemen, THEMEN } from '../../themen'
import { ZIELGRUPPEN_TEXT } from '../../typen'

export async function generateMetadata(props: { params: Promise<{ thema: string }> }): Promise<Metadata> {
  const { thema } = await props.params
  const t = THEMEN.find(x => x.slug === thema)
  return { title: t ? `Anleitung: ${t.titel}` : 'Hilfe' }
}

export default async function HilfeAnleitung(props: { params: Promise<{ thema: string }> }) {
  const { thema: slug } = await props.params
  const { rechte } = await sitzungErzwingen()
  const themen = sichtbareThemen(rechte)
  const i = themen.findIndex(t => t.slug === slug)
  // Unbekannt oder nicht für diesen Zugang: zurück zur Übersicht der Hilfe
  if (i < 0) redirect('/verwaltung/hilfe')
  const thema = themen[i]
  const vorher = themen[i - 1]
  const nachher = themen[i + 1]
  const fuer = ZIELGRUPPEN_TEXT[thema.zielgruppe]

  return (
    <>
      <Seitenkopf titel={thema.titel} zurueck={{ href: `/verwaltung/hilfe/${thema.slug}`, text: 'Zur Übung' }} untertitel={thema.kurz} />

      <div className="max-w-3xl space-y-10">
        <div className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {fuer && <Badge>Für: {fuer}</Badge>}
          <Link href={`/verwaltung/hilfe/${thema.slug}`} className="inline-flex items-center gap-1.5 text-sm text-[#4a4a4a] underline underline-offset-4 hover:text-[#0a0a0a]">
            <FlaskConical size={14} aria-hidden="true" /> Lieber ausprobieren? Zur Übung
          </Link>
        </div>

        <article className="space-y-10 text-[15px] leading-relaxed text-[#0a0a0a]">{thema.inhalt}</article>

        {(thema.ziel || thema.website) && (
          <div className="flex flex-wrap gap-3 border-t border-[#0a0a0a]/10 pt-6">
            {thema.ziel && (
              <Link href={thema.ziel.href} className={knopfKlassen.primaer}>
                {thema.ziel.text} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
            {thema.website && (
              <a href={thema.website.href} target="_blank" rel="noopener noreferrer" className={knopfKlassen.sekundaer}>
                {thema.website.text} <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        {(vorher || nachher) && (
          <nav aria-label="Weitere Anleitungen" className="grid gap-3 sm:grid-cols-2">
            {vorher ? (
              <Link href={`/verwaltung/hilfe/${vorher.slug}/anleitung`} className="rounded-sm border border-[#0a0a0a]/10 bg-white px-4 py-3 hover:border-[#0a0a0a]/40">
                <span className="flex items-center gap-1 text-xs text-[#6b6b6b]">
                  <ArrowLeft size={13} aria-hidden="true" /> Vorherige Anleitung
                </span>
                <span className="mt-0.5 block text-sm font-medium">{vorher.titel}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {nachher && (
              <Link href={`/verwaltung/hilfe/${nachher.slug}/anleitung`} className="rounded-sm border border-[#0a0a0a]/10 bg-white px-4 py-3 text-right hover:border-[#0a0a0a]/40">
                <span className="flex items-center justify-end gap-1 text-xs text-[#6b6b6b]">
                  Nächste Anleitung <ArrowRight size={13} aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-sm font-medium">{nachher.titel}</span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  )
}
