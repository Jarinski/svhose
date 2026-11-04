'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** Kopieren ohne Clipboard-API; true, wenn der Browser es ausgeführt hat. */
function altKopieren(text: string): boolean {
  const feld = document.createElement('textarea')
  feld.value = text
  feld.setAttribute('readonly', '')
  feld.style.position = 'fixed'
  feld.style.opacity = '0'
  document.body.appendChild(feld)
  feld.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    feld.remove()
  }
}

// Kleiner Knopf neben IBAN und BIC auf /foerderverein/spenden: legt den Wert in die Zwischenablage.
export default function KopierKnopf({ text, name }: { text: string; name: string }) {
  const [kopiert, setKopiert] = useState(false)

  useEffect(() => {
    if (!kopiert) return
    const t = setTimeout(() => setKopiert(false), 2000)
    return () => clearTimeout(t)
  }, [kopiert])

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text)
      setKopiert(true)
    } catch {
      // Zwischenablage gesperrt (alter Browser, eingebettete Seite, ohne HTTPS): der alte Weg über ein
      // unsichtbares Textfeld. Klappt auch der nicht, bleibt der Wert zum Markieren stehen.
      if (altKopieren(text)) setKopiert(true)
    }
  }

  return (
    <button
      type="button"
      onClick={kopieren}
      className="inline-flex items-center gap-2 border border-[#f5f5f0]/30 px-3 py-1.5 text-[11px] tracking-[0.15em] uppercase hover:border-[#f5f5f0] transition-colors"
    >
      {kopiert ? <Check size={13} className="shrink-0" /> : <Copy size={13} className="shrink-0" />}
      <span aria-live="polite">
        {kopiert ? 'Kopiert' : 'Kopieren'}
        <span className="sr-only"> – {name}</span>
      </span>
    </button>
  )
}
