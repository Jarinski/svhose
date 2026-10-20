'use client'

import { useFormState } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { LEER } from '@/lib/verwaltung/formular'
import type { TeamArt } from '@/lib/verwaltung/team-bearbeiten'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { Karte } from '@/components/verwaltung/ui'
import { teamLoeschenAktion } from '../../aktionen'

export default function TeamLoeschen({ art, id, name }: { art: TeamArt; id: number; name: string }) {
  const [ergebnis, aktion] = useFormState(teamLoeschenAktion, LEER)
  const was = art === 'mannschaft' ? 'Mannschaft' : 'Gruppe'
  return (
    <Karte titel={`${was} löschen`}>
      <form action={aktion} className="space-y-4">
        <input type="hidden" name="art" value={art} />
        <input type="hidden" name="id" value={id} />
        <p className="text-sm text-[#4a4a4a] leading-relaxed">
          <strong className="font-medium text-[#0a0a0a]">Lieber ausblenden statt löschen:</strong> Nimm oben den Haken bei „Auf der Website anzeigen“ raus
          und speichere – dann bleiben Trainingszeiten und Trainerteam erhalten und die {was} lässt sich später wieder einblenden.
        </p>
        <p className="text-sm text-[#6b6b6b] leading-relaxed">
          Beim Löschen verschwinden die {was} und ihre Trainingszeiten endgültig. Die Personen im Trainerteam bleiben erhalten.
        </p>
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf
          art="gefahr"
          className="w-full sm:w-auto py-3"
          bestaetigen={`${was} „${name}“ mit allen Trainingszeiten wirklich löschen? Das lässt sich nicht rückgängig machen.`}
        >
          <Trash2 size={15} /> {was} löschen
        </SpeichernKnopf>
      </form>
    </Karte>
  )
}
