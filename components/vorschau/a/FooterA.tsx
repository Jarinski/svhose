import Link from 'next/link'
import Image from 'next/image'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import basis from './basisA.module.css'
import s from './FooterA.module.css'

// ─── Footer Design A (Matchday) ──────────────────────────────────────────────
// Dunkel mit großem Outline-Schriftzug. Wird immer mitgerendert, aber nur im
// Vorschau-Modus A angezeigt (app/vorschau.css) – Bilder deshalb mit loading="lazy".

const SPORT = [
  { href: '/sparten', label: 'Sparten' },
  { href: '/trainingszeiten', label: 'Trainingszeiten' },
  { href: '/termine', label: 'Termine' },
  { href: '/fussball', label: 'Fußball-Spielplan' },
  { href: '/tischtennis', label: 'Tischtennis-Spielplan' },
]

const VEREIN = [
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/news', label: 'News' },
  { href: '/ansprechpartner', label: 'Ansprechpartner*innen' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/kinderschutz', label: 'Kinderschutz' },
]

export default function FooterA() {
  return (
    <footer className={s.footer}>
      <div className={`${basis.wrap} ${s.innen}`}>
        <div className={s.foot}>
          <div>
            <Link href="/" className={s.brand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={40} height={40} loading="lazy" />
              <span>
                <b>Holm-Seppensen</b>
                <small>Sportverein e.V.</small>
              </span>
            </Link>
            <p>Gemeinsam stark. Sportverein in der Lüneburger Heide – mit Sport für alle Generationen.</p>
          </div>

          <nav aria-label="Sport">
            <h2 className={s.titel}>Sport</h2>
            <ul>
              {SPORT.map(link => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Verein">
            <h2 className={s.titel}>Verein</h2>
            <ul>
              {VEREIN.map(link => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={s.titel}>Kontakt</h2>
            <ul>
              <li>
                <a href="tel:+491722970187">+49 172 2970187</a>
              </li>
              <li>
                <a href="https://wa.me/491722970187" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:info@sv-holm-seppensen.de">info@sv-holm-seppensen.de</a>
              </li>
              <li>
                <a href="https://www.instagram.com/svholmseppensen/" target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={s.legal}>
          <span>© {new Date().getFullYear()} SV Holm-Seppensen e.V.</span>
          <Link href="/kinderschutz" className={s.siegel} title="Kinderschutz – ausgezeichnetes Schutzkonzept">
            <Image
              src="/Schutzkonzepte/schutzkonzepte1.jpg"
              alt="Kinderschutz-Siegel: Ausgezeichnetes Schutzkonzept"
              width={120}
              height={35}
              sizes="120px"
              loading="lazy"
            />
          </Link>
          <nav aria-label="Rechtliches" className={s.rechtliches}>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <CookieSettingsButton />
          </nav>
        </div>

        <div className={s.mark} aria-hidden="true">
          Holm-Seppensen
        </div>
      </div>
    </footer>
  )
}
