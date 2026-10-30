/**
 * Bausteine für die Anleitungen unter /verwaltung/hilfe. Ohne Hooks – die Anleitungen sind
 * reine Server-Komponenten. Beschriftungen aus der Oberfläche werden hervorgehoben, damit man
 * sie beim Nachklicken wiedererkennt: <Taste> für Knöpfe, <Begriff> für Menüpunkte, Felder und
 * Überschriften.
 */

import { Children } from 'react'
import { Lightbulb, TriangleAlert } from 'lucide-react'

/** Beschriftung eines Knopfs, z. B. <Taste>Speichern</Taste>. */
export function Taste({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-sm bg-[#0a0a0a] px-1.5 py-px text-[0.85em] font-medium text-[#f5f5f0] whitespace-nowrap">{children}</span>
}

/** Menüpunkt, Feld oder Überschrift aus der Oberfläche, z. B. <Begriff>Personen</Begriff>. */
export function Begriff({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-sm border border-[#0a0a0a]/15 bg-[#0a0a0a]/[0.05] px-1.5 py-px text-[0.85em] font-medium text-[#0a0a0a] whitespace-nowrap">
      {children}
    </span>
  )
}

/** Ein Abschnitt der Anleitung mit Zwischenüberschrift. */
export function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl md:text-3xl tracking-tight leading-none">{titel}</h2>
      {children}
    </section>
  )
}

/** Nummerierte Schritte: Jedes Kind ist ein Schritt, z. B. <Schritte><>Erst …</><>Dann …</></Schritte>. */
export function Schritte({ children }: { children: React.ReactNode }) {
  return (
    <ol className="space-y-3">
      {Children.toArray(children).map((schritt, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-xs font-semibold text-[#f5f5f0]">
            {i + 1}
          </span>
          <div className="min-w-0 pt-px">{schritt}</div>
        </li>
      ))}
    </ol>
  )
}

/** Aufzählung ohne Reihenfolge. */
export function Punkte({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-2 marker:text-[#6b6b6b]">{children}</ul>
}

/** Hervorgehobener Kasten: "tipp" (grün) oder "achtung" (gelb). */
export function Tipp({ art = 'tipp', titel, children }: { art?: 'tipp' | 'achtung'; titel?: string; children: React.ReactNode }) {
  const achtung = art === 'achtung'
  const Symbol = achtung ? TriangleAlert : Lightbulb
  return (
    <div className={`flex gap-3 rounded-sm border px-4 py-3 text-sm leading-relaxed ${achtung ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
      <Symbol size={18} className={`mt-0.5 shrink-0 ${achtung ? 'text-amber-700' : 'text-emerald-700'}`} aria-hidden="true" />
      <div>
        <div className={`text-[11px] tracking-[0.15em] uppercase font-semibold mb-1 ${achtung ? 'text-amber-800' : 'text-emerald-800'}`}>
          {titel ?? (achtung ? 'Achtung' : 'Tipp')}
        </div>
        <div className="text-[#0a0a0a]/85 space-y-2">{children}</div>
      </div>
    </div>
  )
}
