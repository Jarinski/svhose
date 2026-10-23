'use client'

import { useActionState } from 'react'
import { passwortAendernAktion } from '../../aktionen'
import { LEER } from '@/lib/verwaltung/formular'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse, Feld, Karte } from '@/components/verwaltung/ui'

export default function PasswortAendern({ benutzername }: { benutzername: string }) {
  const [ergebnis, aktion] = useActionState(passwortAendernAktion, LEER)
  return (
    <Karte titel="Passwort ändern" beschreibung="Zur Sicherheit mit dem aktuellen Passwort und einem Code aus der App. Danach werden alle anderen Geräte abgemeldet.">
      <form action={aktion} onReset={eingabenBehalten} className="grid gap-4 sm:grid-cols-2" key={ergebnis.ok ? 'gespeichert' : 'offen'}>
        <input type="text" name="benutzername" autoComplete="username" value={benutzername} readOnly hidden />
        <Feld label="Aktuelles Passwort" htmlFor="altesPasswort" fehler={ergebnis.felder?.altesPasswort}>
          <input id="altesPasswort" name="altesPasswort" type="password" required autoComplete="current-password" className={eingabeKlasse} />
        </Feld>
        <Feld label="Code aus der App" htmlFor="totpCodeAendern" fehler={ergebnis.felder?.totpCode}>
          <input
            id="totpCodeAendern"
            name="totpCode"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            className={`${eingabeKlasse} font-mono tracking-[0.3em]`}
          />
        </Feld>
        <Feld label="Neues Passwort" htmlFor="neuesPasswort" hinweis="Mindestens 10 Zeichen." fehler={ergebnis.felder?.neuesPasswort}>
          <input id="neuesPasswort" name="neuesPasswort" type="password" required minLength={10} autoComplete="new-password" className={eingabeKlasse} />
        </Feld>
        <Feld label="Neues Passwort wiederholen" htmlFor="neuesPasswortWdh" fehler={ergebnis.felder?.neuesPasswortWdh}>
          <input id="neuesPasswortWdh" name="neuesPasswortWdh" type="password" required minLength={10} autoComplete="new-password" className={eingabeKlasse} />
        </Feld>
        <div className="sm:col-span-2 space-y-3">
          <FormMeldung ergebnis={ergebnis} />
          <SpeichernKnopf>Passwort ändern</SpeichernKnopf>
        </div>
      </form>
    </Karte>
  )
}
