'use client'

import { useFormState } from 'react-dom'
import { LEER } from '@/lib/verwaltung/formular'
import type { TeamArt } from '@/lib/verwaltung/team-bearbeiten'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { auswahlKlasse, eingabeKlasse, Feld, Karte } from '@/components/verwaltung/ui'
import { teamAnlegenAktion } from '../aktionen'

export default function TeamAnlegenFormular({
  art,
  sparten,
  sparteId,
  bereiche,
}: {
  art: TeamArt
  sparten: { id: number; name: string }[]
  sparteId: number | null
  bereiche: string[]
}) {
  const [ergebnis, aktion] = useFormState(teamAnlegenAktion, LEER)
  const felder = ergebnis.felder ?? {}
  const feste = sparteId != null ? sparten.find(s => s.id === sparteId) : sparten.length === 1 ? sparten[0] : undefined

  return (
    <Karte>
      <form action={aktion} className="space-y-5 max-w-xl">
        <input type="hidden" name="art" value={art} />
        {feste ? (
          <>
            <input type="hidden" name="sparteId" value={feste.id} />
            <p className="text-sm">
              Sparte: <span className="font-medium">{feste.name}</span>
            </p>
          </>
        ) : (
          <Feld label="Sparte" htmlFor="sparteId" fehler={felder.sparte}>
            <select id="sparteId" name="sparteId" defaultValue="" required className={auswahlKlasse}>
              <option value="" disabled>
                – Sparte wählen –
              </option>
              {sparten.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Feld>
        )}
        <Feld
          label="Name"
          htmlFor="name"
          fehler={felder.name}
          hinweis={art === 'mannschaft' ? 'z. B. „U13“, „Herren“ oder „2. Damen“' : 'z. B. „Yoga am Abend“ oder „Kinderturnen 3–5 Jahre“'}
        >
          <input id="name" name="name" required autoFocus maxLength={80} className={eingabeKlasse} autoComplete="off" />
        </Feld>
        {art === 'mannschaft' && (
          <Feld label="Bereich" htmlFor="bereich" fehler={felder.bereich} hinweis="Optional – ordnet die Mannschaft auf der Website ein.">
            <select id="bereich" name="bereich" defaultValue="" className={auswahlKlasse}>
              <option value="">– kein Bereich –</option>
              {bereiche.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Feld>
        )}
        <p className="text-sm text-[#6b6b6b]">Trainingszeiten, Trainerteam und Foto trägst du im nächsten Schritt ein.</p>
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf className="w-full sm:w-auto py-3 px-6">{art === 'mannschaft' ? 'Mannschaft anlegen' : 'Gruppe anlegen'}</SpeichernKnopf>
      </form>
    </Karte>
  )
}
