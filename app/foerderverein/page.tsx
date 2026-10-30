import Link from 'next/link'
import type { Metadata } from 'next'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight, Download, FileText, Mail } from 'lucide-react'
import NewsThumbnail from '@/components/NewsThumbnail'
import { getAllNews, getDownloads } from '@/lib/content'
import { istFoerderverein } from '@/lib/foerderverein'

// ─── Förderverein Sportplatz des SV Holm-Seppensen e.V. ──────────────────────
// Eigene Seite für den Förderverein; seine alte Website (fshose.de) wird nicht mehr gepflegt.
// Der SV stellt den Förderverein hier vor. Feste Angaben stehen gesammelt hier oben. Was sich
// öfter ändert, kommt aus der Verwaltung: News und Downloads mit der Kategorie "Förderverein"
// (lib/foerderverein.ts) erscheinen automatisch auf dieser Seite.

export const metadata: Metadata = {
  title: 'Förderverein',
  description: 'Der Förderverein Sportplatz des SV Holm-Seppensen e.V. unterstützt den Verein beim Bau und Ausbau der Sportanlage am Tostedter Weg.',
}

// News und Downloads frisch aus der Datenbank
export const dynamic = 'force-dynamic'

// Quellen: alte Website fshose.de (Impressum; Beitrag aus dem Artikel „Unsere Unterstützer“, 2014)
// und der SV-Artikel „Unsere 3 Vereinshelden!“ vom 23.08.2026 (Vorsitz). Beitrag vor der
// Veröffentlichung mit dem Förderverein abgleichen.
const VEREIN = {
  name: 'Förderverein Sportplatz des SV Holm-Seppensen e.V.',
  register: 'Amtsgericht Tostedt, VR 200219',
  email: 'info@fshose.de',
  vorsitz: 'Jörg Passlack',
  beitrag: 'zuletzt 24 € im Jahr, Kinder und Jugendliche bis 18 Jahre beitragsfrei',
}

// Geschützte Leerzeichen ( ), damit Zahl und Einheit nicht getrennt umbrechen
const ZAHLEN = [
  { zahl: '2,9 ha', text: 'Gelände am Tostedter Weg' },
  { zahl: 'ca. 12.000 m³', text: 'Erde bewegt' },
  { zahl: '2017', text: 'Spatenstich' },
  { zahl: 'knapp 50', text: 'neue Mitglieder allein 2013' },
]

const GESCHICHTE = [
  {
    zeit: 'Die Idee',
    titel: 'Eltern gründen den Förderverein',
    text: 'Eltern der damaligen E1-Jugend (U11) wollten ihren Kindern und den nächsten Jahrgängen ein besseres sportliches Umfeld bieten. Ihr Ziel: ein eigener Sportplatz für Holm-Seppensen.',
  },
  {
    zeit: '2013',
    titel: 'Jeder Quadratmeter zählt',
    text: 'Brunsberglauf, Glühweinstand, Stadtfest und symbolische Patenschaften für Quadratmeter des künftigen Platzes: Allein 2013 kamen knapp 50 neue Mitglieder dazu.',
  },
  {
    zeit: '2014',
    titel: 'Gemeinsam für Holm-Seppensen',
    text: 'Geschäfte im Ort spenden beim Kauf ausgewählter Produkte einen Teil des Erlöses für den Sportplatz. Bei der Baustellenbesichtigung des neuen REWE-Markts kamen in vier Stunden 400 € an Spenden zusammen.',
  },
  {
    zeit: 'Oktober 2017',
    titel: 'Spatenstich am Tostedter Weg',
    text: 'Die Stadt Buchholz hat ein 2,9 Hektar großes Gelände gekauft und stellt es dem SV zur Verfügung. Am 27. Oktober 2017 ist Spatenstich – danach werden rund 12.000 m³ Erde bewegt.',
  },
  {
    zeit: '2018',
    titel: 'Platz und Vereinshaus entstehen',
    text: 'Gebaut werden ein Naturrasenplatz mit Flutlicht und Beregnung und der erste Teil des Vereinshauses mit Umkleiden und Vereinsraum. Ehrenamtliche bepflanzen den Wall und setzen die Hecke – so bleiben die Kosten im Rahmen.',
  },
  {
    zeit: 'Heute',
    titel: 'Der Platz ist da',
    text: 'Am Tostedter Weg hat der SV heute seine eigene Sportstätte mit Rasenplatz und Vereinsheim. Die Bandenwerbung rund um den Platz soll den weiteren Ausbau mitfinanzieren.',
  },
]

