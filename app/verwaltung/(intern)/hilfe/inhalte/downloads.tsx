import { FileDown } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const downloads: Thema = {
  slug: 'downloads',
  titel: 'Downloads (PDF)',
  kurz: 'Formulare und Dokumente als PDF hochladen, eine neue Fassung einspielen oder einen Download entfernen.',
  icon: FileDown,
  zielgruppe: 'admin',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/downloads/neu', text: 'Neuen Download anlegen' },
  website: { href: '/downloads', text: 'Download-Seite ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür und wer darf?">
        <p>
          Auf der Download-Seite der Website stehen Formulare und Dokumente zum Herunterladen, zum Beispiel ein Aufnahmeantrag. Jeder Download ist eine
          PDF-Datei.
        </p>
        <p>
          Downloads pflegen nur Admins. Nur sie sehen den Menüpunkt <Begriff>Downloads</Begriff>. Ein Download kann aber zu einer Sparte gehören – dann
          steht er auch auf der Seite dieser Sparte.
        </p>
      </Abschnitt>

      <Abschnitt titel="So geht's">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Downloads</Begriff> und klick auf <Taste>Neuer Download</Taste>.
          </>
          <>
            Klick unter <Begriff>PDF-Datei</Begriff> auf <Taste>PDF auswählen</Taste> und wähl die Datei. Daneben erscheint ihr Name.
          </>
          <>
            Trag unter <Begriff>Angaben</Begriff> den <Begriff>Titel</Begriff> ein. Er ist neben der Datei das einzige Pflichtfeld.
          </>
          <>
            Schreib bei Bedarf eine kurze <Begriff>Beschreibung</Begriff>.
          </>
          <>
            Trag eine <Begriff>Kategorie</Begriff> ein, zum Beispiel „Mitgliedschaft“, oder wähl einen Vorschlag.
          </>
          <>
            Trag bei <Begriff>Stand (Datum)</Begriff> das Datum der Fassung ein, wenn du es kennst.
          </>
          <>
            Wähl bei <Begriff>Sparte</Begriff> eine Sparte, wenn das Dokument zu ihr gehört. Sonst bleibt <Begriff>Keine (ganzer Verein)</Begriff>.
          </>
          <>
            Klick unten auf <Taste>Speichern</Taste>. In der Leiste steht dann „Der Download ist angelegt und auf der Website zu sehen.“
          </>
        </Schritte>
      </Abschnitt>

      <Abschnitt titel="Wo erscheint der Download?">
        <Punkte>
          <li>
            Auf der Download-Seite, gruppiert nach <Begriff>Kategorie</Begriff>. Downloads ohne Kategorie stehen dort unter „Sonstiges“. In der
            Verwaltung heißt dieselbe Gruppe <Begriff>Ohne Kategorie</Begriff>.
          </li>
          <li>Besucher:innen sehen den Titel und die Beschreibung. Ein Klick lädt die PDF herunter.</li>
          <li>
            Mit einer <Begriff>Sparte</Begriff> steht der Download zusätzlich auf der Seite dieser Sparte, im Abschnitt „DOWNLOADS & FORMULARE“. Das
            gilt, solange die Sparte auf der Website nicht ausgeblendet ist. Dort öffnet ein Klick die PDF in einem neuen Tab.
          </li>
        </Punkte>
        <p>
          Der <Begriff>Stand (Datum)</Begriff> selbst steht nicht auf der Website. Auf der Download-Seite bestimmt er aber die Reihenfolge: Innerhalb
          einer Kategorie steht der neueste Stand oben, Downloads ohne Stand kommen ans Ende. Auf der Seite der Sparte spielt der Stand für die
          Reihenfolge keine Rolle. In der Liste der Verwaltung siehst du den Stand unter dem Titel.
        </p>
      </Abschnitt>

      <Abschnitt titel="Neue Fassung hochladen">
        <Schritte>
          <>
            Klick unter <Begriff>Downloads</Begriff> auf den Download.
          </>
          <>
            Klick unter <Begriff>PDF-Datei</Begriff> auf <Taste>Datei ersetzen</Taste> und wähl die neue Fassung.
          </>
          <>
            Pass den <Begriff>Stand (Datum)</Begriff> an.
          </>
          <>
            Klick auf <Taste>Speichern</Taste>. Erst jetzt ersetzt die neue Datei die bisherige.
          </>
        </Schritte>
        <p>
          Die bisher gespeicherte Datei öffnest du mit einem Klick auf ihren Namen oberhalb des Knopfs. Wundere dich nicht über den Namen: Beim
          Hochladen benennt die Verwaltung die Datei nach dem Titel und hängt eine Kennung an, zum Beispiel „aufnahmeantrag-3f9a1b2c.pdf“.
        </p>
        <p>
          In der Liste unter <Begriff>Downloads</Begriff> öffnet das Symbol ganz rechts die PDF: ein Kästchen mit schrägem Pfeil. Fährst du mit der
          Maus darüber, steht dort „PDF öffnen“. Ein Klick auf den Eintrag selbst öffnet das Formular.
        </p>
        <Tipp art="achtung">
          Eine neue Fassung bekommt eine neue Adresse, die alte Datei wird entfernt. Ein direkter Link auf die alte PDF funktioniert danach nicht mehr.
          Teile deshalb lieber den Link zur Download-Seite.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Download löschen">
        <p>
          Öffne den Download, klick ganz unten auf <Taste>Download löschen</Taste> und bestätige die Rückfrage. Die PDF verschwindet dann auch von der
          Website – auf der Download-Seite und auf der Seite der Sparte.
        </p>
        <Tipp art="achtung">
          Mit dem Löschen wird auch die Datei entfernt. Heb dir eine Kopie auf, wenn du das Dokument noch brauchst.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp>
          Es gehen nur PDF-Dateien bis 15 MB. Eine größere Datei lehnt die Verwaltung schon beim Auswählen ab: „Die Datei ist größer als 15 MB. Bitte
          eine kleinere Datei wählen.“ Speichere die PDF dann kleiner, zum Beispiel mit geringerer Bildqualität beim Scannen.
        </Tipp>
        <Tipp>
          Ein Word-Dokument speicherst du vorher als PDF. Andere Dateien nimmt die Verwaltung nicht an.
        </Tipp>
        <Tipp>
          Nimm bei <Begriff>Kategorie</Begriff> möglichst einen Vorschlag aus der Liste. Schon eine andere Schreibweise, etwa „Formular“ statt
          „Formulare“ oder „formulare“, ergibt auf der Download-Seite eine eigene Gruppe.
        </Tipp>
        <Tipp>
          Zeilenumbrüche in der <Begriff>Beschreibung</Begriff> übernimmt die Website nicht – alles erscheint als ein Absatz. Schreib deshalb nur einen
          kurzen Satz.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
