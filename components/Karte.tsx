'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import { externeInhalteErlaubt } from '@/components/CookieBanner'

// OpenStreetMap-Karte mit einer Markierung. Die Karte kommt von openstreetmap.org und wird erst
// geladen, wenn "Funktionale Cookies" erlaubt sind oder jemand auf "Karte laden" klickt – vorher
// geht keine Anfrage an einen Dritten raus.

// Halbe Breite und Höhe des Kartenausschnitts in Grad bei Zoom 18 (insgesamt ca. 235 m × 155 m);
// jede Zoomstufe weniger verdoppelt den Ausschnitt.
const HALB_LON = 0.00175
const HALB_LAT = 0.0007

export default function Karte({ name, lat, lon, zoom = 18 }: { name: string; lat: number; lon: number; zoom?: number }) {
  const [erlaubt, setErlaubt] = useState(false)
  const [geladen, setGeladen] = useState(false)

  useEffect(() => {
    setErlaubt(externeInhalteErlaubt())
    // Wird die Einwilligung geändert, auch eine per Klick geladene Karte wieder zumachen
    function beiAenderung() {
      setErlaubt(externeInhalteErlaubt())
      setGeladen(false)
    }
    window.addEventListener('svhose:consent-updated', beiAenderung)
    return () => window.removeEventListener('svhose:consent-updated', beiAenderung)
  }, [])

  const faktor = 2 ** (18 - zoom)
  const dLon = HALB_LON * faktor
  const dLat = HALB_LAT * faktor
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map(w => w.toFixed(5)).join(',')
  const einbettung = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
  const gross = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`

  return (
    <figure className="m-0">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-[#0a0a0a]/[0.04] ring-1 ring-[#0a0a0a]/[0.06]">
        {erlaubt || geladen ? (
          <iframe
            src={einbettung}
            title={`Karte: ${name}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <MapPin size={20} className="text-[#6b6b6b]" aria-hidden="true" />
            <p className="max-w-sm text-xs leading-relaxed text-[#6b6b6b]">
              Die Karte kommt von OpenStreetMap. Beim Laden wird deine IP-Adresse an den Anbieter übertragen.
            </p>
            <button
              type="button"
              onClick={() => setGeladen(true)}
              className="border border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2 text-xs font-medium uppercase tracking-[0.1em] text-[#f5f5f0] transition-colors hover:bg-transparent hover:text-[#0a0a0a]"
            >
              Karte laden
            </button>
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-[#6b6b6b]">
        <a
          href={gross}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-2 transition-colors hover:text-[#0a0a0a]"
        >
          Größere Karte öffnen <ExternalLink size={11} aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  )
}
