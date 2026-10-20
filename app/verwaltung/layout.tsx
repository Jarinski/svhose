import type { Metadata } from 'next'

// ─── Verwaltung ──────────────────────────────────────────────────────────────
// Eigener Rahmen ohne Website-Navigation. Nie in Suchmaschinen aufnehmen.
export const metadata: Metadata = {
  title: { default: 'Verwaltung', template: '%s · Verwaltung' },
  robots: { index: false, follow: false },
}

export default function VerwaltungLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f5f5f0]">{children}</div>
}
