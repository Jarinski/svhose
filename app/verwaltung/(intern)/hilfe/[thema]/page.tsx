import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Badge, Seitenkopf } from '@/components/verwaltung/ui'
import { sichtbareThemen, THEMEN } from '../themen'
import { ZIELGRUPPEN_TEXT } from '../typen'
import Tutorial from '../uebung/Tutorial'

export async function generateMetadata(props: { params: Promise<{ thema: string }> }): Promise<Metadata> {
  const { thema } = await props.params
  const t = THEMEN.find(x => x.slug === thema)
  return { title: t ? `Übung: ${t.titel}` : 'Hilfe' }
}

export default async function HilfeUebung(props: { params: Promise<{ thema: string }> }) {
  const { thema: slug } = await props.params
  const { rechte } = await sitzungErzwingen()
  const themen = sichtbareThemen(rechte)
  const i = themen.findIndex(t => t.slug === slug)
  // Unbekannt oder nicht für diesen Zugang: zurück zur Übersicht der Hilfe
  if (i < 0) redirect('/verwaltung/hilfe')
  const thema = themen[i]
  const naechste = themen[i + 1]
  const fuer = ZIELGRUPPEN_TEXT[thema.zielgruppe]
  const anleitung = `/verwaltung/hilfe/${thema.slug}/anleitung`

  return (
    <>
      <Seitenkopf titel={thema.titel} zurueck={{ href: '/verwaltung/hilfe', text: 'Alle Übungen' }} untertitel={thema.kurz} />

      <div className="max-w-3xl space-y-8">
        <div className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {fuer && <Badge>Für: {fuer}</Badge>}
          <Link href={anleitung} className="inline-flex items-center gap-1.5 text-sm text-[#4a4a4a] underline underline-offset-4 hover:text-[#0a0a0a]">
            <BookOpen size={14} aria-hidden="true" /> Lieber lesen? Zur ausführlichen Anleitung
          </Link>
        </div>

        <Tutorial
          slug={thema.slug}
          ziel={thema.ziel}
          anleitung={anleitung}
          naechste={naechste && { href: `/verwaltung/hilfe/${naechste.slug}`, titel: naechste.titel }}
        />
      </div>
    </>
  )
}
