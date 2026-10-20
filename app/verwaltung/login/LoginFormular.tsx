'use client'

import { useFormState } from 'react-dom'
import { anmelden } from '../aktionen'
import { LEER } from '@/lib/verwaltung/formular'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse, Feld } from '@/components/verwaltung/ui'

export default function LoginFormular() {
  const [ergebnis, aktion] = useFormState(anmelden, LEER)
  return (
    <form action={aktion} className="space-y-5">
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
      <Feld label="Passwort" htmlFor="passwort">
        <input id="passwort" name="passwort" type="password" required autoComplete="current-password" className={eingabeKlasse} />
      </Feld>
      <Feld label="Code aus der Authenticator-App" htmlFor="totpCode" hinweis="6 Ziffern, wechselt alle 30 Sekunden.">
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
      <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
        <input type="checkbox" name="merken" value="ja" defaultChecked className="w-4 h-4 accent-[#0a0a0a]" />
        Auf diesem Gerät angemeldet bleiben (30 Tage)
      </label>
      <FormMeldung ergebnis={ergebnis} />
      <SpeichernKnopf className="w-full py-3">Anmelden</SpeichernKnopf>
    </form>
  )
}
