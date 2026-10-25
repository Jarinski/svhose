import { DESIGNS, umschaltLink, type Design } from '@/lib/vorschau'

// ─── Umschalter der Design-Vorschau ──────────────────────────────────────────
// Leiste ganz oben auf jeder Seite der Website – für die Präsentation immer sichtbar, auch
// ohne eingeschaltete Vorschau. Welches Design gerade aktiv ist, markiert app/vorschau.css
// anhand von data-design am <html>-Element ("Aktuell", wenn es fehlt).
// Bewusst normale <a>-Links statt next/link: Der Wechsel braucht einen vollen Seitenaufruf,
// damit Cookie, Skript im <head> und Startseite zusammenpassen.
export default function DesignUmschalter({ pfad }: { pfad: string }) {
  const designs = Object.entries(DESIGNS) as [Design, (typeof DESIGNS)[Design]][]

  return (
    <nav className="design-umschalter" aria-label="Design wechseln">
      <span className="du-titel">Design</span>
      {/* "Aktuell" beendet die Vorschau – dann sieht die Seite aus wie für alle anderen */}
      <a href={umschaltLink('aus', pfad)} className="du-link du-aktuell">
        Aktuell
      </a>
      {designs.map(([design, info]) => (
        <a key={design} href={umschaltLink(design, pfad)} className={`du-link du-${design}`}>
          {design.toUpperCase()} · {info.name}
        </a>
      ))}
    </nav>
  )
}
