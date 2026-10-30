import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const anmelden: Thema = {
  slug: 'anmelden',
  titel: 'Anmelden & Mein Zugang',
  kurz: 'Einladung annehmen, mit App-Code anmelden, Passwort ändern und Geräte abmelden – und was tun, wenn das Handy weg ist.',
  icon: KeyRound,
  zielgruppe: 'alle',
  bereich: 'start',
  ziel: { href: '/verwaltung/geraete', text: 'Zu „Mein Zugang“' },
  inhalt: (
    <>
      <Abschnitt titel="Drei Dinge zum Anmelden">
        <p>Für die Verwaltung brauchst du immer drei Dinge:</p>
        <Punkte>
          <li>deinen Benutzernamen,</li>
          <li>dein Passwort,</li>
          <li>
            einen 6-stelligen Code aus einer Authenticator-App auf deinem Handy, z. B. Google Authenticator, Microsoft Authenticator oder Aegis.
            Die Apps sind kostenlos.
          </li>
        </Punkte>
        <p>
          Die Verwaltung erreichst du über die Adresse der Vereinswebsite mit <Begriff>/verwaltung</Begriff> am Ende. Selbst registrieren kannst
          du dich nicht. Deinen Zugang legt ein:e Admin an. Du bekommst dann eine Einladung, mit der du Passwort und App einmalig einrichtest.
        </p>
      </Abschnitt>

      <Abschnitt titel="Einladung annehmen (einmalig)">
        <p>Die Einladung ist ein QR-Code, ein Link oder ein Einladungs-Code mit 12 Zeichen wie K7QM-9XTD-2HWP. Sie gilt 7 Tage und nur einmal.</p>
        <p>
          Am einfachsten geht es mit PC und Handy zusammen: Am PC öffnest du die Einladung, mit dem Handy scannst du den QR-Code für die App. Nur
          mit dem Handy geht es auch – dann nimmst du in Schritt 4 den Schlüssel statt des QR-Codes.
        </p>
        <Schritte>
          <>
            Öffne die Einladung. Am PC öffnest du den Link aus der Einladung. Hast du nur den Code, ruf die Adresse der Vereinswebsite mit{' '}
            <Begriff>/verwaltung/anmelden</Begriff> am Ende auf, tippe den Code ins Feld <Begriff>Einladungs-Code</Begriff> und klicke auf{' '}
            <Taste>Weiter</Taste>. Am Handy scannst du den QR-Code der Einladung mit der Kamera oder öffnest den Link.
          </>
          <>
            Unter <Begriff>Dein Benutzername</Begriff> steht dein Benutzername. Merk ihn dir gut – damit meldest du dich künftig an.
          </>
          <>
            Unter <Begriff>Passwort festlegen</Begriff> trägst du dein Passwort bei <Begriff>Neues Passwort</Begriff> und{' '}
            <Begriff>Passwort wiederholen</Begriff> ein. Es braucht mindestens 10 Zeichen und darf deinen Benutzernamen nicht enthalten.
          </>
          <>
            Unter <Begriff>Authenticator-App koppeln</Begriff>: Öffne deine Authenticator-App, tippe auf „+“ bzw. „Konto hinzufügen“ und scanne
            den QR-Code auf der Seite. Bist du am Handy, wählst du in der App stattdessen „Schlüssel eingeben“ und trägst den Schlüssel ein, der
            unter dem QR-Code steht. Tippst du länger darauf, wird er ganz markiert, und du kannst ihn kopieren und in der App einfügen.
          </>
          <>
            Gib die 6 Ziffern, die die App jetzt anzeigt, bei <Begriff>Code aus der App</Begriff> ein.
          </>
          <>
            Der Haken bei „Auf diesem Gerät angemeldet bleiben (30 Tage)“ ist schon gesetzt. Richtest du den Zugang an einem fremden oder
            gemeinsamen Rechner ein, entferne ihn.
          </>
          <>
            Klicke auf <Taste>Zugang einrichten und anmelden</Taste>. Du bist jetzt angemeldet und landest auf der Übersicht.
          </>
        </Schritte>
        <Tipp art="achtung" titel="Seite nicht neu laden">
          Lade die Seite nicht neu und öffne die Einladung nicht noch einmal, nachdem du den QR-Code gescannt hast. Dabei erscheint ein neuer
          QR-Code, und der Eintrag, den du gerade in der App angelegt hast, passt nicht mehr. Ist es doch passiert: Lösch in der App den alten
          Eintrag „SV Holm-Seppensen“ und scanne den neuen QR-Code. So nimmst du später nicht aus Versehen den falschen Code.
        </Tipp>
        <p>
          Steht dort „Dieser Einladungs-Code ist ungültig, abgelaufen oder wurde schon benutzt.“, gilt die Einladung nicht mehr. Ein:e Admin kann
          dir eine neue erstellen.
        </p>
      </Abschnitt>

      <Abschnitt titel="So meldest du dich an">
        <Schritte>
          <>
            Öffne die Verwaltung (Adresse der Vereinswebsite mit <Begriff>/verwaltung</Begriff> am Ende). Bist du nicht angemeldet, erscheint die
            Seite <Begriff>Anmelden</Begriff>.
          </>
          <>
            Trage <Begriff>Benutzername</Begriff> und <Begriff>Passwort</Begriff> ein.
          </>
          <>
            Öffne die Authenticator-App und tippe die 6 Ziffern bei <Begriff>Code aus der Authenticator-App</Begriff> ein. Der Code wechselt alle 30
            Sekunden.
          </>
          <>
            Lass den Haken bei „Auf diesem Gerät angemeldet bleiben (30 Tage)“ gesetzt, wenn es dein eigenes Gerät ist.
          </>
          <>
            Klicke auf <Taste>Anmelden</Taste>.
          </>
        </Schritte>
        <p>
          Mit dem Haken bleibst du 30 Tage angemeldet. Danach meldest du dich neu an, auch wenn du die Verwaltung zwischendurch benutzt hast. Ohne
          Haken endet die Anmeldung, wenn du den Browser schließt, spätestens nach 12 Stunden.
        </p>
        <Tipp>
          Die Website verlinkt die Verwaltung nicht. Leg dir am besten ein Lesezeichen an. Groß- und Kleinschreibung spielen beim Benutzernamen keine
          Rolle.
        </Tipp>
        <Tipp art="achtung" titel="Fremder oder gemeinsamer Rechner">
          Entferne dort den Haken bei „angemeldet bleiben“ und melde dich am Ende ab. <Taste>Abmelden</Taste> steht unten in der Seitenleiste, am
          Handy im Menü.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Wenn die Anmeldung nicht klappt">
        <p>
          Bei falschen Angaben erscheint „Anmeldung fehlgeschlagen. Benutzername, Passwort oder App-Code stimmen nicht.“ Die Meldung sagt absichtlich
          nicht, welche Angabe falsch war.
        </p>
        <Punkte>
          <li>Jeder App-Code gilt nur einmal. Hast du dich gerade auf einem anderen Gerät angemeldet, warte auf den nächsten Code.</li>
          <li>Stimmt der Code immer wieder nicht, prüfe, ob die Uhrzeit auf deinem Handy automatisch eingestellt ist. Die Codes hängen an der Uhrzeit.</li>
          <li>
            Hast du den QR-Code gescannt, heißt der Eintrag in der App „SV Holm-Seppensen“, zusammen mit deinem Benutzernamen. Hast du zwei solche
            Einträge? Dann gilt nur der, mit dem du die Einrichtung abgeschlossen hast – meist der neueste. Lösch den alten.
          </li>
        </Punkte>
        <Tipp art="achtung" titel="Pause nach Fehlversuchen">
          Nach fünf falschen Versuchen innerhalb einer Viertelstunde erscheint „Zu viele falsche Versuche. Bitte in einer Viertelstunde erneut
          probieren.“ Solange geht es auch mit den richtigen Angaben nicht. Die Pause kann auch kommen, wenn sich andere im selben WLAN mehrmals
          vertippt haben. Warte die Viertelstunde ab und versuch es dann in Ruhe noch einmal.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Mein Zugang: Geräte und Passwort">
        <p>
          Unter <Begriff>Mein Zugang</Begriff> im Menü siehst du oben deinen Benutzernamen. Darunter verwaltest du deine Geräte und dein Passwort.
        </p>
        <p>
          <Begriff>Angemeldete Geräte</Begriff> zeigt alle Geräte, auf denen du gerade angemeldet bist, z. B. „iPhone · Safari“. Das Gerät, an dem
          du sitzt, ist mit <Begriff>dieses Gerät</Begriff> markiert. Jedes andere Gerät meldest du mit <Taste>Abmelden</Taste> daneben ab. Das
          aktuelle Gerät meldest du über <Taste>Abmelden</Taste> im Menü ab.
        </p>
        <p>So änderst du dein Passwort:</p>
        <Schritte>
          <>
            Trage unter <Begriff>Passwort ändern</Begriff> dein <Begriff>Aktuelles Passwort</Begriff> ein.
          </>
          <>
            Gib bei <Begriff>Code aus der App</Begriff> den aktuellen Code aus deiner Authenticator-App ein.
          </>
          <>
            Trage das neue Passwort bei <Begriff>Neues Passwort</Begriff> und <Begriff>Neues Passwort wiederholen</Begriff> ein (mindestens 10
            Zeichen).
          </>
          <>
            Klicke auf <Taste>Passwort ändern</Taste>. Es erscheint „Passwort geändert. Alle anderen Geräte wurden abgemeldet.“
          </>
        </Schritte>
        <Tipp>Siehst du ein Gerät, das du nicht kennst? Melde es ab und ändere dein Passwort.</Tipp>
      </Abschnitt>

      <Abschnitt titel="Passwort vergessen, Handy verloren oder neues Handy">
        <p>
          Zum Ändern des Passworts brauchst du das alte Passwort und die App. Fehlt eins davon, bitte eine:n Admin, deinen Zugang zurückzusetzen.
          Dabei passiert Folgendes:
        </p>
        <Punkte>
          <li>Alle deine Geräte werden sofort abgemeldet.</li>
          <li>Dein altes Passwort und die Kopplung mit der App gelten nicht mehr.</li>
          <li>Du bekommst eine neue Einladung (7 Tage gültig, nur einmal). Dein Benutzername bleibt gleich.</li>
        </Punkte>
        <p>
          Mit der neuen Einladung richtest du Passwort und App neu ein, genau wie oben unter „Einladung annehmen“. So gehst du auch vor, wenn du ein
          neues Handy oder eine neue App hast. Lösch in der App vorher den alten Eintrag „SV Holm-Seppensen“ – er gilt nicht mehr, und so nimmst du
          nicht aus Versehen den falschen Code.
        </p>
        <Tipp>
          Bist du noch an einem anderen Gerät angemeldet, kannst du das verlorene Handy dort sofort unter <Begriff>Mein Zugang</Begriff> abmelden.
          Beim Zurücksetzen werden ohnehin alle Geräte abgemeldet.
        </Tipp>
        <Tipp art="achtung">
          Behandle die Einladung wie einen Schlüssel: Wer sie zuerst benutzt, richtet den Zugang ein. Gib sie nicht weiter und teile sie nie in
          Gruppen.
        </Tipp>
        <p>
          Für Admins: Wie du einen Zugang zurücksetzt oder eine neue Einladung erstellst, steht in der Anleitung{' '}
          <Link href="/verwaltung/hilfe/zugaenge" className="underline underline-offset-4 hover:text-[#6b6b6b]">
            Zugänge vergeben
          </Link>
          . Den Benutzernamen siehst du unter <Begriff>Zugänge</Begriff>, wenn du den Zugang öffnest – falls ihn jemand vergessen hat.
        </p>
      </Abschnitt>
    </>
  ),
}
