'use client'

/**
 * Formular-Bausteine mit Client-Logik: Speichern-Knopf mit Ladezustand und Rückmeldung
 * aus der Server-Aktion (useActionState-Ergebnis).
 */

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { FormErgebnis } from '@/lib/verwaltung/formular'
import { knopfKlassen, Meldung } from './ui'

/**
 * Für onReset an Formularen mit Server-Aktion: React 19 setzt solche Formulare nach jedem Absenden
 * zurück – bei einer Fehlermeldung wären die Eingaben dann weg. Formulare, die nach dem Speichern
 * leer sein sollen, bekommen stattdessen einen neuen key.
 */
export function eingabenBehalten(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
}

export function SpeichernKnopf({
  children = 'Speichern',
  art = 'primaer',
  className = '',
  name,
  value,
  bestaetigen,
}: {
  children?: React.ReactNode
  art?: keyof typeof knopfKlassen
  className?: string
  name?: string
  value?: string
  /** Rückfrage vor dem Absenden, z. B. beim Löschen. */
  bestaetigen?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`${knopfKlassen[art]} ${className}`}
      onClick={e => {
        if (bestaetigen && !window.confirm(bestaetigen)) e.preventDefault()
      }}
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}

export function FormMeldung({ ergebnis }: { ergebnis: FormErgebnis }) {
  if (!ergebnis.meldung) return null
  return <Meldung art={ergebnis.ok ? 'erfolg' : 'fehler'}>{ergebnis.meldung}</Meldung>
}
