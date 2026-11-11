import Link from 'next/link'
import type { Metadata } from 'next'
import { Search } from 'lucide-react'
import Treffer from '@/components/suche/Treffer'
import s from '@/components/suche/Suche.module.css'
import { suchen } from '@/lib/suche/suchen'
import { ART_NAMEN, istSuchArt, SUCH_ARTEN, type SuchArt } from '@/lib/suche/typen'

// Suchergebnisse gehören nicht in Suchmaschinen – die Seiten selbst schon
export const metadata: Metadata = { title: 'Suche', robots: { index: false, follow: true } }

// Liest bei jedem Aufruf direkt aus der Datenbank – neue Inhalte sind sofort auffindbar.
export const dynamic = 'force-dynamic'

/** So viele Treffer stehen zuerst da, "Weitere Treffer" zeigt jeweils so viele mehr. */
const SCHRITT = 30
const HOECHSTENS = 300

/** Ohne Suchbegriff: die Seiten, nach denen am häufigsten gefragt wird */
const HAEUFIG: { href: string; label: string }[] = [
  { href: '/trainingszeiten', label: 'Trainingszeiten' },
  { href: '/termine', label: 'Termine' },
  { href: '/downloads', label: 'Mitglied werden' },
  { href: '/vereinsheim', label: 'Vereinsheim mieten' },
  { href: '/sportplaetze', label: 'Sportplätze' },
  { href: '/kinderschutz', label: 'Kinderschutz' },
  { href: '/ansprechpartner', label: 'Kontakt' },
]

function suchAdresse(q: string, art?: SuchArt | null, anzahl?: number): string {
  const p = new URLSearchParams({ q })
  if (art) p.set('art', art)
  if (anzahl) p.set('n', String(anzahl))
  return `/suche?${p}`
}

export default async function SuchSeite({ searchParams }: { searchParams: Promise<{ q?: string; art?: string; n?: string }> }) {
  const params = await searchParams
  const eingabe = (params.q ?? '').trim().slice(0, 120)
  const art = istSuchArt(params.art) ? params.art : null
  const grenze = Math.min(Math.max(Number(params.n) || SCHRITT, SCHRITT), HOECHSTENS)

  const ergebnis = eingabe ? await suchen(eingabe, { art, grenze }) : null
  const gesamt = ergebnis ? Object.values(ergebnis.proArt).reduce((a, b) => a + b, 0) : 0
  const arten = SUCH_ARTEN.filter(a => ergebnis?.proArt[a])

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="mb-10">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Website durchsuchen</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">SUCHE</h1>
      </div>

      <form action="/suche" role="search" className={`${s.formular} mb-8`}>
        <Search aria-hidden="true" />
        <label htmlFor="suche-eingabe" className="sr-only">Suchbegriff</label>
        <input
          id="suche-eingabe"
          name="q"
          type="search"
          defaultValue={eingabe}
          placeholder="Wonach suchst du? z. B. Judo, Aufnahmeantrag, Sommerfest"
          autoComplete="off"
          enterKeyHint="search"
          // Mit Ergebnissen nicht: Am Handy klappte sonst gleich die Tastatur über die Treffer
          autoFocus={!eingabe}
          className={s.eingabe}
        />
        <button type="submit" className={s.knopf}>
          <Search size={16} aria-hidden="true" /> <span>Suchen</span>
        </button>
      </form>

      {!ergebnis && (
        <section aria-labelledby="haeufig">
          <h2 id="haeufig" className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-4">Häufig gesucht</h2>
          <ul className={s.filter}>
            {HAEUFIG.map(z => (
              <li key={z.href}>
                <Link href={z.href} className={s.chip}>{z.label}</Link>
              </li>
            ))}
          </ul>
          <p className={`${s.hinweis} mt-8`}>
            Die Suche findet alles, was auf der Website steht: News, Sparten und Mannschaften, Trainingszeiten,
            Termine, Ansprechpartner:innen, Downloads und die Texte aller Seiten. Mit <b>Strg + K</b> (am Mac{' '}
            <b>⌘ + K</b>) öffnest du sie auf jeder Seite.
          </p>
        </section>
      )}

      {ergebnis && (
        <>
          <div className={`${s.hinweis} mb-6`} aria-live="polite">
            {gesamt === 0 ? (
              <>
                Keine Treffer für <b>„{eingabe}“</b>. Versuch es mit einem anderen oder kürzeren Begriff – oder schau
                unter{' '}
                {HAEUFIG.slice(0, 3).map((z, i) => (
                  <span key={z.href}>
                    {i > 0 && ', '}
                    <Link href={z.href}>{z.label}</Link>
                  </span>
                ))}
                .
              </>
            ) : ergebnis.korrektur ? (
              <>
                Keine Treffer für „{eingabe}“ – {gesamt} Treffer für <b>„{ergebnis.korrektur}“</b>
              </>
            ) : ergebnis.teilweise ? (
              <>
                Keine Seite enthält alle Wörter aus „{eingabe}“ – {gesamt} Treffer mit einem Teil davon
              </>
            ) : (
              <>
                {gesamt} Treffer für <b>„{eingabe}“</b>
              </>
            )}
          </div>

          {arten.length > 1 && (
            <nav aria-label="Treffer filtern" className="mb-8">
              <ul className={s.filter}>
                <li>
                  <Link href={suchAdresse(eingabe)} className={s.chip} aria-current={art === null ? 'true' : undefined}>
                    Alle <small>{gesamt}</small>
                  </Link>
                </li>
                {arten.map(a => (
                  <li key={a}>
                    <Link href={suchAdresse(eingabe, a)} className={s.chip} aria-current={art === a ? 'true' : undefined}>
                      {ART_NAMEN[a].mehrere} <small>{ergebnis.proArt[a]}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {art && !ergebnis.proArt[art] && gesamt > 0 && (
            <p className={s.hinweis}>
              Keine {ART_NAMEN[art].mehrere} unter den Treffern. <Link href={suchAdresse(eingabe)}>Alle Treffer zeigen</Link>
            </p>
          )}

          <ul className={s.liste}>
            {ergebnis.treffer.map(t => (
              <li key={t.id}>
                <Treffer treffer={t} />
              </li>
            ))}
          </ul>

          {ergebnis.anzahl > ergebnis.treffer.length && (
            <p className="mt-8 text-center">
              <Link href={suchAdresse(eingabe, art, ergebnis.treffer.length + SCHRITT)} className={s.chip} scroll={false}>
                Weitere Treffer anzeigen <small>{ergebnis.anzahl - ergebnis.treffer.length}</small>
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
