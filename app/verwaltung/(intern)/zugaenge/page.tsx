import Link from 'next/link'
import type { Metadata } from 'next'
import { asc, sql } from 'drizzle-orm'
import { ChevronRight, Plus } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { datumDeutsch, zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Badge, Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'
import { bereicheText, offeneEinladung } from './logik'

export const metadata: Metadata = { title: 'Zugänge' }

/** Höchstens drei Bereiche ausschreiben, den Rest zusammenfassen. */
function bereicheKurz(bereiche: string[]): string {
  if (bereiche.length === 0) return 'noch keine Bereiche'
  if (bereiche.length <= 3) return bereiche.join(', ')
  return `${bereiche.slice(0, 3).join(', ')} und ${bereiche.length - 3} weitere`
}

export default function ZugaengeSeite() {
  const { rechte } = adminErzwingen()
  const db = datenbank()
  const zugaenge = db
    .select()
    .from(schema.zugaenge)
    .orderBy(sql`${schema.zugaenge.aktiv} desc`, sql`${schema.zugaenge.istAdmin} desc`, asc(schema.zugaenge.name))
    .all()
  const geraete = db.select({ zugangId: schema.geraete.zugangId }).from(schema.geraete).all()

  return (
    <>
      <Seitenkopf
        titel="ZUGÄNGE"
        untertitel="Wer darf die Verwaltung benutzen? Angemeldet wird mit Benutzername, Passwort und einem Code aus der Authenticator-App."
        aktionen={
          <Link href="/verwaltung/zugaenge/neu" className={knopfKlassen.primaer}>
            <Plus size={15} /> Neuer Zugang
          </Link>
        }
      />
      <Karte>
        {zugaenge.length === 0 ? (
          <LeerHinweis>Noch keine Zugänge.</LeerHinweis>
        ) : (
          <ul className="divide-y divide-[#0a0a0a]/[0.07]">
            {zugaenge.map(z => {
              const anzahlGeraete = geraete.filter(g => g.zugangId === z.id).length
              const einladung = z.aktiv ? offeneEinladung(db, z.id) : null
              return (
                <li key={z.id}>
                  <Link href={`/verwaltung/zugaenge/${z.id}`} className={`flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03] ${z.aktiv ? '' : 'opacity-60'}`}>
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{z.name}</span>
                        {z.id === rechte.zugangId && <Badge ton="erfolg">du</Badge>}
                        {z.istAdmin && <Badge>Admin</Badge>}
                        {!z.aktiv && <Badge ton="warnung">deaktiviert</Badge>}
                        {z.aktiv && !z.eingerichtetAm && <Badge ton="warnung">Einrichtung ausstehend</Badge>}
                        {einladung && <Badge>Einladung offen bis {datumDeutsch(einladung.slice(0, 10))}</Badge>}
                      </span>
                      <span className="block text-xs text-[#6b6b6b] mt-0.5">
                        Benutzername: <span className="font-mono">{z.benutzername ?? '– noch keiner –'}</span>
                        {z.eingerichtetAm && <> · eingerichtet am {datumDeutsch(z.eingerichtetAm.slice(0, 10))}</>}
                      </span>
                      <span className="block text-xs text-[#6b6b6b] mt-0.5">
                        {z.istAdmin ? 'Darf alles bearbeiten' : `Darf bearbeiten: ${bereicheKurz(bereicheText(db, z.id))}`}
                      </span>
                      <span className="block text-xs text-[#6b6b6b] mt-0.5">
                        {z.letzteAnmeldung ? `Zuletzt angemeldet ${zeitpunktDeutsch(z.letzteAnmeldung)}` : 'Noch nie angemeldet'} ·{' '}
                        {anzahlGeraete === 0 ? 'kein Gerät' : anzahlGeraete === 1 ? '1 Gerät' : `${anzahlGeraete} Geräte`}
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Karte>
    </>
  )
}
