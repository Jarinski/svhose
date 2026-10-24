'use client'

import { useActionState } from 'react'
import { LEER } from '@/lib/verwaltung/formular'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { Karte } from '@/components/verwaltung/ui'
import { zugangLoeschenAktion, zugangStatusAktion } from '../aktionen'

/** Aktivieren/Deaktivieren und Löschen eines Zugangs. Für den eigenen Zugang gesperrt. */
export default function ZugangStatus({
  id,
  name,
  aktiv,
  sperrGrund,
}: {
  id: number
  name: string
  aktiv: boolean
  /** Warum Deaktivieren/Löschen nicht geht (eigener Zugang, letzter Admin) – oder null. */
  sperrGrund: string | null
}) {
  const [statusErgebnis, statusAktion] = useActionState(zugangStatusAktion, LEER)
  const [loeschErgebnis, loeschAktion] = useActionState(zugangLoeschenAktion, LEER)

  return (
    <>
      <Karte
        titel={aktiv ? 'Zugang deaktivieren' : 'Zugang aktivieren'}
        beschreibung={
          aktiv
            ? 'Sperrt den Zugang sofort: alle Geräte werden abgemeldet, eine offene Einladung wird gelöscht. Rechte, Passwort und Verlauf bleiben erhalten.'
            : 'Der Zugang ist deaktiviert. Nach dem Aktivieren kann sich die Person wieder mit Benutzername, Passwort und App anmelden.'
        }
      >
        <form action={statusAktion} onReset={eingabenBehalten} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="aktiv" value={aktiv ? '0' : '1'} />
          {aktiv && sperrGrund ? (
            <p className="text-sm text-[#6b6b6b]">{sperrGrund}</p>
          ) : (
            <SpeichernKnopf
              art={aktiv ? 'gefahr' : 'primaer'}
              bestaetigen={aktiv ? `Zugang „${name}“ deaktivieren? Alle Geräte werden sofort abgemeldet.` : undefined}
            >
              {aktiv ? 'Zugang deaktivieren' : 'Zugang wieder aktivieren'}
            </SpeichernKnopf>
          )}
          <FormMeldung ergebnis={statusErgebnis} />
        </form>
      </Karte>

      <Karte titel="Zugang löschen" beschreibung="Löscht den Zugang mit allen Geräten, Passwort und App-Kopplung. Im Verlauf bleibt der Name bei früheren Änderungen stehen.">
        <form action={loeschAktion} onReset={eingabenBehalten} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          {sperrGrund ? (
            <p className="text-sm text-[#6b6b6b]">{sperrGrund}</p>
          ) : (
            <SpeichernKnopf art="gefahr" bestaetigen={`Zugang „${name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`}>
              Zugang löschen
            </SpeichernKnopf>
          )}
          <FormMeldung ergebnis={loeschErgebnis} />
        </form>
      </Karte>
    </>
  )
}
