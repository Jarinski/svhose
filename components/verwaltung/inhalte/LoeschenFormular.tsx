'use client'

/** Löschen-Knopf mit Rückfrage; zeigt eine Fehlermeldung der Server-Aktion an (z. B. fehlende Rechte). */

import { useFormState } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'

export default function LoeschenFormular({
  aktion,
  id,
  frage,
  children,
}: {
  aktion: (vorher: FormErgebnis, formData: FormData) => Promise<FormErgebnis>
  id: number
  /** Rückfrage vor dem Löschen */
  frage: string
  children: React.ReactNode
}) {
  const [ergebnis, absenden] = useFormState(aktion, LEER)
  return (
    <form action={absenden} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMeldung ergebnis={ergebnis} />
      <SpeichernKnopf art="gefahr" bestaetigen={frage}>
        <Trash2 size={15} /> {children}
      </SpeichernKnopf>
    </form>
  )
}
