import type { Metadata } from 'next'
import { mailEinstellungenLesen, mailZugang, smtpUmgebungGesetzt } from '@/lib/mail'
import { entschluesseln, verschluesselungMoeglich } from '@/lib/verwaltung/geheimnis'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Meldung, Seitenkopf } from '@/components/verwaltung/ui'
import MailFormular from './MailFormular'

export const metadata: Metadata = { title: 'E-Mail-Versand' }

export default async function MailSeite() {
  await adminErzwingen()
  const e = mailEinstellungenLesen()
  const passwortLesbar = !!entschluesseln(e.passwort)
  const umgebung = smtpUmgebungGesetzt()
  const zugang = mailZugang()

  return (
    <>
      <Seitenkopf
        titel="E-MAIL-VERSAND"
        untertitel={
          <>
            Über dieses Postfach gehen die Mails der Vereinsheim-Buchungen raus: Eingangsbestätigungen, Meldungen neuer Anfragen und Rückmeldungen. Nur für
            Admins.
            {e.geaendertAm && <> Zuletzt gespeichert {zeitpunktDeutsch(e.geaendertAm)}.</>}
          </>
        }
      />
      <div className="space-y-6">
        {umgebung ? (
          <Meldung art="hinweis">
            Auf dem Server sind SMTP-Umgebungsvariablen gesetzt ({zugang?.host}, {zugang?.benutzer}). Sie gelten vorrangig – was du hier speicherst, wirkt erst,
            wenn sie entfernt sind.
          </Meldung>
        ) : !verschluesselungMoeglich() ? (
          <Meldung art="fehler">
            Auf dem Server fehlt CRON_SECRET. Ohne ihn lässt sich das Passwort nicht verschlüsselt speichern – bitte zuerst in der Env-Datei setzen.
          </Meldung>
        ) : e.passwort && !passwortLesbar ? (
          <Meldung art="fehler">Das gespeicherte Passwort lässt sich nicht mehr lesen (CRON_SECRET wurde geändert). Bitte das Passwort neu eintragen.</Meldung>
        ) : zugang ? (
          <Meldung art="erfolg">
            Der Versand ist eingerichtet und eingeschaltet: {zugang.benutzer} über {zugang.host}:{zugang.port}.
          </Meldung>
        ) : (
          <Meldung art="hinweis">
            {e.aktiv ? 'Noch nicht eingerichtet: Es fehlt das Passwort des Postfachs.' : 'Der Versand ist ausgeschaltet.'} Bis dahin gehen Anfragen ohne
            E-Mails ein.
          </Meldung>
        )}
        <MailFormular
          daten={{
            aktiv: e.aktiv,
            host: e.host,
            port: e.port,
            benutzer: e.benutzer,
            absenderName: e.absenderName,
            postfach: e.postfach,
            passwortGespeichert: passwortLesbar,
            geaendertAm: e.geaendertAm,
          }}
        />
      </div>
    </>
  )
}
