import type { Metadata } from 'next'
import ZugangEinrichten from './ZugangEinrichten'

export const metadata: Metadata = { title: 'Zugang einrichten' }

/**
 * Ziel des Einladungs-QR-Codes: /verwaltung/anmelden#<code>. Hier legt die Person einmalig ihr
 * Passwort fest und koppelt die Authenticator-App. Der Code steht hinter "#" und erreicht den
 * Server erst durch die Seite selbst – Link-Vorschauen in Messengern können ihn nicht verbrauchen.
 * Ohne Code im Link kann er von Hand eingegeben werden (z. B. am PC).
 */
export default function AnmeldenSeite() {
  return (
    <div className="min-h-screen flex justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <ZugangEinrichten />
      </div>
    </div>
  )
}
