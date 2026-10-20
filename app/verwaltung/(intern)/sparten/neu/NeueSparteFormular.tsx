'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { LEER } from '@/lib/verwaltung/formular'
import { slugify } from '@/lib/verwaltung/text'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse, Feld } from '@/components/verwaltung/ui'
import { sparteAnlegenAktion } from '../aktionen'

export default function NeueSparteFormular() {
  const [ergebnis, aktion] = useFormState(sparteAnlegenAktion, LEER)
  const [name, setName] = useState('')
  const slug = slugify(name)

  return (
    <form action={aktion} className="space-y-5">
      <Feld
        label="Name der Sparte"
        htmlFor="name"
        fehler={ergebnis.felder?.name}
        hinweis={slug ? <>Adresse auf der Website: /sparten/{slug} (wird automatisch vergeben)</> : 'Zum Beispiel „Handball“ oder „Kinderturnen“.'}
      >
        <input id="name" name="name" required autoFocus value={name} onChange={e => setName(e.target.value)} className={eingabeKlasse} />
      </Feld>
      <FormMeldung ergebnis={ergebnis} />
      <SpeichernKnopf>Sparte anlegen</SpeichernKnopf>
    </form>
  )
}
