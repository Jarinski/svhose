/**
 * components/foerderverein/SeitenBausteine.tsx
 *
 * Darstellung der Förderverein-Seiten aus Bausteinen (Aufbau in lib/seiten.ts) – gemeinsam genutzt
 * von den Seiten unter /foerderverein und der Vorschau im Editor der Verwaltung, damit die Vorschau
 * genau so aussieht wie später auf der Website. "Meldungen" und "Unterlagen" zeigen die News und
 * Downloads des Fördervereins, die als `daten` hereinkommen.
 *
 * Bekommt alle Bausteine der Seite, auch ausgeblendete, und zeigt nur die sichtbaren. Jeder
 * Baustein steht für sich – die Zeitleiste zeigt nur ihre eigenen Stationen und Fotos, die
 * Bildergalerie nur ihre Fotos.
 *
 * Ohne Hooks und ohne 'use client': funktioniert in Server- und Client-Komponenten. Nur die
 * Bildergalerie (Großansicht zum Durchblättern) und der Zahlenstrahl mit Zoom sind eigene
 * Client-Komponenten.
 */

import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight, Download as DownloadSymbol, FileText, Mail } from 'lucide-react'
import MarkdownText from '@/components/MarkdownText'
import Galerie from '@/components/foerderverein/Galerie'
import ZeitZoom from '@/components/foerderverein/ZeitZoom'
import NewsKarten from '@/components/NewsKarten'
import type { Download, NewsPost } from '@/lib/content'
import { FOERDERVEREIN } from '@/lib/foerderverein'
import type { AnzeigeBild, Baustein, Hintergrund } from '@/lib/seiten'

type B = Baustein<AnzeigeBild>

/** Was die automatischen Bausteine zeigen: News und Downloads mit der Kategorie "Förderverein". */
export interface SeitenDaten {
  news: NewsPost[]
  downloads: Download[]
}

const OHNE_DATEN: SeitenDaten = { news: [], downloads: [] }

