import { Newspaper } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

/** Zeichen für den Text, so wie man sie eintippt – nur für den Spickzettel. */
function Zeichen({ children }: { children: React.ReactNode }) {
  return <code className="rounded-sm bg-[#0a0a0a]/[0.06] px-1.5 py-px font-mono text-[0.85em] whitespace-nowrap">{children}</code>
}

export const news: Thema = {
  slug: 'news',
  titel: 'News schreiben',
  kurz: 'Überschrift, Text mit Vorschau, Beitragsbild und der Schalter „Veröffentlicht“ – so kommt deine News auf die Website.',
  icon: Newspaper,
  zielgruppe: 'alle',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/news/neu', text: 'Neue News schreiben' },
  website: { href: '/news', text: 'News auf der Website' },
  inhalt: (
    <>
      <Abschnitt titel="Wer darf News schreiben?">
        <p>Mit News berichtest du von Spielen, Festen und allem, was im Verein los ist. Für wen du schreiben darfst, hängt an deinen Rechten:</p>
        <Punkte>
          <li>Trainer:innen schreiben News für ihre eigenen Mannschaften und Gruppen.</li>
          <li>Spartenleitungen schreiben für ihre ganze Sparte und für alle Mannschaften und Gruppen darin.</li>
          <li>
            Admins dürfen alles, auch News für den ganzen Verein (<Begriff>Ganzer Verein</Begriff>).
          </li>
        </Punkte>
        <p>
          Unter <Begriff>News</Begriff> siehst du nur die News, die du bearbeiten darfst. Fehlt dir der Knopf <Taste>Neue News</Taste>, ist deinem
          Zugang noch keine Mannschaft, Gruppe oder Sparte zugeordnet. Dann hilft dir ein:e Admin.
        </p>
      </Abschnitt>

      <Abschnitt titel="So geht's">
        <Schritte>
          <>
            Öffne im Menü <Begriff>News</Begriff> und klick auf <Taste>Neue News</Taste>.
          </>
          <>
            Trag die <Begriff>Überschrift</Begriff> ein. Darunter siehst du schon die Adresse, unter der die News später auf der Website steht.
          </>
          <>
            Schreib bei <Begriff>Kurzbeschreibung (Teaser)</Begriff> ein bis zwei Sätze. Sie stehen in der News-Übersicht und über dem Text.
          </>
          <>
            Schreib den <Begriff>Text</Begriff>. Mit <Taste>Vorschau</Taste> siehst du, wie er auf der Website aussieht. Mit <Taste>Bearbeiten</Taste>{' '}
            schreibst du weiter.
          </>
          <>
            Prüf unter <Begriff>Einordnung</Begriff> das <Begriff>Datum</Begriff> (heute ist schon eingetragen), gib eine <Begriff>Kategorie</Begriff>{' '}
            an und wähl bei <Begriff>Gehört zu</Begriff>, zu wem die News gehört.
          </>
          <>
            Wenn du magst: Wähl unter <Begriff>Beitragsbild</Begriff> mit <Taste>Bild auswählen</Taste> ein Foto aus.
          </>
          <>
            Schalte <Begriff>Veröffentlicht</Begriff> ein, wenn die News gleich erscheinen soll. Bleibt der Schalter aus, ist sie ein Entwurf.
          </>
          <>
            Klick unten auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <p>
          Danach bist du auf der Seite deiner News. In der Leiste unten steht dann „Die News ist angelegt und auf der Website zu sehen.“ oder „Die
          News ist als Entwurf angelegt – noch nicht auf der Website.“
        </p>
        <Tipp>
          Pflicht sind nur <Begriff>Überschrift</Begriff>, <Begriff>Datum</Begriff> und <Begriff>Gehört zu</Begriff>. Fehlt etwas, steht der Hinweis
          direkt am Feld.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Text gestalten: der Spickzettel">
        <p>Im Textfeld gestaltest du mit ein paar Zeichen:</p>
        <Punkte>
          <li>
            <Zeichen>**fett**</Zeichen> wird zu <strong className="font-semibold">fett</strong>
          </li>
          <li>
            <Zeichen>*kursiv*</Zeichen> wird zu <em>kursiv</em>
          </li>
          <li>
            <Zeichen>## Zwischenüberschrift</Zeichen> am Anfang einer eigenen Zeile wird zur Zwischenüberschrift
          </li>
          <li>
            <Zeichen>- Punkt</Zeichen> am Zeilenanfang wird zur Liste, <Zeichen>1. Punkt</Zeichen> zur nummerierten Liste – jede Zeile ein Punkt
          </li>
          <li>
            <Zeichen>[Linktext](https://…)</Zeichen> wird zum Link mit eigenem Text. Eine eingefügte Adresse wie <Zeichen>https://…</Zeichen> wird von
            selbst klickbar.
          </li>
          <li>Eine Leerzeile beginnt einen neuen Absatz.</li>
        </Punkte>
        <p>
          Die Kurzfassung steht auch direkt unter dem Textfeld. Im Zweifel hilft ein Blick in die <Taste>Vorschau</Taste>: Sie sieht genauso aus wie
          später auf der Website.
        </p>
        <Tipp>
          Ein einfacher Zeilenwechsel reicht für einen neuen Absatz nicht – die Website hängt die Zeilen dann aneinander. Lass zwischen zwei Absätzen
          und nach einer Liste eine Leerzeile.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Datum, Kategorie und „Gehört zu“">
        <Punkte>
          <li>
            <Begriff>Datum</Begriff> bestimmt die Reihenfolge: Auf der Website stehen die neuesten News oben.
          </li>
          <li>
            <Begriff>Kategorie</Begriff> ist frei, zum Beispiel „Verein“ oder „Fußball“. Gib sie ein oder wähl einen Vorschlag. Sie steht auf der
            Website neben dem Datum. Lässt du sie leer, steht dort „News“.
          </li>
          <li>
            <Begriff>Gehört zu</Begriff> legt fest, wer die News später bearbeiten darf. Zur Wahl stehen nur Einträge, für die du Rechte hast. Auf
            der Website ist die Auswahl nicht zu sehen: Die News steht immer auf der News-Seite, nicht auf der Seite der Sparte.
          </li>
        </Punkte>
        <p>Was die Auswahl bei „Gehört zu“ bedeutet:</p>
        <Punkte>
          <li>
            Eine Mannschaft oder Gruppe, z. B. <Begriff>U13 (Mannschaft)</Begriff>: Bearbeiten dürfen deren Trainer:innen, die Spartenleitung und
            Admins.
          </li>
          <li>
            <Begriff>Ganze Sparte …</Begriff>: Bearbeiten dürfen nur die Spartenleitung und Admins.
          </li>
          <li>
            <Begriff>Ganzer Verein</Begriff>: Nur Admins können das wählen und die News bearbeiten.
          </li>
        </Punkte>
        <Tipp art="achtung">
          Bei einer neuen News ist unter <Begriff>Gehört zu</Begriff> der erste Eintrag der Liste vorausgewählt. Prüf das Feld vor dem Speichern –
          sonst landet die News vielleicht bei der falschen Mannschaft.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Entwurf oder veröffentlicht">
        <p>
          Der Schalter <Begriff>Veröffentlicht</Begriff> entscheidet, ob die News auf der Website steht. Darunter steht immer, was gerade gilt:
        </p>
        <Punkte>
          <li>Aus: „Entwurf – erscheint nicht auf der Website.“ Du kannst in Ruhe weiterschreiben.</li>
          <li>An: „Die News erscheint nach dem Speichern auf der Website.“</li>
        </Punkte>
        <p>
          In der Liste unter <Begriff>News</Begriff> erkennst du den Stand an <Begriff>Entwurf</Begriff> oder <Begriff>veröffentlicht</Begriff>. Auf der
          Seite einer veröffentlichten News steht oben der Knopf <Taste>Auf Website ansehen</Taste>. Schaltest du den Schalter später wieder aus und klickst auf{' '}
          <Taste>Speichern</Taste>, verschwindet die News von der Website. Auch ihr Link führt dann ins Leere. Das Umschalten allein reicht nicht – es
          gilt immer erst nach dem Speichern.
        </p>
        <Tipp>
          Eine Zeitsteuerung gibt es nicht. Ein Datum in der Zukunft hält die News nicht zurück – mit <Begriff>Veröffentlicht</Begriff> erscheint sie
          sofort. Soll sie erst später kommen, speichere sie als Entwurf. Am Tag selbst schaltest du <Begriff>Veröffentlicht</Begriff> ein, passt das Datum an
          und klickst auf <Taste>Speichern</Taste>.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Ändern, Adresse und Löschen">
        <p>
          Zum Ändern klickst du in der Liste unter <Begriff>News</Begriff> auf die News, änderst, was du willst, und klickst auf{' '}
          <Taste>Speichern</Taste>.
        </p>
        <p>
          Hat die News schon ein Beitragsbild, wählst du mit <Taste>Anderes Bild wählen</Taste> ein neues aus. Mit <Taste>Bild entfernen</Taste>{' '}
          nimmst du es heraus, <Taste>Rückgängig</Taste> holt es zurück. Beides gilt erst, wenn du auf <Taste>Speichern</Taste> klickst.
        </p>
        <p>
          Nach dem ersten Speichern gibt es das Feld <Begriff>Adresse auf der Website</Begriff>. Die Adresse entsteht aus der Überschrift, zum Beispiel
          /news/sommerfest-2026. Sie bleibt gleich, auch wenn du die Überschrift später änderst. Leerst du das Feld, bildet die Verwaltung die Adresse
          neu aus der Überschrift. Ist sie beim Anlegen schon vergeben, hängt die Verwaltung eine Zahl an, etwa -2. Trägst du selbst eine vergebene
          Adresse ein, meldet sie „Diese Adresse ist schon an eine andere News vergeben. Bitte eine andere wählen.“
        </p>
        <Tipp art="achtung">
          Ändere die Adresse nach dem Veröffentlichen nicht mehr. Sonst funktionieren Links, die schon geteilt wurden, nicht mehr.
        </Tipp>
        <p>
          Zum Löschen klickst du ganz unten auf <Taste>News löschen</Taste> und bestätigst die Rückfrage. Das lässt sich nicht rückgängig machen.
        </p>
        <Tipp>
          Soll eine News nur von der Website verschwinden, schalte lieber <Begriff>Veröffentlicht</Begriff> aus und klick auf{' '}
          <Taste>Speichern</Taste>. Dann bleibt sie als Entwurf erhalten.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Wo erscheint die News?">
        <Punkte>
          <li>
            Auf der Seite <Begriff>News</Begriff> als Karte mit Bild, Kategorie, Datum, Überschrift und Kurzbeschreibung – die neueste zuerst.
          </li>
          <li>Die neuesten News stehen außerdem auf der Startseite.</li>
          <li>Auf den Seiten der Sparten erscheinen keine News – auch nicht, wenn die News zu einer Mannschaft der Sparte gehört.</li>
          <li>Ein Klick öffnet die ganze News: oben das Beitragsbild, darunter die Kurzbeschreibung und der Text.</li>
        </Punkte>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp>
          In der News-Übersicht und auf der Startseite schneidet die Website das Beitragsbild auf ein Querformat zu. Querformat-Fotos passen deshalb am besten. Ohne Bild zeigt die
          Karte das Vereinswappen.
        </Tipp>
        <Tipp>
          Fotos lädst du nur als Beitragsbild hoch – eins pro News. Bilder mitten im Text lassen sich nicht hochladen.
        </Tipp>
        <Tipp>
          Wiederholt die Kurzbeschreibung nur den Anfang deines Textes, zeigt die Website sie in der News nicht doppelt.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
