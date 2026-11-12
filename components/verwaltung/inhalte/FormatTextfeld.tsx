'use client'

/**
 * Textfeld mit Formatierungsleiste: fett, kursiv, drei Überschriftsgrößen, größere und kleinere Schrift,
 * Aufzählung, Nummerierung, Zitat und Link. Gespeichert wird weiter reiner Markdown-Text – die Leiste
 * schreibt nur die Zeichen ins Feld, die man sonst von Hand tippen müsste (**fett**, ## Überschrift …).
 * Die Darstellung auf der Website liefert components/MarkdownText, damit Vorschau und Seite übereinstimmen.
 *
 * Schriftgröße kennt Markdown nicht. Sie steckt deshalb in einem Link auf eine Pseudo-Adresse
 * ([Text](#gross) bzw. [Text](#klein)); MarkdownText macht daraus einen Text in anderer Größe.
 *
 * Die Umformungen (umschliessen, zeilenPraefix, …) sind reine Funktionen auf (Text, Auswahl) und kennen
 * das Textfeld nicht; nur FormatTextfeld liest und setzt Auswahl und Fokus.
 */

import { useLayoutEffect, useRef } from 'react'
import { Bold, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react'
import { GROESSE_GROSS, GROESSE_KLEIN } from '@/components/MarkdownText'
import { eingabeKlasse } from '@/components/verwaltung/ui'

/** Auswahl im Textfeld: start/ende als Zeichenstellen (ende = hinter dem letzten markierten Zeichen). */
interface Stand {
  text: string
  start: number
  ende: number
}

// ─── Umformungen ────────────────────────────────────────────────────────────

/** Leerzeichen am Rand der Markierung ausnehmen – "** wort**" würde Markdown nicht als fett lesen. */
function ohneRandLeerzeichen({ text, start, ende }: Stand): Stand {
  while (start < ende && /\s/.test(text[start])) start++
  while (ende > start && /\s/.test(text[ende - 1])) ende--
  return { text, start, ende }
}

/** Wie viele gleiche Zeichen stehen direkt vor `von` (rückwärts) bzw. ab `von` (vorwärts)? */
function zaehle(text: string, von: number, zeichen: string, rueckwaerts: boolean): number {
  let n = 0
  while (rueckwaerts ? text[von - 1 - n] === zeichen : text[von + n] === zeichen) n++
  return n
}

/**
 * Fett (**) bzw. kursiv (*) setzen oder wieder entfernen. Sternchen werden gezählt statt verglichen:
 * "***x***" ist fett UND kursiv, "**x**" nur fett – so schaltet man beides unabhängig voneinander um.
 */
function sternchen(stand: Stand, laenge: 1 | 2, platzhalter: string): Stand {
  const s = ohneRandLeerzeichen(stand)
  const { text } = s
  if (s.start === s.ende) {
    const einsatz = '*'.repeat(laenge)
    const neu = text.slice(0, s.start) + einsatz + platzhalter + einsatz + text.slice(s.ende)
    return { text: neu, start: s.start + laenge, ende: s.start + laenge + platzhalter.length }
  }
  const davor = zaehle(text, s.start, '*', true)
  const danach = zaehle(text, s.ende, '*', false)
  const paar = Math.min(davor, danach)
  // Fett steckt in den Sternchen, wenn mindestens zwei auf jeder Seite stehen; kursiv, wenn die Anzahl ungerade ist.
  const vorhanden = laenge === 2 ? paar >= 2 : paar % 2 === 1
  if (vorhanden) {
    const neu = text.slice(0, s.start - laenge) + text.slice(s.start, s.ende) + text.slice(s.ende + laenge)
    return { text: neu, start: s.start - laenge, ende: s.ende - laenge }
  }
  const einsatz = '*'.repeat(laenge)
  const neu = text.slice(0, s.start) + einsatz + text.slice(s.start, s.ende) + einsatz + text.slice(s.ende)
  return { text: neu, start: s.start + laenge, ende: s.ende + laenge }
}

/** Markierten Text in einen Link auf die Pseudo-Adresse einer Schriftgröße setzen, wechseln oder zurücknehmen. */
function groesse(stand: Stand, adresse: string, platzhalter: string): Stand {
  const s = ohneRandLeerzeichen(stand)
  const { text } = s
  const alleAdressen = [GROESSE_GROSS, GROESSE_KLEIN]
  // Schon in einer Größe? Der Text steht dann zwischen "[" und "](#gross)" bzw. "](#klein)".
  for (const a of alleAdressen) {
    const nach = `](${a})`
    if (text[s.start - 1] === '[' && text.slice(s.ende, s.ende + nach.length) === nach) {
      const ohne = text.slice(0, s.start - 1) + text.slice(s.start, s.ende) + text.slice(s.ende + nach.length)
      if (a === adresse) return { text: ohne, start: s.start - 1, ende: s.ende - 1 }
      // andere Größe gewünscht: erst entpacken, dann neu einpacken
      return groesse({ text: ohne, start: s.start - 1, ende: s.ende - 1 }, adresse, platzhalter)
    }
  }
  const inhalt = s.start === s.ende ? platzhalter : text.slice(s.start, s.ende)
  const neu = `${text.slice(0, s.start)}[${inhalt}](${adresse})${text.slice(s.ende)}`
  return { text: neu, start: s.start + 1, ende: s.start + 1 + inhalt.length }
}

/** Link setzen: Markierung wird Linktext (oder, wenn sie eine Adresse ist, die Adresse), der Rest zum Ausfüllen markiert. */
function verlinken(stand: Stand): Stand {
  const s = ohneRandLeerzeichen(stand)
  const { text } = s
  const markiert = text.slice(s.start, s.ende)
  if (/^https?:\/\/\S+$/i.test(markiert)) {
    const neu = `${text.slice(0, s.start)}[Linktext](${markiert})${text.slice(s.ende)}`
    return { text: neu, start: s.start + 1, ende: s.start + 1 + 'Linktext'.length }
  }
  const linktext = markiert || 'Linktext'
  const adresse = 'https://'
  const neu = `${text.slice(0, s.start)}[${linktext}](${adresse})${text.slice(s.ende)}`
  // Ohne Markierung steht der Linktext zum Überschreiben bereit, mit Markierung die Adresse
  if (!markiert) return { text: neu, start: s.start + 1, ende: s.start + 1 + linktext.length }
  const adressStart = s.start + 1 + linktext.length + 2
  return { text: neu, start: adressStart, ende: adressStart + adresse.length }
}

type ZeilenArt = { art: 'ueberschrift'; stufe: 2 | 3 | 4 } | { art: 'aufzaehlung' } | { art: 'nummern' } | { art: 'zitat' }

const ZEILEN_MARKE = /^(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/

function marke(art: ZeilenArt, nummer: number): string {
  switch (art.art) {
    case 'ueberschrift':
      return `${'#'.repeat(art.stufe)} `
    case 'aufzaehlung':
      return '- '
    case 'nummern':
      return `${nummer}. `
    case 'zitat':
      return '> '
  }
}

/**
 * Alle Zeilen der Markierung als Überschrift, Aufzählung, Nummerierung oder Zitat – oder, wenn sie schon
 * so aussehen, wieder als normaler Text. Eine andere Zeilenart wird ersetzt, nicht aufgestapelt.
 */
function zeilenPraefix({ text, start, ende }: Stand, art: ZeilenArt): Stand {
  const zeilenStart = text.lastIndexOf('\n', start - 1) + 1
  // Endet die Markierung genau am Zeilenumbruch, gehört die nächste Zeile nicht mehr dazu
  const bis = ende > start && text[ende - 1] === '\n' ? ende - 1 : ende
  const naechster = text.indexOf('\n', bis)
  const zeilenEnde = naechster === -1 ? text.length : naechster
  const zeilen = text.slice(zeilenStart, zeilenEnde).split('\n')

  // Leere Zeilen bleiben leer (Absatztrenner) und zählen nicht mit
  const belegt = zeilen.filter(z => z.trim() !== '')
  const gleich = belegt.length > 0 && belegt.every(z => exakteMarke(z, art) !== undefined)
  let nummer = 0
  const neu = zeilen
    .map(z => {
      if (z.trim() === '' && zeilen.length > 1) return z
      const ohne = z.replace(ZEILEN_MARKE, '')
      if (gleich) return ohne
      return marke(art, ++nummer) + ohne
    })
    .join('\n')
  return { text: text.slice(0, zeilenStart) + neu + text.slice(zeilenEnde), start: zeilenStart, ende: zeilenStart + neu.length }
}

/** Die Marke am Zeilenanfang so, wie `art` sie setzen würde – zum Erkennen, ob die Zeile schon so formatiert ist. */
function exakteMarke(zeile: string, art: ZeilenArt): string | undefined {
  const m = ZEILEN_MARKE.exec(zeile)?.[0]
  if (!m) return undefined
  switch (art.art) {
    case 'ueberschrift':
      return m === `${'#'.repeat(art.stufe)} ` ? m : undefined
    case 'aufzaehlung':
      return /^[-*+]\s+$/.test(m) ? m : undefined
    case 'nummern':
      return /^\d+\.\s+$/.test(m) ? m : undefined
    case 'zitat':
      return /^>\s?$/.test(m) ? m : undefined
  }
}

// ─── Leiste ─────────────────────────────────────────────────────────────────

interface Werkzeug {
  name: string
  icon: React.ComponentType<{ size?: number }>
  titel: string
  anwenden: (s: Stand) => Stand
}

const GRUPPEN: Werkzeug[][] = [
  [
    { name: 'fett', icon: Bold, titel: 'Fett (Strg+B)', anwenden: s => sternchen(s, 2, 'fetter Text') },
    { name: 'kursiv', icon: Italic, titel: 'Kursiv (Strg+I)', anwenden: s => sternchen(s, 1, 'kursiver Text') },
  ],
  [
    { name: 'ueberschrift-gross', icon: Heading1, titel: 'Große Überschrift', anwenden: s => zeilenPraefix(s, { art: 'ueberschrift', stufe: 2 }) },
    { name: 'ueberschrift-mittel', icon: Heading2, titel: 'Mittlere Überschrift', anwenden: s => zeilenPraefix(s, { art: 'ueberschrift', stufe: 3 }) },
    { name: 'ueberschrift-klein', icon: Heading3, titel: 'Kleine Überschrift', anwenden: s => zeilenPraefix(s, { art: 'ueberschrift', stufe: 4 }) },
  ],
  [
    { name: 'schrift-groesser', icon: SchriftGroesser, titel: 'Größere Schrift', anwenden: s => groesse(s, GROESSE_GROSS, 'größerer Text') },
    { name: 'schrift-kleiner', icon: SchriftKleiner, titel: 'Kleinere Schrift', anwenden: s => groesse(s, GROESSE_KLEIN, 'kleinerer Text') },
  ],
  [
    { name: 'aufzaehlung', icon: List, titel: 'Aufzählung', anwenden: s => zeilenPraefix(s, { art: 'aufzaehlung' }) },
    { name: 'nummern', icon: ListOrdered, titel: 'Nummerierte Liste', anwenden: s => zeilenPraefix(s, { art: 'nummern' }) },
    { name: 'zitat', icon: Quote, titel: 'Zitat', anwenden: s => zeilenPraefix(s, { art: 'zitat' }) },
  ],
  [{ name: 'link', icon: Link2, titel: 'Link (Strg+K)', anwenden: verlinken }],
]

/** Ein großes und ein kleines "A" als Symbol für Schriftgröße – lucide hat keins, das klar zwischen größer und kleiner unterscheidet. */
function SchriftGroesser({ size = 16 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 19 9 5l6 14M5.2 14h7.6" />
      <path d="M19 6v6M16 9h6" />
    </svg>
  )
}
function SchriftKleiner({ size = 16 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 19 9 5l6 14M5.2 14h7.6" />
      <path d="M16 9h6" />
    </svg>
  )
}

const KNOPF =
  'inline-flex items-center justify-center w-9 h-9 rounded-sm text-[#4a4a4a] hover:bg-[#0a0a0a]/[0.07] hover:text-[#0a0a0a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]'

export default function FormatTextfeld({
  id,
  wert,
  onAendern,
  zeilen = 8,
  hinweis,
}: {
  id: string
  wert: string
  onAendern: (wert: string) => void
  zeilen?: number
  hinweis?: React.ReactNode
}) {
  const feld = useRef<HTMLTextAreaElement>(null)
  /** Auswahl, die nach dem nächsten Rendern wiederhergestellt wird (React setzt sonst den Cursor ans Ende). */
  const danach = useRef<{ start: number; ende: number } | null>(null)

  useLayoutEffect(() => {
    const auswahl = danach.current
    const t = feld.current
    if (!auswahl || !t) return
    danach.current = null
    t.focus()
    t.setSelectionRange(auswahl.start, auswahl.ende)
  }, [wert])

  function anwenden(w: Werkzeug) {
    const t = feld.current
    if (!t) return
    const neu = w.anwenden({ text: t.value, start: t.selectionStart, ende: t.selectionEnd })
    danach.current = { start: neu.start, ende: neu.ende }
    if (neu.text === t.value) {
      t.focus()
      t.setSelectionRange(neu.start, neu.ende)
      return
    }
    onAendern(neu.text)
  }

  function taste(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return
    const name = e.key === 'b' ? 'fett' : e.key === 'i' ? 'kursiv' : e.key === 'k' ? 'link' : null
    const w = GRUPPEN.flat().find(x => x.name === name)
    if (!w) return
    e.preventDefault()
    anwenden(w)
  }

  return (
    <div>
      <div role="toolbar" aria-label="Textformatierung" aria-controls={id} className="flex flex-wrap items-center gap-x-1 gap-y-0.5 border border-b-0 border-[#0a0a0a]/20 rounded-t-sm bg-[#fafaf7] px-1.5 py-1">
        {GRUPPEN.map((gruppe, g) => (
          <div key={g} className={`flex items-center gap-0.5 ${g > 0 ? 'pl-1.5 ml-0.5 border-l border-[#0a0a0a]/15' : ''}`}>
            {gruppe.map(w => (
              <button
                key={w.name}
                type="button"
                className={KNOPF}
                title={w.titel}
                aria-label={w.titel.replace(/ \(Strg\+\w\)/, '')}
                // Der Fokus soll im Textfeld bleiben, sonst verschwindet die Markierung
                onMouseDown={e => e.preventDefault()}
                onClick={() => anwenden(w)}
              >
                <w.icon size={16} />
              </button>
            ))}
          </div>
        ))}
      </div>
      <textarea
        ref={feld}
        id={id}
        rows={zeilen}
        value={wert}
        onChange={e => onAendern(e.target.value)}
        onKeyDown={taste}
        className={`${eingabeKlasse} !rounded-t-none leading-relaxed`}
      />
      {hinweis && <p className="mt-1.5 text-xs text-[#6b6b6b] leading-relaxed">{hinweis}</p>}
    </div>
  )
}
