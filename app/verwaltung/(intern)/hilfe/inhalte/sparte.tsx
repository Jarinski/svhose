import { Shapes } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const sparte: Thema = {
  slug: 'sparte',
  titel: 'Spartenseite gestalten',
  kurz: 'Texte, Foto, Farbe und Ansprechpartner:innen deiner Sparte pflegen – und festlegen, was in welcher Reihenfolge auf der Website steht.',
  icon: Shapes,
  zielgruppe: 'sparte',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/sparten', text: 'Zu den Sparten' },
  website: { href: '/sparten', text: 'Sparten auf der Website' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür ist das – und wer darf was?">
        <p>
          Jede Sparte hat eine eigene Seite auf der Website: mit Beschreibung, Foto, ihren Mannschaften und Gruppen und den Ansprechpartner:innen.
          Alles, was die Sparte als Ganzes betrifft, pflegst du im Menü unter <Begriff>Sparten</Begriff> auf der Bearbeitungsseite deiner Sparte.
        </p>
        <Punkte>
          <li>
            <strong>Spartenleitung:</strong> Name, Icon, Farbe, Texte, Foto, Ansprechpartner:innen, Sichtbarkeit und Reihenfolge deiner eigenen Sparte.
          </li>
          <li>
            <strong>Nur Admins:</strong> neue Sparten anlegen, Sparten löschen und die Adresse einer Sparte ändern.
          </li>
        </Punkte>
        <p>Trainer:innen sehen den Menüpunkt nicht – sie pflegen ihre Mannschaft oder Gruppe direkt.</p>
      </Abschnitt>

      <Abschnitt titel="So geht's: Texte, Farbe und Foto">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Sparten</Begriff> und tippe auf deine Sparte. Es öffnet sich ihre Bearbeitungsseite.
          </>
          <>
            Im Kasten <Begriff>Allgemein</Begriff> trägst du <Begriff>Name</Begriff> und <Begriff>Icon</Begriff> ein. Das Icon ist ein einzelnes Emoji
            – am Handy über die Emoji-Tastatur.
          </>
          <>
            Bei <Begriff>Farbe</Begriff> wählst du die Akzentfarbe mit dem Farbfeld oder trägst sie als Code ein, z. B. #0369a1.{' '}
            <Taste>Keine</Taste> entfernt die Farbe wieder.
          </>
          <>
            In die <Begriff>Kurzbeschreibung</Begriff> gehören ein bis zwei Sätze für die Übersicht aller Sparten. Die <Begriff>Ausführliche Beschreibung</Begriff>{' '}
            ist der längere Text auf der Seite der Sparte auf der Website. Absätze trennst du mit einer Leerzeile.
          </>
          <>
            Im Kasten <Begriff>Foto</Begriff> wählst du bei <Begriff>Foto hochladen</Begriff> ein Bild aus (gibt es schon eins:{' '}
            <Begriff>Neues Foto hochladen</Begriff>). Die Vorschau erscheint sofort.
          </>
          <>
            Tippe unten auf <Taste>Speichern</Taste>. Es erscheint „Gespeichert. Die Änderungen sind sofort auf der Website zu sehen.“
          </>
        </Schritte>
        <p>
          Zum Entfernen des Fotos setzt du den Haken bei <Begriff>Foto entfernen</Begriff> und speicherst. Bis dahin steht dort „Das Foto wird beim
          Speichern entfernt.“
        </p>
      </Abschnitt>

      <Abschnitt titel="Ansprechpartner:innen">
        <p>
          Im Kasten <Begriff>Ansprechpartner:innen</Begriff> legst du fest, wer auf der Seite der Sparte als Kontakt steht.
        </p>
        <Schritte>
          <>
            Tippe unter <Begriff>Person hinzufügen</Begriff> den Namen ein und tippe auf den passenden Treffer. Mit der Eingabetaste übernimmst du den
            ersten Treffer.
          </>
          <>
            Wen du hinzufügst, bekommt zuerst die Rolle <Begriff>Ansprechpartner:in</Begriff>. Im Feld beim Namen (am Handy darunter) kannst du sie
            ändern: Vorgeschlagen wird auch <Begriff>Abteilungsleitung</Begriff>, eigene Bezeichnungen gehen ebenso. Bleibt das Feld leer, gilt
            Ansprechpartner:in.
          </>
          <>
            Mit den Pfeilen neben dem Feld (<Begriff>Nach oben</Begriff>, <Begriff>Nach unten</Begriff>) legst du die Reihenfolge fest. So stehen
            die Personen auch auf der Website.
          </>
          <>
            Das Kreuz (<Begriff>Entfernen</Begriff>) nimmt eine Person aus der Liste. Die Person selbst bleibt in der Verwaltung erhalten.
          </>
          <>
            Zum Schluss <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <Tipp titel="Telefon, E-Mail und Foto">
          <p>
            Die Kontaktdaten kommen aus den Personendaten, nicht aus der Sparte. Unter jedem Namen führt <Begriff>Kontaktdaten bearbeiten</Begriff>{' '}
            zur Person. Was du dort änderst, gilt überall, wo die Person vorkommt. Hast du an der Sparte etwas geändert, speichere vorher – sonst fragt
            die Verwaltung nach, ob du die Seite trotzdem verlassen willst.
          </p>
          <p>
            Darfst du die Person nicht ändern, erscheint nach dem Klick <Begriff>SEITE NICHT GEFUNDEN</Begriff>. Das ist bei der Abteilungsleitung
            oft so, weil sie meist auch auf der Kontaktseite steht. Geh dann mit dem Zurück-Pfeil des Browsers zurück und bitte eine:n Admin um die
            Änderung. Wann du selbst ändern darfst, steht unten bei „Gut zu wissen“.
          </p>
        </Tipp>
        <Tipp titel="Person fehlt in der Suche?">
          Unter dem Suchfeld öffnet <Begriff>Person fehlt? Neue Person anlegen ↗</Begriff> einen neuen Tab. Hast du die Person dort angelegt, tippst du
          hier auf <Taste>Liste aktualisieren</Taste> – dann findest du sie in der Suche. Deine Eingaben bleiben dabei erhalten.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Sichtbarkeit und Reihenfolge">
        <p>
          Im Kasten <Begriff>Anzeige auf der Website</Begriff>:
        </p>
        <Punkte>
          <li>
            <Begriff>Auf der Website anzeigen</Begriff> – ohne Haken verschwinden die Seite der Sparte, ihr Eintrag in den Übersichten und ihre
            Mannschaften, Gruppen und Trainingszeiten von der Website. News, Termine und Downloads der Sparte bleiben sichtbar. Nach dem Speichern
            steht oben auf der Bearbeitungsseite <Begriff>auf der Website ausgeblendet</Begriff>.
          </li>
          <li>
            <Begriff>Reihenfolge</Begriff> – eine ganze Zahl. Kleinere Zahlen stehen in den Übersichten weiter vorne.
          </li>
        </Punkte>
        <p>
          Die Reihenfolge der <strong>Mannschaften und Gruppen</strong> stellst du bei jeder Mannschaft bzw. Gruppe selbst ein. Unten auf der
          Bearbeitungsseite der Sparte stehen sie im Kasten <Begriff>Mannschaften & Gruppen</Begriff>:
        </p>
        <Schritte>
          <>Tippe in der Liste auf die Mannschaft oder Gruppe.</>
          <>
            Trag im Kasten <Begriff>Allgemein</Begriff> bei <Begriff>Reihenfolge (optional)</Begriff> eine Zahl von 0 bis 9999 ein. Kleinere Zahlen
            stehen auf der Website weiter oben, bei gleicher Zahl entscheidet der Name.
          </>
          <>
            Tippe auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <p>
          Auf der Seite der Sparte stehen die Mannschaften nach ihrem Bereich geordnet: Herren, Damen, Junioren, Juniorinnen, Senioren, Freizeit /
          Hobby und zuletzt „Weitere Mannschaften“ ohne Bereich. Die Zahl sortiert nur innerhalb eines Bereichs, z. B. innerhalb der Junioren. Den
          Bereich wählst du bei der Mannschaft im Feld <Begriff>Bereich</Begriff>. Gruppen stehen immer nach den Mannschaften.
        </p>
        <p>
          Über <Taste>Neue Mannschaft</Taste> und <Taste>Neue Gruppe</Taste> legst du dort auch neue an. Sie kommen ans Ende der Liste.
        </p>
        <Tipp>
          Vergib die Zahlen in Zehnerschritten (10, 20, 30 …). Dann kannst du später etwas dazwischen schieben, ohne alles neu zu nummerieren. Ein
          leeres Feld zählt wie 0 – die Mannschaft oder Gruppe rutscht dann nach oben.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Wo es auf der Website erscheint">
        <Punkte>
          <li>
            <strong>Übersicht der Sparten</strong>: Name, Icon und Kurzbeschreibung, in der eingestellten Reihenfolge. Auf der Startseite stehen Name
            und Icon.
          </li>
          <li>
            <strong>Seite der Sparte</strong>: oben Icon, Name und Kurzbeschreibung, darunter die ausführliche Beschreibung und das Foto. Danach
            folgen die Mannschaften – sortiert nach ihrem Bereich, z. B. Herren, Damen, Junioren – und die Gruppen.
          </li>
          <li>
            <strong>Abschnitt „Ansprechpartner“</strong>: weiter unten auf der Seite der Sparte, mit Foto, Name, Rolle, E-Mail, Telefon und WhatsApp aus
            den Personendaten.
          </li>
          <li>
            <strong>Abschnitt „Downloads & Formulare“</strong>: ganz unten stehen die Downloads der Sparte. Die pflegt ein:e Admin unter{' '}
            <Begriff>Downloads</Begriff>.
          </li>
          <li>
            <strong>Farbe</strong>: als Akzent, z. B. als Strich neben dem Namen und in den Überschriften der Seite. Ohne Farbe wird Schwarz verwendet.
          </li>
        </Punkte>
        <p>
          Oben auf der Bearbeitungsseite der Sparte öffnet <Taste>Auf Website ansehen ↗</Taste> die fertige Seite in einem neuen Tab.
        </p>
      </Abschnitt>

      <Abschnitt titel="Neue Sparte anlegen und löschen (nur Admins)">
        <Schritte>
          <>
            Tippe unter <Begriff>Sparten</Begriff> auf <Taste>Neue Sparte</Taste>.
          </>
          <>
            Trag im Feld <Begriff>Name der Sparte</Begriff> den Namen ein. Darunter siehst du gleich die Adresse, die automatisch vergeben wird.
          </>
          <>
            Tippe auf <Taste>Sparte anlegen</Taste>. Du landest direkt auf der Bearbeitungsseite der neuen Sparte und füllst dort Texte, Foto, Farbe
            und Ansprechpartner:innen aus.
          </>
          <>
            Neue Sparten starten ausgeblendet. Ist alles fertig, setz den Haken bei <Begriff>Auf der Website anzeigen</Begriff> und tippe auf{' '}
            <Taste>Speichern</Taste>.
          </>
          <>
            Damit jemand die Sparte pflegen kann, öffne unter <Begriff>Zugänge</Begriff> den Zugang der Person. Wähle im Kasten{' '}
            <Begriff>Darf bearbeiten</Begriff> die Möglichkeit <Begriff>Bestimmte Bereiche</Begriff>, setz den Haken bei der Sparte (ganze Sparte)
            und speichere.
          </>
        </Schritte>
        <p>
          Zum Löschen gibt es ganz unten auf der Bearbeitungsseite der Sparte den Kasten <Begriff>Sparte löschen</Begriff>. Der Knopf{' '}
          <Taste>Sparte löschen</Taste> erscheint nur, wenn die Sparte keine Mannschaften und Gruppen mehr hat – sonst steht dort ein Hinweis, was
          noch dranhängt. Vor dem Löschen fragt die Verwaltung noch einmal nach.
        </p>
        <p>
          Mannschaften und Gruppen löschst du vorher einzeln: Öffne sie im Kasten <Begriff>Mannschaften & Gruppen</Begriff>, ganz unten steht der
          Kasten <Begriff>Mannschaft löschen</Begriff> bzw. <Begriff>Gruppe löschen</Begriff>. Ihre Trainingszeiten verschwinden dabei mit. In eine
          andere Sparte verschieben lassen sie sich in der Verwaltung nicht. Sollen sie erhalten bleiben, lösch die Sparte nicht und melde dich bei der
          Person, die die Website technisch betreut.
        </p>
        <Punkte>
          <li>Die Zuordnungen der Ansprechpartner:innen und die Zugangsrechte für diese Sparte werden mit gelöscht. Die Personen selbst bleiben.</li>
          <li>News, Termine und Downloads der Sparte bleiben erhalten, gehören dann aber zu keiner Sparte mehr.</li>
        </Punkte>
        <Tipp art="achtung">
          Löschen lässt sich nicht rückgängig machen. Willst du eine Sparte nur vorübergehend verstecken, nimm lieber den Haken bei{' '}
          <Begriff>Auf der Website anzeigen</Begriff> heraus.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Adresse der Sparte ändern (nur Admins)">
        <p>
          Jede Sparte hat eine feste Adresse auf der Website, z. B. /sparten/tischtennis. Sie steht im Kasten <Begriff>Adresse auf der Website</Begriff>{' '}
          – erlaubt sind nur Kleinbuchstaben, Ziffern und Bindestriche, Umlaute werden automatisch umgeschrieben. Änderst du nur den Namen der Sparte,
          bleibt die Adresse gleich.
        </p>
        <Tipp art="achtung" titel="Rückfrage ernst nehmen">
          Änderst du die Adresse, fragt die Verwaltung beim Speichern nach. Nach dem Ändern funktionieren alte Links, Lesezeichen und QR-Codes auf die
          bisherige Adresse nicht mehr. Ändere die Adresse also nur, wenn es wirklich sein muss.
        </Tipp>
        <Tipp art="achtung" titel="Fußball und Tischtennis">
          Bei diesen beiden Sparten steht in Rot <Begriff>Bitte nicht ändern:</Begriff> Die nächtliche Übernahme der Spiele von fussball.de bzw.
          click-tt erkennt die Sparte nur an ihrer Adresse. Mit einer anderen Adresse – oder wenn die Sparte gelöscht wird – kommen die Spiele zwar
          weiter auf die Website, gehören aber zu keiner Sparte mehr, auch die schon eingetragenen. Lass die Adresse deshalb unbedingt so.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp>
          Das Foto erscheint auf der Seite der Sparte als breites Bild und wird dafür passend zugeschnitten. Nimm am besten ein Foto im Querformat.
        </Tipp>
        <Tipp>
          Blendest du eine Sparte aus, verschwinden auch ihre Mannschaften, Gruppen und deren Trainingszeiten von der Website. News, Termine und
          Downloads der Sparte bleiben sichtbar, News sogar mit dem Namen der Sparte. Gespeichert bleibt alles – mit dem Haken bei{' '}
          <Begriff>Auf der Website anzeigen</Begriff> ist es sofort wieder da.
        </Tipp>
        <Tipp>
          Wer im Trainerteam jeder Mannschaft und Gruppe der Sparte steht, wird im Abschnitt „Ansprechpartner“ nicht noch einmal gezeigt – die
          Person steht ja schon bei allen Teams.
        </Tipp>
        <Tipp>
          Auf größeren Bildschirmen zeigt die Liste der Sparten mit <Begriff>keine Ansprechpartner:in</Begriff>, wo noch niemand eingetragen ist.
        </Tipp>
        <Tipp art="achtung" titel="Kontaktdaten ändern als Spartenleitung">
          Die Kontaktdaten einer Person kannst du nur ändern, wenn sie ausschließlich in deiner Sparte vorkommt. Steht sie auch anderswo – etwa auf
          der Kontaktseite oder in einer anderen Sparte – oder hat sie einen eigenen Zugang, ändert ein:e Admin ihre Daten. Deine eigenen Daten
          kannst du immer ändern, wenn dein Zugang mit deiner Person verknüpft ist.
        </Tipp>
        <Tipp titel="Neue Person als Spartenleitung anlegen">
          <p>
            Hat deine Sparte Mannschaften oder Gruppen, fragt das Formular beim Anlegen unter <Begriff>Gehört zu</Begriff>, zu welcher davon die
            Person gehört – sie steht dann auch in deren Trainerteam. Soll jemand nur Ansprechpartner:in der Sparte sein, bitte eine:n Admin, die
            Person anzulegen.
          </p>
          <p>
            Hat deine Sparte noch keine Mannschaften oder Gruppen, legst du die Person ohne Zuordnung an. Danach landest du in der Liste der Personen,
            dort steht sie aber noch nicht. Tippe auf der Bearbeitungsseite der Sparte auf <Taste>Liste aktualisieren</Taste>, füge die Person hinzu
            und speichere. Erst dann kannst du ihre Kontaktdaten bearbeiten.
          </p>
        </Tipp>
      </Abschnitt>
    </>
  ),
}
