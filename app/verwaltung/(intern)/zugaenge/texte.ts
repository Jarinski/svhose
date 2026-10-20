/**
 * Texte der Zugangsverwaltung, die Server und Browser gemeinsam nutzen (ohne Datenbank-Importe).
 */

/** Hinweis unter dem Einladungs-Code (nach dem Anlegen und nach dem Zurücksetzen). */
export function einladungsHinweis(name: string): string {
  return `Über diesen QR-Code legt ${name} einmalig das Passwort fest und koppelt die Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator). Der Code gilt 7 Tage und nur einmal. Nur persönlich oder per Direktnachricht weitergeben.`
}

export const BENUTZERNAME_HINWEIS = 'Damit meldet sich die Person an. Erlaubt sind Kleinbuchstaben (a–z), Ziffern, Punkt, Bindestrich und Unterstrich.'
