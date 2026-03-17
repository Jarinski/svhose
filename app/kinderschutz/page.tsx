import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Shield, Mail, Phone, CheckCircle2, XCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kinderschutz – SV Holm-Seppensen',
  description:
    'Der Schutz von Kindern und Jugendlichen hat beim SV Holm-Seppensen höchste Priorität. Hier findest du unser Schutzkonzept, Vertrauenspersonen und Ansprechpartner.',
}

const VERTRAUENSPERSONEN = [
  {
    name: 'Céline Goldschalt',
    rolle: 'Vertrauensperson',
    email: 'hallo@celinegoldschalt.de',
    telefon: '0172 42 70 669',
    bild: '/images/Celine.webp',
  },
  {
    name: 'Sebastian Daniel',
    rolle: 'Vertrauensperson',
    email: 'sebastian_daniel@gmx.net',
    telefon: '0176 989 600 77',
    bild: '/images/Sebastian.webp',
  },
  {
    name: 'Saad Fidaoui',
    rolle: 'Kinderschutzbeauftragter & Vorstandsmitglied',
    email: 'saad.fidaoui@sv-holm-seppensen.de',
    telefon: null,
    bild: '/images/SEO-Saad-Fidaoui-294x300.webp',
  },
  {
    name: 'Henrik Behrndt',
    rolle: '1. Vorsitzender',
    email: 'henrik.behrndt@sv-holm-seppensen.de',
    telefon: null,
    bild: '/images/henrik behrndt.jpg',
  },
]

const BAUSTEINE = [
  'Positionierung des Vorstandes / des Vereins',
  'Benennung und Schulung von Vertrauenspersonen (Ein Dankeschön an Celine Goldschalt und Sebastian Daniel!)',
  'Schulung der Übungsleiter:innen (Nochmals vielen Dank an euch alle!)',
  'Beschwerdeverfahren und Verhaltensregeln',
  'Risikoanalyse',
  'Einrichtung eines anonymen Beschwerdemanagements',
]

const AUFGABEN_JA = [
  'Ansprechpartner:in für Kinder, Jugendliche, Eltern, Trainer:innen',
  'Vermittlung von Hilfe und Beratung',
  'Vernetzung mit Fach- und Beratungsstellen',
  'Bindeglied zum geschäftsführenden Vorstand',
]

const AUFGABEN_NEIN = [
  'klären keine Verdachtsfälle',
  'bieten weder Therapie noch Täterberatung an',
  'ermitteln nicht',
]

const FAKTEN = [
  {
    titel: 'Unser Ziel',
    text: 'Ein sicheres und respektvolles Umfeld schaffen, in dem Kinder, Jugendliche und junge Erwachsene geschützt und gestärkt werden.',
  },
  {
    titel: 'Prävention',
    text: 'Prävention hilft dabei, Probleme zu vermeiden, bevor sie entstehen. Sie schafft ein täterfeindliches Umfeld und sensibilisiert alle Beteiligten.',
  },
  {
    titel: 'Vertrauenspersonen',
    text: 'Celine Goldschalt und Sebastian Daniel stehen dir bei Fragen und Anliegen vertrauensvoll zur Seite. Sie hören zu, beraten und vernetzen mit Fachstellen.',
  },
  {
    titel: 'Was sie nicht tun',
    text: 'Die Vertrauenspersonen können keine Verdachtsfälle klären oder ermitteln – dafür gibt es spezialisierte Fachstellen.',
  },
  {
    titel: 'Anonym melden',
    text: 'Du kannst dich anonym über unser Beschwerdemanagement oder direkt über den Briefkasten an der Sportanlage Tostedter Weg an uns wenden.',
  },
  {
    titel: 'Verhaltensregeln',
    text: 'Alle Mitglieder achten auf respektvolles Verhalten, vermeiden unangemessenen Körperkontakt, beachten Kleiderregeln und nutzen Social Media verantwortungsbewusst.',
  },
]

