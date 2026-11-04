'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { passwortVergessen } from '../aktionen'
import { LEER } from '@/lib/verwaltung/formular'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse, Feld, knopfKlassen } from '@/components/verwaltung/ui'

export default function PasswortVergessenFormular() {
  const [ergebnis, aktion] = useActionState(passwortVergessen, LEER)

  if (ergebnis.ok) {
    return (
      <div className="space-y-5">
        <FormMeldung ergebnis={ergebnis} />
        <Link href="/verwaltung/login" className={`${knopfKlassen.primaer} w-full py-3 text-center block`}>
          Zur Anmeldung
        </Link>
        <p className="text-xs text-[#6b6b6b] leading-relaxed">
          Aus Sicherheitsgründen wurden alle Geräte abgemeldet.
        </p>
      </div>
    )
  }

  return (
    <form action={aktion} onReset={eingabenBehalten} className="space-y-5">
      <Feld label="Benutzername" htmlFor="benutzername">
        <input
          id="benutzername"
          name="benutzername"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={eingabeKlasse}
        />
      </Feld>
      <Feld label="Code aus der Authenticator-App" htmlFor="totpCode" hinweis="6 Ziffern, wechselt alle 30 Sekunden." fehler={ergebnis.felder?.totpCode}>
        <input
          id="totpCode"
          name="totpCode"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          placeholder="123456"
          className={`${eingabeKlasse} font-mono text-xl tracking-[0.3em]`}
        />
      </Feld>
      <Feld label="Neues Passwort" htmlFor="neuesPasswort" hinweis="Mindestens 10 Zeichen." fehler={ergebnis.felder?.neuesPasswort}>
        <input id="neuesPasswort" name="neuesPasswort" type="password" required minLength={10} autoComplete="new-password" className={eingabeKlasse} />
      </Feld>
      <Feld label="Neues Passwort wiederholen" htmlFor="neuesPasswortWdh" fehler={ergebnis.felder?.neuesPasswortWdh}>
        <input id="neuesPasswortWdh" name="neuesPasswortWdh" type="password" required minLength={10} autoComplete="new-password" className={eingabeKlasse} />
      </Feld>
      <FormMeldung ergebnis={ergebnis} />
      <SpeichernKnopf className="w-full py-3">Passwort ändern</SpeichernKnopf>
    </form>
  )
}
