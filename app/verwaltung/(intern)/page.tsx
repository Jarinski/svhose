import Link from 'next/link'
import type { Metadata } from 'next'
import { desc, eq, ne } from 'drizzle-orm'
import { ChevronRight } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { buchungsTermine } from '@/lib/buchungen/belegung'
import { heute, OFFENE_STATUS, tagPlus, zeitraumText } from '@/lib/buchungen/zeit'
import { offeneAnfragen } from '@/lib/verwaltung/inhalte/buchungen'
import { bearbeitbareTeams, darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Badge, Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'Übersicht' }

export default async function Uebersicht() {
  const { rechte } = await sitzungErzwingen()
  const db = datenbank()
  const teams = bearbeitbareTeams(db, rechte)
  // Mit Förderverein- oder Buchungs-Recht, aber ohne Admin: eigene Karten; die leere Team-Karte entfällt, wenn es keine Teams gibt.
  const nurFoerderverein = !rechte.istAdmin && rechte.foerderverein
  const nurSonderrechte = !rechte.istAdmin && (rechte.foerderverein || rechte.buchungen)
  const buchungen = darfBuchungen(rechte)
    ? {
        offen: offeneAnfragen(db),
        // Die nächsten Belegungen (ohne Regelbelegung): offene zuerst sichtbar machen, dann nach Datum
        naechste: buchungsTermine(db, heute(), tagPlus(heute(), 30))
          .sort((a, b) => a.von.localeCompare(b.von))
          .slice(0, 5),
      }
    : null

  // Zählungen für die Hinweise "kein Trainerteam" / "keine Trainingszeit"
  const zeiten = db.select({ m: schema.trainingszeiten.mannschaftId, g: schema.trainingszeiten.gruppeId }).from(schema.trainingszeiten).all()
  const mp = db.select({ id: schema.mannschaftPersonen.mannschaftId }).from(schema.mannschaftPersonen).all()
  const gp = db.select({ id: schema.gruppePersonen.gruppeId }).from(schema.gruppePersonen).all()
  const anzahl = (liste: { id: number | null }[], id: number) => liste.filter(x => x.id === id).length

  // Gruppiert nach Sparte, Reihenfolge wie geliefert
  const nachSparte: { sparte: string; teams: typeof teams }[] = []
  for (const t of teams) {
    const letzte = nachSparte[nachSparte.length - 1]
    if (letzte && letzte.sparte === t.sparte) letzte.teams.push(t)
    else nachSparte.push({ sparte: t.sparte, teams: [t] })
  }

  const verlauf = db
    .select()
    .from(schema.verlauf)
    .where(rechte.istAdmin ? ne(schema.verlauf.aktion, 'anmeldung') : eq(schema.verlauf.zugangId, rechte.zugangId))
    .orderBy(desc(schema.verlauf.id))
    .limit(8)
    .all()
    .filter(v => v.aktion !== 'anmeldung' && v.aktion !== 'abmeldung')

  return (
    <>
      <Seitenkopf titel={`HALLO ${rechte.name.split(' ')[0].toUpperCase()}`} untertitel={rechte.istAdmin ? 'Du hast Admin-Rechte und kannst alles bearbeiten.' : 'Hier ist alles, was du bearbeiten darfst.'} />

      <div className="space-y-6">
        {buchungen && (
          <Karte
            titel="Vereinsheim"
            beschreibung={
              buchungen.offen > 0
                ? `${buchungen.offen} Anfrage${buchungen.offen === 1 ? '' : 'n'} warte${buchungen.offen === 1 ? 't' : 'n'} auf Antwort.`
                : 'Keine offenen Anfragen.'
            }
            aktionen={
              <div className="flex flex-wrap gap-2">
                <Link href="/verwaltung/buchungen" className={buchungen.offen > 0 ? knopfKlassen.primaer : knopfKlassen.sekundaer}>
                  Buchungen
                </Link>
                <Link href="/verwaltung/buchungen/kalender" className={knopfKlassen.sekundaer}>
                  Kalender
                </Link>
              </div>
            }
          >
            {buchungen.naechste.length === 0 ? (
              <LeerHinweis>In den nächsten 30 Tagen ist nichts gebucht.</LeerHinweis>
            ) : (
              <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
                {buchungen.naechste.map(t => (
                  <li key={t.buchung.id}>
                    <Link href={`/verwaltung/buchungen/${t.buchung.id}`} className="flex items-center gap-3 py-2.5 px-1 hover:bg-[#0a0a0a]/[0.03]">
                      <span className="flex-1 min-w-0">
                        <span className="font-medium">{t.titel}</span>
                        <span className="block text-xs text-[#6b6b6b] mt-0.5">{zeitraumText(t)}</span>
                      </span>
                      {(OFFENE_STATUS as string[]).indexOf(t.status) >= 0 && <Badge ton="warnung">offen</Badge>}
                      <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Karte>
        )}

        {nurFoerderverein && (
          <Karte
            titel="Förderverein"
            beschreibung="Du darfst News und Downloads des Fördervereins pflegen, seine Seiten gestalten (Über den Förderverein, Aktuelles, Chronik, Mitglied werden) und den Vorstand eintragen. Alles erscheint auf der Website unter Förderverein."
          >
            <div className="flex flex-wrap gap-2">
              <Link href="/verwaltung/news" className={knopfKlassen.sekundaer}>
                News
              </Link>
              <Link href="/verwaltung/downloads" className={knopfKlassen.sekundaer}>
                Downloads
              </Link>
              <Link href="/verwaltung/foerderverein-seiten" className={knopfKlassen.sekundaer}>
                Seiten
              </Link>
              <Link href="/verwaltung/foerderverein-vorstand" className={knopfKlassen.sekundaer}>
                Vorstand
              </Link>
            </div>
          </Karte>
        )}

        {!(nurSonderrechte && teams.length === 0) && (
          <Karte titel={rechte.istAdmin ? 'Alle Mannschaften & Gruppen' : 'Deine Mannschaften & Gruppen'}>
            {teams.length === 0 ? (
              <LeerHinweis>Dir sind noch keine Mannschaften oder Gruppen zugeordnet.</LeerHinweis>
            ) : (
              <div className="space-y-5">
                {nachSparte.map(gruppe => (
                  <div key={gruppe.sparte}>
                    <div className="text-xs text-[#6b6b6b] mb-1.5">{gruppe.sparte}</div>
                    <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07]">
                      {gruppe.teams.map(t => {
                        const anzZeiten = zeiten.filter(z => (t.art === 'mannschaft' ? z.m : z.g) === t.id).length
                        const anzTrainer = anzahl(t.art === 'mannschaft' ? mp : gp, t.id)
                        return (
                          <li key={`${t.art}-${t.id}`}>
                            <Link href={`/verwaltung/teams/${t.art}/${t.id}`} className="flex items-center gap-3 py-2.5 px-1 hover:bg-[#0a0a0a]/[0.03]">
                              <span className="flex-1 min-w-0">
                                <span className="font-medium">{t.name}</span>
                                <span className="text-xs text-[#6b6b6b] ml-2">{t.art === 'mannschaft' ? 'Mannschaft' : 'Gruppe'}</span>
                              </span>
                              <span className="hidden sm:flex flex-wrap gap-1.5 justify-end">
                                {!t.sichtbar && <Badge>ausgeblendet</Badge>}
                                {anzTrainer === 0 && <Badge ton="warnung">kein Trainerteam</Badge>}
                                {anzZeiten === 0 && <Badge ton="warnung">keine Trainingszeit</Badge>}
                                {anzZeiten > 0 && <Badge>{anzZeiten} Trainingszeit{anzZeiten === 1 ? '' : 'en'}</Badge>}
                              </span>
                              <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Karte>
        )}

        <Karte titel="Zuletzt geändert" beschreibung={rechte.istAdmin ? 'Alle Änderungen im Verein' : 'Deine letzten Änderungen'}>
          {verlauf.length === 0 ? (
            <LeerHinweis>Noch keine Änderungen.</LeerHinweis>
          ) : (
            <ul className="space-y-2 text-sm">
              {verlauf.map(v => (
                <li key={v.id} className="flex flex-wrap gap-x-3">
                  <span className="text-[#6b6b6b] tabular-nums">{zeitpunktDeutsch(v.zeitpunkt)}</span>
                  <span>
                    {v.zugangName ?? 'System'} · {v.bezeichnung} <span className="text-[#6b6b6b]">({v.aktion})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>
    </>
  )
}
