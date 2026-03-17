import Link from 'next/link'
import Image from 'next/image'
import CookieSettingsButton from '@/components/CookieSettingsButton'

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] text-[#f5f5f0] mt-32">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-[#f5f5f0]/10">
          {/* Brand */}
          <div>
            <div className="font-display text-3xl tracking-wider mb-3">SV HOLM-SEPPENSEN</div>
            <p className="text-[#6b6b6b] text-sm leading-relaxed max-w-xs">
              Gemeinsam stark. Sportverein in der Lüneburger Heide mit über 14 Sparten für alle Generationen.
            </p>
          </div>

          {/* Links */}
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-[#6b6b6b] mb-4">Navigation</div>
            <ul className="space-y-2">
              {[
                { href: '/news', label: 'News' },
                { href: '/sparten', label: 'Sparten' },
                { href: '/termine', label: 'Termine' },
                { href: '/downloads', label: 'Downloads' },
                { href: '/ansprechpartner', label: 'Kontakt' },
                { href: '/kinderschutz', label: 'Kinderschutz' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[#6b6b6b] hover:text-[#f5f5f0] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-[#6b6b6b] mb-4">Kontakt</div>
            <div className="space-y-2 text-sm text-[#6b6b6b]">
              <p>SV Holm-Seppensen e.V.</p>
              <p>Holm-Seppensen</p>
              <a href="tel:+491722970187" className="block hover:text-[#f5f5f0] transition-colors">
                +49 172 2970187
              </a>
              <a href="https://wa.me/491722970187" target="_blank" rel="noopener noreferrer" className="block hover:text-[#f5f5f0] transition-colors">
                WhatsApp
              </a>
              <a href="mailto:info@sv-holm-seppensen.de" className="block hover:text-[#f5f5f0] transition-colors">
                info@sv-holm-seppensen.de
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-[#6b6b6b]">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p>© {new Date().getFullYear()} SV Holm-Seppensen e.V.</p>
            {/* Schutzkonzept-Auszeichnung */}
            <Link href="/kinderschutz" title="Kinderschutz – Ausgezeichnetes Schutzkonzept">
              <Image
                src="/Schutzkonzepte/schutzkonzepte1.jpg"
                alt="Ausgezeichnetes Schutzkonzept"
                width={80}
                height={54}
                className="rounded opacity-70 hover:opacity-100 transition-opacity object-cover"
              />
            </Link>
          </div>
          <div className="flex gap-6">
            <Link href="/impressum" className="hover:text-[#f5f5f0] transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-[#f5f5f0] transition-colors">Datenschutz</Link>
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  )
}
