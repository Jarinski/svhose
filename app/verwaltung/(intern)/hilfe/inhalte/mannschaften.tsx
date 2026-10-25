import { Shirt } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const mannschaften: Thema = {
  slug: 'mannschaften-und-gruppen',
  titel: 'Mannschaft oder Gruppe anlegen',
  kurz: 'Neue Mannschaften und Gruppen anlegen, Name, Foto und Reihenfolge pflegen – und lieber ausblenden als löschen.',
  icon: Shirt,
  zielgruppe: 'sparte',
  bereich: 'teams',
  ziel: { href: '/verwaltung/teams/neu', text: 'Neue Mannschaft anlegen' },
  website: { href: '/sparten', text: 'Sparten ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Mannschaft oder Gruppe?">
        <Punkte>
          <li>
            Mannschaften spielen im Ligabetrieb, z. B. im Fußball oder Tischtennis. Sie haben zusätzlich das Feld <Begriff>Bereich</Begriff>.
          </li>
          <li>Gruppen sind Trainings- und Kursgruppen ohne Ligabetrieb, z. B. Yoga oder Kinderturnen.</li>
        </Punkte>
        <p>
          Sonst funktionieren beide gleich: Trainingszeiten, Trainerteam und Foto pflegst du im selben Formular. Die Art lässt sich später nicht mehr
          ändern – überleg also vorher kurz.
        </p>
      </Abschnitt>

      <Abschnitt titel="Wer darf was?">
        <Punkte>
          <li>Anlegen und löschen dürfen nur die Spartenleitung (in der eigenen Sparte) und Admins.</li>
          <li>
            Trainer:innen bearbeiten ihre eigenen Mannschaften und Gruppen – auch Name, Foto und <Begriff>Auf der Website anzeigen</Begriff>. Neue
            anlegen oder löschen können sie nicht. Braucht ein Trainerteam eine neue Mannschaft, legst du sie an.
          </li>
          <li>
            Sollen Trainer:innen eine neue Mannschaft oder Gruppe selbst pflegen, vergibt ein:e Admin unter <Begriff>Zugänge</Begriff> das Recht
            dafür.
          </li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="So legst du eine neue an">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Mannschaften & Gruppen</Begriff>.
          </>
          <>
            Tippe in der Karte deiner Sparte auf <Taste>Neue Mannschaft</Taste> oder <Taste>Neue Gruppe</Taste>. Auf dem Handy heißen die Knöpfe nur{' '}
            <Taste>Mannschaft</Taste> und <Taste>Gruppe</Taste>. Solange im Suchfeld etwas steht, sind sie ausgeblendet.
          </>
          <>
            Trag im Feld <Begriff>Name</Begriff> den Namen ein, z. B. „U13“, „2. Damen“ oder „Yoga am Abend“. Bei einer Mannschaft kannst du gleich den{' '}
            <Begriff>Bereich</Begriff> wählen.
          </>
          <>
            Tippe auf <Taste>Mannschaft anlegen</Taste> bzw. <Taste>Gruppe anlegen</Taste>.
          </>
          <>
            Die Seite zum Bearbeiten öffnet sich. Trag dort Trainingszeiten, Trainerteam und Foto ein und tippe auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <p>
          Der Knopf <Taste>Neue Mannschaft anlegen</Taste> am Ende dieser Anleitung führt direkt zum Formular. Bist du für mehrere Sparten zuständig,
          wählst du dort zuerst die <Begriff>Sparte</Begriff>. Für eine Gruppe nimm den Weg über die Liste.
        </p>
        <Tipp art="achtung" titel="Sofort sichtbar">
          Die neue Mannschaft oder Gruppe steht sofort auf der Website, wenn ihre Sparte sichtbar ist – zunächst nur mit ihrem Namen. Willst du sie
          erst fertig machen, nimm den Haken bei <Begriff>Auf der Website anzeigen</Begriff> raus und speichere. Wenn alles drin ist, setzt du ihn
          wieder.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Die Angaben im Überblick">
        <Punkte>
          <li>
            <Begriff>Name</Begriff> – Pflicht, höchstens 80 Zeichen.
          </li>
          <li>
            <Begriff>Bereich</Begriff> (nur Mannschaften) – Herren, Damen, Junioren, Juniorinnen, Senioren oder Freizeit (auf der Website „Freizeit /
            Hobby“). Freiwillig.
          </li>
          <li>
            <Begriff>Altersklasse / Jahrgang</Begriff> bei Mannschaften, <Begriff>Für wen? (Alter)</Begriff> bei Gruppen – z. B. „Jg. 2013“ oder
            „5–7 Jahre“. Freiwillig.
          </li>
          <li>
            <Begriff>Beschreibung</Begriff> – erscheint auf der Website, Zeilenumbrüche bleiben erhalten. Freiwillig.
          </li>
          <li>
            <Begriff>Foto</Begriff> – über <Taste>Foto hochladen</Taste>, später <Taste>Anderes Foto wählen</Taste> oder{' '}
            <Taste>Foto entfernen</Taste>.
          </li>
          <li>
            <Begriff>Auf der Website anzeigen</Begriff> und <Begriff>Reihenfolge (optional)</Begriff> – mehr dazu unten.
          </li>
        </Punkte>
        <Tipp>Nimm fürs Foto ein Bild im Querformat. Auf der Website wird es auf das Format 16:10 zugeschnitten.</Tipp>
      </Abschnitt>

      <Abschnitt titel="Reihenfolge festlegen">
        <p>
          Die Reihenfolge steuerst du über das Zahlenfeld <Begriff>Reihenfolge (optional)</Begriff>: Kleinere Zahlen stehen auf der Website weiter
          oben. Neue Mannschaften und Gruppen bekommen automatisch die nächsthöhere Zahl und stehen damit am Ende. Bei gleicher Zahl entscheidet der
          Name.
        </p>
        <Tipp titel="Mit Lücken nummerieren">
          Nummeriere in Zehnerschritten (10, 20, 30 …). Dann kannst du später eine Mannschaft dazwischenschieben, ohne alle anderen zu ändern.
        </Tipp>
        <p>Lässt du das Feld leer, zählt das wie 0 – die Mannschaft rutscht dann nach oben.</p>
      </Abschnitt>

      <Abschnitt titel="So erscheint es auf der Website">
        <p>
          Mannschaften und Gruppen stehen auf der Seite ihrer Sparte. Mannschaften sind nach Bereich geordnet, z. B. unter „Junioren“. Ohne Bereich
          stehen sie unter „Weitere Mannschaften“. Gruppen haben einen eigenen Abschnitt. Die Reihenfolge gilt jeweils innerhalb dieser Abschnitte.
          Die Zahl wirkt auch auf der Seite Trainingszeiten und in deiner Liste unter <Begriff>Mannschaften & Gruppen</Begriff>. Dort stehen je
          Sparte erst die Mannschaften, dann die Gruppen – jeweils nach dieser Zahl.
        </p>
        <p>
          Jede Karte zeigt Foto, Name, Beschreibung, Bereich und Altersklasse, dazu Trainingszeiten und Trainerteam. Ohne Foto erscheint das Symbol
          der Sparte oder das Vereinslogo. Ist die ganze Sparte ausgeblendet, sieht man nichts davon – in der Verwaltung steht dann{' '}
          <Begriff>Sparte ausgeblendet</Begriff>.
        </p>
      </Abschnitt>

      <Abschnitt titel="Ausblenden oder löschen">
        <p>
          Pausiert eine Mannschaft oder Gruppe nur, blende sie aus: Haken bei <Begriff>Auf der Website anzeigen</Begriff> raus und{' '}
          <Taste>Speichern</Taste>. Trainingszeiten, Trainerteam und Foto bleiben gespeichert. Auf der Website ist sie aber nicht mehr zu sehen – auch
          nicht bei den Trainingszeiten. In der Verwaltung steht dann <Begriff>ausgeblendet</Begriff> dabei. Zum Einblenden setzt du den Haken wieder.
        </p>
        <p>Gibt es sie wirklich nicht mehr, kannst du sie löschen:</p>
        <Schritte>
          <>
            Öffne die Mannschaft oder Gruppe und scrolle ganz nach unten zur Karte <Begriff>Mannschaft löschen</Begriff> bzw.{' '}
            <Begriff>Gruppe löschen</Begriff>.
          </>
          <>
            Tippe auf <Taste>Mannschaft löschen</Taste> bzw. <Taste>Gruppe löschen</Taste>.
          </>
          <>Bestätige die Rückfrage. Danach landest du wieder in der Liste.</>
        </Schritte>
        <Punkte>
          <li>Endgültig weg sind die Mannschaft bzw. Gruppe, ihre Trainingszeiten und ihr Foto.</li>
          <li>
            Die Personen aus dem Trainerteam bleiben im System erhalten. Admins finden sie unter <Begriff>Personen</Begriff>, und über{' '}
            <Taste>Person hinzufügen</Taste> kannst du sie in einer anderen Mannschaft wieder eintragen.
          </li>
          <li>News und Termine bleiben bestehen und gehören danach zur ganzen Sparte.</li>
          <li>
            Zugänge von Trainer:innen verlieren ihr Recht für diese Mannschaft oder Gruppe. War es ihr einziges, fehlt ihnen danach der Menüpunkt{' '}
            <Begriff>Mannschaften & Gruppen</Begriff>. Sollen sie ein anderes Team betreuen, vergibt ein:e Admin unter <Begriff>Zugänge</Begriff>{' '}
            das neue Recht.
          </li>
        </Punkte>
        <Tipp art="achtung">
          Löschen lässt sich nicht rückgängig machen – einen Knopf zum Wiederherstellen gibt es nicht. Im Zweifel lieber ausblenden.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp>Nach dem Löschen erscheint keine eigene Meldung. Fehlt der Eintrag in der Liste, hat es geklappt.</Tipp>
        <Tipp titel="Namen">
          Jede Mannschaft braucht in ihrer Sparte einen eigenen Namen, ebenso jede Gruppe. Groß- und Kleinschreibung zählen dabei nicht als
          Unterschied. Sonst erscheint „In dieser Sparte gibt es schon eine Mannschaft …“, und du wählst einen anderen Namen.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
