import { DESIGNS, umschaltLink, type Design } from '@/lib/vorschau'

// ─── Umschalter der Design-Vorschau ──────────────────────────────────────────
// Schwebende Leiste unten in der Mitte. Sichtbar nur im Vorschau-Modus; welches Design
// gerade aktiv ist, markiert app/vorschau.css anhand von data-design am <html>-Element.
// Bewusst normale <a>-Links statt next/link: Der Wechsel braucht einen vollen Seitenaufruf,
// damit Cookie, Skript im <head> und Startseite zusammenpassen.
export default function DesignUmschalter({ pfad }: { pfad: string }) {
  const designs = Object.entries(DESIGNS) as [Design, (typeof DESIGNS)[Design]][]

  return (
    <nav className="design-umschalter" aria-label="Design-Vorschau">
      <span className="du-titel">Vorschau</span>
      {designs.map(([design, info]) => (
        <a key={design} href={umschaltLink(design, pfad)} className={`du-link du-${design}`}>
          {design.toUpperCase()} · {info.name}
        </a>
      ))}
      <a href={umschaltLink('aktuell', pfad)} className="du-link du-aktuell">
        Aktuell
      </a>
      <a href={umschaltLink('aus', pfad)} className="du-aus" aria-label="Vorschau beenden" title="Vorschau beenden">
        ×
      </a>
    </nav>
  )
}
