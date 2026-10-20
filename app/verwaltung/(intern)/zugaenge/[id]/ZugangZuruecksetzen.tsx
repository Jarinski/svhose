'use client'

/**
 * "Zugang zurücksetzen": Passwort und Authenticator-App gelten nicht mehr, alle Geräte werden
 * abgemeldet, und es gibt einen neuen Einladungs-Code. Der Code lebt nur im Speicher dieser Seite.
 */

import { useState, useTransition } from 'react'
import { KeyRound, Loader2, RotateCcw } from 'lucide-react'
import AnmeldeCodeKarte, { type AnmeldeCodeDaten } from '@/components/verwaltung/AnmeldeCodeKarte'
import { knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { zugangZuruecksetzenAktion } from '../aktionen'
import { einladungsHinweis } from '../texte'

export default function ZugangZuruecksetzen({
  zugangId,
  name,
  aktiv,
  eingerichtet,
  anzahlGeraete,
  istSelbst,
  offenBis,
}: {
  zugangId: number
  name: string
  aktiv: boolean
  /** Hat die Person Passwort und App schon eingerichtet? */
  eingerichtet: boolean
  anzahlGeraete: number
  istSelbst: boolean
  /** Ablauf einer noch offenen Einladung (lesbar) – oder null. */
  offenBis: string | null
}) {
  const [daten, setDaten] = useState<AnmeldeCodeDaten | null>(null)
  const [selbstAbgemeldet, setSelbstAbgemeldet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()

  if (daten) {
    return (
      <div className="space-y-4">
        {selbstAbgemeldet && (
          <Meldung art="hinweis">
            Du bist jetzt auch auf diesem Gerät abgemeldet. Scanne den QR-Code mit dem Handy (oder öffne den Link), um Passwort und App neu einzurichten. Erst
            danach weiterklicken – der Code wird nicht noch einmal angezeigt.
          </Meldung>
        )}
        <AnmeldeCodeKarte daten={daten} hinweis={einladungsHinweis(name)} />
        {selbstAbgemeldet ? (
          <a href="/verwaltung/login" className={knopfKlassen.sekundaer}>
            Zur Anmeldung
          </a>
        ) : (
          <button type="button" className={knopfKlassen.leise} onClick={() => setDaten(null)}>
            Code ausblenden
          </button>
        )}
      </div>
    )
  }

  // Ohne Einrichtung und ohne Geräte gibt es nichts zurückzusetzen – dann nur neue Einladung.
  const echtesZuruecksetzen = eingerichtet || anzahlGeraete > 0
  let rueckfrage: string | null = null
  if (echtesZuruecksetzen) {
    rueckfrage = `Zugang „${name}“ zurücksetzen?\n\nAlle Geräte werden sofort abgemeldet, das alte Passwort und die App-Kopplung gelten nicht mehr.`
    if (istSelbst) rueckfrage += '\n\nDas ist dein eigener Zugang – du wirst dabei auch auf diesem Gerät abgemeldet.'
  } else if (offenBis) {
    rueckfrage = `Neuen Einladungs-Code erstellen? Die bisherige Einladung (gültig bis ${offenBis} Uhr) funktioniert dann nicht mehr.`
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#6b6b6b] leading-relaxed">
        {echtesZuruecksetzen
          ? 'Passwort vergessen, Handy mit der Authenticator-App verloren oder gewechselt? Nach dem Zurücksetzen richtet die Person beides über einen neuen Einladungs-Code neu ein.'
          : 'Die Einladung ist verloren gegangen oder abgelaufen? Hier gibt es einen neuen Einladungs-Code.'}
        {offenBis && <> Die noch offene Einladung (gültig bis {offenBis} Uhr) wird dabei ungültig.</>}
      </p>
      {!aktiv && <Meldung art="hinweis">Der Zugang ist deaktiviert. Bitte zuerst wieder aktivieren.</Meldung>}
      {fehler && <Meldung art="fehler">{fehler}</Meldung>}
      <button
        type="button"
        className={echtesZuruecksetzen ? knopfKlassen.gefahr : knopfKlassen.primaer}
        disabled={laeuft || !aktiv}
        onClick={() => {
          if (rueckfrage && !window.confirm(rueckfrage)) return
          starten(async () => {
            setFehler(null)
            const ergebnis = await zugangZuruecksetzenAktion(zugangId)
            if (ergebnis.daten) {
              setSelbstAbgemeldet(!!ergebnis.selbstAbgemeldet)
              setDaten(ergebnis.daten)
            } else {
              setFehler(ergebnis.fehler ?? 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.')
            }
          })
        }}
      >
        {laeuft ? <Loader2 size={15} className="animate-spin" /> : echtesZuruecksetzen ? <RotateCcw size={15} /> : <KeyRound size={15} />}
        {echtesZuruecksetzen ? 'Zugang zurücksetzen (Passwort & App neu einrichten)' : 'Neuen Einladungs-Code erstellen'}
      </button>
    </div>
  )
}
