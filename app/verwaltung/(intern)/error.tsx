'use client'

/**
 * Auffangnetz für unerwartete Fehler in der Verwaltung, z. B. eine Anfrage über 16 MB oder ein
 * Formular, das nach einem Update des Servers noch abgeschickt wird. Ohne diese Datei zeigt
 * Next.js eine englische Fehlerseite ohne Navigation.
 */

import Link from 'next/link'
import { RotateCw } from 'lucide-react'
import { knopfKlassen, Meldung, Seitenkopf } from '@/components/verwaltung/ui'

export default function Fehler({ error }: { error: Error & { digest?: string } }) {
  return (
    <>
      <Seitenkopf titel="Das hat nicht geklappt" />
      <div className="space-y-6 max-w-2xl">
        <Meldung art="fehler">
          Beim Laden oder Speichern ist ein unerwarteter Fehler passiert. Eingaben, die noch nicht gespeichert waren, sind leider verloren.
          Bitte die Seite neu laden und es noch einmal versuchen. Bei Bildern und PDFs: höchstens 15 MB pro Datei.
        </Meldung>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={knopfKlassen.primaer} onClick={() => window.location.reload()}>
            <RotateCw size={15} /> Seite neu laden
          </button>
          <Link href="/verwaltung" className={knopfKlassen.sekundaer}>
            Zur Übersicht
          </Link>
        </div>
        {error.digest && <p className="text-xs text-[#6b6b6b]">Fehlernummer für die Technik: {error.digest}</p>}
      </div>
    </>
  )
}
