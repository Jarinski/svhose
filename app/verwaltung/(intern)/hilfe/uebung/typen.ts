/**
 * Eine Lektion im Übungsmodus der Hilfe: eine kleine Aufgabe in einem nachgebauten Formular.
 * Gespeichert wird dabei nichts – alles passiert nur im Browser.
 */

export interface LektionProps {
  /** Aufrufen, sobald die Aufgabe erfüllt ist. */
  geloest: () => void
  /** true, wenn die Lektion schon gelöst ist (z. B. nach "Zurück"). */
  istGeloest: boolean
}

export interface Lektion {
  titel: string
  /** Die Aufgabe, z. B. "Die U13 trainiert dienstags 17:30–19:00 auf dem Sportplatz." */
  aufgabe: React.ReactNode
  /** Die Übung selbst: ein nachgebautes Formular, eine Liste oder ein Quiz. */
  Inhalt: React.ComponentType<LektionProps>
  /** Erscheint nach dem Lösen: Was das in der echten Verwaltung bewirkt. */
  danach?: React.ReactNode
}
