import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { ExternalLink } from 'lucide-react'
import { getFoerdervereinDaten } from '@/lib/content'
import { datenbank, schema } from '@/lib/db'
import { foerdervereinSeite } from '@/lib/foerderverein-seiten'
import { medienUrl } from '@/lib/medien'
import { bilderUmwandeln } from '@/lib/seiten'
import { seiteLaden } from '@/lib/verwaltung/inhalte/seiten'
import { darfFoerdervereinSeiten } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { knopfKlassen, Seitenkopf } from '@/components/verwaltung/ui'
import SeitenFormular from '../SeitenFormular'

export async function generateMetadata(props: { params: Promise<{ seite: string }> }): Promise<Metadata> {
  const seite = foerdervereinSeite((await props.params).seite)
  return { title: seite ? `${seite.name} (Förderverein)` : 'Förderverein-Seiten' }
}

export default async function FoerdervereinSeiteBearbeiten(props: { params: Promise<{ seite: string }> }) {
  const params = await props.params
  const { rechte } = await sitzungErzwingen()
  if (!darfFoerdervereinSeiten(rechte)) redirect('/verwaltung')
  const seite = foerdervereinSeite(params.seite)
  if (!seite) notFound()

  const db = datenbank()
  const { inhalt, stand, geaendertAm, id } = seiteLaden(db, seite)
  const daten = await getFoerdervereinDaten()

  // Wer zuletzt gespeichert hat – aus dem Verlauf
  const letzte =
    id != null
      ? db
          .select({ name: schema.verlauf.zugangName })
          .from(schema.verlauf)
          .where(and(eq(schema.verlauf.objektTyp, 'seiten'), eq(schema.verlauf.objektId, id)))
          .orderBy(desc(schema.verlauf.id))
          .get()
      : undefined

  return (
    <>
      <Seitenkopf
        titel={seite.titel}
        zurueck={{ href: '/verwaltung/foerderverein-seiten', text: 'Alle Förderverein-Seiten' }}
        untertitel={
          <>
            {seite.beschreibung} Bausteine hinzufügen, verschieben und gestalten.
            {geaendertAm ? (
              <span className="block mt-1">
                Zuletzt gespeichert {zeitpunktDeutsch(geaendertAm)}
                {letzte?.name ? ` von ${letzte.name}` : ''}
              </span>
            ) : (
              <span className="block mt-1">Noch nie gespeichert – die Website zeigt den ursprünglichen Stand.</span>
            )}
          </>
        }
        aktionen={
          <a href={seite.pfad} target="_blank" rel="noopener noreferrer" className={knopfKlassen.sekundaer}>
            Seite ansehen <ExternalLink size={14} />
          </a>
        }
      />
      <SeitenFormular
        seite={seite.slug}
        kopf={{ kicker: seite.kicker, titel: seite.titel }}
        stand={stand}
        inhalt={bilderUmwandeln(inhalt, bild => (bild ? { ...bild, url: medienUrl(bild.pfad) as string } : null))}
        // Der Text der News wird für die Vorschau nicht gebraucht
        daten={{ news: daten.news.map(n => ({ ...n, body: '' })), downloads: daten.downloads }}
      />
    </>
  )
}
