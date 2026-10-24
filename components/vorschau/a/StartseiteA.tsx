import Link from 'next/link'
import Image from 'next/image'
import type { NewsPost } from '@/lib/content'
import { spielInfo, type StartseitenDaten } from '@/lib/vorschau'
import basis from './basisA.module.css'
import s from './StartseiteA.module.css'
import HeroVideoA from './HeroVideoA'
import SpielplanA from './SpielplanA'
import { IconKalender, IconPfeil, IconPin } from './IconsA'
import {
  eigenerName,
  kurzDatum,
  kurzUhrzeit,
  kuerzel,
  langDatum,
  ortText,
  sportAus,
  spielKarten,
  spielplanLink,
} from './hilfenA'

// ─── Startseite Design A (Matchday) ──────────────────────────────────────────
// Dunkel und sportlich: Hero mit Video und nächstem Spiel, Zahlenleiste, Spielplan mit
// Filtern, News, Sparten und Mitmachen-Block. Das Wurzelelement trägt data-a-startseite,
// damit die Regeln für Unterseiten aus app/vorschau-a.css hier nicht greifen.

/** Höchstens so viele Termine im Spielplan der Startseite */
const SPIELPLAN_MAX = 24
const LOGO = '/SV_Holm_Seppensen_Logo.svg'

