import type { Metadata } from 'next'
import { INSTAGRAM_ANZAHL, instagramFeedLesen, instagramZugangLesen } from '@/lib/instagram'
import { medienUrl } from '@/lib/medien'
import { entschluesseln, verschluesselungMoeglich } from '@/lib/verwaltung/geheimnis'
import { adminErzwingen } from '@/lib/verwaltung/sitzung'
import { datumDeutsch, zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Karte, LeerHinweis, Meldung, Seitenkopf } from '@/components/verwaltung/ui'
import { AbrufKnopf, TrennenKnopf, ZugangFormular } from './Formulare'

export const metadata: Metadata = { title: 'Instagram' }

const linkKlasse = 'underline underline-offset-2'

export default async function InstagramSeite() {
  await adminErzwingen()
  const zugang = instagramZugangLesen()
  const feed = instagramFeedLesen()
  const verbunden = !!zugang.token
  const lesbar = verbunden && !!entschluesseln(zugang.token)
  const konto = zugang.benutzername ? `@${zugang.benutzername}` : 'dem Konto'
  const bilder = feed.beitraege.slice(0, INSTAGRAM_ANZAHL)

  return (
    <>
      <Seitenkopf
        titel="INSTAGRAM"
        untertitel={
          <>
            Die Instagram-Kachel auf der Startseite zeigt die {INSTAGRAM_ANZAHL} neuesten Beiträge. Die Website holt sie stündlich und speichert die Bilder auf
            unserem Server – wer die Startseite besucht, verbindet sich dabei nicht mit Instagram. Nur für Admins.
          </>
        }
      />
      <div className="space-y-6">
        {!verschluesselungMoeglich() ? (
          <Meldung art="fehler">
            Auf dem Server fehlt CRON_SECRET. Ohne ihn lässt sich der Zugangsschlüssel nicht verschlüsselt speichern – bitte zuerst in der Env-Datei setzen.
          </Meldung>
        ) : !verbunden ? (
          <Meldung art="hinweis">Noch nicht verbunden – die Startseite zeigt bis dahin Platzhalterfotos. Wie du den Zugangsschlüssel bekommst, steht unten.</Meldung>
        ) : !lesbar ? (
          <Meldung art="fehler">Der gespeicherte Zugangsschlüssel lässt sich nicht mehr lesen (CRON_SECRET wurde geändert). Bitte einen neuen eintragen.</Meldung>
        ) : feed.fehler ? (
          <Meldung art="fehler">
            Verbunden mit {konto}, aber der letzte Abruf ({zeitpunktDeutsch(feed.versuchtAm)}) hat nicht geklappt: {feed.fehler}
            {feed.abgerufenAm && <> Die Startseite zeigt weiter die Bilder vom {zeitpunktDeutsch(feed.abgerufenAm)}.</>}
          </Meldung>
        ) : (
          <Meldung art="erfolg">
            Verbunden mit {konto}.{feed.abgerufenAm && <> Zuletzt abgerufen {zeitpunktDeutsch(feed.abgerufenAm)}.</>} Der Zugangsschlüssel verlängert sich
            dabei von selbst{zugang.gueltigBis && <> (gültig bis {datumDeutsch(zugang.gueltigBis)})</>}.
          </Meldung>
        )}

        {verbunden && (
          <Karte titel="Gerade auf der Startseite" beschreibung="Die Kachel verlinkt auf das Profil; hier führt jedes Bild zu seinem Beitrag." aktionen={<AbrufKnopf />}>
            {bilder.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {bilder.map(b => (
                  <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={medienUrl(b.bild) ?? ''} alt={`Beitrag vom ${datumDeutsch(b.datum)}`} className="w-full aspect-square object-cover rounded-sm" />
                    <span className="mt-1 block text-xs text-[#6b6b6b]">{datumDeutsch(b.datum)}</span>
                  </a>
                ))}
              </div>
            ) : (
              <LeerHinweis>Noch keine Bilder abgerufen – die Startseite zeigt Platzhalterfotos.</LeerHinweis>
            )}
          </Karte>
        )}

        <Karte titel="Zugangsschlüssel">
          <ZugangFormular verbunden={verbunden} />
        </Karte>

        <Karte titel="So bekommst du den Zugangsschlüssel" beschreibung="Einmalig, dauert etwa 15 Minuten. Du brauchst die Zugangsdaten des Instagram-Kontos des Vereins und ein Facebook-Konto.">
          <ol className="list-decimal pl-5 space-y-2.5 text-sm leading-relaxed">
            <li>
              Das Instagram-Konto muss ein <b>professionelles Konto</b> sein (Creator oder Unternehmen, kostenlos). In der Instagram-App unter{' '}
              <i>Einstellungen → Kontotyp und Tools → Zu professionellem Konto wechseln</i> umstellen, falls noch nicht geschehen.
            </li>
            <li>
              Auf{' '}
              <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className={linkKlasse}>
                developers.facebook.com/apps
              </a>{' '}
              mit einem Facebook-Konto anmelden (einmalig als Entwickler*in registrieren) und eine neue App anlegen. Als Anwendungsfall „Nachrichten und
              Inhalte auf Instagram verwalten“ wählen, als App-Typ <i>Business</i>.
            </li>
            <li>
              Solange die App nicht veröffentlicht ist, darf sie nur Konten lesen, die eine Rolle in ihr haben: unter <i>App-Rollen → Rollen → Personen
              hinzufügen</i> das Vereinskonto als <i>Instagram-Tester</i> eintragen. Die Einladung dann auf instagram.com (angemeldet als Verein) unter{' '}
              <i>Einstellungen → Apps und Websites → Tester-Einladungen</i> annehmen.
            </li>
            <li>
              In der App links <i>Instagram → API setup with Instagram business login</i> öffnen, bei <i>Generate access tokens</i> das Vereinskonto
              hinzufügen und mit dessen Instagram-Zugangsdaten anmelden.
            </li>
            <li>
              Auf <i>Generate token</i> klicken, den angezeigten Schlüssel kopieren und oben einfügen. Die App muss dafür nicht veröffentlicht oder von Meta
              geprüft werden – sie liest nur die Beiträge des eigenen Kontos.
            </li>
          </ol>
          <p className="mt-4 text-sm text-[#6b6b6b]">
            Ein Schlüssel gilt 60 Tage und wird bei jedem Abruf rechtzeitig verlängert. Neu eintragen musst du ihn nur, wenn die Website länger als 60 Tage
            keinen Abruf geschafft hat, das Passwort des Instagram-Kontos geändert wurde oder oben ein Fehler steht.
          </p>
        </Karte>

        {verbunden && (
          <Karte titel="Verbindung trennen" beschreibung="Löscht den gespeicherten Schlüssel und die abgerufenen Bilder. Die Startseite zeigt dann wieder Platzhalterfotos.">
            <TrennenKnopf />
          </Karte>
        )}
      </div>
    </>
  )
}
