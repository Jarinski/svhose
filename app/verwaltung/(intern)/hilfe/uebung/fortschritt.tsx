'use client'

/**
 * Welche Übungen schon geschafft sind – nur im Browser gemerkt (localStorage), als kleine
 * Bequemlichkeit für die Kacheln. Fehlt der Speicher (privates Fenster), geht nichts kaputt.
 */

import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'

const SCHLUESSEL = 'svhs-hilfe-erledigt'

function lesen(): string[] {
  try {
    const wert = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '[]')
    return Array.isArray(wert) ? wert.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

export function erledigtMerken(slug: string): void {
  try {
    const liste = lesen()
    if (!liste.includes(slug)) localStorage.setItem(SCHLUESSEL, JSON.stringify(liste.concat(slug)))
  } catch {
    // ohne Speicher eben ohne Haken
  }
}

/** Haken "Geschafft" auf der Kachel – erst nach dem Laden im Browser, damit nichts springt. */
export function ErledigtHaken({ slug }: { slug: string }) {
  const [erledigt, setErledigt] = useState(false)
  useEffect(() => setErledigt(lesen().includes(slug)), [slug])
  if (!erledigt) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
      <CircleCheck size={14} aria-hidden="true" /> Geschafft
    </span>
  )
}