export default function StartseiteA({ daten }: { daten: StartseitenDaten }) {
  const { news, termine, sparten, zahlen, heute } = daten
  const karten = spielKarten(termine.slice(0, SPIELPLAN_MAX), heute)
  const [aufmacher, ...weitere] = news
  const liste = weitere.slice(0, 3)

  const kennzahlen = [
    zahlen.sparten > 0 ? `${zahlen.sparten} Sparten` : null,
    zahlen.mannschaften > 0 ? `${zahlen.mannschaften} Mannschaften` : null,
  ].filter(Boolean)

  return (
    <div data-a-startseite="" className={s.seite}>
      {/* ── Hero mit Video (schwarz-weiß) und nächstem Spiel ── */}
      <header className={s.hero}>
        <HeroVideoA className={s.video} />
        <div className={`${basis.wrap} ${s.heroGrid}`}>
          <div className={s.heroText}>
            <span className={basis.eyebrow}>Sportverein in der Lüneburger Heide</span>
            <h1 className={`${basis.cond} ${s.h1}`}>
              Gemeinsam
              <br />
              <em>stark.</em>
            </h1>
            <p className={s.lead}>
              {kennzahlen.length > 0 ? `${kennzahlen.join(', ')}, ein Verein` : 'Ein Verein'} – mit Sport für alle
              Generationen.
            </p>
            <div className={s.actions}>
              <a href="#sparten" className={`${basis.btn} ${basis.btnAccent}`}>
                Sparte finden <IconPfeil />
              </a>
              <a href="#spielplan" className={`${basis.btn} ${basis.btnGhost}`}>
                Spielplan ansehen
              </a>
            </div>
          </div>

          <NaechstesSpiel daten={daten} />
        </div>
      </header>

      {/* ── Zahlenleiste ── */}
      <div className={s.stats}>
        <div className={`${basis.wrap} ${s.statsWrap}`}>
          <div className={s.stat}>
            <b>{zahlen.sparten}</b>
            <span>Sparten</span>
          </div>
          <div className={s.stat}>
            <b>{zahlen.mannschaften}</b>
            <span>Mannschaften</span>
          </div>
          <div className={`${s.stat} ${s.statBreit}`}>
            <b>2</b>
            <span>
              Spielpläne live:{' '}
              <Link href="/fussball" className={s.statLink}>
                Fußball
              </Link>{' '}
              &amp;{' '}
              <Link href="/tischtennis" className={s.statLink}>
                Tischtennis
              </Link>
            </span>
          </div>
          <Link href="/kinderschutz" className={`${s.stat} ${s.badge}`}>
            <Image
              src="/Schutzkonzepte/schutzkonzepte1.jpg"
              alt="Kinderschutz-Siegel"
              width={152}
              height={44}
              sizes="152px"
            />
            <span>
              Ausgezeichnetes
              <br />
              Kinderschutzkonzept
            </span>
          </Link>
        </div>
      </div>

      {/* ── Spielplan ── */}
      <section id="spielplan" className={s.abschnitt} aria-labelledby="a-titel-spielplan">
        <div className={basis.wrap}>
          <div className={s.head}>
            <div>
              <span className={basis.eyebrow}>Spielplan</span>
              <h2 id="a-titel-spielplan" className={`${basis.cond} ${s.h2}`}>
                Nächste Spiele
              </h2>
            </div>
            <Link href="/termine" className={basis.more}>
              Alle Termine →
            </Link>
          </div>
          <SpielplanA karten={karten} />
        </div>
      </section>

      {/* ── News ── */}
      <section id="news" className={`${s.abschnitt} ${s.ohneOben}`} aria-labelledby="a-titel-news">
        <div className={basis.wrap}>
          <div className={s.head}>
            <div>
              <span className={basis.eyebrow}>Aktuelles</span>
              <h2 id="a-titel-news" className={`${basis.cond} ${s.h2}`}>
                News
              </h2>
            </div>
            <Link href="/news" className={basis.more}>
              Alle News →
            </Link>
          </div>

          {aufmacher ? (
            <div className={`${s.newsGrid} ${liste.length === 0 ? s.newsEinzeln : ''}`}>
              <Aufmacher post={aufmacher} />
              {liste.length > 0 && (
                <ul className={s.newsList}>
                  {liste.map(post => (
                    <li key={post.slug}>
                      <NewsEintrag post={post} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className={s.leer}>Noch keine News vorhanden.</p>
          )}
        </div>
      </section>

      {/* ── Sparten ── */}
      <section id="sparten" className={`${s.abschnitt} ${s.ohneOben}`} aria-labelledby="a-titel-sparten">
        <div className={basis.wrap}>
          <div className={s.head}>
            <div>
              <span className={basis.eyebrow}>Was wir bieten</span>
              <h2 id="a-titel-sparten" className={`${basis.cond} ${s.h2}`}>
                Sparten
              </h2>
            </div>
            <Link href="/trainingszeiten" className={basis.more}>
              Trainingszeiten →
            </Link>
          </div>

          {sparten.length > 0 ? (
            <ul className={s.sparten}>
              {sparten.map((sparte, i) => (
                <li key={sparte.slug}>
                  <Link href={`/sparten/${sparte.slug}`} className={s.sparte}>
                    <span className={s.nr} aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={s.pfeil} aria-hidden="true">
                      <IconPfeil />
                    </span>
                    <b>{sparte.name}</b>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.leer}>
              Die Sparten werden gerade überarbeitet. <Link href="/ansprechpartner">Frag uns gern direkt.</Link>
            </p>
          )}
        </div>
      </section>

      {/* ── Mitmachen: invertierter Abschnitt ── */}
      <div className={`${basis.wrap} ${s.ctaWrap}`} id="mitmachen">
        <div className={s.cta}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.wappen} src={LOGO} alt="" aria-hidden="true" />
          <div>
            <span className={basis.eyebrow}>Mitmachen</span>
            <h2 className={`${basis.cond} ${s.ctaTitel}`}>
              Werde Teil
              <br />
              <em>vom Team.</em>
            </h2>
            <p>
              Aufnahmeantrag herunterladen, ausfüllen, loslegen. Fragen zu einer Sparte? Unsere
              Ansprechpartner*innen helfen gern weiter.
            </p>
          </div>
          <div className={s.ctaActions}>
            <Link href="/downloads" className={`${basis.btn} ${s.btnDark}`}>
              Aufnahmeantrag <IconPfeil />
            </Link>
            <Link href="/ansprechpartner" className={`${basis.btn} ${s.btnLine}`}>
              Ansprechpartner*innen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Karte "Nächstes Spiel" im Hero ──────────────────────────────────────────

function NaechstesSpiel({ daten }: { daten: StartseitenDaten }) {
  const { termine, heute } = daten
  const spiel = termine.find(t => spielInfo(t).art !== null)

  // Kein Spiel angesetzt: nächster sonstiger Termin
  if (!spiel) {
    const termin = termine[0]
    if (!termin) {
      return (
        <aside className={s.match} aria-label="Spielpläne">
          <div className={s.matchTop}>
            <span className={s.live}>Spielpläne</span>
            <span>Fußball &amp; Tischtennis</span>
          </div>
          <p className={s.matchText}>
            Gerade stehen keine Spiele an. Alle Ansetzungen und Ergebnisse findest du in den Spielplänen.
          </p>
          <div className={s.matchLinks}>
            <Link href="/fussball">Fußball →</Link>
            <Link href="/tischtennis">Tischtennis →</Link>
            <Link href="/termine">Kalender →</Link>
          </div>
        </aside>
      )
    }
    const ort = ortText(termin.ort, null)
    return (
      <aside className={s.match} aria-label="Nächster Termin">
        <div className={s.matchTop}>
          <span className={`${s.live} ${termin.datum === heute ? s.livePuls : ''}`}>
            {termin.datum === heute ? 'Heute' : kurzDatum(termin.datum)}
            {termin.uhrzeit && ` · ${kurzUhrzeit(termin.uhrzeit)}`}
          </span>
          <span>{termin.sparte}</span>
        </div>
        <div className={s.termin}>
          <span className={s.terminIcon} aria-hidden="true">
            <IconKalender />
          </span>
          <b className={basis.cond}>{termin.titel}</b>
        </div>
        <div className={s.matchMeta}>
          <span className={s.ort}>
            {ort && (
              <>
                <IconPin className={basis.icon} />
                {ort}
              </>
            )}
          </span>
          <Link href="/termine">Alle Termine →</Link>
        </div>
      </aside>
    )
  }

  const info = spielInfo(spiel)
  const istHeute = spiel.datum === heute
  const wir = (
    <div className={s.team}>
      <div className={`${s.crest} ${s.crestHeim}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} alt="" />
      </div>
      {eigenerName(spiel.titel)}
    </div>
  )
  const gegner = (
    <div className={s.team}>
      <div className={`${s.crest} ${s.crestGast}`} aria-hidden="true">
        {kuerzel(info.gegner)}
      </div>
      {info.gegner}
    </div>
  )
  const ort = ortText(spiel.ort, info.art)
  const kopf = [info.liga, spiel.sparte].filter(Boolean).join(' · ')

  return (
    <aside className={s.match} aria-label="Nächstes Spiel">
      <div className={s.matchTop}>
        <span className={`${s.live} ${istHeute ? s.livePuls : ''}`}>
          {istHeute ? 'Heute' : kurzDatum(spiel.datum)}
          {spiel.uhrzeit && ` · ${kurzUhrzeit(spiel.uhrzeit)}`}
        </span>
        <span className={s.matchKopf}>{kopf}</span>
      </div>
      <p className={s.matchArt}>
        {info.art === 'heim' ? 'Heimspiel' : 'Auswärtsspiel'}
        {info.sportart && ` · ${info.sportart}`}
      </p>
      {/* Heimmannschaft steht links */}
      <div className={s.teams}>
        {info.art === 'heim' ? wir : gegner}
        <div className={s.vs}>
          <span aria-hidden="true">VS</span>
          <span className={basis.unsichtbar}>gegen</span>
        </div>
        {info.art === 'heim' ? gegner : wir}
      </div>
      <div className={s.matchMeta}>
        <span className={s.ort}>
          {ort && (
            <>
              <IconPin className={basis.icon} />
              {ort}
            </>
          )}
        </span>
        <Link href={spielplanLink(sportAus(info.sportart))}>Spielplan →</Link>
      </div>
    </aside>
  )
}

// ─── News ────────────────────────────────────────────────────────────────────

function Aufmacher({ post }: { post: NewsPost }) {
  return (
    <Link href={`/news/${post.slug}`} className={s.feature}>
      {post.image ? (
        <Image src={post.image.url} alt="" fill sizes="(max-width: 760px) 100vw, 60vw" className={s.featureBild} />
      ) : (
        <span className={s.featureLeer} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="" />
        </span>
      )}
      <div className={s.featureBody}>
        <div className={s.meta}>
          <b>{post.category}</b> · {langDatum(post.date)}
        </div>
        <h3 className={s.featureTitel}>{post.title}</h3>
        {post.excerpt && <p className={s.featureText}>{post.excerpt}</p>}
      </div>
    </Link>
  )
}

function NewsEintrag({ post }: { post: NewsPost }) {
  return (
    <Link href={`/news/${post.slug}`} className={s.newsItem}>
      <div className={`${s.thumb} ${post.image ? '' : s.thumbLeer}`}>
        {post.image ? (
          <Image src={post.image.url} alt="" fill sizes="150px" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={LOGO} alt="" />
        )}
      </div>
      <div className={s.newsText}>
        <div className={s.meta}>
          <b>{post.category}</b> · {langDatum(post.date)}
        </div>
        <h3>{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </Link>
  )
}