const HELFEN = [
  {
    titel: 'Mitglied werden',
    text: `Der Jahresbeitrag ist klein (${VEREIN.beitrag}). Den aktuellen Stand nennt dir der Förderverein. Jedes Mitglied stärkt ihn.`,
  },
  {
    titel: 'Spenden',
    text: 'Spenden helfen beim weiteren Ausbau der Sportanlage. Schreib dem Förderverein – du bekommst die Kontoverbindung.',
  },
  {
    titel: 'Bandenwerbung',
    text: 'Unternehmen können Werbeflächen an den Banden rund um den Fußballplatz mieten. Der Förderverein stellt gern den Kontakt her.',
  },
  {
    titel: 'Mit anpacken',
    text: 'Ob Stand beim Fest, Arbeitseinsatz auf dem Gelände oder eine gute Idee: Helfende Hände sind immer willkommen.',
  },
]

const IDEEN = ['Größeres Vereinshaus mit vier Umkleiden und Gymnastikraum', 'Beachvolleyballfeld', 'Laufbahn', 'Bocciaanlage', 'Zusätzlicher Trainingsplatz']

/** Downloads, die in den Kasten "Beitrittserklärung" gehören – alle anderen stehen unter "Unterlagen". */
const BEITRITT = /beitritt|mitglied|aufnahme/i

const KNOPF_HELL =
  'inline-flex items-center gap-2 bg-[#f5f5f0] text-[#0a0a0a] px-6 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-white transition-colors'

