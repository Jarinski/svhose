import type { Metadata } from 'next'
import Link from 'next/link'
import { datenbank } from '@/lib/db'
import { TRAINER_ROLLEN } from '@/lib/db/schema'
import { PERSONEN_ANLEGEN_NUR_ADMINS } from '@/lib/verwaltung/person-bearbeiten'
import { bearbeitbareTeams, darfFoerdervereinVorstand, darfPersonenAnlegen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Karte, knopfKlassen, Meldung, Seitenkopf } from '@/components/verwaltung/ui'
import PersonAnlegenFormular from './PersonAnlegenFormular'

export const metadata: Metadata = { title: 'Neue Person' }

export default async function PersonNeuSeite(props: { searchParams: Promise<{ team?: string }> }) {
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  const db = datenbank()
  const teams = bearbeitbareTeams(db, rechte).map(t => ({
    wert: `${t.art}-${t.id}`,
    text: `${t.sparte} · ${t.name}`,
  }))

  return (
    <>
      <Seitenkopf
        titel="NEUE PERSON"
        zurueck={{ href: '/verwaltung/personen', text: 'Alle Personen' }}
        untertitel="Tipp: Trainer:innen lassen sich auch direkt im Trainerteam einer Mannschaft neu anlegen."
      />
      {darfPersonenAnlegen(db, rechte) ? (
        <PersonAnlegenFormular
          teams={teams}
          teamPflicht={!rechte.istAdmin && teams.length > 0}
          vorauswahl={teams.some(t => t.wert === searchParams.team) ? (searchParams.team ?? null) : null}
          rollen={[...TRAINER_ROLLEN]}
        />
      ) : darfFoerdervereinVorstand(rechte) ? (
        <Karte>
          <div className="space-y-4">
            <Meldung art="hinweis">
              Vorstandsmitglieder des Fördervereins trägst du direkt beim Vorstand ein. Wer noch nicht in der Verwaltung steht, legst du dort über{' '}
              <strong>Person zum Vorstand hinzufügen</strong> gleich mit an.
            </Meldung>
            <Link href="/verwaltung/foerderverein-vorstand" className={knopfKlassen.primaer}>
              Zum Vorstand (Förderverein)
            </Link>
          </div>
        </Karte>
      ) : (
        <Karte>
          <Meldung art="hinweis">{PERSONEN_ANLEGEN_NUR_ADMINS}</Meldung>
        </Karte>
      )}
    </>
  )
}
