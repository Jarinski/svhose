'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Contact } from 'lucide-react'

// ─── „Mitglied werden“-Lasche ────────────────────────────────────────────────
// Senkrechte Lasche am rechten Bildschirmrand. Ein Klick schiebt ein Feld mit dem
// Weg zum Aufnahmeantrag heraus. Schließt per Klick daneben, Escape oder Seitenwechsel.
export default function MitgliedWerdenLasche() {
  const [offen, setOffen] = useState(false)
  const rahmen = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOffen(false), [pathname])

  useEffect(() => {
    if (!offen) return
    function beiTaste(e: KeyboardEvent) {
      if (e.key === 'Escape') setOffen(false)
    }
    function beiKlick(e: PointerEvent) {
      if (!rahmen.current?.contains(e.target as Node)) setOffen(false)
    }
    window.addEventListener('keydown', beiTaste)
    document.addEventListener('pointerdown', beiKlick)
    return () => {
      window.removeEventListener('keydown', beiTaste)
      document.removeEventListener('pointerdown', beiKlick)
    }
  }, [offen])

  return (
    <div
      ref={rahmen}
      className={`flex items-stretch transition-transform duration-300 ease-out motion-reduce:transition-none ${
        offen ? 'translate-x-0' : 'translate-x-[calc(100%-2.75rem)]'
      }`}
    >
      <button
        type="button"
        onClick={() => setOffen(o => !o)}
        aria-expanded={offen}
        aria-controls="mitglied-werden-feld"
        className="w-11 shrink-0 bg-[#0a0a0a] text-[#f5f5f0] flex items-center justify-center py-5 hover:bg-[#1a1a1a] transition-colors"
      >
        <span className="flex items-center gap-2 [writing-mode:vertical-rl] rotate-180 text-xs tracking-[0.15em] uppercase font-medium whitespace-nowrap">
          <Contact size={16} className="rotate-90 shrink-0" aria-hidden />
          Mitglied werden!
        </span>
      </button>

      <div
        id="mitglied-werden-feld"
        inert={!offen}
        className="w-[min(26rem,calc(100vw-2.75rem))] bg-[#f5f5f0] border-y border-l-0 border-r-0 border-[#0a0a0a]/10 shadow-xl p-6 sm:p-8"
      >
        <h2 className="font-display text-3xl tracking-tight leading-none mb-3">Werde Mitglied in unserem Sportverein</h2>
        <p className="text-sm text-[#6b6b6b] mb-6">
          Hier geht es zum Aufnahmeantrag und weiteren wichtigen Informationen rund um deine Mitgliedschaft.
        </p>
        <Link
          href="/downloads"
          className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-6 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          Mitglied werden <ArrowRight size={16} className="shrink-0" />
        </Link>
      </div>
    </div>
  )
}
