import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { datenbank, schema } from '@/lib/db'
import { bearbeitbareTeams, kannSparte } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { suchtext } from '@/lib/verwaltung/suche'
import { Karte, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'
import TeamListe, { type TeamListenSparte } from './TeamListe'

export const metadata: Metadata = { title: 'Mannschaften & Gruppen' }

export default function TeamsSeite() {
  const { rechte } = sitzungErzwingen()
  const db = datenbank()
  const teams = bearbeitbareTeams(db, rechte)

  // Zusatzangaben für Hinweise und Suche
  const altersklassen = new Map<string, string | null>()
  db.select({ id: schema.mannschaften.id, a: schema.mannschaften.altersklasse }).from(schema.mannschaften).all().forEach(m => altersklassen.set(`mannschaft-${m.id}`, m.a))
  db.select({ id: schema.gruppen.id, a: schema.gruppen.altersklasse }).from(schema.gruppen).all().forEach(g => altersklassen.set(`gruppe-${g.id}`, g.a))

  const zeiten = new Map<string, number>()
  db.select({ m: schema.trainingszeiten.mannschaftId, g: schema.trainingszeiten.gruppeId })
    .from(schema.trainingszeiten)
    .all()
    .forEach(z => {
      if (z.m != null) zeiten.set(`mannschaft-${z.m}`, (zeiten.get(`mannschaft-${z.m}`) ?? 0) + 1)
      if (z.g != null) zeiten.set(`gruppe-${z.g}`, (zeiten.get(`gruppe-${z.g}`) ?? 0) + 1)
    })

  const trainer = new Map<string, string[]>()
  const trainerHinzu = (schluessel: string, name: string) => {
    const liste = trainer.get(schluessel)
    if (liste) liste.push(name)
    else trainer.set(schluessel, [name])
  }
  db.select({ id: schema.mannschaftPersonen.mannschaftId, name: schema.personen.name })
    .from(schema.mannschaftPersonen)
    .innerJoin(schema.personen, eq(schema.personen.id, schema.mannschaftPersonen.personId))
    .all()
    .forEach(z => trainerHinzu(`mannschaft-${z.id}`, z.name))
  db.select({ id: schema.gruppePersonen.gruppeId, name: schema.personen.name })
    .from(schema.gruppePersonen)
    .innerJoin(schema.personen, eq(schema.personen.id, schema.gruppePersonen.personId))
    .all()
    .forEach(z => trainerHinzu(`gruppe-${z.id}`, z.name))

  // Sparten mit bearbeitbaren Teams – und solche, in denen der Zugang neue Teams anlegen darf.
  const sparten: TeamListenSparte[] = db
    .select()
    .from(schema.sparten)
    .all()
    .filter(s => kannSparte(rechte, s.id) || teams.some(t => t.sparteId === s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map(s => ({
      id: s.id,
      name: s.name,
      sichtbar: s.sichtbar,
      kannAnlegen: kannSparte(rechte, s.id),
      teams: teams
        .filter(t => t.sparteId === s.id)
        .map(t => {
          const k = `${t.art}-${t.id}`
          const namen = trainer.get(k) ?? []
          return {
            art: t.art,
            id: t.id,
            name: t.name,
            altersklasse: altersklassen.get(k) ?? null,
            sichtbar: t.sichtbar,
            anzahlZeiten: zeiten.get(k) ?? 0,
            anzahlTrainer: namen.length,
            suchtext: suchtext(t.name, s.name, altersklassen.get(k), ...namen),
          }
        }),
    }))

  return (
    <>
      <Seitenkopf
        titel="MANNSCHAFTEN & GRUPPEN"
        untertitel={rechte.istAdmin ? 'Alle Mannschaften und Gruppen des Vereins.' : 'Alles, was du bearbeiten darfst. Tippe auf einen Eintrag, um ihn zu ändern.'}
      />
      {sparten.length === 0 ? (
        <Karte>
          <LeerHinweis>Dir sind noch keine Mannschaften oder Gruppen zugeordnet. Bitte bei der Spartenleitung oder beim Vorstand melden.</LeerHinweis>
        </Karte>
      ) : (
        <TeamListe sparten={sparten} />
      )}
    </>
  )
}
