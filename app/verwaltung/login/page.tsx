import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { aktuelleSitzung } from '@/lib/verwaltung/sitzung'
import LoginFormular from './LoginFormular'

export const metadata: Metadata = { title: 'Anmelden' }
export const dynamic = 'force-dynamic'

export default function LoginSeite() {
  if (aktuelleSitzung()) redirect('/verwaltung')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/SV_Holm_Seppensen_Logo.svg" alt="" className="w-10 h-10" />
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] leading-tight">
            SV Holm-Seppensen
            <br />
            Vereinsverwaltung
          </div>
        </div>
        <h1 className="font-display text-5xl tracking-tight mb-3">ANMELDEN</h1>
        <p className="text-sm text-[#6b6b6b] leading-relaxed mb-8">
          Mit Benutzername, Passwort und dem Code aus deiner Authenticator-App.
        </p>
        <LoginFormular />
        <div className="mt-8 space-y-2 text-xs text-[#6b6b6b] leading-relaxed">
          <p>
            Du hast eine Einladung bekommen? Dann scanne den QR-Code oder{' '}
            <Link href="/verwaltung/anmelden" className="underline underline-offset-4 hover:text-[#0a0a0a]">
              gib den Einladungs-Code hier ein
            </Link>
            .
          </p>
          <p>Passwort vergessen oder Handy verloren? Ein Admin kann deinen Zugang zurücksetzen – danach richtest du ihn neu ein.</p>
        </div>
      </div>
    </div>
  )
}
