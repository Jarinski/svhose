import { UserCog } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const zugaenge: Thema = {
  slug: 'zugaenge',
  titel: 'Zugänge vergeben',
  kurz: 'Neue Leute einladen, Rechte festlegen und helfen, wenn jemand das Passwort vergessen oder ein neues Handy hat.',
  icon: UserCog,
  zielgruppe: 'admin',
  bereich: 'verwaltung',
  ziel: { href: '/verwaltung/zugaenge/neu', text: 'Neuen Zugang anlegen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür Zugänge da sind">
        <p>
          Jede Person, die Inhalte pflegt, bekommt einen eigenen Zugang. Angemeldet wird mit Benutzername, Passwort und einem Code aus einer
          Authenticator-App auf dem Handy. Zugänge anlegen, ändern und sperren dürfen nur Admins. Du findest alles im Menü unter{' '}
          <Begriff>Zugänge</Begriff>.
        </p>
        <p>
          In der Liste steht bei jedem Zugang, was er bearbeiten darf, wann er zuletzt angemeldet war und auf wie vielen Geräten er gerade
          angemeldet ist. <Begriff>Einrichtung ausstehend</Begriff> heißt: Die Person hat Passwort und App noch nicht eingerichtet – oder ihr
          Zugang wurde zurückgesetzt.
        </p>
      </Abschnitt>

      <Abschnitt titel="Neuen Zugang anlegen">
        <Schritte>
          <>
            Öffne <Begriff>Zugänge</Begriff> und klicke auf <Taste>Neuer Zugang</Taste>.
          </>
          <>
            Trag unter <Begriff>Name</Begriff> den vollen Namen ein, z. B. „Anna Beispiel“. So erscheint der Zugang in der Verwaltung und im
            Verlauf.
          </>
          <>
            Das Feld <Begriff>Benutzername</Begriff> füllt die Verwaltung aus dem Namen vor, z. B. „anna.beispiel“. Du kannst es ändern. Erlaubt
            sind Kleinbuchstaben, Ziffern, Punkt, Bindestrich und Unterstrich.
          </>
          <>
            Optional: Such unter <Begriff>Eigene Person</Begriff> die Person aus der Personenliste, die zu diesem Zugang gehört („das bin ich“).
            Dann kann sie ihre eigenen Kontaktdaten und ihr Foto selbst pflegen.
          </>
          <>
            Leg unter <Begriff>Darf bearbeiten</Begriff> die Rechte fest (siehe nächster Abschnitt).
          </>
          <>
            Klicke auf <Taste>Zugang anlegen und Einladungs-Code erstellen</Taste>.
          </>
        </Schritte>
        <Tipp>
          Zwei Zugänge können nicht denselben Namen haben. Gibt es den Namen schon, ergänze z. B. den Nachnamen.
        </Tipp>
        <Tipp art="achtung" titel="Verknüpfte Person">
          Ist eine Person mit einem Zugang verknüpft, können nur noch sie selbst und Admins ihre Daten ändern. Andere Trainer:innen oder die
          Spartenleitung können das dann nicht mehr – auch wenn die Person in ihrem Team steht.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Welche Rechte passen?">
        <Punkte>
          <li>
            <Begriff>Alles (Admin)</Begriff> – alle Inhalte, Kontaktseite, Zugänge und Verlauf. Nur für den Vorstand.
          </li>
          <li>
            <Begriff>Bestimmte Bereiche</Begriff> und eine <strong>ganze Sparte</strong> anhaken – das ist die Spartenleitung. Sie bearbeitet die
            Sparte und ihre Termine sowie alle Mannschaften und Gruppen darin, darf dort auch neue anlegen und löschen. Außerdem schreibt sie
            News für die Sparte und ihre Teams und pflegt die Personen darin.
          </li>
          <li>
            <Begriff>Bestimmte Bereiche</Begriff> und <strong>einzelne Mannschaften oder Gruppen</strong> – das passt für Trainer:innen. Sie
            bearbeiten nur diese Teams (Trainingszeiten, Trainerteam, Foto und Texte), schreiben News für diese Teams und pflegen die Personen,
            die nur dort eingetragen sind. Löschen können sie ihre Teams nicht, nur ausblenden. Termine pflegt die Spartenleitung.
          </li>
        </Punkte>
        <p>
          Für einzelne Teams klappst du die Sparte über <Taste>einzeln</Taste> rechts daneben auf (auf dem Handy steht dort nur ein Pfeil mit der
          Anzahl). Mit dem Suchfeld findest du eine Mannschaft schneller. Im Kasten darüber steht nach <Begriff>Ausgewählt:</Begriff> genau, was
          der Zugang bearbeiten darf.
        </p>
        <Tipp>Hakst du eine ganze Sparte an, sind ihre Mannschaften und Gruppen automatisch dabei. Einzeln anhaken musst du sie dann nicht.</Tipp>
      </Abschnitt>

      <Abschnitt titel="Den Einladungs-Code weitergeben">
        <p>
          Nach dem Anlegen erscheint „Zugang für … angelegt.“ und darunter der Kasten <Begriff>Anmelde-Code für …</Begriff> mit einem QR-Code
          und einem Code aus 12 Zeichen. Der Code gilt 7 Tage und nur einmal. So gibst du ihn weiter:
        </p>
        <Punkte>
          <li>Am besten persönlich: Die Person scannt den QR-Code mit der Handykamera direkt von deinem Bildschirm.</li>
          <li>
            Oder per Direktnachricht: Klicke auf <Taste>Link kopieren</Taste> und schick den Link nur an diese Person – nicht in eine Gruppe.
          </li>
          <li>
            Am PC öffnet die Person die Anmeldeseite der Verwaltung, klickt unten auf „gib den Einladungs-Code hier ein“ und tippt den Code ein.
            Den Code kannst du ihr mit <Taste>Code kopieren</Taste> schicken.
          </li>
        </Punkte>
        <p>
          Die Person sieht dann ihren Benutzernamen, legt ein Passwort fest und koppelt die Authenticator-App (z. B. Google Authenticator oder
          Microsoft Authenticator). Danach ist sie angemeldet, und in der Liste verschwindet <Begriff>Einrichtung ausstehend</Begriff>. Wie das
          genau geht, steht in der Anleitung „Anmelden & Mein Zugang“.
        </p>
        <Tipp art="achtung">
          Der Code erscheint nur ein einziges Mal. Lass die Seite offen, bis die Person ihn gescannt hat oder du den Link verschickt hast. Ist er
          doch weg oder abgelaufen, öffne den Zugang und klicke im Kasten <Begriff>Einladung</Begriff> auf{' '}
          <Taste>Neuen Einladungs-Code erstellen</Taste>. Der alte Code gilt dann nicht mehr.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Rechte, Name oder Benutzername ändern">
        <Schritte>
          <>
            Öffne <Begriff>Zugänge</Begriff> und tippe auf den Zugang.
          </>
          <>
            Ändere unter <Begriff>Wer?</Begriff> oder <Begriff>Darf bearbeiten</Begriff>, was nötig ist.
          </>
          <>
            Klicke unten auf <Taste>Speichern</Taste>. Es erscheint „Gespeichert. Die neuen Rechte gelten sofort auf allen Geräten.“
          </>
        </Schritte>
        <Tipp>
          Änderst du den Benutzernamen, sag der Person Bescheid. Sie meldet sich ab dann mit dem neuen an.
        </Tipp>
        <p>Dir selbst kannst du die Admin-Rechte nicht entziehen. Das muss ein:e andere:r Admin machen.</p>
      </Abschnitt>

      <Abschnitt titel="Passwort vergessen, Handy verloren oder gewechselt">
        <p>
          Selbst zurücksetzen kann man ein vergessenes Passwort nicht. Auch bei einem neuen Handy oder einer neuen Authenticator-App lässt sich
          die App nicht selbst umziehen. Das machst du als Admin, und es dauert nur eine Minute:
        </p>
        <Schritte>
          <>
            Öffne den Zugang unter <Begriff>Zugänge</Begriff>.
          </>
          <>
            Klicke im Kasten <Begriff>Passwort & App</Begriff> auf den Knopf „Zugang zurücksetzen (Passwort & App neu einrichten)“ und bestätige
            die Rückfrage.
          </>
          <>
            Es erscheint ein neuer Einladungs-Code mit QR-Code. Gib ihn weiter wie beim Anlegen. Die Person richtet damit Passwort und App neu
            ein.
          </>
        </Schritte>
        <p>
          Beim Zurücksetzen werden alle Geräte sofort abgemeldet, das alte Passwort und die App-Kopplung gelten nicht mehr. Wer das Passwort
          noch kennt und es nur ändern möchte, macht das selbst unter <Begriff>Mein Zugang</Begriff>.
        </p>
        <Tipp art="achtung" titel="Deaktivierter Zugang">
          Einen deaktivierten Zugang kannst du nicht zurücksetzen. Aktiviere ihn zuerst wieder (siehe nächster Abschnitt).
        </Tipp>
        <Tipp art="achtung" titel="Eigener Zugang">
          Setzt du deinen eigenen Zugang zurück, bist du danach auch auf diesem Gerät abgemeldet. Scanne den neuen QR-Code mit dem Handy, bevor
          du auf <Taste>Zur Anmeldung</Taste> klickst – der Code wird nicht noch einmal angezeigt.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Abmelden, sperren oder löschen">
        <p>Diese Kästen findest du weiter unten auf der Seite des Zugangs:</p>
        <Punkte>
          <li>
            <Begriff>Angemeldete Geräte</Begriff>: Gerät verloren oder verkauft? Mit <Taste>Abmelden</Taste> ist man dort sofort ausgeloggt. Bei
            mehreren Geräten meldet <Taste>Alle Geräte abmelden</Taste> alle auf einmal ab. Ist mit dem Handy auch die Authenticator-App weg,
            setz den Zugang zusätzlich zurück (siehe oben).
          </li>
          <li>
            <Taste>Zugang deaktivieren</Taste> sperrt den Zugang sofort: Alle Geräte werden abgemeldet, eine offene Einladung wird gelöscht.
            Rechte, Passwort und Verlauf bleiben erhalten.
          </li>
          <li>
            <Taste>Zugang wieder aktivieren</Taste>: Die Person kann sich wieder mit Benutzername, Passwort und App anmelden. War der Zugang noch
            nicht eingerichtet, erstelle danach einen neuen Einladungs-Code.
          </li>
          <li>
            <Taste>Zugang löschen</Taste> entfernt den Zugang mit allen Geräten, Passwort und App-Kopplung. Im Verlauf bleibt der Name bei
            früheren Änderungen stehen.
          </li>
        </Punkte>
        <Tipp>Deaktivieren kannst du jederzeit wieder rückgängig machen. Löschen nicht.</Tipp>
        <Tipp art="achtung" titel="Verdacht auf Missbrauch">
          Ist ein Gerät angemeldet, das niemand kennt, kennt jemand Fremdes Passwort und App-Code. Abmelden und Deaktivieren reichen dann nicht:
          Passwort und App bleiben gültig. Setz den Zugang zurück. Danach gelten Passwort und App nicht mehr, und die Person richtet beides mit
          einem neuen Code neu ein.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp titel="Mindestens zwei Admins">
          Richte mindestens zwei Admins ein. Dann sperrt ein verlorenes Handy nicht alle aus. Können sich gar keine Admins mehr anmelden, muss die
          Person helfen, die die Website technisch betreut.
        </Tipp>
        <Punkte>
          <li>
            Deinen eigenen Zugang kannst du nicht deaktivieren, löschen oder zum Nicht-Admin machen – das kann nur ein:e andere:r Admin. So bleibt
            immer mindestens ein:e Admin übrig.
          </li>
          <li>
            Passwörter und die Codes aus der App sieht niemand, auch Admins nicht. Den Einladungs-Code siehst du nur ein einziges Mal direkt nach
            dem Erstellen. Im Verlauf steht nichts davon.
          </li>
          <li>
            Steht in der Liste <Begriff>Einladung offen bis …</Begriff>, hat die Person ihren Code noch nicht benutzt.
          </li>
        </Punkte>
      </Abschnitt>
    </>
  ),
}
