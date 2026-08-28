import Image from 'next/image'
import type { NewsPost } from '@/lib/content'

/**
 * Vorschaubild einer News-Karte.
 *
 * Feste 16:9-Fläche statt der Originalproportion: In einem Raster sollen die
 * Karten auf einer Höhe beginnen – ein quadratisches Bild würde seine Spalte
 * sonst deutlich in die Länge ziehen. Beiträge ohne Bild bekommen das
 * Vereinswappen, damit keine Karte ohne Vorschau dasteht.
 */
export default function NewsThumbnail({
  bild,
  alt,
  sizes,
}: {
  bild: NewsPost['image']
  alt: string
  sizes: string
}) {
  return (
    <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#e9e9e2]">
      {bild ? (
        <Image
          src={bild.url}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/SV_Holm_Seppensen_Logo.svg"
            alt=""
            aria-hidden="true"
            className="w-14 h-14 object-contain opacity-20 group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
    </div>
  )
}
