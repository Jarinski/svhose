import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { ExternalLink } from 'lucide-react'
import { bilderUmwandeln } from '@/lib/chronik'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { chronikLaden } from '@/lib/verwaltung/inhalte/chronik'
import { darfChronik } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { knopfKlassen, Seitenkopf } from '@/components/verwaltung/ui'
import ChronikFormular from './ChronikFormular'

export const metadata: Metadata = { title: 'Chronik' }

export default async function ChronikSeite() {
  const { rechte } = await sitzungErzwingen()
  if (!darfChronik(rechte)) redirect('/verwaltung')
  const db = datenbank()
  const { inhalt, stand, geaendertAm } = chronikLaden(db)

  // Wer zuletzt gespeichert hat – aus dem Verlauf
  const letzte = geaendertAm
    ? db
        .select({ name: schema.verlauf.zugangName })
        .from(schema.verlauf)
        .where(and(eq(schema.verlauf.objektTyp, 'seiten'), eq(schema.verlauf.bezeichnung, 'Förderverein-Chronik')))
        .orderBy(desc(schema.verlauf.id))
        .get()
    : undefined

  return (
    <>
      <Seitenkopf
        titel="CHRONIK"
        untertitel={
          <>
            Die Geschichte des Fördervereins unter Förderverein → Chronik. Bausteine hinzufügen, verschieben und gestalten.{' '}
            {geaendertAm ? (
              <span className="block mt-1">
                Zuletzt gespeichert {zeitpunktDeutsch(geaendertAm)}
                {letzte?.name ? ` von ${letzte.name}` : ''}
              </span>
            ) : (
              <span className="block mt-1">Noch nie gespeichert – die Website zeigt den ursprünglichen Text.</span>
            )}
          </>
        }
        aktionen={
          <a href="/foerderverein/chronik" target="_blank" rel="noopener noreferrer" className={knopfKlassen.sekundaer}>
            Chronik ansehen <ExternalLink size={14} />
          </a>
        }
      />
      <ChronikFormular stand={stand} inhalt={bilderUmwandeln(inhalt, bild => (bild ? { ...bild, url: medienUrl(bild.pfad) as string } : null))} />
    </>
  )
}
