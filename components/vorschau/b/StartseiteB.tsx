import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { StartseitenDaten } from '@/lib/vorschau'
import { FOERDERVEREIN_MENUE, istFoerderverein } from '@/lib/foerderverein'
import {
  aufzaehlung,
  datumLang,
  minutenInBerlin,
  naechsterTermin,
  spartenAuswahl,
  stehtNochAn,
  terminZeile,
} from './hilfen'
import HeroVideo from './HeroVideo'
import TermineTabs from './TermineTabs'
import b from './bento.module.css'
import s from './StartseiteB.module.css'

// ─── Startseite von Design B (Bento) ─────────────────────────────────────────
// Hell und freundlich: abgerundete Kacheln im Bento-Raster. Server-Komponente –
// nur der Termin-Filter und der Video-Knopf laufen im Browser.

/** Symbole für die Kacheln des Fördervereins, in der Reihenfolge von FOERDERVEREIN_MENUE */
const FOERDER_ICONS = ['📰', '📜', '🧑‍💼', '🤝']

const PFEIL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/** Freie Plätze in der letzten Reihe – die Karte "Alle Sparten" füllt sie (oder eine ganze Reihe). */
function rest(anzahl: number, spalten: number): number {
  const frei = (spalten - (anzahl % spalten)) % spalten
  return frei === 0 ? spalten : frei
}

