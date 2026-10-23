import type { Metadata } from 'next'
import { datenbank } from '@/lib/db'
import { TRAINER_ROLLEN } from '@/lib/db/schema'
import { bearbeitbareTeams } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Seitenkopf } from '@/components/verwaltung/ui'
import PersonAnlegenFormular from './PersonAnlegenFormular'

export const metadata: Metadata = { title: 'Neue Person' }

export default async function PersonNeuSeite(props: { searchParams: Promise<{ team?: string }> }) {
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  const teams = bearbeitbareTeams(datenbank(), rechte).map(t => ({
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
      <PersonAnlegenFormular
        teams={teams}
        teamPflicht={!rechte.istAdmin && teams.length > 0}
        vorauswahl={teams.some(t => t.wert === searchParams.team) ? (searchParams.team ?? null) : null}
        rollen={[...TRAINER_ROLLEN]}
      />
    </>
  )
}
