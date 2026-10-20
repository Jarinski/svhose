import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { datenbank, schema } from '@/lib/db'
import { MANNSCHAFT_BEREICHE } from '@/lib/db/schema'
import { kannSparte } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { istTeamArt } from '@/lib/verwaltung/team-bearbeiten'
import { Seitenkopf } from '@/components/verwaltung/ui'
import TeamAnlegenFormular from './TeamAnlegenFormular'

export const metadata: Metadata = { title: 'Neu anlegen' }

export default function TeamNeuSeite({ searchParams }: { searchParams: { art?: string; sparte?: string } }) {
  const { rechte } = sitzungErzwingen()
  const art = istTeamArt(searchParams.art) ? searchParams.art : 'mannschaft'

  // Anlegen dürfen nur Admins und die Spartenleitung (Recht auf die ganze Sparte).
  const sparten = datenbank()
    .select({ id: schema.sparten.id, name: schema.sparten.name })
    .from(schema.sparten)
    .all()
    .filter(s => kannSparte(rechte, s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  if (sparten.length === 0) redirect('/verwaltung/teams')

  const gewuenscht = searchParams.sparte ? Number(searchParams.sparte) : null
  if (gewuenscht != null && !sparten.some(s => s.id === gewuenscht)) redirect('/verwaltung/teams')

  return (
    <>
      <Seitenkopf
        titel={art === 'mannschaft' ? 'NEUE MANNSCHAFT' : 'NEUE GRUPPE'}
        zurueck={{ href: '/verwaltung/teams', text: 'Alle Mannschaften & Gruppen' }}
        untertitel={
          art === 'mannschaft'
            ? 'Mannschaften spielen im Ligabetrieb, z. B. im Fußball oder Tischtennis.'
            : 'Gruppen sind Trainings- und Kursgruppen ohne Ligabetrieb, z. B. Yoga oder Kinderturnen.'
        }
      />
      <TeamAnlegenFormular art={art} sparten={sparten} sparteId={gewuenscht} bereiche={[...MANNSCHAFT_BEREICHE]} />
    </>
  )
}
