import Link from 'next/link'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import b from './bento.module.css'
import s from './FooterB.module.css'

// ─── Footer von Design B (Bento) ─────────────────────────────────────────────
// Schwarzer, abgerundeter Block. Wird für alle Besucher*innen mitgerendert, aber nur im
// Vorschau-Modus B gezeigt (app/vorschau.css) – Bilder deshalb mit loading="lazy".

const SPALTEN: { titel: string; links: { href: string; label: string; extern?: boolean }[] }[] = [
  {
    titel: 'Sport',
    links: [
      { href: '/sparten', label: 'Sparten' },
      { href: '/trainingszeiten', label: 'Trainingszeiten' },
      { href: '/fussball', label: 'Spielplan Fußball' },
      { href: '/tischtennis', label: 'Spielplan Tischtennis' },
      { href: '/termine', label: 'Termine' },
    ],
  },
  {
    titel: 'Verein',
    links: [
      { href: '/ueber-uns', label: 'Über uns' },
      { href: '/news', label: 'News' },
      { href: '/downloads', label: 'Downloads' },
      { href: '/kinderschutz', label: 'Kinderschutz' },
      { href: '/ansprechpartner', label: 'Ansprechpartner*innen' },
    ],
  },
  {
    titel: 'Kontakt',
    links: [
      { href: 'tel:+491722970187', label: '+49 172 2970187' },
      { href: 'https://wa.me/491722970187', label: 'WhatsApp', extern: true },
      { href: 'mailto:info@sv-holm-seppensen.de', label: 'info@sv-holm-seppensen.de' },
      { href: 'https://www.instagram.com/svholmseppensen/', label: 'Instagram', extern: true },
    ],
  },
]

export default function FooterB() {
  return (
    <footer className={s.fuss}>
      <div className={s.block}>
        <div className={s.cta}>
          <p className={s.ctaText}>Gemeinsam stark.</p>
          <Link href="/downloads" className={`${b.btn} ${b.btnHell}`}>
            Mitglied werden
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div className={s.oben}>
          <div>
            <Link href="/" className={`${b.marke} ${s.marke}`} aria-label="SV Holm-Seppensen – zur Startseite">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={44} height={44} loading="lazy" />
              <span>
                <b>SV Holm-Seppensen</b>
                <small>Sportverein e.V.</small>
              </span>
            </Link>
            <p className={s.text}>
              Sportverein in der Lüneburger Heide – Sport für alle Generationen, vom Kinderturnen bis zum Punktspiel.
            </p>
            <Link href="/kinderschutz" className={s.siegel}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Schutzkonzepte/schutzkonzepte1.jpg"
                alt="Kinderschutz: ausgezeichnetes Schutzkonzept – mehr erfahren"
                width={1640}
                height={475}
                loading="lazy"
              />
            </Link>
          </div>

          {SPALTEN.map(spalte => (
            <div key={spalte.titel} className={s.spalte}>
              <h2>{spalte.titel}</h2>
              <ul>
                {spalte.links.map(link => (
                  <li key={link.href}>
                    {link.extern ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                        <span className={b.sr}> (öffnet in neuem Tab)</span>
                      </a>
                    ) : link.href.startsWith('/') ? (
                      <Link href={link.href}>{link.label}</Link>
                    ) : (
                      <a href={link.href}>{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={s.unten}>
          <span>© {new Date().getFullYear()} SV Holm-Seppensen e.V.</span>
          <nav className={s.rechtliches} aria-label="Rechtliches">
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <CookieSettingsButton />
          </nav>
        </div>
      </div>
    </footer>
  )
}
