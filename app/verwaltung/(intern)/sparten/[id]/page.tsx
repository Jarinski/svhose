import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { ChevronRight, ExternalLink, Plus } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { kannSparte } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Badge, Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'
import { CRON_SLUGS } from '../konstanten'
import { ansprechpartnerLaden } from '../logik'
import SparteFormular from './SparteFormular'
import SparteLoeschen from './SparteLoeschen'

export const metadata: Metadata = { title: 'Sparte bearbeiten' }

function mehrzahl(n: number, eins: string, viele: string) {
  return `${n} ${n === 1 ? eins : viele}`
}

export default async function SparteSeite(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { rechte } = await sitzungErzwingen()
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  if (!kannSparte(rechte, id)) redirect('/verwaltung')
  const db = datenbank()
  const sparte = db.select().from(schema.sparten).where(eq(schema.sparten.id, id)).get()
  if (!sparte) notFound()

  const ansprechpartner = ansprechpartnerLaden(db, id)
  const personen = db.select({ id: schema.personen.id, name: schema.personen.name }).from(schema.personen).orderBy(asc(schema.personen.name)).all()
  const mannschaften = db
    .select()
    .from(schema.mannschaften)
    .where(eq(schema.mannschaften.sparteId, id))
    .orderBy(asc(schema.mannschaften.reihenfolge), asc(schema.mannschaften.name))
    .all()
  const gruppen = db
    .select()
    .from(schema.gruppen)
    .where(eq(schema.gruppen.sparteId, id))
    .orderBy(asc(schema.gruppen.reihenfolge), asc(schema.gruppen.name))
    .all()

  const teamText = [
    mannschaften.length > 0 ? mehrzahl(mannschaften.length, 'Mannschaft', 'Mannschaften') : '',
    gruppen.length > 0 ? mehrzahl(gruppen.length, 'Gruppe', 'Gruppen') : '',
  ]
    .filter(Boolean)
    .join(' und ')

  const teamListe = (art: 'mannschaft' | 'gruppe', liste: { id: number; name: string; sichtbar: boolean }[]) =>
    liste.length === 0 ? (
      <LeerHinweis>{art === 'mannschaft' ? 'Keine Mannschaften.' : 'Keine Gruppen.'}</LeerHinweis>
    ) : (
      <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
        {liste.map(t => (
          <li key={t.id}>
            <Link href={`/verwaltung/teams/${art}/${t.id}`} className="flex items-center gap-3 py-2.5 px-1 hover:bg-[#0a0a0a]/[0.03]">
              <span className="flex-1 min-w-0 truncate font-medium">{t.name}</span>
              {!t.sichtbar && <Badge>ausgeblendet</Badge>}
              <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    )

  return (
    <>
      <Seitenkopf
        titel={sparte.name.toUpperCase()}
        zurueck={{ href: '/verwaltung/sparten', text: 'Alle Sparten' }}
        untertitel={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>Sparte</span>
            {!sparte.sichtbar && <Badge ton="warnung">auf der Website ausgeblendet</Badge>}
          </span>
        }
        aktionen={
          <a href={`/sparten/${sparte.slug}`} target="_blank" rel="noopener" className={knopfKlassen.sekundaer}>
            <ExternalLink size={15} /> Auf Website ansehen ↗
          </a>
        }
      />

      <div className="space-y-6">
        <SparteFormular
          sparte={{
            id: sparte.id,
            name: sparte.name,
            slug: sparte.slug,
            icon: sparte.icon,
            farbe: sparte.farbe,
            kurzbeschreibung: sparte.kurzbeschreibung,
            beschreibung: sparte.beschreibung,
            fotoUrl: medienUrl(sparte.foto),
            sichtbar: sparte.sichtbar,
            reihenfolge: sparte.reihenfolge,
            geaendertAm: sparte.geaendertAm,
          }}
          ansprechpartner={ansprechpartner}
          personen={personen}
          istAdmin={rechte.istAdmin}
        />

        <Karte titel="Mannschaften & Gruppen" beschreibung="Trainerteam, Trainingszeiten und Texte werden direkt bei der Mannschaft bzw. Gruppe bearbeitet.">
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium">Mannschaften</h3>
                <Link href={`/verwaltung/teams/neu?art=mannschaft&sparte=${sparte.id}`} className={knopfKlassen.sekundaer}>
                  <Plus size={15} /> Neue Mannschaft
                </Link>
              </div>
              {teamListe('mannschaft', mannschaften)}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium">Gruppen</h3>
                <Link href={`/verwaltung/teams/neu?art=gruppe&sparte=${sparte.id}`} className={knopfKlassen.sekundaer}>
                  <Plus size={15} /> Neue Gruppe
                </Link>
              </div>
              {teamListe('gruppe', gruppen)}
            </div>
          </div>
        </Karte>

        {rechte.istAdmin && <SparteLoeschen id={sparte.id} name={sparte.name} teams={teamText || null} cronHinweis={CRON_SLUGS[sparte.slug]} />}
      </div>
    </>
  )
}
