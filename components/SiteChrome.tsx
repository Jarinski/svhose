import Navbar from './Navbar'
import Footer from './Footer'
import CookieBanner from './CookieBanner'

// ─── Seitenrahmen ────────────────────────────────────────────────────────────
// Navigation, Inhalt, Footer und Cookie-Banner auf jeder Seite.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CookieBanner />
    </>
  )
}
