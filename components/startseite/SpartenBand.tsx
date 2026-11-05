import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { SparteUebersicht } from '@/lib/content'

/**
 * Startseite: alle Sparten als geschlossenes Band.
 * Auf großen Bildschirmen genau zwei Reihen (Spaltenzahl = halbe Spartenzahl), damit keine
 * einzelnen Kacheln in einer angefangenen Reihe hängen bleiben.
 */
export default function SpartenBand({ sparten }: { sparten: SparteUebersicht[] }) {
  const spalten = { '--spalten': Math.ceil(sparten.length / 2) } as CSSProperties

  return (
    <div style={spalten} className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-[repeat(var(--spalten),minmax(0,1fr))] gap-2">
      {sparten.map(s => (
        <Link key={s.slug} href={`/sparten/${s.slug}`} className="group relative aspect-[3/4] overflow-hidden bg-[#0a0a0a]">
          {s.bild && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.bild}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/85 via-transparent to-transparent" />
          <span className="absolute left-4 right-4 bottom-3 font-display text-2xl tracking-tight leading-none text-[#f5f5f0]">
            {s.name}
          </span>
        </Link>
      ))}
    </div>
  )
}
