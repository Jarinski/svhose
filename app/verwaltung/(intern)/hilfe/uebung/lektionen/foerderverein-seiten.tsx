'use client'

/**
 * Übung "Seiten des Fördervereins" (am Beispiel der Chronik) – mit dem echten Editor (SeitenEditor aus
 * app/verwaltung/(intern)/chronik/SeitenFormular.tsx) und der echten Darstellung der Website
 * (components/foerderverein/SeitenBausteine). Geprüft wird mit denselben Regeln und Meldungen wie beim
 * echten Speichern (seiteBereinigen, seitePruefen aus lib/seiten.ts). Gespeichert wird nichts;
 * gewählte Fotos bleiben im Browser.
 */

import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import SeitenBausteine from '@/components/foerderverein/SeitenBausteine'
import { knopfKlassen } from '@/components/verwaltung/ui'
import { CHRONIK_VORLAGE } from '@/lib/foerderverein-seiten'
import {
  bilderUmwandeln,
  seiteBereinigen,
  seitePruefen,
  type AnzeigeBild,
  type Baustein,
  type SeitenInhalt,
  type GespeichertesBild,
} from '@/lib/seiten'
import { SeitenEditor, type EditorBild, type EditorStand } from '../../../foerderverein-seiten/SeitenFormular'
import type { Lektion, LektionProps } from '../typen'
import { Quiz, Spielwiese, UebungsLeiste, Vorschau } from '../werkzeuge'

type Gespeichert = SeitenInhalt<AnzeigeBild>
type Rueckmeldung = { art: 'erfolg' | 'fehler' | 'hinweis'; text: React.ReactNode }

/** Für alle, die gerade kein eigenes Foto zur Hand haben: ein gezeichneter Sportplatz. */
const BEISPIELBILD =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#dbe7ee"/><path d="M0 300c120-40 260-60 400-30s300 10 420-20 260-10 380 20v60H0z" fill="#4f7a45"/><rect y="320" width="1200" height="480" fill="#6f9e5b"/><path d="M180 760l140-400h560l140 400z" fill="none" stroke="#f5f5f0" stroke-width="8"/><path d="M250 560h700" stroke="#f5f5f0" stroke-width="8"/><ellipse cx="600" cy="560" rx="120" ry="40" fill="none" stroke="#f5f5f0" stroke-width="8"/><rect x="520" y="300" width="160" height="60" fill="none" stroke="#f5f5f0" stroke-width="8"/></svg>',
  )

/** Die echte Vorlage der Chronik (Stand vor der Verwaltung) – ohne Fotos. */
const START = bilderUmwandeln<GespeichertesBild, EditorBild>(CHRONIK_VORLAGE, () => null)
const START_STATIONEN = START.bausteine.reduce((n, b) => n + (b.art === 'zeitleiste' ? b.eintraege.length : 0), 0)

function alsAnzeige(inhalt: SeitenInhalt<EditorBild>): Gespeichert {
  return bilderUmwandeln(inhalt, bild => (bild ? { src: bild.url, breite: bild.breite, hoehe: bild.hoehe } : null))
}

/** Gleicher Inhalt? Die Schlüssel des Editors zählen nicht – sie werden auch in echt nicht gespeichert. */
const vergleichbar = (c: Gespeichert) => JSON.stringify(c, (k, v) => (k === 'schluessel' ? undefined : v))
const gleich = (a: Gespeichert, b: Gespeichert) => vergleichbar(a) === vergleichbar(b)
const norm = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

function finde<A extends Baustein['art']>(c: Gespeichert, art: A): { index: number; b: Extract<Baustein<AnzeigeBild>, { art: A }> | null } {
  const index = c.bausteine.findIndex(b => b.art === art)
  return { index, b: index >= 0 ? (c.bausteine[index] as Extract<Baustein<AnzeigeBild>, { art: A }>) : null }
}

const VON_VORN = 'Mit „Von vorn“ unten startest du die Übung neu.'

/* ── Eine Lektion: Editor, Speicherleiste und Website darunter ─────────────── */

