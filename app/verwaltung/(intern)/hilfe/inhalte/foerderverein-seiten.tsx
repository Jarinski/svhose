import { LayoutTemplate } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'
import { FOERDERVEREIN_START } from '@/lib/foerderverein'

export const foerdervereinSeiten: Thema = {
  slug: 'foerderverein-seiten',
  titel: 'Seiten des Fördervereins',
  kurz: 'Was ist der Förderverein, Aktuelles, Chronik und Mitglied werden selbst gestalten: Texte, Karten, Fotos und Knöpfe zusammenstellen und das Aussehen wählen.',
  icon: LayoutTemplate,
  zielgruppe: 'foerderverein',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/foerderverein-seiten', text: 'Förderverein-Seiten öffnen' },
  website: { href: FOERDERVEREIN_START, text: 'Förderverein ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür und wer darf?">
        <p>
          Vier Seiten unter Förderverein auf der Website gestaltest du selbst, Inhalt und Aussehen: <Begriff>Was ist der Förderverein</Begriff>,{' '}
          <Begriff>Aktuelles</Begriff>, <Begriff>Chronik</Begriff> und <Begriff>Mitglied werden</Begriff>. <Begriff>Was ist der Förderverein</Begriff>{' '}
          ist dabei der Einstieg: Wer auf der Website auf „Förderverein“ klickt, landet dort. Den Vorstand pflegst du nicht hier, sondern unter <Begriff>Vorstand (Förderverein)</Begriff>.
        </p>
        <p>
          Die Seiten bearbeiten Admins und Zugänge mit dem Recht <Begriff>Förderverein</Begriff>. Nur sie sehen im Menü den Punkt{' '}
          <Begriff>Förderverein-Seiten</Begriff>. Dort steht jede Seite mit dem Zeitpunkt, an dem sie zuletzt gespeichert wurde.
        </p>
      </Abschnitt>

      <Abschnitt titel="So ist eine Seite aufgebaut">
        <p>
          Ganz oben steht die <Begriff>Einleitung</Begriff>, ein Satz unter der großen Überschrift. Die Überschrift selbst ist fest, damit sie zum
          Menü passt. Darunter folgen <strong>Bausteine</strong>, einer nach dem anderen – in der Reihenfolge, in der sie in der Verwaltung stehen:
        </p>
        <Punkte>
          <li>
            <Begriff>Textabschnitt</Begriff>: eine Überschrift und längerer Text, wahlweise mit Foto daneben.
          </li>
          <li>
            <Begriff>Karten</Begriff>: Kästen nebeneinander mit Titel und kurzem Text, zum Beispiel „Mitglied werden“, „Spenden“, „Bandenwerbung“.
          </li>
          <li>
            <Begriff>Kasten mit Knopf</Begriff>: ein hervorgehobener Kasten, etwa für die Beitrittserklärung – mit Knöpfen zum Herunterladen von
            PDFs und auf Wunsch einem Knopf <Begriff>E-Mail schreiben</Begriff> an den Förderverein.
          </li>
          <li>
            <Begriff>Zeitleiste</Begriff>: Stationen mit Zeit („2017“, „Heute“), Titel, kurzem Text und auf Wunsch einem Foto.
          </li>
          <li>
            <Begriff>Bildergalerie</Begriff>: viele Fotos auf einmal, zum Beispiel vom Bau oder vom Sommerfest. Auf der Website öffnet ein Klick auf ein
            Foto die Großansicht, in der man durch alle Fotos blättert.
          </li>
          <li>
            <Begriff>Foto</Begriff>, <Begriff>Stichpunkte</Begriff>, <Begriff>Zahlen & Fakten</Begriff> und <Begriff>Zitat</Begriff>.
          </li>
        </Punkte>
        <p>Zwei Bausteine füllen sich von selbst – ihren Inhalt pflegst du an anderer Stelle:</p>
        <Punkte>
          <li>
            <Begriff>Meldungen</Begriff> zeigt die veröffentlichten News mit der Kategorie „Förderverein“, die neueste zuerst. Neue Meldungen schreibst
            du unter <Begriff>News</Begriff>. Gibt es keine, steht dort ein Text, den du im Baustein festlegst.
          </li>
          <li>
            <Begriff>Unterlagen</Begriff> zeigt die Downloads des Fördervereins als Liste. PDFs lädst du unter <Begriff>Downloads</Begriff> hoch.
            Wahlweise fehlen dort die, die schon als Knopf in einem <Begriff>Kasten mit Knopf</Begriff> stehen.
          </li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="Baustein hinzufügen, verschieben, entfernen">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Förderverein-Seiten</Begriff> und wähl die Seite.
          </>
          <>
            Wähl ganz unten unter <Begriff>Baustein hinzufügen</Begriff> die Art, zum Beispiel <Taste>Karten</Taste>. Soll er gleich an eine bestimmte
            Stelle, tipp zwischen zwei Bausteinen auf <Taste>Hier einfügen</Taste>.
          </>
          <>Füll die Felder aus und wähl die Darstellung (siehe unten).</>
          <>Mit den Pfeilen oben rechts im Baustein schiebst du ihn nach oben oder unten. Das Kreuz entfernt ihn nach einer Rückfrage.</>
          <>
            Klick unten auf <Taste>Seite speichern</Taste>. In der Leiste steht dann zum Beispiel „Gespeichert. Die Seite „Chronik“ ist sofort auf
            der Website zu sehen.“
          </>
        </Schritte>
        <p>
          Stationen, Karten, Zahlen und Stichpunkte innerhalb eines Bausteins verschiebst und entfernst du genauso – mit den Knöpfen neben dem
          Eintrag. Neue gibt es mit <Taste>Station hinzufügen</Taste>, <Taste>Karte hinzufügen</Taste>, <Taste>Zahl hinzufügen</Taste> bzw.{' '}
          <Taste>Punkt hinzufügen</Taste>.
        </p>
      </Abschnitt>

      <Abschnitt titel="Das Aussehen wählen">
        <p>Jeder Baustein hat eigene Einstellungen. Eine kleine Skizze neben jeder Wahl zeigt, wie es ungefähr aussieht.</p>
        <Punkte>
          <li>
            Zeitleiste, <Begriff>Darstellung</Begriff>: <Begriff>Kacheln</Begriff> (kompakte Kästen nebeneinander), <Begriff>Zeitstrahl</Begriff>{' '}
            (untereinander an einer Linie), <Begriff>Groß mit Fotos</Begriff> (Fotos abwechselnd links und rechts) oder{' '}
            <Begriff>Zahlenstrahl mit Zoom</Begriff>: Die Jahre stehen auf einem Strahl, beim Scrollen fährt die Seite von Jahr zu Jahr und zoomt
            in Foto und Text jeder Station hinein. Das Jahr kommt aus der Zeitangabe („2013“, „Oktober 2017“); „Heute“ ist das laufende Jahr,
            Stationen ohne Jahr („Die Idee“) liegen zwischen ihren Nachbarn.
          </li>
          <li>
            Meldungen, <Begriff>Darstellung</Begriff>: <Begriff>Kacheln</Begriff> mit Bild oder kompakte <Begriff>Zeilen</Begriff>; dazu, ob alle
            oder nur die neuesten drei oder sechs erscheinen.
          </li>
          <li>
            Textabschnitt, Zahlen und Kasten mit Knopf, <Begriff>Hintergrund</Begriff>: <Begriff>Hell</Begriff> oder <Begriff>Dunkel</Begriff>.
            Beim Textabschnitt mit Foto wählst du außerdem <Begriff>Foto rechts</Begriff> oder <Begriff>Foto links</Begriff>.
          </li>
          <li>
            Foto, <Begriff>Breite</Begriff>: <Begriff>Normal</Begriff> (mittig, etwas schmaler) oder <Begriff>Volle Breite</Begriff>.
          </li>
          <li>
            Bildergalerie, <Begriff>Darstellung</Begriff>: <Begriff>Kacheln</Begriff> (gleich große Fotos, bis zu vier nebeneinander) oder{' '}
            <Begriff>Mosaik</Begriff> (jedes Foto in seinem Format, die Bildunterschrift steht darunter). Bei mehr als 16 Fotos zeigt die Website
            erst zwölf und darunter einen Knopf für alle.
          </li>
          <li>
            Stichpunkte, <Begriff>Darstellung</Begriff>: <Begriff>Kästchen</Begriff> für kurze Begriffe oder <Begriff>Aufzählung</Begriff> in zwei
            Spalten.
          </li>
          <li>Karten stehen zu viert nebeneinander, auf dem Handy untereinander. Die Karten einer Reihe füllen immer die ganze Breite.</li>
        </Punkte>
        <Tipp>
          Ein dunkles Band hebt einen Abschnitt hervor. Setz es sparsam ein – zwei dunkle Bausteine direkt untereinander verschwimmen zu einem großen
          schwarzen Block.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Erst ansehen, dann speichern">
        <p>
          Oben wechselst du zwischen <Taste>Bearbeiten</Taste> und <Taste>Vorschau</Taste>. Die Vorschau zeigt die Seite genau so, wie sie nach dem
          Speichern auf der Website aussieht – auch mit gerade gewählten Fotos und den aktuellen Meldungen und Unterlagen. Besucher:innen sehen davon
          noch nichts: Die Website ändert sich erst mit <Taste>Seite speichern</Taste>.
        </p>
        <p>
          Oben rechts öffnet <Taste>Seite ansehen</Taste> die echte Seite in einem neuen Tab – dort steht immer der zuletzt gespeicherte Stand.
        </p>
      </Abschnitt>

      <Abschnitt titel="Ausblenden statt löschen">
        <p>
          Nimm in einem Baustein den Haken bei <Begriff>Auf der Website zeigen</Begriff> heraus, dann bleibt er in der Verwaltung gespeichert, erscheint
          aber nicht auf der Website. In der Verwaltung ist er gestrichelt umrandet und mit <Begriff>ausgeblendet</Begriff> markiert. So kannst du
          einen Abschnitt in Ruhe vorbereiten und erst später zeigen – oder Veraltetes aufheben, statt es wegzuwerfen.
        </p>
      </Abschnitt>

      <Abschnitt titel="Fotos">
        <Schritte>
          <>
            Tipp im Baustein auf <Taste>Foto hinzufügen</Taste> (beim Baustein <Begriff>Foto</Begriff> ist das Feld gleich da) und dann auf{' '}
            <Taste>Bild auswählen</Taste>.
          </>
          <>Wähl ein Bild von deinem Gerät. Es erscheint sofort als Vorschau.</>
          <>
            Hochgeladen wird es erst mit <Taste>Seite speichern</Taste>. Mit <Taste>Bild entfernen</Taste> nimmst du es wieder heraus.
          </>
        </Schritte>
        <Punkte>
          <li>Es gehen Bilder bis 15 MB. Die Verwaltung verkleinert sie beim Speichern und entfernt dabei Standortdaten.</li>
          <li>
            In den Darstellungen <Begriff>Kacheln</Begriff> und <Begriff>Groß mit Fotos</Begriff> wird das Foto auf ein Querformat zugeschnitten; die
            Mitte bleibt stehen. Sonst zeigt die Website das ganze Bild.
          </li>
        </Punkte>
        <p>
          In der <Begriff>Bildergalerie</Begriff> geht es schneller: Tipp auf <Taste>Fotos hinzufügen</Taste> und wähl gleich mehrere Fotos aus – am
          Computer kannst du sie auch einfach in das Feld ziehen. Jedes Foto bekommt eine eigene Karte mit Bildunterschrift; mit den Pfeilen schiebst du
          es nach vorn oder hinten, das Kreuz nimmt es heraus.
        </p>
        <Punkte>
          <li>Die Galerie verkleinert die Fotos schon beim Auswählen auf Webgröße – auch große Handyfotos gehen also.</li>
          <li>
            Pro Speichern gehen neue Fotos bis zusammen 15 MB, das sind meist 20 bis 40 Fotos. Steht unter dem Feld eine rote Zahl, speicher erst
            einen Teil und füg den Rest danach hinzu.
          </li>
        </Punkte>
        <Tipp art="achtung">
          Personen auf Fotos müssen mit der Veröffentlichung einverstanden sein. Bei Kindern und Jugendlichen gilt das für die Eltern – im Zweifel lieber
          ein Foto vom Platz als eines mit erkennbaren Gesichtern.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Wenn das Speichern nicht klappt">
        <p>Die Meldung in der Leiste nennt Baustein und Eintrag, zum Beispiel „Baustein 1 (Zeitleiste): Bei Station 3 fehlt der Titel.“ Nötig sind:</p>
        <Punkte>
          <li>bei jeder Station und jeder Karte ein Titel,</li>
          <li>beim Textabschnitt und beim Kasten mit Knopf eine Überschrift oder ein Text,</li>
          <li>beim Baustein Foto ein Foto, bei der Bildergalerie mindestens eins,</li>
          <li>bei Stichpunkten mindestens ein Punkt, bei Zahlen & Fakten zu jedem Eintrag eine Zahl,</li>
          <li>beim Zitat der Text.</li>
        </Punkte>
        <p>Ganz leere Stationen, Karten, Zahlen und Punkte stören nicht – sie fallen beim Speichern einfach weg.</p>
        <p>
          Steht dort „Inzwischen hat jemand anderes diese Seite gespeichert“, hat jemand die Seite bearbeitet, während du sie offen hattest. Lade die
          Seite neu und mach deine Änderung noch einmal – sonst würdest du die andere überschreiben.
        </p>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp>
          Im Text eines Textabschnitts geht einfache Formatierung: <code className="font-mono">**fett**</code>, <code className="font-mono">*kursiv*</code>
          , <code className="font-mono">- Aufzählung</code>, eine Leerzeile für einen neuen Absatz. Links fügst du einfach ein.
        </Tipp>
        <Tipp>
          Wird ein Download gelöscht, verschwindet sein Knopf aus dem Kasten von selbst. Im Baustein steht dann ein Hinweis, bis du ihn speicherst.
        </Tipp>
        <Tipp>
          Unter der Überschrift steht, wann und von wem die Seite zuletzt gespeichert wurde. Deine eigenen Änderungen findest du auch auf der{' '}
          <Begriff>Übersicht</Begriff> unter <Begriff>Zuletzt geändert</Begriff>; Admins sehen im <Begriff>Verlauf</Begriff> jede Fassung mit Vorher und
          Nachher.
        </Tipp>
        <Tipp art="achtung">
          Gespeichert wird immer die ganze Seite auf einmal. Schließt du den Tab vorher, sind deine Änderungen weg – die Verwaltung fragt deshalb nach,
          wenn du die Seite mit ungespeicherten Änderungen verlassen willst.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
