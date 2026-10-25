import { CalendarClock } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const trainingszeiten: Thema = {
  slug: 'trainingszeiten',
  titel: 'Trainingszeiten pflegen',
  kurz: 'Wann und wo trainiert wird: Zeiten eintragen, ändern und entfernen – dazu Name, Beschreibung und Foto deiner Mannschaft.',
  icon: CalendarClock,
  zielgruppe: 'teams',
  bereich: 'teams',
  ziel: { href: '/verwaltung/teams', text: 'Zu den Mannschaften & Gruppen' },
  website: { href: '/trainingszeiten', text: 'Trainingszeiten ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür und wer darf">
        <p>
          Trainingszeiten gehören immer zu einer Mannschaft oder Gruppe. Du pflegst sie auf derselben Seite wie Beschreibung, Foto und Trainerteam.
          Trainer:innen dürfen das für ihre eigenen Mannschaften und Gruppen, die Spartenleitung für alle in ihrer Sparte, Admins überall.
        </p>
      </Abschnitt>

      <Abschnitt titel="Deine Mannschaft oder Gruppe finden">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Mannschaften & Gruppen</Begriff>. Du siehst alles, was du bearbeiten darfst – nach Sparte geordnet.
          </>
          <>Hast du mehr als fünf Einträge, steht oben ein Suchfeld. Du kannst nach Name, Sparte, Jahrgang oder Trainer:in suchen.</>
          <>Tippe auf den Eintrag. Die Seite zum Bearbeiten öffnet sich.</>
        </Schritte>
        <p>
          Der Hinweis <Begriff>keine Trainingszeit</Begriff> in der Liste zeigt dir, wo noch etwas fehlt. Deine Mannschaften und Gruppen findest du
          außerdem auf der <Begriff>Übersicht</Begriff>.
        </p>
      </Abschnitt>

      <Abschnitt titel="So trägst du eine Zeit ein">
        <Schritte>
          <>
            Tippe im Abschnitt <Begriff>Trainingszeiten</Begriff> auf <Taste>Trainingszeit hinzufügen</Taste>. Ein neuer Block erscheint, z. B.{' '}
            <Begriff>Trainingszeit 2</Begriff> mit dem Zusatz <Begriff>neu</Begriff>.
          </>
          <>
            Wähle den <Begriff>Wochentag</Begriff>.
          </>
          <>
            Stell <Begriff>Beginn</Begriff> und <Begriff>Ende</Begriff> ein. Der Beginn muss sein, das Ende ist freiwillig – es muss aber nach dem
            Beginn liegen.
          </>
          <>
            Trag den <Begriff>Ort</Begriff> ein. Beim Tippen schlägt das Feld Orte vor, die schon eingetragen sind. Einen neuen Ort tippst du einfach
            ein.
          </>
          <>
            Wähle die <Begriff>Saison</Begriff> (ganzjährig, Sommer oder Winter) und den <Begriff>Rhythmus</Begriff> (jede Woche oder alle 2 Wochen).
            Voreingestellt sind ganzjährig und jede Woche.
          </>
          <>
            Bei Bedarf: <Begriff>Hinweis (optional)</Begriff>, z. B. „ab Februar“ oder „nicht in den Ferien“.
          </>
          <>
            Tippe unten auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <Tipp>
          Bei jeder weiteren Zeit übernimmt die Verwaltung Ort und Saison aus der letzten Zeile – meist stimmt das schon. Wochentag und Uhrzeit trägst
          du jedes Mal neu ein. Der Rhythmus steht bei jeder neuen Zeit wieder auf jede Woche. Trainiert ihr alle 2 Wochen, stell ihn jedes Mal um.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Ändern und entfernen">
        <p>
          Zum Ändern überschreibst du die Felder einfach und speicherst. Zum Entfernen tippst du oben rechts im Block der Zeit auf{' '}
          <Taste>Entfernen</Taste> und danach auf <Taste>Speichern</Taste>.
        </p>
        <p>Bis zum Speichern ist nichts endgültig: Verlässt du die Seite ohne zu speichern, bleibt alles, wie es war.</p>
        <Tipp titel="Sommer und Winter">
          Trainiert ihr im Winter woanders oder zu anderen Zeiten? Leg für jede Saison eine eigene Zeit an – eine mit <Begriff>Sommer</Begriff>, eine
          mit <Begriff>Winter</Begriff>. Auf der Seite Trainingszeiten steht die Saison bei jeder Zeit dabei, und Besucher:innen können danach
          filtern.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Name, Beschreibung und Foto">
        <p>
          Oben auf derselben Seite steht die Karte <Begriff>Allgemein</Begriff>. Auch die pflegst du selbst:
        </p>
        <Punkte>
          <li>
            <Begriff>Name</Begriff> – Pflicht, höchstens 80 Zeichen.
          </li>
          <li>
            <Begriff>Bereich</Begriff> (nur bei Mannschaften) – ordnet die Mannschaft auf der Seite der Sparte ein, z. B. unter „Junioren“.
          </li>
          <li>
            <Begriff>Altersklasse / Jahrgang</Begriff> bzw. bei Gruppen <Begriff>Für wen? (Alter)</Begriff> – z. B. „Jg. 2013“ oder „5–7 Jahre“.
          </li>
          <li>
            <Begriff>Beschreibung</Begriff> – ein paar Sätze für Interessierte. Zeilenumbrüche bleiben auf der Website erhalten.
          </li>
          <li>
            <Begriff>Foto</Begriff> – über <Taste>Foto hochladen</Taste>, später <Taste>Anderes Foto wählen</Taste> oder{' '}
            <Taste>Foto entfernen</Taste>. Am besten ein Bild im Querformat.
          </li>
          <li>
            <Begriff>Reihenfolge (optional)</Begriff> – kleinere Zahlen stehen weiter oben, auf der Seite der Sparte und bei den Trainingszeiten.
          </li>
        </Punkte>
        <Tipp titel="Pause statt löschen">
          Pausiert eure Mannschaft oder Gruppe? Nimm den Haken bei <Begriff>Auf der Website anzeigen</Begriff> raus und tippe auf{' '}
          <Taste>Speichern</Taste>. Alles bleibt gespeichert, ist auf der Website aber nicht mehr zu sehen – auch die Trainingszeiten nicht. Zum
          Einblenden setzt du den Haken wieder.
        </Tipp>
        <p>Neue Mannschaften und Gruppen anlegen oder löschen kann nur die Spartenleitung oder ein:e Admin.</p>
      </Abschnitt>

      <Abschnitt titel="Was nach dem Speichern erscheint">
        <Punkte>
          <li>„Gespeichert – ist jetzt auf der Website sichtbar.“ – alles hat geklappt.</li>
          <li>
            „Gespeichert. Hinweis: Die Mannschaft ist zurzeit auf der Website ausgeblendet.“ (bzw. die Gruppe) – gespeichert ist alles, aber die
            Mannschaft oder ihre Sparte ist ausgeblendet. Dann erscheinen auch die Zeiten nicht.
          </li>
          <li>„Alles schon gespeichert – es gab keine Änderungen.“</li>
          <li>
            „Noch nicht gespeichert.“ mit dem Grund, z. B. „Trainingszeit 2: Bitte einen Wochentag auswählen.“ Die Verwaltung springt zum ersten rot
            markierten Feld.
          </li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="Wo die Zeiten erscheinen">
        <Punkte>
          <li>
            Auf der Seite <Begriff>Trainingszeiten</Begriff> stehen alle Zeiten des Vereins, geordnet nach Sparte. Besucher:innen können nach Sparte,
            Wochentag und Saison filtern. Zu jeder Zeit gehören Tag, Uhrzeit, Ort, Rhythmus, Saison und Hinweis, dazu die Namen aus dem Trainerteam.
          </li>
          <li>Auf der Seite der Sparte stehen die Zeiten in der Karte der Mannschaft oder Gruppe – sortiert nach Wochentag und Beginn.</li>
        </Punkte>
        <p>Zeiten von ausgeblendeten Mannschaften, Gruppen oder Sparten erscheinen nirgends.</p>
        <Tipp titel="Ergebnis gleich prüfen">
          Ganz unten auf der Seite, neben <Begriff>Zuletzt geändert am …</Begriff>, öffnet <Begriff>Auf Website ansehen ↗</Begriff> die Seite der
          Sparte in einem neuen Tab. Lade sie nach dem Speichern neu, dann siehst du das Ergebnis sofort.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp titel="Ende immer eintragen">
          Ohne Ende steht auf der Website nur der Beginn, z. B. „10:00 Uhr“. Mit Ende sieht man auf einen Blick „10:00 - 11:30 Uhr“.
        </Tipp>
        <Tipp art="achtung" titel="Doppelte Zeiten">
          Die Verwaltung prüft nicht, ob sich Zeiten doppeln oder überschneiden. Trägst du dieselbe Zeit zweimal ein, steht sie auch zweimal auf der
          Website. Schau die Liste vor dem Speichern kurz durch.
        </Tipp>
        <Tipp titel="Gemeinsames Training">
          <p>
            Trainieren eine Mannschaft und eine Gruppe zusammen, trägst du die Zeit bei beiden getrennt ein. Eine Zeit, die zu beiden gleichzeitig
            gehört, lässt sich hier nicht anlegen.
          </p>
          <p>
            Gibt es schon so eine gemeinsame Zeit, gilt dein Ändern oder Entfernen nur für deine Mannschaft bzw. Gruppe. Beim anderen Team bleibt sie,
            wie sie war.
          </p>
        </Tipp>
      </Abschnitt>
    </>
  ),
}
