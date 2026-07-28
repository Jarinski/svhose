import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Datenschutz' }

export default function DatenschutzPage() {
  return (
    <div className="pt-32 pb-24 px-6 max-w-2xl mx-auto">
      <h1 className="font-display text-6xl tracking-tight mb-3">DATENSCHUTZ</h1>
      <p className="text-sm text-[#6b6b6b] mb-12">Stand: 25.10.2023</p>

      <div className="space-y-10 text-sm text-[#6b6b6b] leading-relaxed">

        <p>
          Vielen Dank für Ihren Besuch auf der Webseite des Sportvereins SV Holm-Seppensen e.V..
          Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. In dieser
          Datenschutzerklärung erklären wir, wie wir Ihre personenbezogenen Daten erfassen, wenn
          Sie unsere Webseite besuchen, Kontakt zu uns aufnehmen und wie wir mit eingebetteten
          Inhalten umgehen.
        </p>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            1. Verantwortliche Stelle
          </div>
          <p>
            Die verantwortliche Stelle für die Datenverarbeitung im Sinne der
            Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <p className="mt-3">
            SV Holm-Seppensen e.V.<br />
            Van der Smissenweg 3a, 21244 Buchholz
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
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            2. Erhebung und Verarbeitung personenbezogener Daten
          </div>
          <p>
            Wir erheben personenbezogene Daten, die Sie uns freiwillig zur Verfügung stellen, wenn
            Sie Kontakt zu uns aufnehmen, beispielsweise durch Anrufe oder E-Mails. Die erfassten
            Daten können umfassen:
          </p>
          <ul className="mt-3 space-y-1 list-disc list-inside">
            <li>Name</li>
            <li>Kontaktdaten (Telefonnummer, E-Mail-Adresse)</li>
            <li>Informationen, die Sie uns in Ihren Anfragen oder Mitteilungen übermitteln</li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            3. Umgang mit Cookies und eingebetteten Inhalten
          </div>
          <p>
            Unsere Webseite verwendet Cookies, um die Nutzung unserer Webseite zu verbessern.
            Cookies sind kleine Textdateien, die auf Ihrem Endgerät gespeichert werden. Sie helfen
            dabei, Ihre Präferenzen zu speichern und die Webseite besser auf Ihre Bedürfnisse
            abzustimmen.
          </p>
          <p className="mt-3">
            Eingebettete Inhalte von Drittanbietern, wie beispielsweise Videos, Karten oder
            Schriftarten (z. B. Google Fonts), können ebenfalls Cookies verwenden und Daten über
            Sie erfassen. Die Nutzung von Cookies und eingebetteten Inhalten dient der Verbesserung
            Ihrer Nutzererfahrung auf unserer Webseite.
          </p>
          <p className="mt-3">
            Wir respektieren Ihre Privatsphäre und verwenden keine Cookies oder eingebetteten
            Inhalte, um personenbezogene Daten ohne Ihre ausdrückliche Zustimmung zu sammeln. Sie
            können die Cookie-Einstellungen in Ihrem Browser anpassen, um Cookies nach Ihren
            Präferenzen zu akzeptieren oder abzulehnen.
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            4. Zwecke der Datenverarbeitung
          </div>
          <p>
            Wir verarbeiten Ihre personenbezogenen Daten nur zu dem Zweck, auf Ihre Anfragen zu
            antworten und mit Ihnen in Kontakt zu treten. Wir verwenden Ihre Daten nicht für andere
            Zwecke und geben sie nicht ohne Ihre ausdrückliche Zustimmung an Dritte weiter.
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            5. Rechtsgrundlage der Verarbeitung
          </div>
          <p>
            Die Verarbeitung Ihrer Daten erfolgt auf Grundlage der DSGVO und des jeweils geltenden
            nationalen Datenschutzrechts, insbesondere zur Erfüllung rechtlicher Verpflichtungen
            oder im berechtigten Interesse des Vereins.
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            6. Speicherung der Daten
          </div>
          <p>
            Ihre Daten werden nur so lange gespeichert, wie dies für die Bearbeitung Ihrer
            Anfragen oder Mitteilungen erforderlich ist. Wir halten uns an gesetzliche
            Aufbewahrungspflichten.
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            7. Ihre Rechte
          </div>
          <p>
            Als Besucher unserer Webseite haben Sie bestimmte Rechte in Bezug auf Ihre
            personenbezogenen Daten. Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung und Widerspruch. Bitte kontaktieren Sie uns, wenn Sie
            von diesen Rechten Gebrauch machen möchten.
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            8. Beschwerderecht bei der Aufsichtsbehörde
          </div>
          <p>
            Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen Datenschutzrecht
            verstößt, haben Sie das Recht, eine Beschwerde bei der zuständigen
            Datenschutzaufsichtsbehörde einzureichen.
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#0a0a0a] mb-3">
            9. Änderungen der Datenschutzerklärung
          </div>
          <p>
            Der Verein behält sich das Recht vor, diese Datenschutzerklärung zu aktualisieren.
            Bitte überprüfen Sie regelmäßig unsere Datenschutzerklärung auf Änderungen.
          </p>
        </div>

        <div className="border-t border-[#0a0a0a]/10 pt-10">
          <p>
            Bei Fragen zur Datenschutzerklärung, zur Ausübung Ihrer Rechte als Besucher oder zum
            Umgang mit eingebetteten Inhalten können Sie sich an{' '}
            <a href="mailto:Jari.Gonzales@sv-holm-seppensen.de" className="text-[#0a0a0a] underline underline-offset-2">
              Jari Gonzales Reyes
            </a>{' '}
            wenden.
          </p>
          <p className="mt-3">
            Wir bedanken uns für Ihren Besuch auf unserer Webseite und Ihr Interesse an unserem
            Sportverein.
          </p>
        </div>

      </div>
    </div>
  )
}
