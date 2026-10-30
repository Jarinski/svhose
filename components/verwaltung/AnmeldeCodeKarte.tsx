'use client'

/**
 * Zeigt einen frisch erstellten Anmelde-Code: QR-Code zum Scannen, Code zum Eintippen,
 * Ablaufzeit und Knöpfe zum Kopieren. Der Code wird nur dieses eine Mal angezeigt.
 */

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { knopfKlassen } from './ui'

export interface AnmeldeCodeDaten {
  name: string
  code: string
  codeAnzeige: string
  link: string
  laeuftAbText: string
  qrSvg: string
}

function KopierKnopf({ text, label }: { text: string; label: string }) {
  const [kopiert, setKopiert] = useState(false)
  return (
    <button
      type="button"
      className={knopfKlassen.sekundaer}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setKopiert(true)
          setTimeout(() => setKopiert(false), 2000)
        } catch {
          window.prompt('Zum Kopieren markieren:', text)
        }
      }}
    >
      {kopiert ? <Check size={15} /> : <Copy size={15} />}
      {kopiert ? 'Kopiert' : label}
    </button>
  )
}

export default function AnmeldeCodeKarte({ daten, hinweis }: { daten: AnmeldeCodeDaten; hinweis?: string }) {
  return (
    <div className="bg-white border border-[#0a0a0a]/10 rounded-sm p-5 md:p-6">
      <div className="text-[11px] tracking-[0.18em] uppercase font-semibold mb-4">Anmelde-Code für {daten.name}</div>
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
        <div
          className="w-52 h-52 shrink-0 self-center sm:self-auto border border-[#0a0a0a]/10 p-2 bg-white [&>svg]:w-full [&>svg]:h-full"
          aria-label="QR-Code zum Anmelden"
          role="img"
          dangerouslySetInnerHTML={{ __html: daten.qrSvg }}
        />
        <div className="space-y-3">
          <div className="font-mono text-2xl md:text-3xl tracking-[0.08em] select-all">{daten.codeAnzeige}</div>
          <div className="text-sm text-[#6b6b6b]">{daten.laeuftAbText} · nur einmal verwendbar</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <KopierKnopf text={daten.link} label="Link kopieren" />
            <KopierKnopf text={daten.codeAnzeige} label="Code kopieren" />
          </div>
        </div>
      </div>
      <p className="mt-5 text-xs text-[#6b6b6b] leading-relaxed">
        {hinweis ??
          'Mit der Handykamera scannen (oder Link öffnen). Am PC: /verwaltung/anmelden aufrufen und den Code eingeben. Dort werden Passwort und Authenticator-App eingerichtet. Nur persönlich oder per Direktnachricht weitergeben – nicht in Gruppen. Der Code wird nicht noch einmal angezeigt.'}
      </p>
    </div>
  )
}