export default async function FoerdervereinPage() {
  const [news, downloads] = await Promise.all([getAllNews(), getDownloads()])
  const fvNews = news.filter(n => istFoerderverein(n.category)).slice(0, 3)
  const fvDownloads = downloads.filter(d => istFoerderverein(d.kategorie))
  const beitritt = fvDownloads.filter(d => BEITRITT.test(d.titel))
  const unterlagen = fvDownloads.filter(d => !BEITRITT.test(d.titel))
  // Bei 1–2 News keine leeren Rasterzellen
  const newsSpalten = fvNews.length === 1 ? 'max-w-md' : fvNews.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="pt-32 pb-24">
      {/* Hero */}
      <div className="px-6 max-w-7xl mx-auto mb-24">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Gemeinsam für Holm-Seppensen</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-12 break-words hyphens-auto">FÖRDERVEREIN</h1>
        <div className="max-w-2xl space-y-8">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            Der {VEREIN.name} sammelt Geld, Ideen und helfende Hände für die Sportanlage des SV. Sein großes Ziel ist erreicht: Am Tostedter Weg
            hat der SV heute seinen eigenen Rasenplatz – geschafft mit der Stadt Buchholz, vielen Spender:innen und Helfer:innen. Und es geht
            weiter.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#helfen"
              className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Unterstützen <ArrowRight size={16} className="shrink-0" />
            </a>
            <a
              href="#kontakt"
              className="inline-flex items-center gap-2 border border-[#0a0a0a]/20 px-8 py-4 text-sm tracking-[0.1em] uppercase font-medium hover:border-[#0a0a0a] transition-colors"
            >
              Kontakt
            </a>
          </div>
        </div>
      </div>

      {/* Wer wir sind */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#f5f5f0]/60 mb-6">Über den Förderverein</div>
            <h2 className="font-display text-5xl tracking-tight mb-8">EIN PLATZ FÜR UNSER DORF.</h2>
            <p className="text-[#f5f5f0]/70 leading-relaxed mb-6">
              Holm-Seppensen hatte Schule, Kindergärten und Kulturbahnhof – aber keinen eigenen Sportplatz. Der Platz an der Mühlenschule stand dem
              Verein nur eingeschränkt zur Verfügung, während die Kinder- und Jugendfußballsparte immer weiter wuchs.
            </p>
            <p className="text-[#f5f5f0]/70 leading-relaxed">
              Der Förderverein ist ein eigenständiger, eingetragener Verein. Über Jahre hat er Spenden gesammelt, Patenschaften vermittelt und mit
              angepackt, damit der SV seine Sportanlage bekommt.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#f5f5f0]/10">
            {ZAHLEN.map(item => (
              <div key={item.text} className="bg-[#0a0a0a] p-6 md:p-8 text-center">
                <div className="font-display text-3xl md:text-4xl lg:text-5xl whitespace-nowrap text-[#f5f5f0] mb-2">{item.zahl}</div>
                <div className="text-[11px] tracking-[0.15em] uppercase text-[#f5f5f0]/60">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geschichte */}
      <div className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Geschichte</div>
        <h2 className="font-display text-5xl tracking-tight mb-12">VON DER IDEE ZUM EIGENEN PLATZ</h2>
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          {GESCHICHTE.map(schritt => (
            <li key={schritt.titel} className="bg-[#f5f5f0] p-8">
              <div className="text-xs tracking-[0.15em] uppercase text-[#6b6b6b] mb-3">{schritt.zeit}</div>
              <h3 className="font-display text-2xl tracking-tight mb-3">{schritt.titel}</h3>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">{schritt.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div>
            <h3 className="font-display text-2xl tracking-tight mb-2">IDEEN FÜR DIE ZUKUNFT</h3>
            <p className="text-sm text-[#6b6b6b] leading-relaxed">Auf dem Gelände ist Platz für mehr. Bei der Planung 2017 standen diese Ideen auf der Liste:</p>
          </div>
          <ul className="md:col-span-2 flex flex-wrap gap-2">
            {IDEEN.map(idee => (
              <li key={idee} className="border border-[#0a0a0a]/15 px-4 py-2 text-sm">
                {idee}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* So kannst du helfen */}
      <div id="helfen" className="bg-[#0a0a0a]/[0.03] py-24 px-6 scroll-mt-36">
        <div className="max-w-7xl mx-auto">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Mitglied werden & spenden</div>
          <h2 className="font-display text-5xl tracking-tight mb-12">SO KANNST DU HELFEN</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#0a0a0a]/10">
            {HELFEN.map(weg => (
              <div key={weg.titel} className="bg-[#f5f5f0] p-8">
                <h3 className="font-display text-2xl tracking-tight mb-3">{weg.titel}</h3>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">{weg.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-[#0a0a0a] text-[#f5f5f0] p-8 md:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="min-w-0">
              <h3 className="font-display text-3xl md:text-4xl tracking-tight mb-2 break-words">BEITRITTS&shy;ERKLÄRUNG</h3>
              <p className="text-[#f5f5f0]/70">
                {beitritt.length > 0
                  ? `Herunterladen, ausfüllen, unterschreiben und per E-Mail an ${VEREIN.email} schicken.`
                  : 'Schreib dem Förderverein eine kurze E-Mail – du bekommst die Beitrittserklärung zugeschickt.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 min-w-0 lg:max-w-sm">
              {beitritt.length > 0 ? (
                beitritt.map(d => (
                  <a key={d.id} href={d.datei} target="_blank" rel="noopener noreferrer" className={KNOPF_HELL}>
                    <Download size={16} className="shrink-0" /> <span className="min-w-0 break-words">{d.titel}</span>
                  </a>
                ))
              ) : (
                <a href={`mailto:${VEREIN.email}?subject=${encodeURIComponent('Mitgliedschaft im Förderverein')}`} className={KNOPF_HELL}>
                  <Mail size={16} className="shrink-0" /> E-Mail schreiben
                </a>
              )}
            </div>
          </div>

          {unterlagen.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-2xl tracking-tight mb-4">UNTERLAGEN</h3>
              <ul className="divide-y divide-[#0a0a0a]/10 border-y border-[#0a0a0a]/10">
                {unterlagen.map(d => (
                  <li key={d.id}>
                    <a href={d.datei} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 py-4 hover:text-[#6b6b6b] transition-colors">
                      <FileText size={18} className="shrink-0 mt-0.5" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium break-words">{d.titel}</span>
                        {d.beschreibung && <span className="block text-sm text-[#6b6b6b]">{d.beschreibung}</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Aktionen & Neuigkeiten – nur, wenn es News mit der Kategorie "Förderverein" gibt */}
      {fvNews.length > 0 && (
        <div className="py-24 px-6 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Aktionen & Neuigkeiten</div>
              <h2 className="font-display text-5xl tracking-tight">AUS DEM FÖRDERVEREIN</h2>
            </div>
            <Link href="/news" className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]">
              Alle News <ArrowRight size={14} className="shrink-0" />
            </Link>
          </div>
          <div className={`grid grid-cols-1 ${newsSpalten} gap-px bg-[#0a0a0a]/10`}>
            {fvNews.map(post => (
              <Link
                key={post.slug}
                href={`/news/${post.slug}`}
                className="bg-[#f5f5f0] group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-300 flex flex-col"
              >
                <NewsThumbnail bild={post.image} alt={post.title} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                <div className="p-8 flex flex-col flex-1">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] group-hover:text-[#f5f5f0]/50 mb-4">
                    {format(new Date(post.date), 'd. MMMM yyyy', { locale: de })}
                  </div>
                  <h3 className="font-display text-2xl tracking-tight leading-tight mb-4">{post.title}</h3>
                  <p className="text-sm text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 leading-relaxed flex-1">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Kontakt */}
      <div id="kontakt" className="py-24 px-6 max-w-7xl mx-auto scroll-mt-36">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Vorstand & Kontakt</div>
        <h2 className="font-display text-5xl tracking-tight mb-12">SO ERREICHST DU DEN FÖRDERVEREIN</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#0a0a0a]/10">
          <div className="bg-[#f5f5f0] p-8">
            <h3 className="font-display text-2xl tracking-tight mb-4">Vorstand</h3>
            <p className="text-sm">
              <span className="text-[#6b6b6b]">Vorsitzender:</span> {VEREIN.vorsitz}
            </p>
            <p className="mt-3 text-sm text-[#6b6b6b] leading-relaxed">Den ganzen Vorstand nennt dir der Förderverein gern per E-Mail.</p>
          </div>
          <div className="bg-[#f5f5f0] p-8">
            <h3 className="font-display text-2xl tracking-tight mb-4">E-Mail</h3>
            <a href={`mailto:${VEREIN.email}`} className="inline-flex items-center gap-2 text-sm underline underline-offset-4 break-all hover:text-[#6b6b6b]">
              <Mail size={14} className="shrink-0" /> {VEREIN.email}
            </a>
            <p className="mt-4 text-sm text-[#6b6b6b] leading-relaxed">Oder sprich die Ansprechpartner:innen des SV an – sie stellen gern den Kontakt her.</p>
            <Link href="/ansprechpartner" className="mt-3 inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a]">
              Zu den Ansprechpartner:innen <ArrowRight size={12} className="shrink-0" />
            </Link>
          </div>
          <div className="bg-[#f5f5f0] p-8">
            <h3 className="font-display text-2xl tracking-tight mb-4">Der Verein</h3>
            <p className="text-sm leading-relaxed">{VEREIN.name}</p>
            <p className="mt-2 text-sm text-[#6b6b6b] leading-relaxed">Eingetragen beim {VEREIN.register}.</p>
            <p className="mt-4 text-sm text-[#6b6b6b] leading-relaxed">
              Diese Seite stellt der SV Holm-Seppensen e.V. für den Förderverein bereit. Mitgliedschaft und Spenden laufen direkt über den
              Förderverein.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
