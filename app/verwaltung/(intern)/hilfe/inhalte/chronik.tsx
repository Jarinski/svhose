import { History } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const chronik: Thema = {
  slug: 'chronik',
  titel: 'Chronik des Fördervereins',
  kurz: 'Die Geschichte des Fördervereins erzählen: Stationen, Texte und Fotos zusammenstellen und das Aussehen wählen.',
  icon: History,
  zielgruppe: 'foerderverein',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/chronik', text: 'Chronik bearbeiten' },
  website: { href: '/foerderverein/chronik', text: 'Chronik ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür und wer darf?">
        <p>
          Unter Förderverein → Chronik erzählt die Website, wie der Sportplatz am Tostedter Weg entstanden ist. Was dort steht und wie es aussieht,
          bestimmst du selbst – ohne Hilfe von der technischen Betreuung.
        </p>
        <p>
          Die Chronik bearbeiten Admins und Zugänge mit dem Recht <Begriff>Förderverein</Begriff>. Nur sie sehen im Menü den Punkt{' '}
          <Begriff>Chronik (Förderverein)</Begriff>.
        </p>
      </Abschnitt>

      <Abschnitt titel="So ist die Chronik aufgebaut">
        <p>
          Ganz oben steht die <Begriff>Einleitung</Begriff>, ein Satz unter der großen Überschrift CHRONIK. Darunter folgen <strong>Bausteine</strong>,
          einer nach dem anderen – in der Reihenfolge, in der sie in der Verwaltung stehen:
        </p>
        <Punkte>
          <li>
            <Begriff>Zeitleiste</Begriff>: Stationen mit Zeit („2017“, „Heute“), Titel, kurzem Text und auf Wunsch einem Foto.
          </li>
          <li>
            <Begriff>Textabschnitt</Begriff>: eine Überschrift und längerer Text, wahlweise mit Foto daneben.
          </li>
          <li>
            <Begriff>Foto</Begriff>: ein großes Foto mit Bildunterschrift.
          </li>
          <li>
            <Begriff>Stichpunkte</Begriff>: kurze Punkte, zum Beispiel Ideen für die Zukunft oder Unterstützer.
          </li>
          <li>
            <Begriff>Zahlen & Fakten</Begriff>: große Zahlen mit kurzer Erklärung, etwa „2,9 ha – Gelände am Tostedter Weg“.
          </li>
          <li>
            <Begriff>Zitat</Begriff>: ein hervorgehobener Satz mit Quelle.
          </li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="Baustein hinzufügen, verschieben, entfernen">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Chronik (Förderverein)</Begriff>.
          </>
          <>
            Wähl ganz unten unter <Begriff>Baustein hinzufügen</Begriff> die Art, zum Beispiel <Taste>Textabschnitt</Taste>. Soll er gleich an eine
            bestimmte Stelle, tipp zwischen zwei Bausteinen auf <Taste>Hier einfügen</Taste>.
          </>
          <>Füll die Felder aus und wähl die Darstellung (siehe unten).</>
          <>
            Mit den Pfeilen oben rechts im Baustein schiebst du ihn nach oben oder unten. Das Kreuz entfernt ihn nach einer Rückfrage.
          </>
          <>
            Klick unten auf <Taste>Chronik speichern</Taste>. In der Leiste steht dann „Gespeichert. Die Chronik ist sofort auf der Website zu sehen.“
          </>
        </Schritte>
        <p>
          Stationen, Zahlen und Stichpunkte innerhalb eines Bausteins verschiebst und entfernst du genauso – mit den Knöpfen neben dem Eintrag. Neue
          gibt es mit <Taste>Station hinzufügen</Taste>, <Taste>Zahl hinzufügen</Taste> bzw. <Taste>Punkt hinzufügen</Taste>.
        </p>
      </Abschnitt>

      <Abschnitt titel="Das Aussehen wählen">
        <p>Jeder Baustein hat eigene Einstellungen. Eine kleine Skizze neben jeder Wahl zeigt, wie es ungefähr aussieht.</p>
        <Punkte>
          <li>
            Zeitleiste, <Begriff>Darstellung</Begriff>: <Begriff>Kacheln</Begriff> (kompakte Kästen nebeneinander, gut für viele Stationen),{' '}
            <Begriff>Zeitstrahl</Begriff> (untereinander an einer Linie) oder <Begriff>Groß mit Fotos</Begriff> (große Stationen, Fotos abwechselnd
            links und rechts).
          </li>
          <li>
            Textabschnitt und Zahlen, <Begriff>Hintergrund</Begriff>: <Begriff>Hell</Begriff> wie die übrige Seite oder <Begriff>Dunkel</Begriff> als
            schwarzes Band über die ganze Breite. Beim Textabschnitt mit Foto wählst du außerdem <Begriff>Foto rechts</Begriff> oder{' '}
            <Begriff>Foto links</Begriff>.
          </li>
          <li>
            Foto, <Begriff>Breite</Begriff>: <Begriff>Normal</Begriff> (mittig, etwas schmaler) oder <Begriff>Volle Breite</Begriff>.
          </li>
          <li>
            Stichpunkte, <Begriff>Darstellung</Begriff>: <Begriff>Kästchen</Begriff> für kurze Begriffe oder <Begriff>Aufzählung</Begriff> in zwei
            Spalten, auch für ganze Sätze.
          </li>
        </Punkte>
        <Tipp>
          Ein dunkles Band hebt einen Abschnitt hervor. Setz es sparsam ein – zwei dunkle Bausteine direkt untereinander verschwimmen zu einem großen
          schwarzen Block.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Erst ansehen, dann speichern">
        <p>
          Oben wechselst du zwischen <Taste>Bearbeiten</Taste> und <Taste>Vorschau</Taste>. Die Vorschau zeigt die Chronik genau so, wie sie nach dem
          Speichern auf der Website aussieht – auch mit gerade gewählten Fotos. Besucher:innen sehen davon noch nichts: Die Website ändert sich erst
          mit <Taste>Chronik speichern</Taste>.
        </p>
        <p>
          Oben rechts öffnet <Taste>Chronik ansehen</Taste> die echte Seite in einem neuen Tab – dort steht immer der zuletzt gespeicherte Stand.
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
            Hochgeladen wird es erst mit <Taste>Chronik speichern</Taste>. Mit <Taste>Bild entfernen</Taste> nimmst du es wieder heraus.
          </>
        </Schritte>
        <Punkte>
          <li>Es gehen Bilder bis 15 MB. Die Verwaltung verkleinert sie beim Speichern und entfernt dabei Standortdaten.</li>
          <li>
            In den Darstellungen <Begriff>Kacheln</Begriff> und <Begriff>Groß mit Fotos</Begriff> wird das Foto auf ein Querformat zugeschnitten; die
            Mitte bleibt stehen. Sonst zeigt die Website das ganze Bild.
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
          <li>bei jeder Station ein Titel,</li>
          <li>beim Textabschnitt eine Überschrift oder ein Text,</li>
          <li>beim Baustein Foto ein Foto,</li>
          <li>bei Stichpunkten mindestens ein Punkt, bei Zahlen & Fakten zu jedem Eintrag eine Zahl,</li>
          <li>beim Zitat der Text.</li>
        </Punkte>
        <p>Ganz leere Stationen, Zahlen und Punkte stören nicht – sie fallen beim Speichern einfach weg.</p>
        <p>
          Steht dort „Inzwischen hat jemand anderes die Chronik gespeichert“, hat jemand die Chronik bearbeitet, während du sie offen hattest. Lade die
          Seite neu und mach deine Änderung noch einmal – sonst würdest du die andere überschreiben.
        </p>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp>
          Im Text eines Textabschnitts geht einfache Formatierung: <code className="font-mono">**fett**</code>, <code className="font-mono">*kursiv*</code>
          , <code className="font-mono">- Aufzählung</code>, eine Leerzeile für einen neuen Absatz. Links fügst du einfach ein.
        </Tipp>
        <Tipp>
          Unter der Überschrift der Seite steht, wann und von wem die Chronik zuletzt gespeichert wurde. Deine eigenen Änderungen findest du auch auf
          der <Begriff>Übersicht</Begriff> unter <Begriff>Zuletzt geändert</Begriff>; Admins sehen im <Begriff>Verlauf</Begriff> jede Fassung mit
          Vorher und Nachher.
        </Tipp>
        <Tipp art="achtung">
          Gespeichert wird immer die ganze Chronik auf einmal. Schließt du den Tab vorher, sind deine Änderungen weg – die Verwaltung fragt deshalb
          nach, wenn du die Seite mit ungespeicherten Änderungen verlassen willst.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
