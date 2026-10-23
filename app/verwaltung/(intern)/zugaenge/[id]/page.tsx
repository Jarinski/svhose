import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { datenbank, schema } from '@/lib/db'
import { benutzernameVorschlag } from '@/lib/verwaltung/anmeldung'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { Badge, Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'
import { zugangAlleGeraeteAbmeldenAktion, zugangGeraetAbmeldenAktion } from '../aktionen'
import { bereichsBaum, offeneEinladung } from '../logik'
import ZugangFormular from '../ZugangFormular'
import ZugangStatus from './ZugangStatus'
import ZugangZuruecksetzen from './ZugangZuruecksetzen'

export const metadata: Metadata = { title: 'Zugang bearbeiten' }

export default async function ZugangSeite(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { rechte, geraetId } = await adminErzwingen()
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  const db = datenbank()
  const zugang = db.select().from(schema.zugaenge).where(eq(schema.zugaenge.id, id)).get()
  if (!zugang) notFound()

  const istSelbst = zugang.id === rechte.zugangId
  const bereiche = db.select().from(schema.zugangBereiche).where(eq(schema.zugangBereiche.zugangId, id)).all()
  const person = zugang.personId != null ? db.select().from(schema.personen).where(eq(schema.personen.id, zugang.personId)).get() : null
  const personen = db.select({ id: schema.personen.id, name: schema.personen.name }).from(schema.personen).orderBy(asc(schema.personen.name)).all()
  const geraete = db.select().from(schema.geraete).where(eq(schema.geraete.zugangId, id)).orderBy(desc(schema.geraete.zuletztAktiv)).all()
  const einladung = zugang.aktiv ? offeneEinladung(db, id) : null
  const andereAdmins = db
    .select({ id: schema.zugaenge.id })
    .from(schema.zugaenge)
    .where(and(eq(schema.zugaenge.istAdmin, true), eq(schema.zugaenge.aktiv, true), ne(schema.zugaenge.id, id)))
    .all().length

  const sperrGrund = istSelbst
    ? 'Das ist dein eigener Zugang – deaktivieren oder löschen kann ihn nur ein anderer Admin.'
    : zugang.istAdmin && zugang.aktiv && andereAdmins === 0
      ? 'Das ist der letzte aktive Admin. Bitte zuerst einen anderen Zugang zum Admin machen.'
      : null
  const andereGeraete = geraete.filter(g => !(istSelbst && g.id === geraetId)).length

  return (
    <>
      <Seitenkopf
        titel={zugang.name.toUpperCase()}
        zurueck={{ href: '/verwaltung/zugaenge', text: 'Alle Zugänge' }}
        untertitel={
          <span className="inline-flex flex-wrap items-center gap-2">
            {istSelbst && <Badge ton="erfolg">Das bist du</Badge>}
            {zugang.istAdmin ? <Badge>Admin</Badge> : <Badge>Bestimmte Bereiche</Badge>}
            {!zugang.aktiv && <Badge ton="warnung">deaktiviert</Badge>}
            {zugang.eingerichtetAm ? (
              <Badge ton="erfolg">eingerichtet am {zeitpunktDeutsch(zugang.eingerichtetAm)}</Badge>
            ) : (
              <Badge ton="warnung">Einrichtung ausstehend</Badge>
            )}
            <span>
              Benutzername: <span className="font-mono text-[#0a0a0a]">{zugang.benutzername ?? '– noch keiner –'}</span>
            </span>
            <span>
              {zugang.letzteAnmeldung ? `Zuletzt angemeldet ${zeitpunktDeutsch(zugang.letzteAnmeldung)}` : 'Noch nie angemeldet'} · angelegt{' '}
              {zeitpunktDeutsch(zugang.erstelltAm)}
            </span>
          </span>
        }
      />

      <div className="space-y-6">
        <ZugangFormular
          modus="bearbeiten"
          istSelbst={istSelbst}
          zugang={{
            id: zugang.id,
            name: zugang.name,
            benutzername: zugang.benutzername ?? benutzernameVorschlag(db, zugang.name),
            benutzernameFehlt: !zugang.benutzername,
            personId: zugang.personId,
            personName: person?.name ?? null,
            istAdmin: zugang.istAdmin,
            sparten: bereiche.map(b => b.sparteId).filter((x): x is number => x != null),
            mannschaften: bereiche.map(b => b.mannschaftId).filter((x): x is number => x != null),
            gruppen: bereiche.map(b => b.gruppeId).filter((x): x is number => x != null),
          }}
          personen={personen}
          baum={bereichsBaum(db)}
        />

        <Karte titel={zugang.eingerichtetAm ? 'Passwort & App' : 'Einladung'}>
          <ZugangZuruecksetzen
            zugangId={zugang.id}
            name={zugang.name}
            aktiv={zugang.aktiv}
            eingerichtet={zugang.eingerichtetAm != null}
            anzahlGeraete={geraete.length}
            istSelbst={istSelbst}
            offenBis={einladung ? zeitpunktDeutsch(einladung) : null}
          />
        </Karte>

        <Karte titel="Angemeldete Geräte" beschreibung="Ein Gerät verloren oder verkauft? Hier abmelden – dort ist man dann sofort ausgeloggt.">
          {geraete.length === 0 ? (
            <LeerHinweis>Auf keinem Gerät angemeldet.</LeerHinweis>
          ) : (
            <>
              <ul className="divide-y divide-[#0a0a0a]/[0.07]">
                {geraete.map(g => {
                  const diesesGeraet = istSelbst && g.id === geraetId
                  return (
                    <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex flex-wrap items-center gap-2">
                          {g.name} {diesesGeraet && <Badge ton="erfolg">dieses Gerät</Badge>}
                        </div>
                        <div className="text-xs text-[#6b6b6b]">
                          angemeldet am {zeitpunktDeutsch(g.angemeldetAm)} · zuletzt aktiv {zeitpunktDeutsch(g.zuletztAktiv)}
                        </div>
                      </div>
                      {!diesesGeraet && (
                        <form action={zugangGeraetAbmeldenAktion}>
                          <input type="hidden" name="zugangId" value={zugang.id} />
                          <input type="hidden" name="geraetId" value={g.id} />
                          <button type="submit" className={knopfKlassen.sekundaer}>
                            Abmelden
                          </button>
                        </form>
                      )}
                    </li>
                  )
                })}
              </ul>
              {andereGeraete > 1 && (
                <form action={zugangAlleGeraeteAbmeldenAktion} className="mt-4">
                  <input type="hidden" name="zugangId" value={zugang.id} />
                  <SpeichernKnopf
                    art="gefahr"
                    bestaetigen={istSelbst ? 'Alle anderen Geräte abmelden? Dieses Gerät bleibt angemeldet.' : `Alle Geräte von ${zugang.name} abmelden?`}
                  >
                    {istSelbst ? 'Alle anderen Geräte abmelden' : 'Alle Geräte abmelden'}
                  </SpeichernKnopf>
                </form>
              )}
            </>
          )}
        </Karte>

        <ZugangStatus id={zugang.id} name={zugang.name} aktiv={zugang.aktiv} sperrGrund={sperrGrund} />
      </div>
    </>
  )
}
