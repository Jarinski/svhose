import type { Metadata } from 'next'
import Link from 'next/link'
import PasswortVergessenFormular from './PasswortVergessenFormular'

export const metadata: Metadata = { title: 'Passwort vergessen' }

export default function PasswortVergessenSeite() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-2">SV Holm-Seppensen · Vereinsverwaltung</div>
        <h1 className="font-display text-5xl tracking-tight mb-3">PASSWORT VERGESSEN</h1>
        <p className="text-sm text-[#6b6b6b] leading-relaxed mb-8">
          Mit deinem Benutzernamen und dem Code aus der Authenticator-App legst du ein neues Passwort fest.
        </p>
        <PasswortVergessenFormular />
        <div className="mt-8 space-y-2 text-xs text-[#6b6b6b] leading-relaxed">
          <p>
            <Link href="/verwaltung/login" className="underline underline-offset-4 hover:text-[#0a0a0a]">
              Zurück zur Anmeldung
            </Link>
          </p>
          <p>Handy verloren? Dann kann ein Admin deinen Zugang zurücksetzen.</p>
        </div>
      </div>
    </div>
  )
}
