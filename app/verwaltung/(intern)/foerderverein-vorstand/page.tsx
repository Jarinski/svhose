import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { datenbank } from '@/lib/db'
import { personenFuerAuswahl } from '@/lib/verwaltung/person-bearbeiten'
import { darfFoerdervereinVorstand, kannPerson } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { knopfKlassen, Seitenkopf } from '@/components/verwaltung/ui'
import VorstandFormular from './VorstandFormular'
import { vorstandLaden, vorstandStand } from './logik'

export const metadata: Metadata = { title: 'Förderverein-Vorstand' }

export default async function FoerdervereinVorstandSeite() {
  const { rechte } = await sitzungErzwingen()
  if (!darfFoerdervereinVorstand(rechte)) redirect('/verwaltung')
  const db = datenbank()
  const zeilen = vorstandLaden(db)
  const imVorstand = zeilen.map(z => z.personId)

  return (
    <>
      <Seitenkopf
        titel="FÖRDERVEREIN-VORSTAND"
        untertitel="Wer steht auf der Seite „Förderverein → Vorstand“? Telefon, E-Mail und Foto kommen aus den Personendaten."
        aktionen={
          <a href="/foerderverein/vorstand" target="_blank" rel="noopener" className={knopfKlassen.sekundaer}>
            <ExternalLink size={15} /> Vorstand ansehen ↗
          </a>
        }
      />
      <VorstandFormular
        stand={vorstandStand(db)}
        zeilen={zeilen.map(z => ({ schluessel: `v${z.id}`, id: z.id, personId: z.personId, neu: null, bezeichnung: z.bezeichnung }))}
        // Kontaktdaten des Vorstands stehen ohnehin auf der Website – für alle anderen reichen Name und Verwendung.
        personen={personenFuerAuswahl(db, rechte, imVorstand)}
        bearbeitbar={imVorstand.filter(id => kannPerson(db, rechte, id))}
      />
    </>
  )
}
