'use client'

import { useActionState } from 'react'
import { Trash2 } from 'lucide-react'
import { LEER } from '@/lib/verwaltung/formular'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { Karte } from '@/components/verwaltung/ui'
import { personLoeschenAktion } from '../aktionen'

export default function PersonLoeschen({ id, name, verwendung }: { id: number; name: string; verwendung: string[] }) {
  const [ergebnis, aktion] = useActionState(personLoeschenAktion, LEER)
  const rueckfrage = verwendung.length
    ? `„${name}“ wirklich löschen? Die Person wird dabei auch an ${verwendung.length} Stelle${verwendung.length === 1 ? '' : 'n'} entfernt:\n\n– ${verwendung.join('\n– ')}\n\nDas lässt sich nicht rückgängig machen.`
    : `„${name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`

  return (
    <Karte titel="Person löschen">
      <form action={aktion} onReset={eingabenBehalten} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        {verwendung.length > 0 ? (
          <div className="text-sm text-[#4a4a4a] leading-relaxed">
            <p>Die Person ist noch eingetragen. Beim Löschen wird sie überall entfernt:</p>
            <ul className="mt-2 list-disc pl-5 space-y-0.5">
              {verwendung.map(v => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-[#4a4a4a]">Die Person ist nirgends eingetragen und kann gefahrlos gelöscht werden.</p>
        )}
        <p className="text-sm text-[#6b6b6b]">Ein vorhandenes Foto wird dabei ebenfalls gelöscht.</p>
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf art="gefahr" className="w-full sm:w-auto py-3" bestaetigen={rueckfrage}>
          <Trash2 size={15} /> Person löschen
        </SpeichernKnopf>
      </form>
    </Karte>
  )
}
