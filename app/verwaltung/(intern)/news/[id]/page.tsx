import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { heuteBerlin, vorschlaege, zuordnungsOptionen, zuordnungWert } from '@/lib/verwaltung/inhalte/gemeinsam'
import { kannZuordnung } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Badge, knopfKlassen, Seitenkopf } from '@/components/verwaltung/ui'
import NewsFormular from '../NewsFormular'

export const metadata: Metadata = { title: 'News bearbeiten' }

export default function NewsBearbeiten({ params, searchParams }: { params: { id: string }; searchParams: { neu?: string } }) {
  const { rechte } = sitzungErzwingen()
  const db = datenbank()
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  const news = db.select().from(schema.news).where(eq(schema.news.id, id)).get()
  if (!news || !kannZuordnung(db, rechte, news)) notFound()

  const kategorien = vorschlaege(db.select({ k: schema.news.kategorie }).from(schema.news).all().map(n => n.k))

  return (
    <>
      <Seitenkopf
        titel="NEWS BEARBEITEN"
        zurueck={{ href: '/verwaltung/news', text: 'Alle News' }}
        untertitel={
          <span className="inline-flex flex-wrap items-center gap-2">
            {news.veroeffentlicht ? <Badge ton="erfolg">veröffentlicht</Badge> : <Badge ton="warnung">Entwurf</Badge>}
            <span>Zuletzt gespeichert {zeitpunktDeutsch(news.geaendertAm)}</span>
          </span>
        }
        aktionen={
          news.veroeffentlicht && (
            <a href={`/news/${news.slug}`} target="_blank" rel="noopener noreferrer" className={knopfKlassen.sekundaer}>
              Auf Website ansehen <ExternalLink size={14} />
            </a>
          )
        }
      />
      <NewsFormular
        news={{
          id: news.id,
          titel: news.titel,
          slug: news.slug,
          datum: news.datum,
          kategorie: news.kategorie ?? '',
          teaser: news.teaser ?? '',
          inhalt: news.inhalt,
          bildUrl: medienUrl(news.bild),
          veroeffentlicht: news.veroeffentlicht,
          zuordnung: zuordnungWert(news),
          geaendertAm: news.geaendertAm,
        }}
        heute={heuteBerlin()}
        zuordnungen={zuordnungsOptionen(db, rechte)}
        kategorien={kategorien}
        hinweis={
          searchParams.neu
            ? news.veroeffentlicht
              ? 'Die News ist angelegt und auf der Website zu sehen.'
              : 'Die News ist als Entwurf angelegt – noch nicht auf der Website.'
            : undefined
        }
      />
    </>
  )
}
