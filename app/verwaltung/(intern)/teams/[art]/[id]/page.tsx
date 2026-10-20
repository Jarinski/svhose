import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { datenbank } from '@/lib/db'
import { MANNSCHAFT_BEREICHE, RHYTHMEN, SAISONS, TRAINER_ROLLEN } from '@/lib/db/schema'
import { medienUrl } from '@/lib/medien'
import { personenFuerAuswahl } from '@/lib/verwaltung/person-bearbeiten'
import { kannSparte } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { alleOrte, artName, darfTeam, istTeamArt, teamLaden } from '@/lib/verwaltung/team-bearbeiten'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Badge, Seitenkopf } from '@/components/verwaltung/ui'
import TeamBearbeiten from './TeamFormular'
import TeamLoeschen from './TeamLoeschen'

export const metadata: Metadata = { title: 'Mannschaft / Gruppe bearbeiten' }

export default function TeamSeite({ params }: { params: { art: string; id: string } }) {
  const { rechte } = sitzungErzwingen()
  const art = params.art
  const id = Number(params.id)
  if (!istTeamArt(art) || !Number.isInteger(id)) notFound()

  const db = datenbank()
  const stand = teamLaden(db, art, id)
  // Ohne Recht wie "nicht vorhanden" behandeln – verrät nichts über fremde Bereiche.
  if (!stand || !darfTeam(rechte, art, stand.team)) notFound()
  const { team, sparte } = stand
  const was = artName(art)

  return (
    <>
      <Seitenkopf
        titel={team.name}
        zurueck={{ href: '/verwaltung/teams', text: 'Alle Mannschaften & Gruppen' }}
        untertitel={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {was} · Sparte {sparte.name}
            </span>
            {!team.sichtbar && <Badge>auf der Website ausgeblendet</Badge>}
            {!sparte.sichtbar && <Badge>Sparte ausgeblendet</Badge>}
          </span>
        }
      />

      <TeamBearbeiten
        art={art}
        id={team.id}
        stand={team.geaendertAm}
        start={{
          name: team.name,
          bereich: team.bereich ?? '',
          altersklasse: team.altersklasse ?? '',
          beschreibung: team.beschreibung ?? '',
          sichtbar: team.sichtbar,
          reihenfolge: String(team.reihenfolge),
          trainingszeiten: stand.trainingszeiten.map(z => ({
            id: z.id,
            wochentag: z.wochentag,
            beginn: z.beginn,
            ende: z.ende ?? '',
            ort: z.ort ?? '',
            saison: z.saison,
            rhythmus: z.rhythmus,
            hinweis: z.hinweis ?? '',
          })),
          trainer: stand.trainer.map(t => ({ personId: t.personId, rolle: t.rolle })),
        }}
        fotoUrl={medienUrl(team.foto)}
        personen={personenFuerAuswahl(db, rechte, stand.trainer.map(t => t.personId))}
        orte={alleOrte(db)}
        optionen={{
          bereiche: [...MANNSCHAFT_BEREICHE],
          saisons: [...SAISONS],
          rhythmen: [...RHYTHMEN],
          rollen: [...TRAINER_ROLLEN],
        }}
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-[#6b6b6b]">
        <span>Zuletzt geändert am {zeitpunktDeutsch(team.geaendertAm)}</span>
        <Link href={`/sparten/${sparte.slug}`} target="_blank" className="underline underline-offset-4 hover:text-[#0a0a0a]">
          Auf Website ansehen ↗
        </Link>
      </div>

      {kannSparte(rechte, team.sparteId) && (
        <div className="mt-8">
          <TeamLoeschen art={art} id={team.id} name={team.name} />
        </div>
      )}
    </>
  )
}
