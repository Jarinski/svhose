'use client'

/** Ein/Aus-Schalter (Checkbox mit Wert "1") mit wechselndem Hinweistext darunter. */

import { useState } from 'react'

export default function Schalter({
  name,
  label,
  standard,
  hinweisAn,
  hinweisAus,
}: {
  name: string
  label: string
  standard: boolean
  hinweisAn: string
  hinweisAus: string
}) {
  const [an, setAn] = useState(standard)
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input type="checkbox" name={name} value="1" checked={an} onChange={e => setAn(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 inline-block h-6 w-11 shrink-0 rounded-full bg-[#0a0a0a]/20 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-[#0a0a0a] after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
      <span>
        <span className="block text-sm font-medium text-[#0a0a0a]">{label}</span>
        <span className={`block text-xs mt-0.5 ${an ? 'text-emerald-800' : 'text-[#6b6b6b]'}`}>{an ? hinweisAn : hinweisAus}</span>
      </span>
    </label>
  )
}
