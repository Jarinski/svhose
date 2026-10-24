'use client'

import { useActionState } from 'react'
import { LEER } from '@/lib/verwaltung/formular'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { Karte, Meldung } from '@/components/verwaltung/ui'
import { sparteLoeschenAktion } from '../aktionen'

export default function SparteLoeschen({ id, name, teams, cronHinweis }: { id: number; name: string; teams: string | null; cronHinweis?: string }) {
  const [ergebnis, aktion] = useActionState(sparteLoeschenAktion, LEER)
  let rueckfrage = `Sparte „${name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.\n\nNews, Termine und Downloads der Sparte bleiben erhalten, gehören dann aber zu keiner Sparte mehr.`
  if (cronHinweis) rueckfrage += `\n\nACHTUNG: Ohne diese Sparte funktioniert ${cronHinweis} nicht mehr!`

  return (
    <Karte titel="Sparte löschen" beschreibung="Nur für Admins.">
      <form action={aktion} onReset={eingabenBehalten} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        {teams ? (
          <Meldung art="hinweis">
            Die Sparte hat noch {teams}. Erst wenn diese gelöscht oder einer anderen Sparte zugeordnet sind, lässt sich die Sparte löschen.
          </Meldung>
        ) : (
          <p className="text-sm text-[#6b6b6b]">
            Ansprechpartner:innen-Zuordnungen und Zugangsrechte für diese Sparte werden mit gelöscht. Die Personen selbst bleiben erhalten.
          </p>
        )}
        <FormMeldung ergebnis={ergebnis} />
        {!teams && (
          <SpeichernKnopf art="gefahr" bestaetigen={rueckfrage}>
            Sparte löschen
          </SpeichernKnopf>
        )}
      </form>
    </Karte>
  )
}
