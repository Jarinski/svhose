import { Contact } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const kontaktseite: Thema = {
  slug: 'kontaktseite',
  titel: 'Kontaktseite pflegen',
  kurz: 'Vorstand, Abteilungsleitungen und weitere Ansprechpartner:innen auf der Seite „Kontakt“ eintragen, sortieren und entfernen.',
  icon: Contact,
  zielgruppe: 'admin',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/kontakte', text: 'Zur Kontaktseite' },
  website: { href: '/ansprechpartner', text: 'Kontaktseite ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür ist das?">
        <p>
          Die Seite „Kontakt“ auf der Website zeigt, wer im Verein wofür zuständig ist. Du pflegst sie im Menü unter <Begriff>Kontaktseite</Begriff>{' '}
          – das dürfen nur Admins.
        </p>
        <p>Jeder Eintrag ist eine Funktion: eine Person und eine Bezeichnung, z. B. „1. Vorsitzende:r“. Die Seite hat drei Abschnitte:</p>
        <Punkte>
          <li>
            <Begriff>Vorstand</Begriff> – der geschäftsführende und erweiterte Vorstand.
          </li>
          <li>
            <Begriff>Abteilungsleitung</Begriff> – die Leitungen der Sparten.
          </li>
          <li>
            <Begriff>Weitere Ansprechpartner</Begriff> – zum Beispiel Mitgliederverwaltung, Kinderschutz oder Platzwart.
          </li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="So geht's: Funktion hinzufügen">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Kontaktseite</Begriff>.
          </>
          <>
            Tippe im passenden Abschnitt auf <Taste>Funktion hinzufügen</Taste>. Am Ende des Abschnitts erscheint eine neue Zeile, das Suchfeld ist
            schon aktiv.
          </>
          <>
            Tippe bei <Begriff>Person</Begriff> den Namen ein und tippe auf den passenden Treffer. Mit der Eingabetaste übernimmst du den ersten Treffer.
          </>
          <>
            Trag die <Begriff>Bezeichnung</Begriff> ein, z. B. „1. Vorsitzende:r“ oder „Abteilungsleitung Fußball“. Sie ist Pflicht und steht auf der
            Website unter dem Namen.
          </>
          <>
            Bei <Begriff>Sparte (optional)</Begriff> kannst du vermerken, zu welcher Sparte die Funktion gehört – die Verwaltung empfiehlt das für die
            Abteilungsleitung. Das ist nur ein Vermerk für die Ordnung hier in der Verwaltung: Auf der Website und auf der Seite der Sparte ändert es
            nichts. Ohne Vermerk bleibt <Begriff>– keine –</Begriff> stehen.
          </>
          <>
            Tippe unten auf <Taste>Kontaktseite speichern</Taste>. Es erscheint „Gespeichert. Die Kontaktseite ist sofort aktuell.“
          </>
        </Schritte>
        <p>
          Oben auf der Seite in der Verwaltung öffnet <Taste>Kontaktseite ansehen ↗</Taste> die fertige Seite der Website in einem neuen Tab.
        </p>
      </Abschnitt>

      <Abschnitt titel="Ändern, sortieren, entfernen">
        <Punkte>
          <li>
            <strong>Andere Person:</strong> Tippe neben dem Namen auf <Begriff>Person ändern</Begriff> und such die neue Person aus. Überlegst du es dir
            anders, behält <Taste>Abbrechen – … behalten</Taste> (mit dem bisherigen Namen) alles beim Alten.
          </li>
          <li>
            <strong>Bezeichnung oder Sparte:</strong> einfach im Feld überschreiben bzw. neu auswählen.
          </li>
          <li>
            <strong>Reihenfolge:</strong> Mit den Pfeilen rechts in der Zeile (<Begriff>Nach oben</Begriff>, <Begriff>Nach unten</Begriff>) – so
            stehen die Einträge auch auf der Website.
          </li>
          <li>
            <strong>Entfernen:</strong> Das Kreuz (<Begriff>Entfernen</Begriff>) nimmt die Zeile heraus. Die Person selbst bleibt unter{' '}
            <Begriff>Personen</Begriff> erhalten.
          </li>
        </Punkte>
        <Tipp>
          Die Pfeile verschieben nur innerhalb eines Abschnitts. Gehört eine Funktion in einen anderen Abschnitt, entferne sie und füge sie dort neu
          hinzu.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gespeichert wird die ganze Seite">
        <p>
          Alle drei Abschnitte speicherst du zusammen mit einem Knopf. Ändere also in Ruhe alles, was ansteht, und tippe dann einmal auf{' '}
          <Taste>Kontaktseite speichern</Taste>. Bis dahin steht in der Leiste <Begriff>Ungespeicherte Änderungen</Begriff>.
        </p>
        <p>
          Gespeichert wird erst, wenn jede Zeile eine Person und eine Bezeichnung hat. Fehlt irgendwo die Person, steht über dem Knopf „Bei einer
          Funktion fehlt noch die Person. Bitte auswählen oder die Zeile entfernen.“ Die Meldung beim Speichern nennt dir Abschnitt und Zeile, z. B.
          „Im Abschnitt ‚Vorstand‘ fehlt bei Zeile 2 die Person.“
        </p>
        <Tipp art="achtung">
          Hat jemand anderes die Kontaktseite gespeichert, während du sie offen hattest, erscheint „Inzwischen hat jemand anderes die Kontaktseite
          gespeichert. Bitte Seite neu laden.“ Nach <Taste>Seite neu laden</Taste> sind deine eigenen Änderungen weg – schreib sie dir vorher auf.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Was auf der Website erscheint">
        <p>
          Die Abschnitte stehen in dieser Reihenfolge auf der Seite „Kontakt“. Dort heißen sie <Begriff>Vorstand</Begriff>,{' '}
          <Begriff>Abteilungsleiter</Begriff> und <Begriff>Weitere Ansprechpartner</Begriff>. Ein Abschnitt ohne Einträge erscheint nicht. Zu jeder
          Funktion zeigt die Website:
        </p>
        <Punkte>
          <li>den Namen der Person und darunter die Bezeichnung,</li>
          <li>das Foto der Person – rund und in Schwarz-Weiß –, wenn sie eins hat,</li>
          <li>E-Mail und Telefon, wenn sie eingetragen sind,</li>
          <li>
            einen WhatsApp-Link: mit der Nummer aus <Begriff>WhatsApp (nur falls abweichend)</Begriff>, sonst automatisch bei einer Handynummer
            (015…, 016…, 017…). Festnetznummern bekommen keinen WhatsApp-Link.
          </li>
        </Punkte>
        <p>
          Die Sparte einer Funktion steht nicht auf der Website. Der Kasten <Begriff>Allgemeiner Kontakt</Begriff> oben auf der Seite lässt sich in
          der Verwaltung nicht ändern. Soll sich dort etwas ändern, melde dich bei der Person, die die Website technisch betreut.
        </p>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp titel="Kontaktdaten ändern">
          Telefon, E-Mail und Foto kommen aus den Personendaten. Du änderst sie unter <Begriff>Personen</Begriff> – nicht hier. Die Änderung gilt dann
          überall, wo die Person vorkommt.
        </Tipp>
        <Tipp titel="Person fehlt in der Suche?">
          Unter dem Suchfeld öffnet <Begriff>Person fehlt? Neue Person anlegen ↗</Begriff> einen neuen Tab. Hast du die Person dort angelegt, tippst du
          hier unter dem Suchfeld auf <Taste>Liste aktualisieren</Taste> – dann findest du sie in der Auswahl. Deine Eingaben auf der Kontaktseite
          bleiben dabei erhalten.
        </Tipp>
        <Tipp>Eine Person kann mehrere Funktionen haben. Sie steht dann mehrfach auf der Seite – jeweils mit der passenden Bezeichnung.</Tipp>
        <Tipp art="achtung" titel="Zwei getrennte Listen">
          Die Abteilungsleitung auf der Kontaktseite und die Ansprechpartner:innen auf der Seite einer Sparte werden getrennt gepflegt – auch das
          Feld <Begriff>Sparte (optional)</Begriff> verbindet die beiden nicht. Wechselt eine Leitung, passe beides an: hier und unter{' '}
          <Begriff>Sparten</Begriff>.
        </Tipp>
        <Tipp>
          Bei Personen auf der Kontaktseite können nur Admins die Kontaktdaten ändern – und die Person selbst, wenn ihr Zugang mit ihr verknüpft ist.
          Trainer:innen und Spartenleitungen fragen dafür bei dir nach.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
