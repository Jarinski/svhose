import { History } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const verlauf: Thema = {
  slug: 'verlauf',
  titel: 'Verlauf: Wer hat was geändert?',
  kurz: 'Jede Änderung mit Zeitpunkt, Name und dem Stand vorher und nachher – und wie du einen alten Stand zurückholst.',
  icon: History,
  zielgruppe: 'admin',
  bereich: 'verwaltung',
  ziel: { href: '/verwaltung/verlauf', text: 'Zum Verlauf' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür der Verlauf gut ist">
        <p>
          Die Verwaltung hält jede Änderung fest: wer, wann, was – und wie es vorher und nachher aussah. Auch Anmeldungen und Abmeldungen stehen
          dort. Den Verlauf sehen nur Admins, im Menü unter <Begriff>Verlauf</Begriff>.
        </p>
        <p>
          Die neuesten Änderungen aller Zugänge siehst du außerdem auf der <Begriff>Übersicht</Begriff> unter <Begriff>Zuletzt geändert</Begriff>.
        </p>
      </Abschnitt>

      <Abschnitt titel="So liest du einen Eintrag">
        <p>Die neuesten Einträge stehen oben. Jede Zeile zeigt:</p>
        <Punkte>
          <li>
            <Begriff>Zeitpunkt</Begriff> – Datum und Uhrzeit.
          </li>
          <li>
            <Begriff>Wer · Quelle</Begriff> – der Name des Zugangs. Als Quelle steht dort meist <Begriff>Verwaltung</Begriff>.{' '}
            <Begriff>System</Begriff> heißt: Die Änderung kam nicht über die Verwaltung, z. B. die von der alten Website übernommenen News.
          </li>
          <li>
            <Begriff>Was</Begriff> – <Begriff>angelegt</Begriff>, <Begriff>geändert</Begriff>, <Begriff>gelöscht</Begriff>,{' '}
            <Begriff>Anmeldung</Begriff> oder <Begriff>Abmeldung</Begriff>.
          </li>
          <li>
            <Begriff>Bezeichnung</Begriff> – worum es geht, mit dem Bereich davor, z. B. „Personen: Anna Beispiel“.
          </li>
        </Punkte>
        <p>Am Handy stehen diese Angaben ohne Überschrift untereinander, in derselben Reihenfolge.</p>
        <p>
          Hat eine Zeile vorne einen kleinen Pfeil, kannst du sie antippen. Dann siehst du nur die Felder, die sich geändert haben, jeweils mit{' '}
          <Begriff>Vorher</Begriff> (rot) und <Begriff>Nachher</Begriff> (grün). Bei neu angelegten Einträgen steht nur{' '}
          <Begriff>Angelegt mit</Begriff>, bei gelöschten nur <Begriff>Vor dem Löschen</Begriff>.
        </p>
        <Tipp>
          Bei manchen Einträgen steht unter einer Überschrift der ganze Stand, nicht nur die geänderte Zeile – etwa bei Mannschaften mit ihren
          Trainingszeiten. Vergleiche dann <Begriff>Vorher</Begriff> und <Begriff>Nachher</Begriff> Zeile für Zeile. Manche Überschriften sehen
          technisch aus, z. B. „team“ oder „trainer“. Darunter stehen ganz normal die Angaben der Mannschaft bzw. des Trainerteams.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Filtern und blättern">
        <Schritte>
          <>
            Wähle oben unter <Begriff>Was</Begriff> einen Bereich, z. B. <Begriff>Mannschaften</Begriff>, <Begriff>News</Begriff> oder{' '}
            <Begriff>Zugänge</Begriff>.
          </>
          <>
            Wähle unter <Begriff>Wer</Begriff> einen Zugang – oder lass <Begriff>Alle</Begriff> stehen.
          </>
          <>
            Klicke auf <Taste>Anzeigen</Taste>. Mit <Taste>Zurücksetzen</Taste> siehst du wieder alles.
          </>
        </Schritte>
        <p>
          Pro Seite stehen 50 Einträge. Mit <Taste>Ältere</Taste> und <Taste>Neuere</Taste> blätterst du weiter. Einen Filter nach Datum gibt
          es nicht.
        </p>
        <Tipp>
          Änderungen von Zugängen, die inzwischen gelöscht sind, findest du unter <Begriff>Wer</Begriff> bei{' '}
          <Begriff>System / gelöschte Zugänge</Begriff>.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Einen alten Stand zurückholen">
        <p>Der Verlauf zeigt den alten Stand nur an. Zurückholen musst du ihn von Hand:</p>
        <Schritte>
          <>Such den Eintrag und tippe ihn an.</>
          <>
            Lies unter <Begriff>Vorher</Begriff> (oder <Begriff>Vor dem Löschen</Begriff>) ab, wie es vorher aussah. Längere Texte kannst du
            dort markieren und kopieren.
          </>
          <>
            Öffne das, was geändert wurde (z. B. die Mannschaft oder die News), an der gewohnten Stelle in der Verwaltung und trag den alten
            Stand ein. Wurde es gelöscht, leg es neu an.
          </>
          <>
            Klicke auf <Taste>Speichern</Taste>. Beim Neu-Anlegen heißt der Knopf z. B. <Taste>Person anlegen</Taste> oder{' '}
            <Taste>Mannschaft anlegen</Taste>, auf der Kontaktseite <Taste>Kontaktseite speichern</Taste>. Auch diese Änderung landet wieder im
            Verlauf.
          </>
        </Schritte>
        <Tipp art="achtung" titel="Kein Wiederherstellen-Knopf">
          Es gibt keinen Knopf, der eine Änderung automatisch rückgängig macht. Schau vorher, ob jemand dasselbe danach noch einmal geändert
          hat – sonst überschreibst du auch diese Änderung.
        </Tipp>
        <Tipp titel="Gelöschte Person">
          Bei einer gelöschten Person steht unter <Begriff>Vor dem Löschen</Begriff> bei „verwendung“, wo sie eingetragen war, z. B. „Trainer:in
          bei U13 (Fußball)“. Leg die Person neu an und trag sie dort wieder ein.
        </Tipp>
        <Tipp art="achtung" titel="Fotos, Bilder und PDF-Dateien">
          Von ersetzten oder entfernten Fotos, Bildern und PDF-Dateien – auch aus gelöschten Einträgen – steht im Verlauf nur der Dateiname. Die
          Datei selbst lässt sich daraus nicht zurückholen. Lade sie dann noch einmal hoch.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Anmeldungen im Blick behalten">
        <p>
          Wähle unter <Begriff>Was</Begriff> den Bereich <Begriff>Anmeldungen & Geräte</Begriff>. Dort stehen die normalen An- und Abmeldungen,
          jeweils mit dem Gerät, z. B. „iPhone · Safari · angemeldet bleiben“. „aus der Ferne“ heißt: Die Person hat das Gerät selbst unter{' '}
          <Begriff>Mein Zugang</Begriff> abgemeldet. „durch Admin abgemeldet“ heißt: Ein:e Admin hat es auf der Seite des Zugangs abgemeldet.
        </p>
        <p>
          Wähle unter <Begriff>Was</Begriff> den Bereich <Begriff>Zugänge</Begriff>, um den Rest zu sehen: die erste Anmeldung nach dem
          Einrichten von Passwort und App, Abmeldungen durch Deaktivieren, Zurücksetzen oder eine Passwortänderung – und wer welchen Zugang
          angelegt, geändert, zurückgesetzt oder deaktiviert hat.
        </p>
        <Tipp art="achtung" titel="Ein Gerät, das niemand kennt?">
          Dann kennt jemand Fremdes Passwort und App-Code. Öffne im Menü unter <Begriff>Zugänge</Begriff> den Zugang und klicke im Kasten{' '}
          <Begriff>Passwort & App</Begriff> auf „Zugang zurücksetzen (Passwort & App neu einrichten)“. Dann gelten Passwort und App nicht mehr, und
          die Person richtet beides mit einem neuen Code neu ein. Abmelden oder Deaktivieren reicht nicht – Passwort und App bleiben dabei gültig.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Punkte>
          <li>Passwörter und Codes stehen nie im Verlauf.</li>
          <li>Fehlgeschlagene Anmeldeversuche stehen nicht im Verlauf.</li>
          <li>Einträge im Verlauf lassen sich in der Verwaltung weder ändern noch löschen.</li>
          <li>
            Wird ein Zugang gelöscht, bleiben seine früheren Änderungen im Verlauf stehen – mit dem Namen, den er damals hatte.
          </li>
        </Punkte>
      </Abschnitt>
    </>
  ),
}
