/**
 * components/AusschnittBild.tsx
 *
 * Bild, das seinen Rahmen ausfüllt: mit gespeichertem Ausschnitt (lib/bild-ausschnitt.ts) genau
 * diesen Teil, sonst mittig beschnitten wie `object-cover`. Der Rahmen gibt Größe und
 * Seitenverhältnis vor und braucht `overflow: hidden`.
 */

import { ausschnittStil, type Ausschnitt } from '@/lib/bild-ausschnitt'

export default function AusschnittBild({
  src,
  alt,
  ausschnitt,
  className = '',
  onError,
}: {
  src: string
  alt: string
  ausschnitt: Ausschnitt | null
  className?: string
  onError?: () => void
}) {
  if (!ausschnitt) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`w-full h-full object-cover ${className}`} onError={onError} />
  }
  return (
    <span className={`relative block w-full h-full overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={ausschnittStil(ausschnitt)} onError={onError} />
    </span>
  )
}
