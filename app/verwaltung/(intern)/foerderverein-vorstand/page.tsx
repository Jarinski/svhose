import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { ausschnittLesen } from '@/lib/bild-ausschnitt'
import { datenbank } from '@/lib/db'
import { gruppenfotoLesen } from '@/lib/foerderverein-gruppenfoto'
import { medienUrl } from '@/lib/medien'
import { personenFuerAuswahl, sichtbareVerwendungen, verwendungenLaden } from '@/lib/verwaltung/person-bearbeiten'
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
  const gruppenfoto = gruppenfotoLesen(db)
  const gruppenfotoUrl = medienUrl(gruppenfoto?.foto)
  const imVorstand = zeilen.map(z => z.personId)
  const bearbeitbar = imVorstand.filter(id => kannPerson(db, rechte, id))
  // Wer auch anderswo steht (z. B. im Trainerteam), dessen Kontaktdaten ändert ein Admin – sie gelten überall.
  // Der Editor nennt diese Stellen, statt den Link kommentarlos wegzulassen.
  const verwendungen = verwendungenLaden(db)
  const auchEingetragen: Record<number, string[]> = {}
  imVorstand
    .filter(id => bearbeitbar.indexOf(id) < 0)
    .forEach(id => {
      auchEingetragen[id] = sichtbareVerwendungen(verwendungen.get(id), rechte)
        .filter(v => v.art !== 'foerderverein')
        .map(v => v.text)
    })

  return (
    <>
      <Seitenkopf
        titel="FÖRDERVEREIN-VORSTAND"
        untertitel="Wer steht auf der Seite „Förderverein → Vorstand“? Telefon, E-Mail und Foto kommen aus den Personendaten, dazu ein Gruppenfoto über allen."
        aktionen={
          <a href="/foerderverein/vorstand" target="_blank" rel="noopener" className={knopfKlassen.sekundaer}>
            <ExternalLink size={15} /> Vorstand ansehen ↗
          </a>
        }
      />
      <VorstandFormular
        stand={vorstandStand(db)}
        zeilen={zeilen.map(z => ({
          schluessel: `v${z.id}`,
          id: z.id,
          personId: z.personId,
          neu: null,
          bezeichnung: z.bezeichnung,
          aufgabe: z.aufgabe ?? '',
          eigene: z.eigeneKontaktdaten,
          telefon: z.telefon ?? '',
          email: z.email ?? '',
        }))}
        // Kontaktdaten des Vorstands stehen ohnehin auf der Website – für alle anderen reichen Name und Verwendung.
        personen={personenFuerAuswahl(db, rechte, imVorstand)}
        bearbeitbar={bearbeitbar}
        auchEingetragen={auchEingetragen}
        gruppenfoto={gruppenfotoUrl ? { url: gruppenfotoUrl, ausschnitt: ausschnittLesen(gruppenfoto?.ausschnitt) } : null}
      />
    </>
  )
}
