'use client'

/**
 * Sicherheitsprüfung im Anfrageformular: holt eine Rechenaufgabe vom Server, löst sie im
 * Hintergrund (SHA-256 per Web Crypto, etwa eine Sekunde) und legt die Lösung in ein verstecktes
 * Feld „captcha“. Mit `runde` startet sie neu – nötig nach jedem Absenden, denn jede Lösung gilt nur
 * einmal.
 */

import { useEffect, useState } from 'react'
import { Check, Loader2, ShieldAlert } from 'lucide-react'
import { captchaHolen } from './captcha-aktion'

type Zustand = { art: 'rechnet' } | { art: 'fertig'; wert: string } | { art: 'fehler'; text: string }

async function loesen(salt: string, aufgabe: string, max: number, abgebrochen: () => boolean): Promise<number | null> {
  const kodierer = new TextEncoder()
  for (let n = 0; n < max; n++) {
    const hash = await crypto.subtle.digest('SHA-256', kodierer.encode(salt + n))
    let hex = ''
    for (const b of new Uint8Array(hash)) hex += b.toString(16).padStart(2, '0')
    if (hex === aufgabe) return n
    // Ab und zu Luft holen, damit die Seite bedienbar bleibt
    if (n % 2000 === 1999) {
      await new Promise(r => setTimeout(r, 0))
      if (abgebrochen()) return null
    }
  }
  return null
}

export default function Captcha({ runde }: { runde: number }) {
  const [zustand, setZustand] = useState<Zustand>({ art: 'rechnet' })

  useEffect(() => {
    let abgebrochen = false
    setZustand({ art: 'rechnet' })
    ;(async () => {
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        setZustand({ art: 'fehler', text: 'Dein Browser kann die Sicherheitsprüfung nicht rechnen. Bitte einen aktuellen Browser nehmen oder uns eine E-Mail schreiben.' })
        return
      }
      try {
        const a = await captchaHolen()
        const zahl = await loesen(a.salt, a.aufgabe, a.max, () => abgebrochen)
        if (abgebrochen) return
        if (zahl == null) throw new Error('nicht gefunden')
        setZustand({ art: 'fertig', wert: JSON.stringify({ salt: a.salt, aufgabe: a.aufgabe, signatur: a.signatur, zahl }) })
      } catch {
        if (!abgebrochen) setZustand({ art: 'fehler', text: 'Die Sicherheitsprüfung hat nicht geklappt. Bitte die Seite neu laden.' })
      }
    })()
    return () => {
      abgebrochen = true
    }
  }, [runde])

  return (
    <span className="inline-flex items-center gap-2 text-xs text-[#6b6b6b]" aria-live="polite">
      <input type="hidden" name="captcha" value={zustand.art === 'fertig' ? zustand.wert : ''} />
      {zustand.art === 'rechnet' && (
        <>
          <Loader2 size={13} className="animate-spin" /> Sicherheitsprüfung läuft …
        </>
      )}
      {zustand.art === 'fertig' && (
        <>
          <Check size={13} className="text-emerald-700" /> Sicherheitsprüfung abgeschlossen
        </>
      )}
      {zustand.art === 'fehler' && (
        <>
          <ShieldAlert size={13} className="text-red-700" /> <span className="text-red-700">{zustand.text}</span>
        </>
      )}
    </span>
  )
}

/** Ist die Prüfung durch? (für den Absenden-Knopf) */
export function captchaBereit(form: HTMLFormElement | null): boolean {
  const feld = form?.elements.namedItem('captcha')
  return feld instanceof HTMLInputElement && feld.value !== ''
}
