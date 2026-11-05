import { CalendarCheck } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const buchungen: Thema = {
  slug: 'buchungen',
  titel: 'Vereinsheim: Buchungen und Belegung',
  kurz: 'Anfragen für Vereinsheim und Gelände bestätigen oder ablehnen, eigene Belegungen eintragen und die Regelbelegung im Kalender pflegen.',
  icon: CalendarCheck,
  zielgruppe: 'buchungen',
  bereich: 'vereinsheim',
  ohneUebung: true,
  ziel: { href: '/verwaltung/buchungen', text: 'Buchungen öffnen' },
  website: { href: '/vereinsheim', text: 'Buchungsseite ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür und wer darf?">
        <p>
          Auf der Website kann jede:r unter <Begriff>Verein → Vereinsheim buchen</Begriff> das Vereinsheim, das Gelände oder beides anfragen – als
          Vereinsmitglied oder von außerhalb. Hier in der Verwaltung entscheidest du über diese Anfragen und trägst eigene Belegungen ein, zum Beispiel
          Vorstandssitzungen oder Lehrgänge.
        </p>
        <p>
          Den Menüpunkt <Begriff>Buchungen</Begriff> sehen Admins und Zugänge mit dem Recht <Begriff>Buchungen (Vereinsheim)</Begriff>. Die Zahl
          daneben zeigt, wie viele Anfragen noch auf Antwort warten.
        </p>
      </Abschnitt>

      <Abschnitt titel="Eine Anfrage beantworten">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Buchungen</Begriff>. Unter <Begriff>Offene Anfragen</Begriff> stehen alle Anfragen mit dem Status Angefragt oder
            Rückfrage. Klick auf eine Anfrage.
          </>
          <>
            Steht oben ein gelber Hinweis <Begriff>Überschneidet sich mit</Begriff>, ist zu der Zeit schon etwas eingetragen. Entscheide, ob beides
            zusammen geht.
          </>
          <>
            Wähl unter <Begriff>Status</Begriff> <Taste>Bestätigt</Taste>, <Taste>Rückfrage</Taste> oder <Taste>Abgelehnt</Taste>.
          </>
          <>
            Schreib bei Bedarf eine <Begriff>Rückmeldung</Begriff>, zum Beispiel „Schlüssel bitte am Vortag abholen“.
          </>
          <>
            Lass das Häkchen <Begriff>E-Mail … schicken</Begriff> gesetzt, dann bekommt die Person Status und Rückmeldung per E-Mail.
          </>
          <>
            Klick unten auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <Tipp art="achtung" titel="Die Rückmeldung ist öffentlich">
          Wer Buchungsnummer und Datum kennt, sieht auf der Statusseite den Status und deine Rückmeldung. Schreib dort deshalb keine Namen,
          Telefonnummern oder Adressen hinein. Was nur für den Verein ist (Miete, Kaution, Schlüssel), gehört in die <Begriff>Interne Notiz</Begriff>.
        </Tipp>
        <p>
          Mit <Taste>E-Mail schreiben</Taste> oben auf der Seite öffnest du dein eigenes Mailprogramm mit einem fertigen Text – praktisch für längere
          Absprachen. Antworten auf die automatischen E-Mails landen im Postfach buchungen@sv-holm-seppensen.de.
        </p>
      </Abschnitt>

      <Abschnitt titel="Was bedeuten die Status?">
        <Punkte>
          <li>
            <Begriff>Angefragt</Begriff>: neu über die Website, noch nicht entschieden.
          </li>
          <li>
            <Begriff>Rückfrage</Begriff>: Du klärst noch etwas mit der Person.
          </li>
          <li>
            <Begriff>Bestätigt</Begriff>: zugesagt, steht fest im Kalender.
          </li>
          <li>
            <Begriff>Abgelehnt</Begriff> und <Begriff>Storniert</Begriff>: findet nicht statt und verschwindet aus dem Kalender. Die Person sieht den
            Stand weiter auf der Statusseite – deshalb lieber so absagen als löschen. Löschen ist für Spam und Versehen.
          </li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="Eigene Belegung eintragen (Sonderbelegung)">
        <Schritte>
          <>
            Klick auf <Taste>Belegung eintragen</Taste> – oder im Kalender auf einen Tag und dann auf <Taste>An diesem Tag eintragen</Taste>.
          </>
          <>
            Trag den <Begriff>Anlass</Begriff> ein, wähl den <Begriff>Ort</Begriff> und die Zeit. Endet es nach Mitternacht, trägst du einfach die
            Uhrzeit ein (z. B. 20:00 bis 02:00). Für mehrere Tage füllst du <Begriff>Endet am</Begriff> aus.
          </>
          <>
            Lass <Begriff>Art</Begriff> auf <Begriff>Verein (intern)</Begriff> und den Status auf <Begriff>Bestätigt</Begriff>. Name und E-Mail sind dann
            freiwillig.
          </>
          <>
            Klick auf <Taste>Belegung eintragen</Taste>. Die Belegung bekommt ebenfalls eine Buchungsnummer.
          </>
        </Schritte>
        <p>Anfragen, die per Telefon oder E-Mail kommen, trägst du genauso ein – nur mit der Art Vereinsmitglied oder Extern und dem Status Angefragt.</p>
      </Abschnitt>

      <Abschnitt titel="Regelbelegung und Kalender">
        <p>
          Die <Begriff>Regelbelegung</Begriff> ist alles, was jede Woche zur selben Zeit stattfindet – Dart, Yoga, J4f, Training auf dem Gelände. Sie
          steht automatisch im Kalender (grau), du musst sie nicht für jeden Tag eintragen. Mit <Begriff>Gültig ab/bis</Begriff> begrenzt du sie, zum
          Beispiel auf die Sommersaison.
        </p>
        <Punkte>
          <li>
            Fällt die Regelbelegung an einem Tag aus (Ferien, Feiertag, Sonderbelegung statt Training): im <Begriff>Kalender</Begriff> auf den Tag
            klicken und <Taste>Fällt an diesem Tag aus</Taste>. Das lässt sich mit <Taste>Findet doch statt</Taste> zurücknehmen.
          </li>
          <li>Rot umrandete Einträge überschneiden sich mit etwas anderem am selben Ort.</li>
          <li>Über die Knöpfe oben filterst du den Kalender nach Vereinsheim oder Gelände.</li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="Was sieht die buchende Person?">
        <Punkte>
          <li>Nach dem Absenden ihre Buchungsnummer, dazu eine Bestätigung per E-Mail.</li>
          <li>Beim Anfragen nur, zu welchen Zeiten schon etwas belegt oder angefragt ist – nie Anlass oder Namen.</li>
          <li>
            Unter <Begriff>Vereinsheim → Stand abrufen</Begriff> mit Nummer und Datum: Status, Ort, Zeit und deine Rückmeldung. Hast du das Datum
            verschoben, gilt das neue Datum – sag der Person dann Bescheid.
          </li>
        </Punkte>
        <Tipp titel="Datenschutz">
          Name, E-Mail, Telefon und Nachricht werden ein Jahr nach dem Termin automatisch gelöscht. Anlass, Zeit und Status bleiben für die Übersicht
          stehen. Im Verlauf stehen Kontaktdaten nie.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
