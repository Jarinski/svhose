import { Users } from 'lucide-react'
import { Abschnitt, Begriff, Punkte, Schritte, Taste, Tipp } from '../bausteine'
import type { Thema } from '../typen'

export const trainerteam: Thema = {
  slug: 'trainerteam',
  titel: 'Trainerteam zusammenstellen',
  kurz: 'Personen ins Trainerteam holen oder neu anlegen, Rollen vergeben und die Reihenfolge festlegen.',
  icon: Users,
  zielgruppe: 'teams',
  bereich: 'teams',
  ziel: { href: '/verwaltung/teams', text: 'Zu den Mannschaften & Gruppen' },
  website: { href: '/sparten', text: 'Sparten ansehen' },
  inhalt: (
    <>
      <Abschnitt titel="Wofür das gut ist">
        <p>
          Im Trainerteam stehen alle, die man bei einer Mannschaft oder Gruppe ansprechen kann – Trainer:innen, Betreuer:innen, Übungsleiter:innen.
          Sie erscheinen mit Telefon und E-Mail auf der Website. Du pflegst das Trainerteam auf der Seite der Mannschaft oder Gruppe im Abschnitt{' '}
          <Begriff>Trainerteam & Ansprechpartner</Begriff>. Das darfst du überall, wo du auch die Trainingszeiten bearbeiten darfst.
        </p>
      </Abschnitt>

      <Abschnitt titel="Eine vorhandene Person hinzufügen">
        <Schritte>
          <>
            Öffne im Menü <Begriff>Mannschaften & Gruppen</Begriff> die Mannschaft oder Gruppe.
          </>
          <>
            Tippe im Abschnitt <Begriff>Trainerteam & Ansprechpartner</Begriff> auf <Taste>Person hinzufügen</Taste>.
          </>
          <>
            Tippe den Namen ein. Unter jedem Treffer steht, wo die Person schon eingetragen ist – so unterscheidest du auch Personen mit ähnlichem
            Namen.
          </>
          <>Tippe auf die richtige Person. Sie steht jetzt in der Liste, erst einmal mit der Rolle Trainer:in.</>
          <>
            Passe bei Bedarf die Rolle an und tippe unten auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <p>
          Wer schon im Trainerteam steht, ist in der Trefferliste ausgegraut und mit <Begriff>steht schon in der Liste</Begriff> markiert.
        </p>
        <Tipp titel="„keine Kontaktdaten“ bis zum Speichern">
          Steht bei einer gerade hinzugefügten Person <Begriff>keine Kontaktdaten</Begriff>, ist das oft nur die Vorschau. Nach dem Speichern siehst du
          Telefon und E-Mail, die schon hinterlegt sind – und genau die erscheinen auch auf der Website.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Eine neue Person anlegen">
        <p>
          Ist die Person noch nicht erfasst, legst du sie direkt hier an. Ein Umweg über <Begriff>Personen</Begriff> ist nicht nötig.
        </p>
        <Schritte>
          <>
            Tippe auf <Taste>Person hinzufügen</Taste> und gib den vollständigen Namen ein.
          </>
          <>Tippe auf den letzten Eintrag der Trefferliste: „… als neue Person anlegen“ mit dem eingetippten Namen.</>
          <>
            Unter <Begriff>Neue Person anlegen</Begriff> prüfst du das Feld <Begriff>Name</Begriff>. <Begriff>Telefon (optional)</Begriff> und{' '}
            <Begriff>E-Mail (optional)</Begriff> kannst du leer lassen – siehe Tipp unten.
          </>
          <>
            Tippe auf <Taste>Hinzufügen</Taste>. In der Liste steht die Person jetzt mit <Begriff>neu – wird beim Speichern angelegt</Begriff>.
          </>
          <>
            Tippe unten auf <Taste>Speichern</Taste>. Erst jetzt wird die Person angelegt. Danach findest du sie auch unter <Begriff>Personen</Begriff>.
          </>
        </Schritte>
        <Tipp art="achtung" titel="Nur mit Einverständnis">
          Name, Telefon und E-Mail erscheinen öffentlich auf der Website. Trag sie nur ein, wenn die Person einverstanden ist.
        </Tipp>
        <Tipp titel="Erst der Name, dann die Kontaktdaten">
          Trag bei einer neuen Person zunächst nur den Namen ein und speichere. Telefon und E-Mail ergänzt du danach über{' '}
          <Begriff>Kontaktdaten ändern</Begriff>. Denn ist eine Nummer oder Adresse ungültig, lässt sie sich in der Zeile nicht mehr ändern. Dann
          bleibt nur: Zeile mit dem Kreuz entfernen und die Person neu hinzufügen.
        </Tipp>
        <p>
          Gibt es schon jemanden mit genau diesem Namen, bietet die Suche kein Neuanlegen an. Dann ist die Person meist schon erfasst – wähle sie aus
          der Liste.
        </p>
        <p>
          Heißt wirklich eine andere Person genauso, legst du sie unter <Begriff>Personen</Begriff> über <Taste>Neue Person</Taste> an. Wähle dort
          bei <Begriff>Gehört zu</Begriff> deine Mannschaft oder Gruppe und die <Begriff>Rolle</Begriff>, dann tippe auf{' '}
          <Taste>Person anlegen</Taste>. Bei Admins heißt das Feld <Begriff>Gleich eintragen bei (optional)</Begriff>.
        </p>
      </Abschnitt>

      <Abschnitt titel="Die Rolle wählen">
        <p>
          Jede Person im Trainerteam hat eine Rolle. Zur Auswahl stehen Trainer:in, Co-Trainer:in, Torwarttrainer:in, Betreuer:in und Übungsleiter:in.
          Die Rolle gilt nur für diese Mannschaft oder Gruppe – woanders kann dieselbe Person eine andere Rolle haben.
        </p>
        <Schritte>
          <>Tippe in der Zeile der Person auf die Rolle und wähle eine aus.</>
          <>
            Passt keine? Wähle <Begriff>Andere Rolle eintippen …</Begriff> und schreib die Rolle selbst, z. B. Teammanager:in.
          </>
          <>Zurück zur Auswahl kommst du über den kleinen Knopf mit dem Listen-Symbol neben dem Feld.</>
        </Schritte>
        <Tipp>
          Lässt du eine eigene Rolle leer, speichert die Verwaltung <Begriff>Trainer:in</Begriff>.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Reihenfolge und Entfernen">
        <p>So wie die Liste hier steht, erscheint das Trainerteam auch auf der Website. Rechts in jeder Zeile findest du drei Knöpfe:</p>
        <Punkte>
          <li>Pfeil nach oben bzw. nach unten – verschiebt die Person um einen Platz.</li>
          <li>Kreuz – nimmt die Person aus dem Trainerteam.</li>
        </Punkte>
        <p>
          Beides gilt erst nach <Taste>Speichern</Taste>. Entfernen nimmt die Person nur aus dieser Mannschaft oder Gruppe. Sie bleibt im System
          erhalten und steht weiter überall, wo sie sonst noch eingetragen ist. Über <Taste>Person hinzufügen</Taste> findest du sie jederzeit
          wieder.
        </p>
        <Tipp titel="Wichtigste Ansprechperson nach oben">
          Auf der Seite Trainingszeiten steht bei jeder Zeit nur eine E-Mail-Adresse und eine Telefonnummer – jeweils von der ersten Person in der
          Liste, die eine hat. Setz deshalb die Person nach oben, die Interessierte zuerst erreichen sollen.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Kontaktdaten ändern">
        <p>
          Telefon, E-Mail, WhatsApp und Foto gehören zur Person, nicht zur Mannschaft. Du änderst sie auf der Seite der Person – für alle Stellen, an
          denen sie eingetragen ist, auf einmal.
        </p>
        <Schritte>
          <>
            Tippe in der Zeile der Person auf <Begriff>Kontaktdaten ändern</Begriff>. Oder öffne im Menü <Begriff>Personen</Begriff> und such die
            Person dort.
          </>
          <>
            Ändere unter <Begriff>Kontaktdaten</Begriff> die Felder, z. B. <Begriff>Telefon</Begriff> oder <Begriff>E-Mail</Begriff>.
          </>
          <>
            Tippe unten auf <Taste>Speichern</Taste>.
          </>
        </Schritte>
        <p>
          <Begriff>Kontaktdaten ändern</Begriff> erscheint, sobald die Person gespeichert im Trainerteam steht. Steht sie auch an Stellen, die du nicht
          bearbeiten darfst – etwa bei einer anderen Mannschaft oder auf der Kontaktseite –, oder hat sie einen eigenen Zugang zur Verwaltung, ändert
          ein:e Admin ihre Kontaktdaten. Ausnahme: deine eigene Person, wenn sie mit deinem Zugang verknüpft ist.
        </p>
        <Tipp titel="„Seite nicht gefunden“">
          Öffnet sich nach <Begriff>Kontaktdaten ändern</Begriff> die Meldung <Begriff>SEITE NICHT GEFUNDEN</Begriff>, darfst du diese Person nicht
          selbst ändern. Gib die neuen Daten dann an eine:n Admin weiter.
        </Tipp>
      </Abschnitt>

      <Abschnitt titel="Wo das Trainerteam erscheint">
        <Punkte>
          <li>
            Auf der Seite der Sparte, in der Karte der Mannschaft oder Gruppe unter <Begriff>Trainer & Ansprechpartner</Begriff>: Foto (sonst die
            Initialen), Name, Rolle, E-Mail und Telefon. Bei einer Handynummer erscheint automatisch ein WhatsApp-Link.
          </li>
          <li>Auf der Seite Trainingszeiten: die Namen bei jeder Zeit, dazu eine E-Mail-Adresse und eine Telefonnummer.</li>
        </Punkte>
        <p>
          In der Liste unter <Begriff>Mannschaften & Gruppen</Begriff> zeigt der Hinweis <Begriff>kein Trainerteam</Begriff>, wo noch niemand
          eingetragen ist.
        </p>
      </Abschnitt>

      <Abschnitt titel="Gut zu wissen">
        <Tipp art="achtung" titel="Umlaute in der Suche">
          Tippe Umlaute so, wie sie im Namen stehen: „Björn“ oder „Bjoern“ findet Björn, „Bjorn“ nicht. Dann erscheint meist{' '}
          <Begriff>Niemand mit diesem Namen gefunden.</Begriff> und gleich darunter <Begriff>„Bjorn“ als neue Person anlegen</Begriff>. Findest du jemanden nicht,
          probiere vor dem Neuanlegen die andere Schreibweise (ö oder oe) oder nur den Nachnamen. Sonst legst du die Person aus Versehen doppelt an.
        </Tipp>
        <Tipp>
          Die Suche zeigt höchstens acht Treffer. Bei vielen Treffern tippst du einfach mehr vom Namen, z. B. Vor- und Nachname.
        </Tipp>
      </Abschnitt>
    </>
  ),
}
