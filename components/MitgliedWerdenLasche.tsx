'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Contact } from 'lucide-react'
import GlasEbenen from './glas/GlasEbenen'
import b from './vorschau/b/bento.module.css'
import s from './SeitenLeiste.module.css'

// ─── „Mitglied werden“-Lasche ────────────────────────────────────────────────
// Senkrechte Lasche am rechten Bildschirmrand. Ein Klick schiebt ein Glasfeld mit dem
// Weg zum Aufnahmeantrag heraus. Schließt per Klick daneben, Escape oder Seitenwechsel.
// Gestaltung in SeitenLeiste.module.css.
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
    <div ref={rahmen} className={s.lasche} data-offen={offen ? '' : undefined}>
      <button
        type="button"
        onClick={() => setOffen(o => !o)}
        aria-expanded={offen}
        aria-controls="mitglied-werden-feld"
        className={s.reiter}
      >
        <span className={s.reiterText}>
          <Contact size={16} aria-hidden />
          Mitglied werden!
        </span>
      </button>

      <div id="mitglied-werden-feld" inert={!offen} className={s.feld}>
        <GlasEbenen band={9} staerke={8} unschaerfe="stark" />
        <div className={s.feldInhalt}>
          <h2 className="font-display text-3xl tracking-tight leading-none">Werde Mitglied in unserem Sportverein</h2>
          <p>Hier geht es zum Aufnahmeantrag und weiteren wichtigen Informationen rund um deine Mitgliedschaft.</p>
          <Link href="/downloads" className={`${b.btn} ${b.btnDunkel}`}>
            Mitglied werden <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  )
}