export default function StartseiteB({ daten }: { daten: StartseitenDaten }) {
  const { news, termine, sparten, zahlen, heute } = daten

  const auswahl = spartenAuswahl(sparten)
  const weitere = sparten.length - auswahl.length
  // Termine von heute, die schon vorbei sind, fallen weg (Spiele gelten 2 Std. ab Anpfiff als laufend)
  const minutenJetzt = minutenInBerlin()
  const anstehend = termine.filter(t => stehtNochAn(t, heute, minutenJetzt))
  const naechster = anstehend[0] ? naechsterTermin(anstehend[0], heute) : null
  const terminZeilen = anstehend.slice(0, 80).map(terminZeile)
  const neueste = news.slice(0, 3)
  const fvNews = news.find(n => istFoerderverein(n.category))
  const iconZuName = new Map(sparten.filter(sp => sp.icon).map(sp => [sp.name, sp.icon]))

  const zahlenText = [
    zahlen.sparten > 0 && `${zahlen.sparten} ${zahlen.sparten === 1 ? 'Sparte' : 'Sparten'}`,
    zahlen.mannschaften > 0 && `${zahlen.mannschaften} ${zahlen.mannschaften === 1 ? 'Mannschaft' : 'Mannschaften'}`,
  ].filter(Boolean) as string[]

  const alleSpan = {
    '--rest4': rest(sparten.length, 4),
    '--rest3': rest(sparten.length, 3),
    '--rest2': rest(sparten.length, 2),
  } as CSSProperties

  return (
    <div className={`${b.wrap} ${s.start}`}>
      {/* ── Bento-Hero ── */}
      <div className={s.bento}>
        <section className={`${b.karte} ${s.intro}`} aria-labelledby="b-titel">
          <div>
            <span className={b.eyebrow}>Sportverein e.V. · Lüneburger Heide</span>
            <h1 id="b-titel" className={s.titel}>
              Sport für alle in{' '}
              <span className={s.mark}>
                Holm-Seppensen
                <svg viewBox="0 0 300 20" preserveAspectRatio="none" fill="none" aria-hidden="true">
                  <path d="M3 14C60 5 170 2 297 9" stroke="#111111" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
            <p className={s.introText}>
              Vom ersten Purzelbaum bis zum Punktspiel:{' '}
              {aufzaehlung([...zahlenText, 'ein Verein'])}, in dem alle Generationen zusammen Sport machen.
            </p>
          </div>
          <div className={s.aktionen}>
            <a href="#sparten" className={`${b.btn} ${b.btnDunkel}`}>
              Sparte finden {PFEIL}
            </a>
            <Link href="/trainingszeiten" className={`${b.btn} ${b.btnSanft}`}>
              Trainingszeiten
            </Link>
          </div>
          {auswahl.length > 0 && (
            <div className={s.emojiReihe}>
              <div className={s.stapel} aria-hidden="true">
                {auswahl.map(sp => (
                  <span key={sp.slug}>
                    <i className={b.emo}>{sp.icon}</i>
                  </span>
                ))}
              </div>
              {/* "A, B, C und 10 weitere Sparten" – das "und" steht nur einmal */}
              {weitere > 0 ? (
                <span>
                  {auswahl.map(sp => sp.name).join(', ')} <br />
                  und {weitere} {weitere === 1 ? 'weitere Sparte' : 'weitere Sparten'}
                </span>
              ) : (
                <span>{aufzaehlung(auswahl.map(sp => sp.name))}</span>
              )}
            </div>
          )}
        </section>

        <div className={s.videoKachel}>
          <HeroVideo />
          <span className={`${b.tag} ${s.videoTag}`}>Vereinsleben</span>
        </div>

        <section className={`${b.karte} ${s.naechster}`} aria-labelledby="b-naechster">
          {naechster ? (
            <>
              <span className={`${b.tag} ${s.tagDunkel}`}>
                <span className={b.emo} aria-hidden="true">{naechster.emoji}</span> {naechster.wann}
              </span>
              <div>
                <h2 id="b-naechster" className={s.naechsterTitel}>{naechster.titel}</h2>
                {naechster.unterzeile && (
                  <div className={s.vs}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/SV_Holm_Seppensen_Logo.svg" alt="" width={44} height={44} />
                    <span>{naechster.unterzeile}</span>
                  </div>
                )}
              </div>
              <div className={s.reihe}>
                {naechster.ort ? (
                  <span>
                    <span className={b.emo} aria-hidden="true">📍</span> {naechster.ort}
                  </span>
                ) : (
                  <span />
                )}
                <Link href="/termine">Alle Termine →</Link>
              </div>
            </>
          ) : (
            <>
              <span className={`${b.tag} ${s.tagDunkel}`}>
                <span className={b.emo} aria-hidden="true">📅</span> Termine
              </span>
              <div>
                <h2 id="b-naechster" className={s.naechsterTitel}>Gerade stehen keine Termine an.</h2>
                <p className={s.naechsterText}>Trainiert wird trotzdem – alle Zeiten findest du im Trainingsplan.</p>
              </div>
              <div className={s.reihe}>
                <Link href="/trainingszeiten">Trainingszeiten →</Link>
                <Link href="/termine">Kalender →</Link>
              </div>
            </>
          )}
        </section>

        <Link href="/kinderschutz" className={`${b.karte} ${s.schutz}`}>
          <Image
            src="/Schutzkonzepte/schutzkonzepte1.jpg"
            alt="Kampagnenmotiv „Schweigen schützt die Falschen“ zum ausgezeichneten Schutzkonzept"
            width={1640}
            height={475}
            sizes="(max-width: 720px) 90vw, (max-width: 1100px) 40vw, 300px"
          />
          <div>
            <b>Ausgezeichnetes Kinder&shy;schutz&shy;konzept</b>
            <span className={b.link}>Mehr erfahren →</span>
          </div>
        </Link>

        <Link href="/downloads" className={`${b.karte} ${s.mitglied}`}>
          <span className={s.blob} aria-hidden="true" />
          <div>
            <h2 className={s.mitgliedTitel}>Mitglied werden</h2>
            <p>Aufnahmeantrag und Formulare zum Herunterladen</p>
          </div>
          <span className={s.los} aria-hidden="true">{PFEIL}</span>
        </Link>
      </div>

      {/* ── Sparten ── */}
      <section id="sparten" className={s.abschnitt} aria-labelledby="b-sparten">
        <div className={s.kopf}>
          <div>
            <span className={b.eyebrow}>Sparten</span>
            <h2 id="b-sparten" className={s.abschnittTitel}>Finde deinen Sport</h2>
            <p>Jede Sparte hat eigene Trainingszeiten und Ansprechpartner*innen – schnupper einfach mal rein.</p>
          </div>
          <Link href="/trainingszeiten" className={b.link}>Alle Trainingszeiten →</Link>
        </div>
        <div className={s.sparten}>
          {sparten.map(sp => (
            <Link key={sp.slug} href={`/sparten/${sp.slug}`} className={s.sparte}>
              <span className={s.ico} aria-hidden="true">
                {sp.icon ? <i className={b.emo}>{sp.icon}</i> : <span className={s.initiale}>{sp.name.charAt(0)}</span>}
              </span>
              <h3>{sp.name}</h3>
              {sp.beschreibung && <p>{sp.beschreibung}</p>}
            </Link>
          ))}
          <Link href="/sparten" className={`${s.sparte} ${s.alle}`} style={alleSpan}>
            <h3>
              Alle Sparten
              <br />
              im Überblick
            </h3>
            <span className={`${b.link} ${s.linkHell}`}>Ansehen →</span>
          </Link>
        </div>
      </section>

      {/* ── Förderverein ── */}
      <section className={s.abschnitt} aria-labelledby="b-foerderverein">
        <div className={s.kopf}>
          <div>
            <span className={b.eyebrow}>Förderverein</span>
            <h2 id="b-foerderverein" className={s.abschnittTitel}>Gemeinsam für unseren Platz</h2>
            <p>
              Der Förderverein Sportplatz hat über Jahre Spenden gesammelt und mit angepackt, damit der SV seinen
              Rasenplatz am Tostedter Weg bekommt – und der Ausbau geht weiter.
            </p>
            {fvNews && (
              <p>
                <b>Neu:</b>{' '}
                <Link href={`/news/${fvNews.slug}`} className={b.link}>{fvNews.title}</Link>
              </p>
            )}
          </div>
          <Link href="/foerderverein" className={b.link}>Zum Förderverein →</Link>
        </div>
        <div className={`${s.sparten} ${s.foerder}`}>
          {FOERDERVEREIN_MENUE.kinder.map((kind, i) => (
            <Link key={kind.href} href={kind.href} className={s.sparte}>
              <span className={s.ico} aria-hidden="true">
                <i className={b.emo}>{FOERDER_ICONS[i]}</i>
              </span>
              <h3>{kind.label}</h3>
              <p>{kind.text}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── News ── */}
      <section className={s.abschnitt} aria-labelledby="b-news">
        <div className={s.kopf}>
          <div>
            <span className={b.eyebrow}>News</span>
            <h2 id="b-news" className={s.abschnittTitel}>Neues aus dem Verein</h2>
          </div>
          <Link href="/news" className={b.link}>Alle News →</Link>
        </div>
        {neueste.length > 0 ? (
          <div className={s.news}>
            {neueste.map(post => {
              const icon = iconZuName.get(post.category) ?? iconZuName.get(post.sparte)
              return (
                <Link key={post.slug} href={`/news/${post.slug}`} className={`${b.karte} ${s.post}`}>
                  <div className={s.bild}>
                    {post.image ? (
                      <Image
                        src={post.image.url}
                        alt=""
                        fill
                        sizes="(max-width: 720px) 100vw, (max-width: 1240px) 33vw, 400px"
                      />
                    ) : (
                      // Ohne Bild: Vereinswappen als Platzhalter
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={s.platzhalter} src="/SV_Holm_Seppensen_Logo.svg" alt="" />
                    )}
                  </div>
                  <div className={s.postText}>
                    <div className={s.meta}>
                      <span className={`${b.tag} ${s.tagGrau}`}>
                        {icon && <span className={b.emo} aria-hidden="true">{icon}</span>}
                        {post.category}
                      </span>
                      <time dateTime={post.date.slice(0, 10)}>{datumLang(post.date)}</time>
                    </div>
                    <h3>{post.title}</h3>
                    {post.excerpt && <p>{post.excerpt}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className={`${b.karte} ${s.leerKarte}`}>Noch keine News – schau bald wieder vorbei.</div>
        )}
      </section>

      {/* ── Termine + Kontakt ── */}
      <section id="termine" className={s.abschnitt} aria-label="Termine und Kontakt">
        <div className={s.duo}>
          <div className={`${b.karte} ${s.termine}`}>
            <TermineTabs termine={terminZeilen} />
          </div>

          <div className={s.spalte}>
            <a
              href="https://www.instagram.com/svholmseppensen/"
              target="_blank"
              rel="noopener noreferrer"
              className={s.insta}
            >
              <div className={s.instaKopf}>
                <h2 className={s.kachelTitel}>@svholmseppensen</h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r=".6" fill="currentColor" />
                </svg>
              </div>
              <p>
                Bilder vom Training, Spieltagen und Vereinsfesten auf Instagram.
                <span className={b.sr}> (öffnet in neuem Tab)</span>
              </p>
              <div className={s.fotos}>
                {['/images/girls.webp', '/images/U15.jpeg', '/images/kids.webp'].map(src => (
                  <Image key={src} src={src} alt="" width={240} height={240} sizes="(max-width: 720px) 30vw, (max-width: 1100px) 32vw, 140px" />
                ))}
              </div>
            </a>

            <div id="kontakt" className={`${b.karte} ${s.kontakt}`}>
              <h2 className={s.kachelTitel}>Fragen? Schreib uns.</h2>
              <div className={s.kontaktLinks}>
                <a href="https://wa.me/491722970187" target="_blank" rel="noopener noreferrer">
                  <span aria-hidden="true"><i className={b.emoStark}>💬</i></span>
                  WhatsApp
                  <span className={b.sr}> (öffnet in neuem Tab)</span>
                </a>
                <a href="tel:+491722970187">
                  <span aria-hidden="true"><i className={b.emoStark}>📞</i></span>
                  +49 172 2970187
                </a>
                <a href="mailto:info@sv-holm-seppensen.de">
                  <span aria-hidden="true"><i className={b.emoStark}>✉️</i></span>
                  info@sv-holm-seppensen.de
                </a>
              </div>
              <Link href="/ansprechpartner" className={b.link}>Alle Ansprechpartner*innen →</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
