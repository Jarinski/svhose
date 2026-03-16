import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-[20vw] text-[#0a0a0a]/5 leading-none select-none">404</div>
      <h1 className="font-display text-4xl tracking-tight -mt-8 mb-4">SEITE NICHT GEFUNDEN</h1>
      <p className="text-[#6b6b6b] mb-8">Die gesuchte Seite existiert nicht.</p>
      <Link href="/" className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase">
        Zur Startseite
      </Link>
    </div>
  )
}
