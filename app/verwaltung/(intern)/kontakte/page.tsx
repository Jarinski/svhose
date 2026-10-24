import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { ExternalLink } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { knopfKlassen, Seitenkopf } from '@/components/verwaltung/ui'
import KontakteFormular, { type FunktionZeile } from './KontakteFormular'
import { funktionenLaden, kontakteStand } from './logik'

export const metadata: Metadata = { title: 'Kontaktseite' }

export default async function KontakteSeite() {
  await adminErzwingen()
  const db = datenbank()
  const funktionen = funktionenLaden(db)
  const personen = db.select({ id: schema.personen.id, name: schema.personen.name }).from(schema.personen).orderBy(asc(schema.personen.name)).all()
  const sparten = db
    .select({ id: schema.sparten.id, name: schema.sparten.name })
    .from(schema.sparten)
    .orderBy(asc(schema.sparten.reihenfolge), asc(schema.sparten.name))
    .all()

  const zeilen: Record<string, FunktionZeile[]> = {}
  schema.FUNKTIONS_GRUPPEN.forEach(g => {
    zeilen[g] = funktionen
      .filter(f => f.gruppe === g)
      .map(f => ({ schluessel: `f${f.id}`, id: f.id, personId: f.personId, personName: f.person, bezeichnung: f.bezeichnung, sparteId: f.sparteId }))
  })

  return (
    <>
      <Seitenkopf
        titel="KONTAKTSEITE"
        untertitel="Wer steht auf der Seite „Kontakt“? Telefon, E-Mail und Foto kommen aus den Personendaten."
        aktionen={
          <a href="/ansprechpartner" target="_blank" rel="noopener" className={knopfKlassen.sekundaer}>
            <ExternalLink size={15} /> Kontaktseite ansehen ↗
          </a>
        }
      />
      <KontakteFormular
        stand={kontakteStand(db)}
        zeilen={{ vorstand: zeilen.vorstand, abteilungsleitung: zeilen.abteilungsleitung, weitere: zeilen.weitere }}
        personen={personen}
        sparten={sparten}
      />
    </>
  )
}
