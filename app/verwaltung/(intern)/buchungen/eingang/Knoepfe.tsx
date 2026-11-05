'use client'

import { useActionState } from 'react'
import { RefreshCw } from 'lucide-react'
import { LEER } from '@/lib/verwaltung/formular'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse } from '@/components/verwaltung/ui'
import { jetztAbrufen, nachrichtZuordnen } from '../kontakt-aktionen'

export function AbrufKnopf() {
  const [ergebnis, abrufen] = useActionState(jetztAbrufen, LEER)
  return (
    <form action={abrufen} className="space-y-2">
      <SpeichernKnopf art="sekundaer">
        <RefreshCw size={15} /> Jetzt abrufen
      </SpeichernKnopf>
      <FormMeldung ergebnis={ergebnis} />
    </form>
  )
}

export function ZuordnenFormular({ nachrichtId, vorschlag }: { nachrichtId: number; vorschlag?: string }) {
  const [ergebnis, zuordnen] = useActionState(nachrichtZuordnen, LEER)
  return (
    <form action={zuordnen} onReset={eingabenBehalten} className="space-y-2">
      <input type="hidden" name="nachrichtId" value={nachrichtId} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`nummer-${nachrichtId}`} className="text-sm">
          Buchung
        </label>
        <input
          id={`nummer-${nachrichtId}`}
          name="nummer"
          placeholder="z. B. K7M2-Q9XD"
          defaultValue={vorschlag ?? ''}
          autoComplete="off"
          spellCheck={false}
          className={`${eingabeKlasse} w-40 py-1.5 font-mono uppercase`}
        />
        <SpeichernKnopf art="sekundaer" className="py-1.5">
          Zuordnen
        </SpeichernKnopf>
      </div>
      {!ergebnis.ok && <FormMeldung ergebnis={ergebnis} />}
    </form>
  )
}
