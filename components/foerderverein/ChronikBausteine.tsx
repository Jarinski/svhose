/**
 * components/foerderverein/ChronikBausteine.tsx
 *
 * Darstellung der Förderverein-Chronik aus Bausteinen (Aufbau in lib/chronik.ts) – gemeinsam
 * genutzt von der Seite /foerderverein/chronik und der Vorschau im Chronik-Editor der Verwaltung,
 * damit die Vorschau genau so aussieht wie später auf der Website.
 *
 * Ohne Hooks und ohne 'use client': funktioniert in Server- und Client-Komponenten.
 */

import MarkdownText from '@/components/MarkdownText'
import type { AnzeigeBild, Baustein, Hintergrund } from '@/lib/chronik'

type B = Baustein<AnzeigeBild>

/** Kopf der Seite: Überschrift und Einleitung. */
export function ChronikKopf({ einleitung }: { einleitung: string }) {
  return (
    <div className="px-6 max-w-7xl mx-auto mb-12">
      <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Förderverein</div>
      <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12">CHRONIK</h1>
      {einleitung.trim() && <p className="max-w-2xl text-xl text-[#6b6b6b] font-light leading-relaxed whitespace-pre-line">{einleitung}</p>}
    </div>
  )
}

export default function ChronikBausteine({ bausteine }: { bausteine: B[] }) {
  return (
    <div className="space-y-16 md:space-y-20">
      {bausteine.map((b, i) => (
        <BausteinAnzeige key={b.schluessel ?? i} baustein={b} />
      ))}
    </div>
  )
}

function BausteinAnzeige({ baustein: b }: { baustein: B }) {
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
    <img src={bild.src} alt={alt} width={bild.breite || undefined} height={bild.hoehe || undefined} loading="lazy" className={className} />
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

  if (b.darstellung === 'zeitstrahl') {
    return (
      <Rahmen>
        <Ueberschrift text={b.ueberschrift} />
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
          <MarkdownText text={b.text} />
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
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#0a0a0a]" />
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <ul className={`${mitKopf ? 'md:col-span-2' : 'md:col-span-3'} flex flex-wrap gap-2`}>
            {punkte.map((p, i) => (
              <li key={i} className="border border-[#0a0a0a]/15 px-4 py-2 text-sm">
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
