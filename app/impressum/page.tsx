import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Impressum' }

export default function ImpressumPage() {
  return (
    <div className="pt-32 pb-24 px-6 max-w-2xl mx-auto">
      <h1 className="font-display text-6xl tracking-tight mb-12">IMPRESSUM</h1>

      <div className="space-y-10 text-sm text-[#6b6b6b] leading-relaxed">

        {/* Angaben */}
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">Angaben gemäß § 5 TMG</div>
          <p>
            SV Holm-Seppensen e.V.<br />
            Van der Smissenweg 3a<br />
            21244 Buchholz
          </p>
          <p className="mt-3">
            E-Mail:{' '}
            <a href="mailto:info@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">
              info@sv-holm-seppensen.de
            </a>
            <br />
            Telefon:{' '}
            <a href="tel:+491722970187" className="text-[#0a0a0a] underline underline-offset-2">
              +49 172 2970187
            </a>
            {' '}·{' '}
            <a href="https://wa.me/491722970187" target="_blank" rel="noopener noreferrer" className="text-[#0a0a0a] underline underline-offset-2">
              WhatsApp
            </a>
          </p>
        </div>

        {/* Vertretung */}
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-4">
            Gemeinschaftlich vertretungsberechtigt
          </div>

          <div className="space-y-6">
            <div>
              <div className="font-medium text-[#0a0a0a] mb-1">1. Vorsitzender</div>
              <p>
                Henrik Behrndt<br />
                Van der Smissenweg 3a<br />
                21244 Buchholz<br />
                Telefon:{' '}
                <a href="tel:+491722970187" className="text-[#0a0a0a] underline underline-offset-2">
                  +49 172 2970187
                </a>
                {' '}·{' '}
                <a href="https://wa.me/491722970187" target="_blank" rel="noopener noreferrer" className="text-[#0a0a0a] underline underline-offset-2">
                  WhatsApp
                </a>
                <br />
                E-Mail:{' '}
                <a href="mailto:henrik.behrndt@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">
                  henrik.behrndt@sv-holm-seppensen.de
                </a>
              </p>
            </div>

            <div>
              <div className="font-medium text-[#0a0a0a] mb-1">2. Vorsitzende</div>
              <p>
                Lioba Te Nyenhuis<br />
                E-Mail:{' '}
                <a href="mailto:lioba.te.nyenhuis@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">
                  lioba.te.nyenhuis@sv-holm-seppensen.de
                </a>
              </p>
            </div>

            <div>
              <div className="font-medium text-[#0a0a0a] mb-1">3. Vorsitzender</div>
              <p>
                Sönke Fenz<br />
                Am Rain 17<br />
                21244 Buchholz<br />
                E-Mail:{' '}
                <a href="mailto:soenke.fenz@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">
                  soenke.fenz@sv-holm-seppensen.de
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* V.i.S.d. */}
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            V.i.S.d § 18 Abs. 2 MStV
          </div>
          <p>
            Jari Gonzales Reyes<br />
            Dibberser Mühlenweg 102<br />
            21244 Buchholz
          </p>
        </div>

        <div className="border-t border-[#0a0a0a]/10 pt-10 space-y-8">

          {/* Haftungsbeschränkung */}
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">Haftungsbeschränkung</div>
            <p>
              Die Inhalte dieser Website werden mit größtmöglicher Sorgfalt erstellt. Der Anbieter
              übernimmt jedoch keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der
              bereitgestellten Inhalte. Die Nutzung der Inhalte der Website erfolgt auf eigene Gefahr
              des Nutzers.
            </p>
            <p className="mt-3">
              Namentlich gekennzeichnete Beiträge geben die Meinung des jeweiligen Autors und nicht
              immer die Meinung des Anbieters wieder. Mit der reinen Nutzung der Website des Anbieters
              kommt keinerlei Vertragsverhältnis zwischen dem Nutzer und dem Anbieter zustande.
            </p>
          </div>

          {/* Externe Links */}
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">Externe Links</div>
            <p>
              Diese Website enthält Verknüpfungen zu Websites Dritter („externe Links"). Diese
              Websites unterliegen der Haftung der jeweiligen Betreiber. Der Anbieter hat bei der
              erstmaligen Verknüpfung der externen Links die fremden Inhalte daraufhin überprüft, ob
              etwaige Rechtsverstöße bestehen. Zu dem Zeitpunkt waren keine Rechtsverstöße ersichtlich.
              Der Anbieter hat keinerlei Einfluss auf die aktuelle und zukünftige Gestaltung und auf
              die Inhalte der verknüpften Seiten. Das Setzen von externen Links bedeutet nicht, dass
              sich der Anbieter die hinter dem Verweis oder Link liegenden Inhalte zu Eigen macht.
              Eine ständige Kontrolle der externen Links ist für den Anbieter ohne konkrete Hinweise
              auf Rechtsverstöße nicht zumutbar. Bei Kenntnis von Rechtsverstößen werden jedoch
              derartige externe Links unverzüglich gelöscht.
            </p>
          </div>

          {/* Urheberrecht */}
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
              Urheber- und Leistungsschutzrechte
            </div>
            <p>
              Die auf dieser Website veröffentlichten Inhalte unterliegen dem deutschen Urheber- und
              Leistungsschutzrecht. Jede vom deutschen Urheber- und Leistungsschutzrecht nicht
              zugelassene Verwertung bedarf der vorherigen schriftlichen Zustimmung des Anbieters oder
              jeweiligen Rechteinhabers. Dies gilt insbesondere für Vervielfältigung, Bearbeitung,
              Übersetzung, Einspeicherung, Verarbeitung bzw. Wiedergabe von Inhalten in Datenbanken
              oder anderen elektronischen Medien und Systemen. Inhalte und Rechte Dritter sind dabei
              als solche gekennzeichnet. Die unerlaubte Vervielfältigung oder Weitergabe einzelner
              Inhalte oder kompletter Seiten ist nicht gestattet und strafbar. Lediglich die
              Herstellung von Kopien und Downloads für den persönlichen, privaten und nicht
              kommerziellen Gebrauch ist erlaubt. Die Darstellung dieser Website in fremden Frames ist
              nur mit schriftlicher Erlaubnis zulässig.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
