import Link from 'next/link'
import type { Metadata } from 'next'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight, Search } from 'lucide-react'
import { getAllNews, getAnsprechpartner, getDownloads, getSparten, getTermine } from '@/lib/content'
import { passtZurSuche, suchtext } from '@/lib/verwaltung/suche'
import { FOERDERVEREIN_START } from '@/lib/foerderverein'

export const metadata: Metadata = { title: 'Suche' }

// Liest bei jedem Aufruf direkt aus der Datenbank – neue Inhalte sind sofort auffindbar.
export const dynamic = 'force-dynamic'

type Treffer = { href: string; titel: string; zusatz?: string; extern?: boolean }

// Seiten ohne Datenbankinhalt, damit z. B. „Kinderschutz“ oder „Impressum“ gefunden werden
const SEITEN: (Treffer & { stichworte: string })[] = [
  { href: '/ueber-uns', titel: 'Über uns', stichworte: 'verein geschichte mitglied werden' },
  { href: '/sportplaetze', titel: 'Sportplätze', stichworte: 'anfahrt adresse karte halle platz' },
  { href: '/kinderschutz', titel: 'Kinderschutz', stichworte: 'schutzkonzept ansprechperson' },
  { href: '/trainingszeiten', titel: 'Trainingszeiten', stichworte: 'training zeiten wann' },
  { href: '/termine', titel: 'Termine', stichworte: 'veranstaltungen kalender' },
  { href: '/downloads', titel: 'Downloads', stichworte: 'aufnahmeantrag formulare mitglied werden' },
  { href: '/ansprechpartner', titel: 'Kontakt & Ansprechpartner', stichworte: 'vorstand email telefon' },
  { href: FOERDERVEREIN_START, titel: 'Förderverein', stichworte: 'unterstuetzen sportplatz' },
  { href: '/foerderverein/spenden', titel: 'Spenden an den Förderverein', stichworte: 'spenden konto iban bankverbindung kontoverbindung spendenbescheinigung spendenquittung zuwendungsbestätigung steuer' },
  { href: '/fussball', titel: 'Fußball-Spielpläne', stichworte: 'spiele ergebnisse tabelle' },
  { href: '/tischtennis', titel: 'Tischtennis-Spielpläne', stichworte: 'spiele ergebnisse tabelle' },
  { href: '/impressum', titel: 'Impressum', stichworte: '' },
  { href: '/datenschutz', titel: 'Datenschutz', stichworte: 'cookies' },
]

const MAX_PRO_GRUPPE = 10

function datum(text: string | null) {
  return text ? format(new Date(text), 'd. MMMM yyyy', { locale: de }) : undefined
}

export default async function SuchSeite({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const eingabe = ((await searchParams).q ?? '').trim()

  let gruppen: { titel: string; treffer: Treffer[] }[] = []
  if (eingabe) {
    const [sparten, news, termine, downloads, kontakte] = await Promise.all([
      getSparten(), getAllNews(), getTermine(), getDownloads(), getAnsprechpartner(),
    ])
    const passt = (...teile: (string | null | undefined)[]) => passtZurSuche(suchtext(...teile), eingabe)

    gruppen = [
      {
        titel: 'Seiten',
        treffer: SEITEN.filter(s => passt(s.titel, s.stichworte)),
      },
      {
        titel: 'Sparten',
        treffer: sparten
          .filter(s => passt(s.name, s.beschreibung))
          .map(s => ({ href: `/sparten/${s.slug}`, titel: s.name, zusatz: s.beschreibung })),
      },
      {
        titel: 'News',
        treffer: news
          .filter(n => passt(n.title, n.excerpt, n.body, n.category, n.sparte))
          .map(n => ({ href: `/news/${n.slug}`, titel: n.title, zusatz: `${n.sparte} — ${datum(n.date)}` })),
      },
      {
        titel: 'Termine',
        treffer: termine
          .filter(t => passt(t.titel, t.beschreibung, t.ort, t.sparte, ...t.tags))
          .map(t => ({ href: '/termine', titel: t.titel, zusatz: [datum(t.datum), t.ort].filter(Boolean).join(' · ') })),
      },
      {
        titel: 'Downloads',
        treffer: downloads
          .filter(d => passt(d.titel, d.beschreibung, d.kategorie))
          .map(d => ({ href: d.datei, titel: d.titel, zusatz: d.beschreibung, extern: true })),
      },
      {
        titel: 'Ansprechpartner',
        treffer: kontakte
          .filter(k => passt(k.name, k.funktion, k.gruppe))
          .map(k => ({ href: '/ansprechpartner', titel: k.name, zusatz: k.funktion })),
      },
    ].filter(g => g.treffer.length > 0)
  }

  const anzahl = gruppen.reduce((summe, g) => summe + g.treffer.length, 0)

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="mb-12">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Website durchsuchen</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">SUCHE</h1>
      </div>

      <form action="/suche" role="search" className="flex gap-2 mb-12">
        <label htmlFor="suche-eingabe" className="sr-only">Suchbegriff</label>
        <input
          id="suche-eingabe"
          name="q"
          type="search"
          defaultValue={eingabe}
          placeholder="z. B. Fußball, Aufnahmeantrag, Sommerfest"
          autoFocus
          className="flex-1 min-w-0 bg-transparent border border-[#0a0a0a]/20 px-4 py-3 text-base focus:outline-none focus:border-[#0a0a0a]"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-6 text-sm tracking-[0.1em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          <Search size={16} aria-hidden /> <span className="hidden sm:inline">Suchen</span>
        </button>
      </form>

      {eingabe && (
        <p className="text-sm text-[#6b6b6b] mb-10" aria-live="polite">
          {anzahl === 0
            ? <>Keine Treffer für „{eingabe}“. Versuch es mit einem anderen Begriff.</>
            : <>{anzahl} Treffer für „{eingabe}“</>}
        </p>
      )}

      <div className="space-y-12">
        {gruppen.map(g => (
          <section key={g.titel}>
            <h2 className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-4">
              {g.titel} <span className="text-[#0a0a0a]/40">({g.treffer.length})</span>
            </h2>
            <ul className="glas-karte overflow-hidden divide-y divide-[#0a0a0a]/[0.07]">
              {g.treffer.slice(0, MAX_PRO_GRUPPE).map(t => {
                const inhalt = (
                  <>
                    <div className="min-w-0">
                      <div className="font-display text-xl tracking-tight leading-tight group-hover:underline underline-offset-4">{t.titel}</div>
                      {t.zusatz && <div className="text-sm text-[#6b6b6b] mt-1 line-clamp-1">{t.zusatz}</div>}
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-[#6b6b6b] group-hover:text-[#0a0a0a]" aria-hidden />
                  </>
                )
                const klasse = 'group flex items-center justify-between gap-4 px-5 sm:px-7 py-4 transition-colors hover:bg-[#ffffff]/50'
                return (
                  <li key={`${t.href}-${t.titel}`}>
                    {t.extern
                      ? <a href={t.href} target="_blank" rel="noopener noreferrer" className={klasse}>{inhalt}</a>
                      : <Link href={t.href} className={klasse}>{inhalt}</Link>}
                  </li>
                )
              })}
            </ul>
            {g.treffer.length > MAX_PRO_GRUPPE && (
              <p className="text-xs text-[#6b6b6b] mt-3">
                {g.treffer.length - MAX_PRO_GRUPPE} weitere – grenze die Suche mit einem zweiten Wort ein.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