export default function KinderschutzPage() {
  return (
    <div className="pt-32 pb-24">
      {/* ── Hero ── */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-[#6b6b6b]" />
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b]">Unser Versprechen</div>
        </div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-10">
          KINDER-<br />SCHUTZ
        </h1>
        <div className="w-16 h-px bg-[#0a0a0a] mb-10" />
        <div className="max-w-2xl">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            Der Schutz von Kindern und Jugendlichen hat beim SV Holm-Seppensen höchste Priorität.
            Wir setzen uns aktiv für einen sicheren und respektvollen Umgang miteinander ein.
          </p>
        </div>
      </div>

      {/* ── Wir versprechen, dass... ── */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] py-16 px-6 mb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-6">Unser Versprechen</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-10">WIR VERSPRECHEN, DASS…</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#f5f5f0]/10 mb-12">
            {[
              'dein Wohl im Mittelpunkt steht',
              'wir deine Aussage ernstnehmen werden',
              'wir damit sehr diskret umgehen werden',
            ].map((v, i) => (
              <div key={i} className="bg-[#0a0a0a] p-8 flex items-start gap-4">
                <span className="font-display text-3xl text-[#f5f5f0]/20 shrink-0 leading-none mt-1">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-[#f5f5f0]/80 leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
          <div className="border border-[#f5f5f0]/10 p-6 flex items-start gap-4 max-w-2xl">
            <Mail size={16} className="text-[#6b6b6b] shrink-0 mt-0.5" />
            <p className="text-sm text-[#6b6b6b] leading-relaxed">
              Du kannst dich auch <strong className="text-[#f5f5f0]">anonym</strong> an uns wenden:
              Nutze für deine Aussage bitte den eigens dafür eingerichteten{' '}
              <strong className="text-[#f5f5f0]">Briefkasten an der Sportanlage Tostedter Weg</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* ── Unsere Vertrauenspersonen ── */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Direkte Ansprechpartner</div>
        <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-12">UNSERE VERTRAUENSPERSONEN</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#0a0a0a]/10">
          {VERTRAUENSPERSONEN.map((p) => (
            <div key={p.name} className="bg-[#f5f5f0] flex flex-col">
              {/* Foto */}
              <div className="relative w-full aspect-square overflow-hidden bg-[#e8e8e3]">
                <Image
                  src={p.bild}
                  alt={p.name}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              {/* Info */}
              <div className="p-6 flex flex-col flex-1">
                <div className="font-medium text-lg leading-snug mb-1">{p.name}</div>
                <div className="text-[11px] tracking-[0.15em] uppercase text-[#6b6b6b] mb-4 leading-relaxed">
                  {p.rolle}
                </div>
                <div className="mt-auto space-y-2">
                  <a
                    href={`mailto:${p.email}`}
                    className="flex items-center gap-2 text-sm text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors break-all"
                  >
                    <Mail size={13} className="shrink-0" />
                    {p.email}
                  </a>
                  {p.telefon && (
                    <a
                      href={`tel:${p.telefon.replace(/\s/g, '')}`}
                      className="flex items-center gap-2 text-sm text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
                    >
                      <Phone size={13} className="shrink-0" />
                      {p.telefon}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Unser Selbstverständnis ── */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Wir schauen nicht weg</div>
        <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-8">UNSER SELBSTVERSTÄNDNIS</h2>

        {/* Bild + Text nebeneinander */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 items-start">
          {/* Zertifikat / Auszeichnung */}
          <div className="relative">
            <div className="border border-[#0a0a0a]/10 overflow-hidden">
              <Image
                src="/Schutzkonzepte/schutzkonzepte1.jpg"
                alt="Auszeichnung Schutzkonzept SV Holm-Seppensen"
                width={900}
                height={600}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-[#6b6b6b] mt-2">
              Pilotprojekt Kinderschutzbund &amp; Kreissportbund
            </p>
          </div>

          {/* Text + Bausteine */}
          <div>
            <p className="text-[#6b6b6b] leading-relaxed mb-4">
              Für eine sichere und starke Zukunft unserer Jugend – um im Kinder- und Jugendsport weiter
              einen konsequenten Weg des Hinschauens zu gehen und ein täterfeindliches Umfeld zu schaffen,
              haben wir unser Präventionskonzept erfolgreich abgeschlossen und nehmen am Pilotprojekt des
              Kinderschutzbundes und des Kreissportbundes zur Prävention teil.
            </p>
            <p className="text-[#6b6b6b] leading-relaxed mb-8">
              Unser Konzept umfasst <strong className="text-[#0a0a0a]">sechs zentrale Bausteine</strong>:
            </p>
            <div className="space-y-px">
              {BAUSTEINE.map((b, i) => (
                <div key={i} className="bg-[#f5f5f0] p-5 flex items-start gap-4">
                  <span className="font-display text-xl text-[#0a0a0a]/20 shrink-0 leading-none w-7">
                    {i + 1}
                  </span>
                  <p className="text-sm text-[#0a0a0a] leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aufgaben der Vertrauenspersonen */}
        <h3 className="font-display text-3xl tracking-tight mb-8">AUFGABEN DER VERTRAUENSPERSONEN</h3>
        <p className="text-[#6b6b6b] leading-relaxed max-w-3xl mb-8">
          Die Vertrauenspersonen des SV HoSe stehen als Ansprechpartner:innen zur Verfügung. Wenn eine
          Vermutung bzw. ein Verdacht auf sexualisierte Gewalt aufkommt oder geäußert wird, wissen sie,
          was zu tun ist. Celine Goldschalt und Sebastian Daniel kennen sich in den Strukturen aus, sie
          nehmen das Gesagte ernst und gehen behutsam damit um. Hast du ihnen etwas zu sagen?{' '}
          <strong className="text-[#0a0a0a]">Zögere bitte nicht, sie zu kontaktieren!</strong>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Was sie tun */}
          <div className="border border-[#0a0a0a]/10 p-8">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-5">Sie sind zuständig für</div>
            <ul className="space-y-3">
              {AUFGABEN_JA.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#0a0a0a] leading-relaxed">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          {/* Was sie nicht tun */}
          <div className="border border-[#0a0a0a]/10 p-8 bg-[#f5f5f0]">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-5">Sie sind nicht zuständig für</div>
            <ul className="space-y-3">
              {AUFGABEN_NEIN.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#6b6b6b] leading-relaxed">
                  <XCircle size={15} className="text-[#6b6b6b]/60 shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Verhaltenskodex / Grundsätze ── */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] py-20 px-6 mb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Unsere Grundsätze</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-12">SELBSTVERPFLICHTUNG</h2>

          {/* Grundsätze-Grid + Ministeriums-Postkarte nebeneinander */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#f5f5f0]/10 mb-12">
            {[
              {
                titel: 'Sicherheit',
                text: 'Wir sorgen für sichere Räume und Strukturen, in denen sich Kinder und Jugendliche frei entfalten können – ohne Angst vor Grenzüberschreitungen.',
              },
              {
                titel: 'Respekt',
                text: 'Wir behandeln alle Kinder und Jugendlichen mit Würde und Respekt. Diskriminierung, Demütigung oder körperliche Bestrafung haben bei uns keinen Platz.',
              },
              {
                titel: 'Vertrauen',
                text: 'Wir nehmen Signale und Berichte von Betroffenen ernst, handeln konsequent und schützen Hinweisgeber*innen.',
              },
            ].map(item => (
              <div key={item.titel} className="bg-[#0a0a0a] p-8">
                <div className="font-display text-2xl tracking-tight mb-4">{item.titel.toUpperCase()}</div>
                <p className="text-[#6b6b6b] text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Ministeriums-Postkarte "Vertrauen & Schutz" */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-4">
                Ministerium für Soziales, Gesundheit und Gleichstellung
              </div>
              <h3 className="font-display text-3xl tracking-tight mb-4">VERTRAUEN &amp; SCHUTZ</h3>
              <p className="text-[#6b6b6b] text-sm leading-relaxed mb-6">
                Wir sind Teil der niedersächsischen Initiative zum Schutz von Kindern und Jugendlichen
                im Sport. Die offizielle Kampagne des Ministeriums für Soziales, Gesundheit und
                Gleichstellung begleitet unsere Arbeit und stärkt das Bewusstsein für einen
                sicheren Vereinssport.
              </p>
              <a
                href="/Schutzkonzepte/ministerium-postkarte-vertrauenderschutz-DRUCK-3mm-Anschnitt_2.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[#f5f5f0]/30 text-[#f5f5f0] px-5 py-2.5 text-xs tracking-[0.1em] uppercase hover:border-[#f5f5f0] transition-colors"
              >
                Infokarte herunterladen <ArrowRight size={13} />
              </a>
            </div>
            <div className="overflow-hidden">
              <Image
                src="/Schutzkonzepte/schutzkonzepte2.png"
                alt="Vertrauen & Schutz – Ministerium Niedersachsen"
                width={800}
                height={560}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Fakten-Kacheln ── */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-6">Auf einen Blick</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          {FAKTEN.map((f) => (
            <div key={f.titel} className="bg-[#f5f5f0] p-8">
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">{f.titel}</div>
              <p className="text-sm text-[#0a0a0a] leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dokumente & Downloads ── */}
      <div className="px-6 max-w-7xl mx-auto mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Zum Herunterladen</div>
        <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-12">DOKUMENTE</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#0a0a0a]/10">

          {/* Selbstverpflichtungserklärung */}
          <div className="bg-[#f5f5f0] p-8 flex flex-col">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Dokument</div>
            <h3 className="font-display text-xl tracking-tight mb-4 leading-snug">SELBSTVERPFLICHTUNGS&shy;ERKLÄRUNG</h3>
            <p className="text-[#6b6b6b] text-sm leading-relaxed mb-6 flex-1">
              Alle Trainer*innen, Betreuer*innen und ehrenamtlich Tätigen unterzeichnen unsere
              Selbstverpflichtungserklärung für einen respektvollen Umgang mit Minderjährigen.
            </p>
            <a
              href="/pdfs/Selbstverpflichtungserklaerung.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-5 py-3 text-xs tracking-[0.1em] uppercase hover:bg-[#1a1a1a] transition-colors self-start"
            >
              PDF herunterladen <ArrowRight size={13} />
            </a>
          </div>

          {/* Leitfaden Ausgezeichnet */}
          <div className="bg-[#f5f5f0] p-8 flex flex-col">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Leitfaden</div>
            <h3 className="font-display text-xl tracking-tight mb-4 leading-snug">LEITFADEN<br />AUSGEZEICHNET</h3>
            <p className="text-[#6b6b6b] text-sm leading-relaxed mb-6 flex-1">
              Der offizielle Leitfaden des Kinderschutzbundes und des Kreissportbundes zum
              Schutzkonzept-Pilotprojekt – Grundlage unserer Präventionsarbeit seit 2023.
            </p>
            <a
              href="/Schutzkonzepte/00_LEITFADEN__AUSGEZEICHNET_ab_2023.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-5 py-3 text-xs tracking-[0.1em] uppercase hover:bg-[#1a1a1a] transition-colors self-start"
            >
              PDF herunterladen <ArrowRight size={13} />
            </a>
          </div>

          {/* Ministeriums-Infokarte */}
          <div className="bg-[#f5f5f0] p-8 flex flex-col">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Infokarte</div>
            <h3 className="font-display text-xl tracking-tight mb-4 leading-snug">VERTRAUEN<br />&amp; SCHUTZ</h3>
            <p className="text-[#6b6b6b] text-sm leading-relaxed mb-6 flex-1">
              Die offizielle Informationskarte des Niedersächsischen Ministeriums für Soziales,
              Gesundheit und Gleichstellung zur Kampagne „Vertrauen &amp; Schutz im Vereinssport".
            </p>
            <a
              href="/Schutzkonzepte/ministerium-postkarte-vertrauenderschutz-DRUCK-3mm-Anschnitt_2.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-5 py-3 text-xs tracking-[0.1em] uppercase hover:bg-[#1a1a1a] transition-colors self-start"
            >
              PDF herunterladen <ArrowRight size={13} />
            </a>
          </div>

        </div>
      </div>

      {/* ── Ansprechpartner / Kontakt ── */}
      <div className="px-6 max-w-4xl mx-auto">
        <div className="border border-[#0a0a0a]/10 p-8 md:p-10">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Kontakt</div>
          <h3 className="font-display text-3xl tracking-tight mb-4">FRAGEN & ANLIEGEN</h3>
          <p className="text-[#6b6b6b] text-sm leading-relaxed mb-6">
            Wenn du Fragen zu unserem Kinderschutzkonzept hast oder ein Anliegen melden möchtest,
            wende dich bitte vertrauensvoll an unsere Vertrauenspersonen oder den Vorstand.
            Wir nehmen alle Hinweise ernst und behandeln sie selbstverständlich vertraulich.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:saad.fidaoui@sv-holm-seppensen.de"
              className="inline-flex items-center gap-2 border border-[#0a0a0a] px-6 py-3 text-sm tracking-[0.1em] uppercase hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-colors"
            >
              <Mail size={14} /> E-Mail schreiben
            </a>
            <Link
              href="/ansprechpartner"
              className="inline-flex items-center gap-2 border border-[#0a0a0a]/20 px-6 py-3 text-sm tracking-[0.1em] uppercase text-[#6b6b6b] hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition-colors"
            >
              Alle Ansprechpartner <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