function ChronikUebung({ aufgabe, geloest, istGeloest }: { aufgabe: (c: Gespeichert) => string | null } & LektionProps) {
  /** Stand beim letzten "Speichern" – so, wie ihn der Editor zeigt (zum Vergleichen) … */
  const [gespeichert, setGespeichert] = useState<Gespeichert>(() => alsAnzeige(START))
  /** … und für die Website darunter, mit eigenen Kopien der Fotos (BildFeld gibt seine Adressen beim Entfernen frei). */
  const [website, setWebsite] = useState<Gespeichert>(gespeichert)
  const [meldung, setMeldung] = useState<Rueckmeldung | null>(null)
  const aktuell = useRef<EditorStand | null>(null)
  const kopien = useRef<string[]>([])
  const vorschau = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const liste = kopien.current
    return () => liste.forEach(u => URL.revokeObjectURL(u))
  }, [])

  async function fotosKopieren(c: Gespeichert): Promise<Gespeichert> {
    const quellen: string[] = []
    bilderUmwandeln(c, bild => {
      if (bild && bild.src.indexOf('blob:') === 0) quellen.push(bild.src)
      return null
    })
    const kopie = new Map<string, string>()
    for (const src of quellen) {
      if (kopie.has(src)) continue
      const url = URL.createObjectURL(await (await fetch(src)).blob())
      kopien.current.push(url)
      kopie.set(src, url)
    }
    return bilderUmwandeln(c, bild => (bild ? { ...bild, src: kopie.get(bild.src) ?? bild.src } : null))
  }

  async function speichern() {
    if (!aktuell.current) return
    const neu = seiteBereinigen(aktuell.current.anzeige)
    const fehler = seitePruefen(neu)
    if (fehler) {
      setMeldung({ art: 'fehler', text: fehler })
      return
    }
    if (gleich(neu, gespeichert)) {
      // Echte Meldung – und solange die Aufgabe offen ist, darunter ein Tipp, wie es weitergeht
      const offen = istGeloest ? null : aufgabe(neu)
      setMeldung({
        art: 'erfolg',
        text: (
          <>
            Keine Änderungen – es war schon alles gespeichert.
            {offen && <span className="mt-1 block">In der Übung noch nicht ganz: {offen}</span>}
          </>
        ),
      })
      return
    }
    const hinweis = aufgabe(neu)
    if (hinweis) {
      setMeldung({ art: 'hinweis', text: `In der Übung noch nicht ganz: ${hinweis}` })
      return
    }
    setGespeichert(neu)
    setWebsite(await fotosKopieren(neu))
    setMeldung({ art: 'erfolg', text: 'Gespeichert. Die Seite „Chronik“ ist sofort auf der Website zu sehen.' })
    geloest()
  }

  return (
    <div className="space-y-5">
      <Spielwiese>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-3xl leading-none tracking-tight md:text-4xl">CHRONIK</h3>
            <div className="mt-2 text-sm text-[#6b6b6b]">Von der Idee der Eltern bis zum eigenen Platz am Tostedter Weg. Bausteine hinzufügen, verschieben und gestalten.</div>
          </div>
          {/* In echt öffnet sich die Website in einem neuen Tab – hier springt der Knopf zur Website unten */}
          <button
            type="button"
            className={knopfKlassen.sekundaer}
            onClick={() => {
              vorschau.current?.focus({ preventScroll: true })
              vorschau.current?.scrollIntoView({ block: 'start' })
            }}
          >
            Seite ansehen <ExternalLink size={14} aria-hidden="true" />
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            void speichern()
          }}
        >
          <SeitenEditor
            start={START}
            kopf={{ kicker: 'Förderverein', titel: 'CHRONIK' }}
            beispielbild={BEISPIELBILD}
            unten={stand => {
              aktuell.current = stand
              return <UebungsLeiste geaendert={!gleich(seiteBereinigen(stand.anzeige), gespeichert)} meldung={meldung} knopfText="Seite speichern" />
            }}
          />
        </form>
      </Spielwiese>
      <div ref={vorschau} tabIndex={-1} className="focus:outline-none">
        <Vorschau adresse="/foerderverein/chronik">
          <div className="mb-10 px-2">
            <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-[#6b6b6b]">Förderverein</div>
            <div className="font-display text-5xl tracking-tight">CHRONIK</div>
            {website.einleitung && <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-[#6b6b6b]">{website.einleitung}</p>}
          </div>
          <div className="-mx-4">
            <SeitenBausteine bausteine={website.bausteine.filter(b => b.sichtbar)} />
          </div>
        </Vorschau>
      </div>
    </div>
  )
}

/* ── Die Lektionen ─────────────────────────────────────────────────────────── */

export const lektionen: Lektion[] = [
  {
    titel: 'Eine Station ergänzen',
    aufgabe: (
      <>
        Für die Übung: Ergänze in der Zeitleiste eine Station mit der Zeit <strong>2019</strong> und dem Titel <strong>Das erste Heimspiel</strong>.
        Schieb sie mit den Pfeilen direkt vor die Station „Heute“. Dann speichern.
      </>
    ),
    Inhalt: props => (
      <ChronikUebung
        {...props}
        aufgabe={c => {
          const { b: z } = finde(c, 'zeitleiste')
          if (!z) return `Die Zeitleiste soll bleiben. ${VON_VORN}`
          const neu = z.eintraege.findIndex(e => norm(e.titel) === 'das erste heimspiel')
          const heute = z.eintraege.findIndex(e => norm(e.zeit) === 'heute')
          if (neu < 0) {
            return z.eintraege.length > START_STATIONEN
              ? 'Als Titel der neuen Station bitte „Das erste Heimspiel“ eintragen.'
              : 'Tippe in der Zeitleiste unter den Stationen auf „Station hinzufügen“.'
          }
          if (z.eintraege[neu].zeit.trim() !== '2019') return 'Trag bei der neuen Station unter „Zeit“ 2019 ein.'
          if (heute < 0 || z.eintraege.length < START_STATIONEN + 1) return `Die bisherigen Stationen sollen bleiben. ${VON_VORN}`
          if (z.eintraege.length > START_STATIONEN + 1) return 'Füge nur eine neue Station hinzu – weitere nimmst du mit dem Kreuz wieder heraus.'
          if (neu !== heute - 1) return 'Die neue Station steht noch nicht direkt vor „Heute“. Schieb sie mit den Pfeilen an die richtige Stelle.'
          return null
        }}
      />
    ),
    danach: (
      <>
        Die Station steht jetzt auch auf der Website – genau dort, wo du sie einsortiert hast. Die Zeit ist freier Text: „2019“, „Sommer 2019“ oder
        „Heute“ gehen alle. Ganz leere Stationen stören übrigens nicht, sie fallen beim Speichern weg.
      </>
    ),
  },
  {
    titel: 'Die Darstellung wechseln',
    aufgabe: (
      <>
        Die Zeitleiste soll sich lesen wie eine Geschichte. Stell bei der Zeitleiste die Darstellung <strong>Zeitstrahl</strong> ein, schau dir das
        Ergebnis oben unter <strong>Vorschau</strong> an und speichere dann.
      </>
    ),
    Inhalt: props => (
      <ChronikUebung
        {...props}
        aufgabe={c => {
          const { b: z } = finde(c, 'zeitleiste')
          if (!z) return `Die Zeitleiste soll bleiben. ${VON_VORN}`
          if (z.darstellung === 'gross') return 'Fast – „Groß mit Fotos“ ist die dritte Darstellung. Gesucht ist der „Zeitstrahl“.'
          if (z.darstellung !== 'zeitstrahl') return 'Wähle in der Zeitleiste unter „Darstellung“ den „Zeitstrahl“.'
          if (z.eintraege.length !== START_STATIONEN) return `Die Stationen sollen bleiben, wie sie sind. ${VON_VORN}`
          return null
        }}
      />
    ),
    danach:
      'Inhalt und Aussehen sind getrennt: Die Darstellung kannst du jederzeit wieder wechseln, die Stationen bleiben dabei, wie sie sind. Hast du zu vielen Stationen Fotos, wirkt „Groß mit Fotos“ am stärksten.',
  },
  {
    titel: 'Ein Abschnitt mit Foto',
    aufgabe: (
      <>
        Füge zwischen der Zeitleiste und den Stichpunkten einen <strong>Textabschnitt</strong> ein: Überschrift <strong>Ein Platz für unser Dorf</strong>
        , ein, zwei Sätze Text und ein Foto – irgendeins von deinem Gerät oder das Beispielbild. Stell den Hintergrund auf <strong>Dunkel</strong>.
        Dann speichern.
      </>
    ),
    Inhalt: props => (
      <ChronikUebung
        {...props}
        aufgabe={c => {
          const { index: i, b: t } = finde(c, 'text')
          if (!t) return 'Tippe zwischen Zeitleiste und Stichpunkten auf „Hier einfügen“ und wähle „Textabschnitt“.'
          if (c.bausteine.filter(b => b.art === 'text').length > 1 || c.bausteine.length > 3) {
            return 'Füge nur einen Textabschnitt hinzu – weitere Bausteine nimmst du mit dem Kreuz wieder heraus.'
          }
          if (norm(t.ueberschrift) !== 'ein platz für unser dorf') return 'Als Überschrift bitte „Ein Platz für unser Dorf“ eintragen.'
          if (!t.text) return 'Schreib noch ein, zwei Sätze in das Feld „Text“.'
          if (!t.bild) return 'Es fehlt noch das Foto: Tippe auf „Foto hinzufügen“ und dann auf „Bild auswählen“ – oder nimm das Beispielbild.'
          if (t.hintergrund !== 'dunkel') return 'Wähle unter „Hintergrund“ die Einstellung „Dunkel“.'
          const zeitleiste = finde(c, 'zeitleiste').index
          const liste = finde(c, 'liste').index
          if (zeitleiste < 0 || liste < 0) return `Zeitleiste und Stichpunkte sollen bleiben. ${VON_VORN}`
          if (i !== zeitleiste + 1 || liste !== i + 1) return 'Der Textabschnitt soll zwischen Zeitleiste und Stichpunkten stehen. Schieb ihn mit den Pfeilen dorthin.'
          return null
        }}
      />
    ),
    danach: (
      <>
        Mit Foto stehen Text und Bild nebeneinander; unter „Foto“ legst du fest, auf welcher Seite das Bild steht. In echt wird das Foto erst beim
        Speichern hochgeladen und dabei verkleinert. Denk daran: Wer auf einem Foto zu erkennen ist, muss mit der Veröffentlichung einverstanden sein.
      </>
    ),
  },
  {
    titel: 'Ausblenden statt löschen',
    aufgabe: (
      <>
        Die Ideen von 2017 sind teils überholt. Lösch sie nicht, sondern blende den Baustein <strong>Stichpunkte</strong> aus: Nimm den Haken bei
        „Auf der Website zeigen“ heraus. Dann speichern.
      </>
    ),
    Inhalt: props => (
      <ChronikUebung
        {...props}
        aufgabe={c => {
          const { b: liste } = finde(c, 'liste')
          if (!liste) return `Der Baustein soll in der Verwaltung bleiben – nur ausgeblendet. ${VON_VORN}`
          if (liste.sichtbar) return 'Nimm im Baustein „Stichpunkte“ den Haken bei „Auf der Website zeigen“ heraus.'
          if (!finde(c, 'zeitleiste').b?.sichtbar) return 'Die Zeitleiste soll auf der Website bleiben – setz dort den Haken wieder.'
          return null
        }}
      />
    ),
    danach:
      'Auf der Website ist der Abschnitt jetzt weg. In der Verwaltung bleibt er gestrichelt umrandet und mit „ausgeblendet“ markiert stehen – ein Haken genügt, um ihn wieder zu zeigen. So kannst du auch einen neuen Abschnitt in Ruhe vorbereiten.',
  },
  {
    titel: 'Wann ist es auf der Website?',
    aufgabe: 'Eine letzte Frage zum Schluss.',
    Inhalt: props => (
      <Quiz
        {...props}
        frage="Du hast die Chronik umgebaut und schaust sie dir unter „Vorschau“ an. Wann sehen Besucher:innen der Website deine Änderungen?"
        antworten={[
          { text: 'Erst, wenn ich auf „Seite speichern“ tippe', richtig: true },
          {
            text: 'Sofort – die Vorschau ist schon die Website',
            erklaerung: 'Die Vorschau sieht nur aus wie die Website und ist allein für dich. Sichtbar wird es erst mit „Seite speichern“.',
          },
          {
            text: 'Erst, wenn ein:e Admin die Änderung freigegeben hat',
            erklaerung: 'Eine Freigabe gibt es nicht: Mit dem Förderverein-Recht speicherst du direkt – die Chronik ist dann sofort auf der Website.',
          },
        ]}
      />
    ),
    danach:
      'Gespeichert wird immer die ganze Seite auf einmal. Willst du die Seite mit ungespeicherten Änderungen verlassen, fragt die Verwaltung vorher nach.',
  },
]
