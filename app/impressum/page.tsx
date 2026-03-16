import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Impressum' }

export default function ImpressumPage() {
  return (
    <div className="pt-32 pb-24 px-6 max-w-2xl mx-auto">
      <h1 className="font-display text-6xl tracking-tight mb-12">IMPRESSUM</h1>

      <div className="space-y-8 text-sm text-[#6b6b6b] leading-relaxed">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">Angaben gemäß § 5 TMG</div>
          <p>SV Holm-Seppensen e.V.<br />
          Holm-Seppensen<br />
          Deutschland</p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">Kontakt</div>
          <p>
            Telefon: <a href="tel:00491722970187" className="text-[#0a0a0a] underline underline-offset-2">+49 172 2970187</a><br />
            E-Mail: <a href="mailto:info@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">info@sv-holm-seppensen.de</a>
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">Registereintrag</div>
          <p>Eingetragener Verein (e.V.)</p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">Verantwortlich für den Inhalt</div>
          <p>Der Vorstand des SV Holm-Seppensen e.V.</p>
        </div>

        <div className="pt-8 border-t border-[#0a0a0a]/10">
          <p className="text-xs">
            Bitte passe die Angaben (Vereinsregisternummer, vollständige Adresse, Vorstandsname) 
            entsprechend an. Dies ist eine Vorlage – die rechtlich korrekten Angaben sind 
            einzutragen.
          </p>
        </div>
      </div>
    </div>
  )
}
