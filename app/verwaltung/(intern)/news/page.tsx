import Link from 'next/link'
import type { Metadata } from 'next'
import { desc } from 'drizzle-orm'
import { ChevronRight, Plus } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { namensVerzeichnis, zuordnungsOptionen, zuordnungText } from '@/lib/verwaltung/inhalte/gemeinsam'
import { kannZuordnung } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { datumDeutsch } from '@/lib/verwaltung/text'
import { Badge, Karte, knopfKlassen, LeerHinweis, Meldung, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'News' }

export default async function NewsListe(props: { searchParams: Promise<{ geloescht?: string }> }) {
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  const db = datenbank()

  const alle = db.select().from(schema.news).orderBy(desc(schema.news.datum), desc(schema.news.id)).all()
  const sichtbar = alle.filter(n => kannZuordnung(db, rechte, n))
  const namen = namensVerzeichnis(db)
  const darfAnlegen = zuordnungsOptionen(db, rechte).length > 0

  return (
    <>
      <Seitenkopf
        titel="NEWS"
        untertitel={rechte.istAdmin ? 'Alle News des Vereins.' : 'News deiner Sparten, Mannschaften und Gruppen.'}
        aktionen={
          darfAnlegen && (
            <Link href="/verwaltung/news/neu" className={knopfKlassen.primaer}>
              <Plus size={15} /> Neue News
            </Link>
          )
        }
      />

      <div className="space-y-6">
        {searchParams.geloescht && <Meldung art="erfolg">Die News wurde gelöscht.</Meldung>}

        <Karte>
          {sichtbar.length === 0 ? (
            <LeerHinweis>{darfAnlegen ? 'Noch keine News. Leg mit „Neue News“ die erste an.' : 'Hier gibt es keine News, die du bearbeiten darfst.'}</LeerHinweis>
          ) : (
            <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
              {sichtbar.map(n => {
                const bild = medienUrl(n.bild)
                const zuordnung = zuordnungText(n, namen)
                return (
                  <li key={n.id}>
                    <Link href={`/verwaltung/news/${n.id}`} className="flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03]">
                      {bild ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bild} alt="" className="w-14 h-14 rounded-sm object-cover shrink-0 bg-[#f0f0ea]" loading="lazy" />
                      ) : (
                        <span className="w-14 h-14 rounded-sm shrink-0 bg-[#f0f0ea]" aria-hidden />
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{n.titel}</span>
                          {n.veroeffentlicht ? <Badge ton="erfolg">veröffentlicht</Badge> : <Badge ton="warnung">Entwurf</Badge>}
                        </span>
                        <span className="block text-xs text-[#6b6b6b] mt-0.5">
                          {datumDeutsch(n.datum)}
                          {n.kategorie && <> · {n.kategorie}</>} · {zuordnung.art === 'Verein' ? zuordnung.text : `${zuordnung.art}: ${zuordnung.text}`}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Karte>
      </div>
    </>
  )
}
