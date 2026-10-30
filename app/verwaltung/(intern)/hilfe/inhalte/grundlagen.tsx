import { Sparkles } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const grundlagen: Thema = {
  slug: 'grundlagen',
  titel: 'So funktioniert die Verwaltung',
  kurz: 'Speichern, sofort live, ungespeicherte Änderungen und was du sehen darfst – das Wichtigste in zwei Minuten.',
  icon: Sparkles,
  zielgruppe: 'alle',
  bereich: 'start',
  ziel: { href: '/verwaltung', text: 'Zur Übersicht' },
  website: { href: '/', text: 'Website ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Gespeichert heißt: sofort live">
        <p>
          Alles, was du hier speicherst, steht im selben Moment auf der Website. Es gibt keinen Zwischenschritt und keine Wartezeit. Die einzige
          Ausnahme sind News: Sie erscheinen erst, wenn der Schalter <Begriff>Veröffentlicht</Begriff> an ist.
        </p>
        <Tipp>Lass beim Bearbeiten die Website in einem zweiten Tab offen und lade sie nach dem Speichern neu – dann siehst du sofort, wie es aussieht.</Tipp>
      </Abschnitt>

      <Abschnitt titel="Die Leiste am unteren Rand">
        <p>
          In den Formularen steht unten immer eine Leiste mit dem Knopf <Taste>Speichern</Taste>. Links daneben siehst du den Stand:
        </p>
        <Punkte>
          <li>
            <Begriff>Alles gespeichert.</Begriff> – nichts geht verloren, du kannst die Seite verlassen.
          </li>
          <li>
            <Begriff>Ungespeicherte Änderungen</Begriff> – du hast etwas geändert, aber noch nicht gespeichert.
          </li>
        </Punkte>
        <p>
          Willst du eine Seite mit ungespeicherten Änderungen verlassen, fragt die Verwaltung vorher nach. Nach dem Speichern erscheint in der
          Leiste eine Rückmeldung; Fehler stehen zusätzlich direkt am betroffenen Feld.
        </p>
      </Abschnitt>

      <Abschnitt titel="Was du siehst, darfst du bearbeiten">
        <p>
          Jeder Zugang sieht nur die Menüpunkte und Einträge, die er bearbeiten darf. Trainer:innen sehen ihre Mannschaften oder Gruppen,
          Spartenleitungen ihre ganze Sparte, Admins alles. Fehlt dir etwas, frag eine:n Admin – die Rechte werden unter <Begriff>Zugänge</Begriff>{' '}
          vergeben.
        </p>
      </Abschnitt>

      <Abschnitt titel="Wenn zwei gleichzeitig bearbeiten">
        <p>
          Hat jemand anderes denselben Eintrag gespeichert, während du ihn offen hattest, wird nichts überschrieben. Stattdessen erscheint „Inzwischen hat jemand anderes gespeichert. Bitte Seite neu
          laden.“
        </p>
        <Tipp art="achtung">
          Beim Neuladen über <Taste>Seite neu laden</Taste> gehen deine eigenen Eingaben verloren. Kopiere längere Texte vorher heraus und füge sie
          danach wieder ein.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Bilder und Fotos">
        <p>
          Fotos lädst du direkt im Formular hoch: JPG, PNG oder WebP bis 15 MB. Die Verwaltung verkleinert sie automatisch und entfernt dabei
          Standortdaten aus dem Handyfoto. Hochgeladen wird erst beim Speichern.
        </p>
      </Abschnitt>

      <Abschnitt titel="Jede Änderung wird festgehalten">
        <p>
          Die Verwaltung merkt sich bei jeder Änderung, wer was wann geändert hat, mit dem Stand vorher und nachher. Deine eigenen letzten
          Änderungen siehst du auf der <Begriff>Übersicht</Begriff> unter <Begriff>Zuletzt geändert</Begriff>. Einen Knopf zum Rückgängigmachen gibt es nicht – im Zweifel hilft ein:e Admin
          mit dem alten Stand aus dem Verlauf.
        </p>
      </Abschnitt>

      <Abschnitt titel="Auch am Handy">
        <p>
          Die Verwaltung funktioniert auch auf dem Handy. Das Menü öffnest du dort oben rechts über das Symbol mit den drei Strichen.
        </p>
      </Abschnitt>
    </>
  ),
}
