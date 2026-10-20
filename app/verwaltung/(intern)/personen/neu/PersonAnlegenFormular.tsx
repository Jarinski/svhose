'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { LEER } from '@/lib/verwaltung/formular'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import RollenAuswahl from '@/components/verwaltung/RollenAuswahl'
import { auswahlKlasse, eingabeKlasse, Feld, Karte, Meldung } from '@/components/verwaltung/ui'
import { personAnlegenAktion } from '../aktionen'

export default function PersonAnlegenFormular({
  teams,
  teamPflicht,
  vorauswahl,
  rollen,
}: {
  teams: { wert: string; text: string }[]
  /** Nicht-Admins müssen die Person einer eigenen Mannschaft/Gruppe zuordnen – sonst könnten sie sie danach nicht bearbeiten. */
  teamPflicht: boolean
  vorauswahl: string | null
  rollen: string[]
}) {
  const [ergebnis, aktion] = useFormState(personAnlegenAktion, LEER)
  const felder = ergebnis.felder ?? {}
  const [team, setTeam] = useState(vorauswahl ?? (teamPflicht && teams.length === 1 ? teams[0].wert : ''))
  const [rolle, setRolle] = useState(rollen[0] ?? 'Trainer:in')

  return (
    <Karte>
      <form action={aktion} className="space-y-5 max-w-xl" noValidate>
        <Feld label="Name" htmlFor="name" fehler={felder.name}>
          <input id="name" name="name" required autoFocus maxLength={100} className={eingabeKlasse} autoComplete="off" />
        </Feld>
        <Feld label="Telefon (optional)" htmlFor="telefon" fehler={felder.telefon}>
          <input id="telefon" name="telefon" type="tel" inputMode="tel" maxLength={50} className={eingabeKlasse} autoComplete="off" />
        </Feld>
        <Feld label="E-Mail (optional)" htmlFor="email" fehler={felder.email}>
          <input id="email" name="email" type="email" inputMode="email" maxLength={200} className={eingabeKlasse} autoComplete="off" />
        </Feld>
        <Meldung art="hinweis">Diese Angaben erscheinen öffentlich auf der Website. Bitte nur mit Einverständnis der Person eintragen.</Meldung>

        {teams.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld
              label={teamPflicht ? 'Gehört zu' : 'Gleich eintragen bei (optional)'}
              htmlFor="team"
              fehler={felder.zuordnung}
              hinweis={teamPflicht ? 'Die Person erscheint im Trainerteam dieser Mannschaft bzw. Gruppe.' : undefined}
            >
              <select id="team" name="team" value={team} onChange={e => setTeam(e.target.value)} className={auswahlKlasse}>
                <option value="" disabled={teamPflicht}>
                  {teamPflicht ? '– bitte wählen –' : '– nirgends –'}
                </option>
                {teams.map(t => (
                  <option key={t.wert} value={t.wert}>
                    {t.text}
                  </option>
                ))}
              </select>
            </Feld>
            {team && (
              <Feld label="Rolle" htmlFor="rolle" fehler={felder.rolle}>
                <RollenAuswahl id="rolle" name="rolle" wert={rolle} onChange={setRolle} rollen={rollen} />
              </Feld>
            )}
          </div>
        )}

        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf className="w-full sm:w-auto py-3 px-6">Person anlegen</SpeichernKnopf>
      </form>
    </Karte>
  )
}
