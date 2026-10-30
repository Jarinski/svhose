import { CalendarDays } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const termine: Thema = {
  slug: 'termine',
  titel: 'Termine eintragen',
  kurz: 'Feste, Versammlungen und Turniere in den Terminkalender eintragen – und warum Spiele von fussball.de und click-tt von allein kommen.',
  icon: CalendarDays,
  zielgruppe: 'sparte',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/termine/neu', text: 'Neuen Termin eintragen' },
  website: { href: '/termine', text: 'Terminkalender ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür und wer darf?">
        <p>
          Im Terminkalender der Website stehen Vereinstermine und Spiele. Eigene Termine wie Feste, Versammlungen oder Turniere trägst du hier ein.
        </p>
        <Punkte>
          <li>Spartenleitungen tragen Termine für ihre Sparte ein und ändern sie.</li>
          <li>Admins dürfen das für alle Sparten und für den ganzen Verein.</li>
        </Punkte>
        <p>
          Trainer:innen, die nur Mannschaften oder Gruppen betreuen, sehen den Menüpunkt <Begriff>Termine</Begriff> nicht. Ihre Termine trägst du für
          sie ein.
        </p>
      </Abschnitt>

      <Abschnitt titel="So geht's">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Termine</Begriff> und klick auf <Taste>Neuer Termin</Taste>.
          </>
          <>
            Trag <Begriff>Titel</Begriff> und <Begriff>Datum</Begriff> ein. Nur diese beiden sind Pflicht.
          </>
          <>
            Trag bei <Begriff>Uhrzeit</Begriff> die Zeit ein, zum Beispiel „18:30“ oder „10:00–13:00“, und bei <Begriff>Ort</Begriff>, wo der Termin
            stattfindet. Beide sind keine Pflicht, sollten aber nicht leer bleiben – warum, steht unten bei „Gut zu wissen“.
          </>
          <>
            Schreib, wenn nötig, eine kurze <Begriff>Beschreibung</Begriff>.
          </>
          <>
            Wähl unter <Begriff>Einordnung</Begriff> die <Begriff>Sparte</Begriff>. Wenn du magst, füllst du auch <Begriff>Bereich (Anzeige auf der Website)</Begriff>{' '}
            und <Begriff>Stichwörter</Begriff> aus.
          </>
          <>
            Unter <Begriff>Bild</Begriff> kannst du mit <Taste>Bild auswählen</Taste> zum Beispiel ein Plakat hinzufügen.
          </>
          <>
            Klick unten auf <Taste>Speichern</Taste>. In der Leiste steht dann „Der Termin ist angelegt und auf der Website zu sehen.“
          </>
        </Schritte>
      </Abschnitt>

      <Abschnitt titel="Die Felder im Einzelnen">
        <Punkte>
          <li>
            <Begriff>Uhrzeit</Begriff> ist freier Text. Du kannst also auch eine Spanne wie „10:00–13:00“ eintragen.
          </li>
          <li>
            <Begriff>Sparte</Begriff> legt fest, wer den Termin später ändern darf: die Spartenleitung dieser Sparte und Admins. Zur Wahl stehen nur
            Sparten, für die du Rechte hast. <Begriff>Keine Sparte (ganzer Verein)</Begriff> gibt es nur für Admins.
          </li>
          <li>
            <Begriff>Bereich (Anzeige auf der Website)</Begriff> ist das Etikett am Termin, zum Beispiel „Gesamtverein“ oder „Herren“. Bleibt das Feld
            leer, steht dort der Name der Sparte. Ohne Sparte steht dort „Allgemein“.
          </li>
          <li>
            <Begriff>Stichwörter</Begriff> trennst du mit Komma, zum Beispiel „Familie, Kinder“. Unter dem Feld steht nach „Bisher verwendet:“, welche
            Stichwörter es schon gibt.
          </li>
        </Punkte>
        <p>
          Auf der Website werden aus den Etiketten und Stichwörtern Filter-Knöpfe. Besucher:innen sehen damit zum Beispiel nur die Termine für
          Familien.
        </p>
        <Tipp>
          Nimm bei Stichwörtern und beim Bereich genau die Schreibweise, die es schon gibt, auch bei Groß- und Kleinschreibung. „Kinder“, „kinder“ und
          „Kids“ wären sonst drei verschiedene Filter. Weil die Website Etiketten und Stichwörter in Großbuchstaben zeigt, stünde „KINDER“ dann sogar
          zweimal da.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Spiele von fussball.de und click-tt">
        <p>
          Spiele kommen automatisch von fussball.de und click-tt in den Kalender. Sie werden jede Nacht abgeglichen. In der Liste erkennst du sie an
          der Kennzeichnung <Begriff>fussball.de</Begriff> oder <Begriff>click-tt</Begriff> und an den kreisenden Pfeilen am rechten Rand.
        </p>
        <p>
          Diese Spiele kann niemand in der Verwaltung ändern oder löschen, auch Admins nicht. Ein Klick zeigt nur die Angaben, gekennzeichnet mit{' '}
          <Begriff>nur ansehen</Begriff>. Ändert sich ein Spiel bei fussball.de oder click-tt, steht die Änderung nach dem nächsten Abgleich auch hier.
        </p>
        <p>
          Mit den Knöpfen <Taste>Alle</Taste>, <Taste>Eigene Termine</Taste>, <Taste>fussball.de</Taste> und <Taste>click-tt</Taste> über der Liste
          blendest du nur eine Sorte ein. <Begriff>Eigene Termine</Begriff> sind alle von Hand eingetragenen Termine des Vereins, auch die
          anderer Sparten.
        </p>
        <Tipp art="achtung">
          Trag Spiele, die schon automatisch kommen, nicht noch einmal von Hand ein. Sonst stehen sie doppelt im Kalender.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Ändern und Löschen">
        <p>
          Unter <Begriff>Termine</Begriff> stehen zuerst nur die kommenden Termine. Mit <Begriff>auch vergangene</Begriff> blendest du ältere dazu.
          Klick auf einen Termin, ändere ihn und klick auf <Taste>Speichern</Taste>.
        </p>
        <p>
          Von Hand eingetragene Termine, die du nicht ändern darfst, etwa aus einer anderen Sparte oder für den ganzen Verein, haben in der Liste ein
          Schloss. Du kannst sie ansehen, aber nicht ändern.
        </p>
        <p>
          Hat der Termin schon ein Bild, wählst du mit <Taste>Anderes Bild wählen</Taste> ein neues aus. Mit <Taste>Bild entfernen</Taste> nimmst du
          es heraus, <Taste>Rückgängig</Taste> holt es zurück. Beides gilt erst, wenn du auf <Taste>Speichern</Taste> klickst.
        </p>
        <p>
          Zum Löschen öffnest du den Termin, klickst ganz unten auf <Taste>Termin löschen</Taste> und bestätigst die Rückfrage. Das lässt sich nicht
          rückgängig machen.
        </p>
        <Tipp>
          Vorbei ist nicht weg: Vergangene Termine musst du nicht löschen. Auf der Website rutschen sie von selbst nach unten zu „Vergangene Termine“.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Wo erscheint der Termin?">
        <Punkte>
          <li>
            Im Terminkalender unter „Kommende Termine“: mit Datum, Etikett, Stichwörtern, Titel, Beschreibung, Uhrzeit, Ort und Bild.
          </li>
          <li>Die nächsten Termine stehen außerdem auf der Startseite.</li>
          <li>Ist der Tag vorbei, steht der Termin unter „Vergangene Termine“ – nur noch mit Datum, Titel, Etikett und Stichwörtern.</li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp art="achtung">
          Im Terminkalender steht hinter der <Begriff>Uhrzeit</Begriff> immer „Uhr“, auch hinter Wörtern wie „ganztägig“. Schreib also selbst kein
          „Uhr“ dazu. Auch leere Felder zeigt der Kalender an: als „Uhr“ ohne Zeit und als leere Ortsangabe. Trag deshalb immer eine Uhrzeit und
          einen Ort ein. Bei einem ganztägigen Termin nimmst du die Startzeit, zum Beispiel „10:00“, und schreibst „ganztägig“ in die Beschreibung.
        </Tipp>
        <Tipp>
          Zeilenumbrüche in der <Begriff>Beschreibung</Begriff> übernimmt die Website nicht – alles erscheint als ein Absatz. Schreib die Beschreibung
          deshalb kurz und als Fließtext.
        </Tipp>
        <Tipp>
          Das Bild erscheint nur bei kommenden Terminen, bei vergangenen nicht mehr. Es wird ganz gezeigt, nicht beschnitten, und ein Klick öffnet es in voller Größe. Plakate im
          Hochformat passen gut.
        </Tipp>
        <Tipp>
          Ein Termin hat genau ein Datum. Für eine Veranstaltung über mehrere Tage legst du je Tag einen Termin an oder nennst den Zeitraum in der
          Beschreibung.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
