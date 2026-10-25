import Link from 'next/link'
import { Contact } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const personen: Thema = {
  slug: 'personen',
  titel: 'Personen & Kontaktdaten',
  kurz: 'Personen anlegen, Telefon, E-Mail, WhatsApp und Foto ändern – einmal geändert, überall aktuell.',
  icon: Contact,
  zielgruppe: 'alle',
  bereich: 'inhalte',
  ziel: { href: '/verwaltung/personen', text: 'Zu den Personen' },
  website: { href: '/sparten', text: 'Sparten ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Eine Person, viele Stellen">
        <p>
          Jede Person soll es in der Verwaltung nur einmal geben: mit Name, Telefon, E-Mail, WhatsApp-Nummer und Foto. Steht sie in mehreren
          Trainerteams oder ist sie auch Ansprechpartner:in einer Sparte, änderst du ihre Daten trotzdem nur an einer Stelle. Danach sind sie
          überall auf der Website aktuell.
        </p>
        <p>
          Unter <Begriff>Personen</Begriff> im Menü siehst du alle Personen, die du bearbeiten darfst. Unter jedem Namen steht, wo die Person
          eingetragen ist, z. B. „Trainer:in bei U13 (Fußball)“.
        </p>
      </Abschnitt>

      <Abschnitt titel="Wer welche Personen bearbeiten darf">
        <Punkte>
          <li>
            <strong>Admins</strong> dürfen alle Personen bearbeiten.
          </li>
          <li>
            <strong>Trainer:innen und Spartenleitungen</strong> dürfen Personen bearbeiten, die nur in ihren eigenen Mannschaften, Gruppen oder
            Sparten stehen. Steht eine Person zusätzlich in einem fremden Team, kannst du sie nicht ändern.
          </li>
          <li>
            Personen mit einer Vereinsfunktion auf der Kontaktseite (z. B. Vorstand) oder mit einem eigenen Zugang zur Verwaltung bearbeiten nur
            Admins – und die Person selbst, siehe unten. Personen, die nirgends eingetragen sind, bearbeiten ebenfalls nur Admins.
          </li>
          <li>
            <strong>Dich selbst</strong> darfst du immer bearbeiten, wenn dein Zugang mit deiner Person verknüpft ist. Das richtet ein:e Admin
            unter <Begriff>Zugänge</Begriff> im Feld <Begriff>Eigene Person</Begriff> ein.
          </li>
          <li>
            <strong>Löschen</strong> dürfen nur Admins.
          </li>
        </Punkte>
        <Tipp>Fehlt jemand in deiner Liste, obwohl die Person in deinem Team steht? Dann gilt eine der Regeln oben. Frag in dem Fall eine:n Admin.</Tipp>
      </Abschnitt>

      <Abschnitt titel="Neue Person anlegen">
        <p>
          Wenn du Mannschaften oder Gruppen bearbeitest: Trainer:innen trägst du am einfachsten direkt im Trainerteam ein und legst sie dort gleich
          mit an. Wie das geht, steht in der Anleitung{' '}
          <Link href="/verwaltung/hilfe/trainerteam" className="underline underline-offset-4 hover:text-[#6b6b6b]">
            Trainerteam zusammenstellen
          </Link>
          . Alternativ geht es so:
        </p>
        <Schritte>
          <>
            Öffne <Begriff>Personen</Begriff> und klicke auf <Taste>Neue Person</Taste>.
          </>
          <>
            Trage den Namen bei <Begriff>Name</Begriff> ein, dazu nach Wunsch <Begriff>Telefon (optional)</Begriff> und{' '}
            <Begriff>E-Mail (optional)</Begriff>.
          </>
          <>
            Wähle bei <Begriff>Gehört zu</Begriff> die Mannschaft oder Gruppe und dann die <Begriff>Rolle</Begriff>, z. B. Trainer:in oder
            Betreuer:in. Passt keine, wähle <Begriff>Andere Rolle eintippen …</Begriff>. Admins sehen hier{' '}
            <Begriff>Gleich eintragen bei (optional)</Begriff> und können das Feld auch leer lassen.
          </>
          <>
            Klicke auf <Taste>Person anlegen</Taste>. Es öffnet sich die Seite der Person. Dort ergänzt du bei Bedarf WhatsApp-Nummer und Foto.
          </>
        </Schritte>
        <p>
          Als Trainer:in oder Spartenleitung musst du eine Mannschaft oder Gruppe wählen. Sonst könntest du die Person danach nicht mehr
          bearbeiten. Die Person steht dann gleich im Trainerteam dieser Mannschaft bzw. Gruppe.
        </p>
        <Tipp art="achtung" titel="Erst suchen, dann anlegen">
          Die Verwaltung warnt nicht, wenn es schon jemanden mit demselben Namen gibt. Such deshalb vorher, ob die Person schon da ist. In deiner
          Liste unter <Begriff>Personen</Begriff> stehen nur die Personen, die du bearbeiten darfst. Die Suche im Trainerteam findet alle Personen
          des Vereins.
        </Tipp>
        <Tipp titel="Nur Ansprechpartner:in der Sparte">
          <p>
            Als Spartenleitung legst du jemanden an, der nur bei den Ansprechpartner:innen deiner Sparte stehen soll? Dann musst du unter{' '}
            <Begriff>Gehört zu</Begriff> trotzdem eine Mannschaft oder Gruppe wählen, und die Person steht auch in deren Trainerteam. Bitte in dem
            Fall am besten eine:n Admin, die Person anzulegen.
          </p>
          <p>
            Hat deine Sparte keine Mannschaften oder Gruppen, fehlt das Feld <Begriff>Gehört zu</Begriff>. Die neue Person steht dann noch nirgends.
            Du landest wieder in der Liste, und die Person ist dort nicht zu sehen. Trag sie gleich danach unter <Begriff>Sparten</Begriff> bei den
            Ansprechpartner:innen ein. Dann erscheint sie auch in deiner Liste.
          </p>
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Kontaktdaten und Foto ändern">
        <Schritte>
          <>
            Öffne <Begriff>Personen</Begriff>, such die Person im Suchfeld (Name, Telefon, E-Mail oder Mannschaft) und tippe sie an.
          </>
          <>
            Ändere unter <Begriff>Kontaktdaten</Begriff> die Felder <Begriff>Name</Begriff>, <Begriff>Telefon</Begriff>, <Begriff>E-Mail</Begriff>{' '}
            oder <Begriff>WhatsApp (nur falls abweichend)</Begriff>.
          </>
          <>
            Beim <Begriff>Foto</Begriff> wählst du ein Bild über <Taste>Foto hochladen</Taste> bzw. <Taste>Anderes Foto wählen</Taste>. Mit{' '}
            <Taste>Foto entfernen</Taste> nimmst du es heraus; <Taste>Doch behalten</Taste> macht das rückgängig.
          </>
          <>
            Klicke unten in der Leiste auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <p>
          Ist die Person irgendwo eingetragen, kommt die Meldung „Gespeichert – ist jetzt auf der Website sichtbar.“ Sonst steht dort nur
          „Gespeichert.“ Ist die Mannschaft, Gruppe oder Sparte ausgeblendet, erscheint die Person dort trotz dieser Meldung nicht auf der Website.
        </p>
        <p>
          Ganz oben siehst du unter <Begriff>Hier eingetragen</Begriff>, wo die Person überall steht. Ein Klick darauf führt dich direkt dorthin,
          wenn du die Stelle bearbeiten darfst.
        </p>
        <p>
          Das Feld <Begriff>Notiz</Begriff> unter <Begriff>Interne Notiz</Begriff> ist nur für die Verwaltung. Es erscheint nie auf der Website.
        </p>
        <Tipp>
          Fotos: JPG, PNG oder WebP bis 15 MB. Auf der Website wird das Foto rund zugeschnitten. Ein Porträt mit dem Gesicht in der Mitte passt
          deshalb am besten.
        </Tipp>
        <Tipp art="achtung" titel="Neue:r Trainer:in? Nicht umbenennen">
          Übernimmt jemand anderes eine Mannschaft, schreib die alte Person nicht einfach auf die neue um. Die Änderung gilt sonst überall, wo die
          alte Person steht. Leg stattdessen die neue Person an oder hol sie im Trainerteam dazu, und nimm die alte dort heraus.
        </Tipp>
        <Tipp titel="Rolle ändern">
          Die Rolle (z. B. Co-Trainer:in) gibt es auf dieser Seite nicht. Sie gehört zum Eintrag: Du änderst sie im Trainerteam der Mannschaft oder
          Gruppe bzw. unter <Begriff>Sparten</Begriff> bei den Ansprechpartner:innen.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Was auf der Website erscheint">
        <Punkte>
          <li>
            <strong>Spartenseite:</strong> beim Trainerteam jeder Mannschaft oder Gruppe und bei den Ansprechpartner:innen der Sparte – mit Foto,
            Name, Rolle, E-Mail, Telefon und WhatsApp-Link. Ohne Foto stehen dort die Initialen.
          </li>
          <li>
            <strong>Trainingszeiten:</strong> die Namen des Trainerteams. Dazu eine E-Mail-Adresse und eine Telefonnummer, und zwar jeweils von der
            ersten Person im Trainerteam, die eine eingetragen hat.
          </li>
          <li>
            <strong>Kontaktseite:</strong> Personen mit einer Vereinsfunktion, mit Foto, Name, Funktion, E-Mail, Telefon und WhatsApp-Link.
          </li>
        </Punkte>
        <Tipp art="achtung" titel="Kontaktdaten und Foto sind öffentlich">
          Steht eine Person in einem Trainerteam, bei den Ansprechpartner:innen einer Sparte oder auf der Kontaktseite, erscheinen Name, Foto,
          E-Mail-Adresse, Telefonnummer und WhatsApp-Nummer (im WhatsApp-Link) auf der Website. Einen Schalter zum Verstecken gibt es nicht. Trag
          deshalb nur ein, was öffentlich sein darf – und nur mit Einverständnis der Person.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Person löschen (nur Admins)">
        <p>
          Trainer:innen und Spartenleitungen nehmen eine Person nur aus ihrem Trainerteam (bzw. bei den Ansprechpartner:innen ihrer Sparte)
          heraus. Die Person bleibt dabei in der Verwaltung erhalten. Steht sie danach nirgends mehr, siehst du sie nicht mehr unter{' '}
          <Begriff>Personen</Begriff>. Über die Suche im Trainerteam kannst du sie aber wieder eintragen. Ganz löschen können sie nur Admins:
        </p>
        <Schritte>
          <>
            Öffne die Person. Ganz unten steht der Bereich <Begriff>Person löschen</Begriff>. Dort siehst du, wo die Person noch eingetragen ist.
          </>
          <>
            Klicke auf <Taste>Person löschen</Taste> und bestätige die Rückfrage.
          </>
        </Schritte>
        <p>
          Die Person verschwindet dabei überall: aus allen Trainerteams, bei den Ansprechpartner:innen der Sparten und von der Kontaktseite. Ihr Foto
          wird ebenfalls gelöscht. Ein Zugang zur Verwaltung bleibt bestehen, ist danach aber mit keiner Person mehr verknüpft. Das Löschen lässt sich
          nicht rückgängig machen.
        </p>
        <Tipp art="achtung" titel="Vereinsfunktion">
          Hat die Person eine Vereinsfunktion, wird der ganze Eintrag auf der Kontaktseite gelöscht, auch die Bezeichnung wie „Kassenwart“. Gibt es
          eine Nachfolge, tausch die Person zuerst unter <Begriff>Kontaktseite</Begriff> mit <Begriff>Person ändern</Begriff> aus und lösche erst
          danach.
        </Tipp>
        <Tipp>
          Nach dem Löschen landest du wieder in der Liste, ohne eigene Meldung. Ist der Name dort verschwunden, hat es geklappt. Zum Aufräumen
          erscheint für Admins über der Liste der Haken „Nur Personen zeigen, die nirgends eingetragen sind“, sobald es solche Personen gibt.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp titel="WhatsApp-Link">
          <p>
            Eine eigene Nummer bei <Begriff>WhatsApp (nur falls abweichend)</Begriff> hat immer Vorrang. Ist dort nichts eingetragen, bekommt nur eine
            Handynummer (015…, 016…, 017…) einen WhatsApp-Link. Festnetznummern bekommen keinen.
          </p>
          <p>
            Trägst du bei WhatsApp dieselbe Nummer ein wie bei Telefon, wird sie nicht gespeichert. Das Feld ist danach wieder leer. Das ist in
            Ordnung: Ist es eine Handynummer, bekommt sie den WhatsApp-Link trotzdem.
          </p>
        </Tipp>
        <Tipp titel="Suchen mit Umlauten">
          Groß- und Kleinschreibung sind bei der Suche egal. Umlaute musst du aber mit eintippen: „bjorn“ findet „Björn“ nicht, „björn“ oder
          „bjoern“ schon. Oder du suchst nach dem Nachnamen.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
