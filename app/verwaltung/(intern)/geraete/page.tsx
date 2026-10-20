import type { Metadata } from 'next'
import { and, desc, eq, gt } from 'drizzle-orm'
import { datenbank, schema } from '@/lib/db'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { geraetAbmelden } from '../../aktionen'
import { Badge, Karte, knopfKlassen, Seitenkopf } from '@/components/verwaltung/ui'
import PasswortAendern from './PasswortAendern'

export const metadata: Metadata = { title: 'Mein Zugang' }

export default function MeinZugangSeite() {
  const { rechte, geraetId } = sitzungErzwingen()
  const db = datenbank()
  const zugang = db.select().from(schema.zugaenge).where(eq(schema.zugaenge.id, rechte.zugangId)).get()
  const geraete = db
    .select()
    .from(schema.geraete)
    .where(and(eq(schema.geraete.zugangId, rechte.zugangId), gt(schema.geraete.laeuftAb, new Date().toISOString())))
    .orderBy(desc(schema.geraete.zuletztAktiv))
    .all()

  return (
    <>
      <Seitenkopf
        titel="MEIN ZUGANG"
        untertitel={
          <>
            Benutzername: <span className="font-mono text-[#0a0a0a]">{zugang?.benutzername ?? '—'}</span>
            {zugang?.eingerichtetAm && <> · Passwort und App eingerichtet am {zeitpunktDeutsch(zugang.eingerichtetAm)}</>}
          </>
        }
      />
      <div className="space-y-6">
        <Karte titel="Angemeldete Geräte" beschreibung="Ein Gerät, das du nicht kennst? Abmelden und das Passwort ändern.">
          <ul className="divide-y divide-[#0a0a0a]/[0.07]">
            {geraete.map(g => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {g.name} {g.id === geraetId && <Badge ton="erfolg">dieses Gerät</Badge>}
                  </div>
                  <div className="text-xs text-[#6b6b6b]">
                    angemeldet am {zeitpunktDeutsch(g.angemeldetAm)} · zuletzt aktiv {zeitpunktDeutsch(g.zuletztAktiv)} · gültig bis{' '}
                    {zeitpunktDeutsch(g.laeuftAb)}
                  </div>
                </div>
                {g.id !== geraetId && (
                  <form action={geraetAbmelden}>
                    <input type="hidden" name="geraetId" value={g.id} />
                    <button type="submit" className={knopfKlassen.sekundaer}>
                      Abmelden
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Karte>
        {zugang?.benutzername && <PasswortAendern benutzername={zugang.benutzername} />}
        <Karte titel="Handy verloren oder neue App?">
          <p className="text-sm text-[#4a4a4a] leading-relaxed">
            Dann bitte einen Admin, deinen Zugang zurückzusetzen. Dabei werden alle Geräte abgemeldet, und du bekommst einen neuen
            Einladungs-QR-Code, mit dem du Passwort und Authenticator-App neu einrichtest.
          </p>
        </Karte>
      </div>
    </>
  )
}
