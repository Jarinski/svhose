'use client'

import { useActionState } from 'react'
import { RefreshCw, Unlink } from 'lucide-react'
import { LEER } from '@/lib/verwaltung/formular'
import type { AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse, Feld } from '@/components/verwaltung/ui'
import { jetztAbrufen, verbindungTrennen, zugangSichern } from './aktionen'

export function ZugangFormular({ verbunden }: { verbunden: boolean }) {
  const [ergebnis, speichern] = useActionState(zugangSichern, LEER as AktionsErgebnis)
  return (
    // Nach dem Speichern leeren (neuer key), bei einem Fehler vor dem Speichern die Eingabe behalten.
    <form key={ergebnis.stand ?? 'formular'} action={speichern} onReset={eingabenBehalten} className="space-y-3">
      <Feld
        label="Zugangsschlüssel (Access Token)"
        htmlFor="token"
        fehler={ergebnis.felder?.token}
        hinweis={
          verbunden
            ? 'Ist gespeichert (verschlüsselt). Nur ausfüllen, um ihn zu ersetzen – z. B. für ein anderes Konto.'
            : 'Beginnt meist mit „IG“. Er wird bei Instagram geprüft, verschlüsselt gespeichert und nie wieder angezeigt.'
        }
      >
        <input
          id="token"
          name="token"
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={verbunden ? '••••••••  (gespeichert)' : ''}
          className={eingabeKlasse}
        />
      </Feld>
      <SpeichernKnopf>{verbunden ? 'Schlüssel ersetzen' : 'Verbinden'}</SpeichernKnopf>
      {/* Steht der Fehler schon am Feld, nicht noch einmal darunter */}
      {!ergebnis.felder?.token && <FormMeldung ergebnis={ergebnis} />}
    </form>
  )
}

export function AbrufKnopf() {
  const [ergebnis, abrufen] = useActionState(jetztAbrufen, LEER)
  return (
    <form action={abrufen} className="space-y-3">
      <SpeichernKnopf art="sekundaer">
        <RefreshCw size={15} /> Jetzt abrufen
      </SpeichernKnopf>
      <FormMeldung ergebnis={ergebnis} />
    </form>
  )
}

export function TrennenKnopf() {
  const [ergebnis, trennen] = useActionState(verbindungTrennen, LEER)
  return (
    <form action={trennen} className="space-y-3">
      <SpeichernKnopf art="gefahr" bestaetigen="Verbindung zu Instagram trennen? Die Startseite zeigt dann wieder Platzhalterfotos.">
        <Unlink size={15} /> Verbindung trennen
      </SpeichernKnopf>
      <FormMeldung ergebnis={ergebnis} />
    </form>
  )
}