/** Kopf der Seite: kleine Zeile, Überschrift und Einleitung. */
export function SeitenKopf({ kicker, titel, einleitung }: { kicker: string; titel: string; einleitung: string }) {
  return (
    <div className="px-6 max-w-7xl mx-auto mb-12">
      <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">{kicker}</div>
      {/* Lange Überschriften (z. B. der volle Vereinsname) in kleinerer Schrift, damit sie nicht über vier Zeilen laufen */}
      <h1 className={`font-display tracking-tight mb-12 break-words hyphens-auto ${titel.length > 30 ? 'text-4xl md:text-6xl' : 'text-6xl md:text-8xl'}`}>{titel}</h1>
      {einleitung.trim() && <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed whitespace-pre-line">{einleitung}</p>}
    </div>
  )
}

export default function SeitenBausteine({ bausteine: alle, daten = OHNE_DATEN }: { bausteine: B[]; daten?: SeitenDaten }) {
  const bausteine = alle.filter(b => b.sichtbar)
  // Downloads, die schon als Knopf in einem Kasten stehen – "Unterlagen" zeigt sie auf Wunsch nicht noch einmal
  const inKaesten = bausteine.reduce<number[]>((ids, b) => (b.art === 'aufruf' ? ids.concat(b.downloads) : ids), [])
  return (
    <div className="space-y-16 md:space-y-20">
      {bausteine.map((b, i) => (
        <BausteinAnzeige key={b.schluessel ?? i} baustein={b} daten={daten} inKaesten={inKaesten} />
      ))}
    </div>
  )
}

function BausteinAnzeige({ baustein: b, daten, inKaesten }: { baustein: B; daten: SeitenDaten; inKaesten: number[] }) {
  switch (b.art) {
    case 'zeitleiste':
      return <Zeitleiste b={b} />
    case 'text':
      return <Textabschnitt b={b} />
    case 'bild':
      return b.bild ? (
        <Rahmen>
          <figure className={b.breite === 'breit' ? '' : 'max-w-4xl mx-auto'}>
            <Foto bild={b.bild} alt={b.unterschrift} className="w-full h-auto" />
            {b.unterschrift.trim() && <figcaption className="mt-3 text-sm text-[#6b6b6b] leading-relaxed">{b.unterschrift}</figcaption>}
          </figure>
        </Rahmen>
      ) : null
    case 'galerie':
      return <Bildergalerie b={b} />
    case 'liste':
      return <Stichpunkte b={b} />
    case 'zahlen':
      return <Zahlen b={b} />
    case 'zitat':
      return b.text.trim() ? (
        <Rahmen>
          <figure className="max-w-4xl border-l-2 border-[#0a0a0a] pl-6 md:pl-10">
            <blockquote className="text-2xl md:text-4xl font-light leading-snug tracking-tight whitespace-pre-line">{b.text}</blockquote>
            {b.quelle.trim() && <figcaption className="mt-6 text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]">{b.quelle}</figcaption>}
          </figure>
        </Rahmen>
      ) : null
    case 'karten':
      return <Karten b={b} />
    case 'aufruf':
      return <Aufruf b={b} downloads={daten.downloads} />
    case 'meldungen':
      return <Meldungen b={b} news={daten.news} />
    case 'unterlagen': {
      const liste = b.auswahl === 'uebrige' ? daten.downloads.filter(d => inKaesten.indexOf(d.id) < 0) : daten.downloads
      return <Unterlagen ueberschrift={b.ueberschrift} downloads={liste} />
    }
  }
}

// ─── Hilfsbausteine ─────────────────────────────────────────────────────────

/** Abschnitt in Seitenbreite; dunkel als schwarzes Band über die ganze Fensterbreite. */
function Rahmen({ hintergrund = 'hell', children }: { hintergrund?: Hintergrund; children: React.ReactNode }) {
  if (hintergrund === 'dunkel') {
    return (
      <section className="bg-[#0a0a0a] text-[#f5f5f0] py-20 md:py-24 px-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </section>
    )
  }
  return <section className="px-6 max-w-7xl mx-auto">{children}</section>
}

function Foto({ bild, alt, className }: { bild: AnzeigeBild; alt: string; className: string }) {
  return (
    // Bilder liegen im Medienordner und sind schon verkleinert – normales <img> wie im News-Text
    // eslint-disable-next-line @next/next/no-img-element
    <img src={bild.src} alt={alt} width={bild.breite || undefined} height={bild.hoehe || undefined} loading="lazy" className={`rounded-[20px] ${className}`} />
  )
}

function Ueberschrift({ text, className = 'mb-10' }: { text: string; className?: string }) {
  return text.trim() ? <h2 className={`font-display text-4xl md:text-5xl tracking-tight ${className}`}>{text}</h2> : null
}

// ─── Zeitleiste ─────────────────────────────────────────────────────────────

function Zeitleiste({ b }: { b: Extract<B, { art: 'zeitleiste' }> }) {
  const eintraege = b.eintraege.filter(e => e.titel.trim() || e.text.trim() || e.zeit.trim() || e.bild)
  if (eintraege.length === 0) return null
  // Ohne Überschrift über der Zeitleiste sind die Titel der Stationen die Überschriften der Seite
  const Titel = b.ueberschrift.trim() ? 'h3' : 'h2'

  // Zahlenstrahl mit Zoom: eigene Client-Komponente
  if (b.darstellung === 'zahlenstrahl') {
    return (
      <ZeitZoom
        eintraege={eintraege}
        titelTag={Titel}
        kopf={
          b.ueberschrift.trim() ? (
            <Rahmen>
              <Ueberschrift text={b.ueberschrift} />
            </Rahmen>
          ) : null
        }
      />
    )
  }

  if (b.darstellung === 'zeitstrahl') return <ZeitstrahlListe ueberschrift={b.ueberschrift} eintraege={eintraege} titelTag={Titel} />

  if (b.darstellung === 'gross') {
    let mitBild = 0
    return (
      <Rahmen>
        <Ueberschrift text={b.ueberschrift} />
        <ol className="space-y-16 md:space-y-24">
          {eintraege.map((e, i) => {
            // Fotos wechseln die Seite: erstes links, zweites rechts …
            const rechts = e.bild ? mitBild++ % 2 === 1 : false
            return (
              <li key={e.schluessel ?? i} className={e.bild ? 'grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center' : ''}>
                {e.bild && (
                  <div className={rechts ? 'md:order-2' : ''}>
                    <Foto bild={e.bild} alt={e.titel} className="w-full aspect-[4/3] object-cover" />
                  </div>
                )}
                <div className={e.bild ? '' : 'max-w-3xl'}>
                  {e.zeit.trim() && <div className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">{e.zeit}</div>}
                  {e.titel.trim() && <Titel className="font-display text-4xl md:text-5xl tracking-tight mb-5">{e.titel}</Titel>}
                  {e.text.trim() && <p className="text-lg text-[#6b6b6b] leading-relaxed whitespace-pre-line">{e.text}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      </Rahmen>
    )
  }

  return (
    <Rahmen>
      <Ueberschrift text={b.ueberschrift} />
      <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
        {eintraege.map((e, i) => (
          <li key={e.schluessel ?? i} className="bg-[#f5f5f0] p-8">
            {e.bild && <Foto bild={e.bild} alt={e.titel} className="w-full aspect-[4/3] object-cover mb-6" />}
            {e.zeit.trim() && <div className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">{e.zeit}</div>}
            {e.titel.trim() && <Titel className="font-display text-2xl tracking-tight mb-3">{e.titel}</Titel>}
            {e.text.trim() && <p className="text-sm text-[#6b6b6b] leading-relaxed whitespace-pre-line">{e.text}</p>}
          </li>
        ))}
      </ol>
    </Rahmen>
  )
}

/** Darstellung "Zeitstrahl": untereinander an einer Linie. */
function ZeitstrahlListe({ ueberschrift, eintraege, titelTag: Titel }: { ueberschrift: string; eintraege: Extract<B, { art: 'zeitleiste' }>['eintraege']; titelTag: 'h2' | 'h3' }) {
  return (
    <Rahmen>
      <Ueberschrift text={ueberschrift} />
      <ol className="max-w-4xl">
        {eintraege.map((e, i) => (
          <li key={e.schluessel ?? i} className="grid grid-cols-1 md:grid-cols-[10rem_1fr] md:gap-x-10">
            <div className="hidden md:block text-right pt-2 text-xs tracking-[0.15em] uppercase text-[#6b6b6b]">{e.zeit}</div>
            <div className={`relative border-l border-[#0a0a0a]/15 pl-8 ${i === eintraege.length - 1 ? '' : 'pb-12'}`}>
              <span aria-hidden className="absolute -left-[5px] top-3 h-[9px] w-[9px] rounded-full bg-[#0a0a0a]" />
              {e.zeit.trim() && <div className="md:hidden text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-2 pt-1">{e.zeit}</div>}
              {e.titel.trim() && <Titel className="font-display text-3xl tracking-tight mb-3">{e.titel}</Titel>}
              {e.text.trim() && <p className="text-[#6b6b6b] leading-relaxed whitespace-pre-line">{e.text}</p>}
              {e.bild && <Foto bild={e.bild} alt={e.titel} className="mt-6 w-full max-w-xl h-auto" />}
            </div>
          </li>
        ))}
      </ol>
    </Rahmen>
  )
}

// ─── Textabschnitt ──────────────────────────────────────────────────────────

function Textabschnitt({ b }: { b: Extract<B, { art: 'text' }> }) {
  if (!b.ueberschrift.trim() && !b.text.trim() && !b.bild) return null
  const dunkel = b.hintergrund === 'dunkel'
  const text = (
    <div>
      <Ueberschrift text={b.ueberschrift} className="mb-8" />
      {b.text.trim() && (
        <div
          className={`leading-relaxed ${
            dunkel ? 'text-[#f5f5f0]/70 [&_a]:decoration-[#f5f5f0]/40 [&_a:hover]:decoration-[#f5f5f0] [&_blockquote]:border-[#f5f5f0] [&_blockquote]:text-[#f5f5f0]/60' : 'text-[#4a4a4a]'
          }`}
        >
          <MarkdownText text={b.text} zeilenumbrueche />
        </div>
      )}
    </div>
  )
  return (
    <Rahmen hintergrund={b.hintergrund}>
      {b.bild ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className={b.bildPosition === 'links' ? 'md:order-2' : ''}>{text}</div>
          <Foto bild={b.bild} alt={b.ueberschrift} className="w-full h-auto" />
        </div>
      ) : (
        <div className="max-w-3xl">{text}</div>
      )}
    </Rahmen>
  )
}

// ─── Bildergalerie ──────────────────────────────────────────────────────────

function Bildergalerie({ b }: { b: Extract<B, { art: 'galerie' }> }) {
  const fotos = b.fotos.flatMap(f => (f.bild ? [{ bild: f.bild, unterschrift: f.unterschrift.trim() }] : []))
  if (fotos.length === 0) return null
  return (
    <Rahmen>
      <Ueberschrift text={b.ueberschrift} className={b.text.trim() ? 'mb-4' : 'mb-10'} />
      {b.text.trim() && <p className="max-w-2xl mb-10 text-[#6b6b6b] leading-relaxed whitespace-pre-line">{b.text}</p>}
      <Galerie fotos={fotos} darstellung={b.darstellung} />
    </Rahmen>
  )
}

// ─── Stichpunkte ────────────────────────────────────────────────────────────

function Stichpunkte({ b }: { b: Extract<B, { art: 'liste' }> }) {
  const punkte = b.punkte.filter(p => p.trim())
  if (punkte.length === 0) return null
  const mitKopf = !!(b.ueberschrift.trim() || b.text.trim())
  return (
    <Rahmen>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {mitKopf && (
          <div>
            {b.ueberschrift.trim() && <h2 className="font-display text-2xl tracking-tight mb-2">{b.ueberschrift}</h2>}
            {b.text.trim() && <p className="text-sm text-[#6b6b6b] leading-relaxed whitespace-pre-line">{b.text}</p>}
          </div>
        )}
        {b.darstellung === 'punkte' ? (
          <ul className={`${mitKopf ? 'md:col-span-2' : 'md:col-span-3'} grid grid-cols-1 sm:grid-cols-2 gap-x-8`}>
            {punkte.map((p, i) => (
              <li key={i} className="flex gap-3 border-t border-[#0a0a0a]/10 py-3 text-sm leading-relaxed">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0a0a0a]" />
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <ul className={`${mitKopf ? 'md:col-span-2' : 'md:col-span-3'} flex flex-wrap gap-2`}>
            {punkte.map((p, i) => (
              <li key={i} className="glas-pille">
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Rahmen>
  )
}

// ─── Zahlen & Fakten ────────────────────────────────────────────────────────

function Zahlen({ b }: { b: Extract<B, { art: 'zahlen' }> }) {
  const eintraege = b.eintraege.filter(e => e.zahl.trim() || e.text.trim())
  if (eintraege.length === 0) return null
  const dunkel = b.hintergrund === 'dunkel'
  return (
    <Rahmen hintergrund={b.hintergrund}>
      <Ueberschrift text={b.ueberschrift} />
      {/* Kacheln wachsen, bis die Zeile voll ist – so bleibt keine Lücke, egal wie viele es sind */}
      <div className={`flex flex-wrap gap-px ${dunkel ? 'bg-[#f5f5f0]/10' : 'bg-[#0a0a0a]/10'}`}>
        {eintraege.map((e, i) => (
          <div key={e.schluessel ?? i} className={`grow basis-[40%] lg:basis-[20%] p-6 md:p-8 text-center ${dunkel ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f0]'}`}>
            <div className="font-display text-3xl md:text-4xl lg:text-5xl mb-2 break-words">{e.zahl}</div>
            <div className={`text-[11px] tracking-[0.15em] uppercase ${dunkel ? 'text-[#f5f5f0]/60' : 'text-[#6b6b6b]'}`}>{e.text}</div>
          </div>
        ))}
      </div>
    </Rahmen>
  )
}

// ─── Karten ─────────────────────────────────────────────────────────────────

function Karten({ b }: { b: Extract<B, { art: 'karten' }> }) {
  const eintraege = b.eintraege.filter(e => e.titel.trim() || e.text.trim())
  if (eintraege.length === 0) return null
  const Titel = b.ueberschrift.trim() ? 'h3' : 'h2'
  return (
    <Rahmen>
      <Ueberschrift text={b.ueberschrift} />
      {/* Karten wachsen, bis die Zeile voll ist – höchstens vier nebeneinander, keine leeren Felder */}
      <div className="flex flex-wrap gap-px bg-[#0a0a0a]/10">
        {eintraege.map((e, i) => (
          <div key={e.schluessel ?? i} className="grow basis-full md:basis-[40%] lg:basis-[20%] bg-[#f5f5f0] p-8">
            {e.titel.trim() && <Titel className="font-display text-2xl tracking-tight mb-3">{e.titel}</Titel>}
            {e.text.trim() && <p className="text-sm text-[#6b6b6b] leading-relaxed whitespace-pre-line">{e.text}</p>}
          </div>
        ))}
      </div>
    </Rahmen>
  )
}

// ─── Kasten mit Knopf ───────────────────────────────────────────────────────

function Aufruf({ b, downloads }: { b: Extract<B, { art: 'aufruf' }>; downloads: Download[] }) {
  // In der gewählten Reihenfolge; gelöschte Downloads fallen einfach weg
  const dateien = b.downloads.map(id => downloads.filter(d => d.id === id)[0]).filter((d): d is Download => !!d)
  if (!b.ueberschrift.trim() && !b.text.trim()) return null
  const dunkel = b.hintergrund === 'dunkel'
  const knopf = `inline-flex items-center gap-2 px-6 py-4 text-sm tracking-[0.1em] uppercase font-medium transition-colors ${
    dunkel ? 'bg-[#f5f5f0] text-[#0a0a0a] hover:bg-white' : 'bg-[#0a0a0a] text-[#f5f5f0] hover:bg-[#1a1a1a]'
  }`
  const betreff = b.ueberschrift.trim() || 'Förderverein'
  return (
    <Rahmen>
      <div
        className={`p-8 md:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 ${
          dunkel ? 'bg-[#0a0a0a] text-[#f5f5f0]' : 'glas-karte'
        }`}
      >
        <div className="min-w-0">
          {b.ueberschrift.trim() && <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-2 break-words hyphens-auto">{b.ueberschrift}</h2>}
          {b.text.trim() && <p className={`whitespace-pre-line ${dunkel ? 'text-[#f5f5f0]/70' : 'text-[#6b6b6b]'}`}>{b.text}</p>}
        </div>
        {(dateien.length > 0 || b.email) && (
          <div className="flex flex-col gap-3 min-w-0 lg:max-w-sm">
            {dateien.map(d => (
              <a key={d.id} href={d.datei} target="_blank" rel="noopener noreferrer" className={knopf}>
                <DownloadSymbol size={16} className="shrink-0" /> <span className="min-w-0 break-words">{d.titel}</span>
              </a>
            ))}
            {b.email && (
              <a href={`mailto:${FOERDERVEREIN.email}?subject=${encodeURIComponent(betreff)}`} className={knopf}>
                <Mail size={16} className="shrink-0" /> E-Mail schreiben
              </a>
            )}
          </div>
        )}
      </div>
    </Rahmen>
  )
}

// ─── Meldungen (News des Fördervereins) ─────────────────────────────────────

function Meldungen({ b, news }: { b: Extract<B, { art: 'meldungen' }>; news: NewsPost[] }) {
  const liste = b.anzahl > 0 ? news.slice(0, b.anzahl) : news
  return (
    <Rahmen>
      <Ueberschrift text={b.ueberschrift} />
      {liste.length === 0 ? (
        <div className="border border-[#0a0a0a]/10 p-8 md:p-12 max-w-2xl">
          {b.leerTitel.trim() && <h2 className="font-display text-3xl tracking-tight mb-3">{b.leerTitel}</h2>}
          {b.leerText.trim() && (
            <div className="text-[#6b6b6b] leading-relaxed mb-6">
              <MarkdownText text={b.leerText} />
            </div>
          )}
          <Link href="/news" className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]">
            Zu den News des Vereins <ArrowRight size={14} className="shrink-0" />
          </Link>
        </div>
      ) : b.darstellung === 'zeilen' ? (
        <ul className="max-w-4xl divide-y divide-[#0a0a0a]/10 border-y border-[#0a0a0a]/10">
          {liste.map(post => (
            <li key={post.slug}>
              <Link href={`/news/${post.slug}`} className="group grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-8 gap-y-1 py-5">
                <span className="pt-1.5 text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b]">{format(new Date(post.date), 'd. MMMM yyyy', { locale: de })}</span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl tracking-tight leading-tight group-hover:underline underline-offset-4">{post.title}</span>
                  {post.excerpt && <span className="block mt-1 text-sm text-[#6b6b6b] leading-relaxed">{post.excerpt}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <NewsKarten news={liste} />
      )}
    </Rahmen>
  )
}

// ─── Unterlagen (Downloads des Fördervereins) ───────────────────────────────

function Unterlagen({ ueberschrift, downloads }: { ueberschrift: string; downloads: Download[] }) {
  if (downloads.length === 0) return null
  return (
    <Rahmen>
      {ueberschrift.trim() && <h2 className="font-display text-2xl tracking-tight mb-4">{ueberschrift}</h2>}
      <ul className="divide-y divide-[#0a0a0a]/10 border-y border-[#0a0a0a]/10">
        {downloads.map(d => (
          <li key={d.id}>
            <a href={d.datei} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 py-4 hover:text-[#6b6b6b] transition-colors">
              <FileText size={18} className="shrink-0 mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-medium break-words">{d.titel}</span>
                {d.beschreibung && <span className="block text-sm text-[#6b6b6b]">{d.beschreibung}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Rahmen>
  )
}
