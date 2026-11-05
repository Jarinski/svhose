import Link from 'next/link'
import type { Metadata } from 'next'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { Paperclip } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { MailText } from '@/components/verwaltung/buchungen/Kontaktverlauf'
import { abrufFaellig, abrufStandLesen, postfachAbrufen } from '@/lib/buchungen/postfach'
import { imapZugang } from '@/lib/mail'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { Karte, LeerHinweis, Meldung, Seitenkopf } from '@/components/verwaltung/ui'
import { MailTeil } from '../KontaktFormular'
import { nachrichtLoeschen } from '../kontakt-aktionen'
import { AbrufKnopf, ZuordnenFormular } from './Knoepfe'

export const metadata: Metadata = { title: 'Eingang' }

/** "Erika Mustermann <erika@example.org>" → "erika@example.org" */
function adresse(von: string | null): string | null {
  if (!von) return null
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(von)
  return (m ? m[1] : von).trim()
}

export default async function EingangSeite() {
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  const db = datenbank()
  const zugang = imapZugang()
  if (zugang && abrufFaellig(db, 5)) after(() => postfachAbrufen(db).then(() => undefined))
  const stand = abrufStandLesen(db)

  const mails = db
    .select()
    .from(schema.buchungNachrichten)
    .where(and(isNull(schema.buchungNachrichten.buchungId), eq(schema.buchungNachrichten.richtung, 'eingang')))
    .orderBy(desc(schema.buchungNachrichten.zeitpunkt))
    .limit(100)
    .all()
  // Antworten aus der Verwaltung auf diese Mails (noch ohne Buchung)
  const antworten = db
    .select()
    .from(schema.buchungNachrichten)
    .where(and(isNull(schema.buchungNachrichten.buchungId), eq(schema.buchungNachrichten.richtung, 'ausgang'), sql`${schema.buchungNachrichten.verweise} IS NOT NULL`))
    .all()
  const gruss = `\n\nViele Grüße\n${rechte.name}\nSV Holm-Seppensen e.V.`

  return (
    <>
      <Seitenkopf
        titel="EINGANG"
        zurueck={{ href: '/verwaltung/buchungen', text: 'Buchungen' }}
        untertitel="Mails an das Buchungs-Postfach, die keiner Buchung zugeordnet werden konnten – zum Zuordnen, Beantworten oder Löschen. Nach 90 Tagen werden sie hier automatisch gelöscht; im Postfach selbst bleiben sie."
        aktionen={zugang ? <AbrufKnopf /> : undefined}
      />
      <div className="space-y-6">
        {!zugang ? (
          <Meldung art="hinweis">
            Der Abruf ist nicht eingerichtet. Admins richten ihn unter <Link href="/verwaltung/e-mail" className="underline underline-offset-2">E-Mail-Versand</Link> ein
            (Passwort und „Eingehende Mails abrufen“).
          </Meldung>
        ) : stand.fehler ? (
          <Meldung art="fehler">
            Letzter Abruf am {zeitpunktDeutsch(stand.zuletztAm)} fehlgeschlagen: {stand.fehler}
          </Meldung>
        ) : (
          <p className="text-sm text-[#6b6b6b]">
            {stand.erfolgreichAm ? `Zuletzt abgerufen ${zeitpunktDeutsch(stand.erfolgreichAm)}.` : 'Noch nicht abgerufen.'} Neue Mails kommen alle paar Minuten von
            selbst dazu.
          </p>
        )}

        {mails.length === 0 ? (
          <Karte>
            <LeerHinweis>Keine Mails ohne Buchung.</LeerHinweis>
          </Karte>
        ) : (
          mails.map(n => {
            const an = adresse(n.von)
            const meine = antworten.filter(a => n.messageId && (a.verweise ?? '').indexOf(n.messageId) >= 0)
            const betreff = n.betreff ?? ''
            return (
              <Karte key={n.id}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#6b6b6b]">
                  <span className="text-sm font-medium text-[#0a0a0a] [overflow-wrap:anywhere]">{n.von ?? 'Unbekannter Absender'}</span>
                  <span className="tabular-nums">{zeitpunktDeutsch(n.zeitpunkt)}</span>
                  {!n.gelesenAm && <span className="rounded-sm bg-sky-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">neu</span>}
                </div>
                {n.betreff && <div className="mt-1 font-medium [overflow-wrap:anywhere]">{n.betreff}</div>}
                <MailText text={n.text} />
                {n.anhaenge > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#6b6b6b]">
                    <Paperclip size={12} /> {n.anhaenge} Anhang{n.anhaenge === 1 ? '' : 'änge'} – liegt im Postfach
                  </p>
                )}
                {meine.map(a => (
                  <div key={a.id} className="mt-3 border-l-2 border-emerald-300 pl-3 text-xs text-[#6b6b6b]">
                    Beantwortet von {a.zugangName ?? '–'} am {zeitpunktDeutsch(a.zeitpunkt)}: „{a.betreff}“
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-[#0a0a0a]/[0.07] flex flex-wrap items-start justify-between gap-4">
                  <ZuordnenFormular nachrichtId={n.id} />
                  <form action={nachrichtLoeschen}>
                    <input type="hidden" name="nachrichtId" value={n.id} />
                    <SpeichernKnopf art="leise" className="hover:text-red-700" bestaetigen="Diese Mail aus der Verwaltung löschen? Im Postfach bleibt sie erhalten.">
                      Löschen
                    </SpeichernKnopf>
                  </form>
                </div>
                {an && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium">Antworten</summary>
                    <div className="mt-3">
                      <MailTeil
                        buchungId={null}
                        an={an}
                        vorlage={{
                          betreff: /^(re|aw|antw):/i.test(betreff) ? betreff : `Re: ${betreff || 'Ihre Nachricht'}`,
                          text: `Hallo,\n\n${gruss}`,
                          antwortAuf: n.id,
                        }}
                      />
                    </div>
                  </details>
                )}
              </Karte>
            )
          })
        )}
      </div>
    </>
  )
}
