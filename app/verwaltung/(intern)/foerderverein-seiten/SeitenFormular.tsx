'use client'

/**
 * Editor der Förderverein-Seiten (Über den Förderverein, Aktuelles, Chronik, Mitglied werden): Einleitung und Bausteine
 * hinzufügen, verschieben, ausblenden und gestalten. Die Vorschau nutzt dieselbe Darstellung wie die
 * Website (components/foerderverein/SeitenBausteine), auch mit den aktuellen News und Downloads.
 *
 * Der Inhalt geht als JSON im Feld "daten" an die Server-Aktion, neue Fotos als Dateifelder
 * "bild:<schlüssel>" (BildFeld; in der Bildergalerie ein verstecktes Dateifeld je Foto). Gespeichert
 * wird alles auf einmal – deshalb prüft das Formular vor dem Absenden, ob alle neuen Fotos zusammen
 * unter die Grenze für eine Anfrage passen.
 *
 * SeitenEditor ist der Editor ohne Formular – die Übung in der Hilfe nutzt ihn ebenfalls
 * (hilfe/uebung/lektionen/foerderverein-seiten.tsx), damit sie genau so aussieht und sich so bedient.
 */

import { createContext, useActionState, useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Files,
  FlaskConical,
  Hash,
  History,
  Image as ImageIcon,
  ImagePlus,
  Images,
  LayoutGrid,
  List,
  Megaphone,
  Newspaper,
  Pencil,
  Plus,
  Quote,
  X,
  type LucideIcon,
} from 'lucide-react'
import SeitenBausteine, { SeitenKopf, type SeitenDaten } from '@/components/foerderverein/SeitenBausteine'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import BildFeld from '@/components/verwaltung/inhalte/BildFeld'
import { fotoVerkleinern } from '@/components/verwaltung/inhalte/fotoVerkleinern'
import ReihenfolgeKnoepfe, { verschieben } from '@/components/verwaltung/ReihenfolgeKnoepfe'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { auswahlKlasse, Badge, eingabeKlasse, Feld, knopfKlassen, Karte, LeerHinweis } from '@/components/verwaltung/ui'
import { useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import {
  BAUSTEIN_ARTEN,
  bausteinName,
  bilderUmwandeln,
  DARSTELLUNG_NAMEN,
  MELDUNGEN_ANZAHLEN,
  neuerBaustein,
  type AnzeigeBild,
  type Baustein,
  type BausteinArt,
  type SeitenInhalt,
  type GespeichertesBild,
} from '@/lib/seiten'
import { FOERDERVEREIN } from '@/lib/foerderverein'
import { LEER } from '@/lib/verwaltung/formular'
import { MAX_UPLOAD_BYTES } from '@/lib/verwaltung/upload-grenze'
import { seiteSpeichernAktion } from './aktionen'

/** Gespeichertes Bild mit fertiger Adresse (die Seite rechnet sie aus – lib/medien.ts läuft nur auf dem Server). */
export type EditorBild = GespeichertesBild & { url: string }
type EBaustein = Baustein<EditorBild>
type EInhalt = SeitenInhalt<EditorBild>
type Art<A extends BausteinArt> = Extract<EBaustein, { art: A }>

const ICONS: Record<BausteinArt, LucideIcon> = {
  zeitleiste: History,
  text: AlignLeft,
  bild: ImageIcon,
  galerie: Images,
  liste: List,
  zahlen: Hash,
  zitat: Quote,
  karten: LayoutGrid,
  aufruf: Megaphone,
  meldungen: Newspaper,
  unterlagen: Files,
}

/** Kopf der Seite in der Vorschau – kommt aus lib/foerderverein-seiten.ts. */
export interface SeitenKopfDaten {
  kicker: string
  titel: string
}

interface Props {
  /** Slug aus lib/foerderverein-seiten.ts – sagt der Server-Aktion, welche Seite gespeichert wird. */
  seite: string
  kopf: SeitenKopfDaten
  stand: string
  inhalt: EInhalt
  daten: SeitenDaten
}

/** Schlüssel für Bausteine und Einträge (b0, b1 … / e0, e1 …) – beim Laden immer gleich, damit Server und Browser übereinstimmen. */
function mitSchluesseln(inhalt: EInhalt): EInhalt {
  let n = 0
  return {
    einleitung: inhalt.einleitung,
    bausteine: inhalt.bausteine.map((b, i): EBaustein => {
      if (b.art === 'zeitleiste') return { ...b, schluessel: `b${i}`, eintraege: b.eintraege.map(e => ({ ...e, schluessel: `e${n++}` })) }
      if (b.art === 'zahlen') return { ...b, schluessel: `b${i}`, eintraege: b.eintraege.map(e => ({ ...e, schluessel: `e${n++}` })) }
      if (b.art === 'karten') return { ...b, schluessel: `b${i}`, eintraege: b.eintraege.map(e => ({ ...e, schluessel: `e${n++}` })) }
      if (b.art === 'galerie') return { ...b, schluessel: `b${i}`, fotos: b.fotos.map(f => ({ ...f, schluessel: `e${n++}` })) }
      return { ...b, schluessel: `b${i}` }
    }),
  }
}

/** Adresse je Bildplatz (Schlüssel des Bausteins bzw. der Station). */
function bildAdressen(inhalt: EInhalt): Record<string, string | null> {
  const adressen: Record<string, string | null> = {}
  bilderUmwandeln(inhalt, (bild, schluessel) => {
    if (schluessel) adressen[schluessel] = bild?.url ?? null
    return null
  })
  return adressen
}

/** Megabyte mit einer Nachkommastelle, z. B. "12,4 MB". */
export function megabyte(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`
}

/** Alle Dateien, die das Formular gerade mitschicken würde, zusammen. */
function neueDateienBytes(formular: HTMLFormElement): number {
  let summe = 0
  new FormData(formular).forEach(wert => {
    if (typeof wert === 'object' && wert !== null) summe += wert.size
  })
  return summe
}

export default function SeitenFormular({ seite, kopf, stand, inhalt, daten }: Props) {
  const [ergebnis, aktion] = useActionState(seiteSpeichernAktion, LEER)
  const [zuGross, setZuGross] = useState<string | null>(null)

  // Next.js nimmt eine Anfrage nur bis 16 MB an – größer bricht die Seite ab, ohne dass eine Meldung käme.
  function absenden(e: React.FormEvent<HTMLFormElement>) {
    const bytes = neueDateienBytes(e.currentTarget)
    if (bytes > MAX_UPLOAD_BYTES) {
      e.preventDefault()
      setZuGross(
        `Die neuen Fotos sind zusammen ${megabyte(bytes)} groß – auf einmal gehen höchstens ${megabyte(MAX_UPLOAD_BYTES)}. ` +
          'Bitte einige neue Fotos wieder entfernen, speichern und sie danach in einem zweiten Schritt hinzufügen.',
      )
    } else {
      setZuGross(null)
    }
  }

  return (
    <form action={aktion} onSubmit={absenden} onReset={eingabenBehalten}>
      {/* Nach dem Speichern ändert sich der Stand → der Editor startet mit dem frisch gespeicherten Inhalt. */}
      <SeitenEditor
        key={stand}
        start={inhalt}
        kopf={kopf}
        daten={daten}
        angeheftet
        warnen
        unten={({ inhalt: aktuell, geaendert }) => (
          <>
            <input type="hidden" name="seite" value={seite} />
            <input type="hidden" name="stand" value={stand} />
            {/* Gespeicherte Fotos ohne Adresse – neue Fotos stecken in den Dateifeldern */}
            <input
              type="hidden"
              name="daten"
              value={JSON.stringify(bilderUmwandeln(aktuell, bild => (bild ? { pfad: bild.pfad, breite: bild.breite, hoehe: bild.hoehe } : null)))}
            />
            <SpeicherLeiste
              geaendert={geaendert}
              ergebnis={ergebnis}
              knopfText="Seite speichern"
              zusatz={zuGross && <p className="text-sm text-red-700" role="alert">{zuGross}</p>}
            />
          </>
        )}
      />
    </form>
  )
}

/** Was der Editor gerade zeigt – für Speicherleiste und Formularfelder (Verwaltung) bzw. die Prüfung (Übung in der Hilfe). */
export interface EditorStand {
  /** Inhalt mit Editor-Schlüsseln; Fotos wie geladen – neu gewählte stecken in den Dateifeldern. */
  inhalt: EInhalt
  /** So sähe die Seite aus, mit neu gewählten Fotos als lokale Adressen. */
  anzeige: SeitenInhalt<AnzeigeBild>
  /** Anders als beim Öffnen (Inhalt oder Fotos)? */
  geaendert: boolean
}

/** Adresse eines Beispielbilds für die Übung: Foto-Felder bieten es dann zusätzlich an. */
const BeispielbildKontext = createContext<string | null>(null)

/** News und Downloads des Fördervereins – für die Hinweise in "Meldungen", "Unterlagen" und die Auswahl im Kasten mit Knopf. */
const DatenKontext = createContext<SeitenDaten>({ news: [], downloads: [] })

/**
 * Der Editor selbst, ohne Formular und Speichern – die Seite in der Verwaltung und die Übung in der
 * Hilfe (hilfe/uebung/lektionen/foerderverein-seiten.tsx) bauen ihr eigenes `unten` darum.
 */
export function SeitenEditor({
  start,
  kopf,
  daten = { news: [], downloads: [] },
  unten,
  angeheftet = false,
  warnen = false,
  beispielbild = null,
}: {
  start: EInhalt
  kopf: SeitenKopfDaten
  daten?: SeitenDaten
  unten: (stand: EditorStand) => React.ReactNode
  /** Umschalter Bearbeiten/Vorschau oben am Fenster anheften (Verwaltung) statt im Fluss (Übung). */
  angeheftet?: boolean
  /** Beim Verlassen mit ungespeicherten Änderungen nachfragen. */
  warnen?: boolean
  beispielbild?: string | null
}) {
  const [anfang] = useState(() => mitSchluesseln(start))
  const [startAdressen] = useState(() => bildAdressen(anfang))
  const [inhalt, setInhalt] = useState<EInhalt>(anfang)
  /** Was BildFeld gerade zeigt (gespeichertes Foto, neue Auswahl oder nichts) – für Vorschau und "geändert". */
  const [fotos, setFotos] = useState<Record<string, string | null>>({})
  const [vorschau, setVorschau] = useState(false)
  const [einfuegenBei, setEinfuegenBei] = useState<number | null>(null)
  const [zuletztNeu, setZuletztNeu] = useState<string | null>(null)
  const zaehler = useRef(0)

  const neuerSchluessel = (praefix: 'b' | 'e') => `${praefix}n${++zaehler.current}`

  // Neu eingefügten Baustein ins Bild holen
  useEffect(() => {
    if (zuletztNeu) document.getElementById(`baustein-${zuletztNeu}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [zuletztNeu])

  function bausteine(neu: EBaustein[]) {
    setInhalt({ ...inhalt, bausteine: neu })
  }
  function ersetzen(i: number, neu: EBaustein) {
    bausteine(inhalt.bausteine.map((b, j) => (j === i ? neu : b)))
  }
  function einfuegen(position: number, art: BausteinArt) {
    const roh = neuerBaustein(art)
    const schluessel = neuerSchluessel('b')
    const b: EBaustein =
      roh.art === 'zeitleiste'
        ? { ...roh, schluessel, eintraege: roh.eintraege.map(e => ({ ...e, schluessel: neuerSchluessel('e') })) }
        : roh.art === 'zahlen'
          ? { ...roh, schluessel, eintraege: roh.eintraege.map(e => ({ ...e, schluessel: neuerSchluessel('e') })) }
          : roh.art === 'karten'
            ? { ...roh, schluessel, eintraege: roh.eintraege.map(e => ({ ...e, schluessel: neuerSchluessel('e') })) }
            : { ...roh, schluessel }
    bausteine(inhalt.bausteine.slice(0, position).concat(b, inhalt.bausteine.slice(position)))
    setEinfuegenBei(null)
    setZuletztNeu(schluessel)
  }
  function entfernen(i: number) {
    const b = inhalt.bausteine[i]
    if (!window.confirm(`Baustein ${i + 1} (${bausteinName(b.art)}) entfernen? Endgültig weg ist er erst mit „Seite speichern“.`)) return
    bausteine(inhalt.bausteine.filter((_, j) => j !== i))
  }
  const fotoMelden = (schluessel: string) => (url: string | null) =>
    setFotos(alt => (schluessel in alt && alt[schluessel] === url ? alt : { ...alt, [schluessel]: url }))

  // Angezeigte Adresse je Bildplatz: was BildFeld meldet, sonst das gespeicherte Foto
  const fotoAdresse = (bild: EditorBild | null, schluessel: string | undefined) =>
    schluessel && schluessel in fotos ? fotos[schluessel] : (bild?.url ?? null)

  const plaetze = Object.keys(bildAdressen(inhalt))
  const fotosGeaendert = plaetze.some(k => k in fotos && fotos[k] !== (startAdressen[k] ?? null))
  const geaendert = fotosGeaendert || JSON.stringify(inhalt) !== JSON.stringify(anfang)
  useUngespeichertWarnung(warnen && geaendert)

  const anzeige = bilderUmwandeln(inhalt, (bild, schluessel): AnzeigeBild | null => {
    const src = fotoAdresse(bild, schluessel)
    if (!src) return null
    return bild && src === bild.url ? { src, breite: bild.breite, hoehe: bild.hoehe } : { src }
  })
  const ausgeblendet = inhalt.bausteine.filter(b => !b.sichtbar).length

  const reiter = (aktiv: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${aktiv ? 'bg-[#0a0a0a] text-[#f5f5f0]' : 'bg-white text-[#4a4a4a] hover:bg-[#0a0a0a]/[0.05]'}`

  return (
    <BeispielbildKontext.Provider value={beispielbild}>
      <DatenKontext.Provider value={daten}>
      <div className="space-y-6">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 ${
            angeheftet ? 'sticky top-14 lg:top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#f5f5f0]/95 backdrop-blur border-b border-[#0a0a0a]/10' : ''
          }`}
        >
          <div role="tablist" aria-label="Ansicht" className="inline-flex rounded-sm border border-[#0a0a0a]/20 overflow-hidden">
            <button type="button" role="tab" aria-selected={!vorschau} className={reiter(!vorschau)} onClick={() => setVorschau(false)}>
              <Pencil size={14} /> Bearbeiten
            </button>
            <button type="button" role="tab" aria-selected={vorschau} className={reiter(vorschau)} onClick={() => setVorschau(true)}>
              <Eye size={14} /> Vorschau
            </button>
          </div>
          <p className="text-xs text-[#6b6b6b]">
            {inhalt.bausteine.length === 1 ? '1 Baustein' : `${inhalt.bausteine.length} Bausteine`}
            {ausgeblendet > 0 && `, davon ${ausgeblendet} ausgeblendet`}
          </p>
        </div>

        {vorschau && (
          // overflow-clip statt -hidden: schneidet die Ecken ab, ohne einen Scroll-Rahmen zu bilden –
          // sonst bliebe die Bühne des Zahlenstrahls (sticky) in der Vorschau nicht stehen
          <div className="rounded-sm border border-[#0a0a0a]/10 overflow-clip">
            <p className="bg-white border-b border-[#0a0a0a]/10 px-4 py-2.5 text-xs text-[#6b6b6b]">
              So sieht die Seite nach dem Speichern aus{ausgeblendet > 0 ? ' – ausgeblendete Bausteine fehlen, wie auf der Website' : ''}. Zum Ändern
              zurück zu „Bearbeiten“.
            </p>
            <div className="bg-[#f5f5f0] text-[#0a0a0a] pt-12 pb-16">
              <SeitenKopf kicker={kopf.kicker} titel={kopf.titel} einleitung={anzeige.einleitung} />
              {/* alle Bausteine – SeitenBausteine zeigt nur die sichtbaren */}
              <SeitenBausteine bausteine={anzeige.bausteine} daten={daten} />
            </div>
          </div>
        )}

        {/* In der Vorschau nur ausgeblendet, nicht entfernt – sonst gingen gewählte Fotos verloren */}
        <div className={vorschau ? 'hidden' : 'space-y-4'}>
          <Karte titel="Einleitung" beschreibung={`Steht groß unter der Überschrift ${kopf.titel}.`}>
            <textarea
              aria-label="Einleitung"
              rows={3}
              value={inhalt.einleitung}
              onChange={e => setInhalt({ ...inhalt, einleitung: e.target.value })}
              className={eingabeKlasse}
            />
          </Karte>

          {inhalt.bausteine.length === 0 && (
            <Karte>
              <LeerHinweis>Noch keine Bausteine – unten den ersten hinzufügen.</LeerHinweis>
            </Karte>
          )}

          {inhalt.bausteine.map((b, i) => {
            const schluessel = b.schluessel as string
            const setzen = (neu: EBaustein) => ersetzen(i, neu)
            return (
              <div key={schluessel} className="space-y-4">
                <Einfuegen offen={einfuegenBei === i} onOeffnen={() => setEinfuegenBei(i)} onSchliessen={() => setEinfuegenBei(null)} onWaehlen={art => einfuegen(i, art)} />
                <BausteinKarte
                  b={b}
                  index={i}
                  anzahl={inhalt.bausteine.length}
                  onSichtbar={sichtbar => setzen({ ...b, sichtbar })}
                  onVerschieben={r => bausteine(verschieben(inhalt.bausteine, i, r))}
                  onEntfernen={() => entfernen(i)}
                >
                  {b.art === 'zeitleiste' && <ZeitleisteEditor b={b} setzen={setzen} neuerSchluessel={neuerSchluessel} fotoMelden={fotoMelden} />}
                  {b.art === 'text' && <TextEditor b={b} setzen={setzen} fotoMelden={fotoMelden} hatFoto={!!fotoAdresse(b.bild, schluessel)} />}
                  {b.art === 'bild' && <FotoEditor b={b} setzen={setzen} fotoMelden={fotoMelden} />}
                  {b.art === 'galerie' && <GalerieEditor b={b} setzen={setzen} neuerSchluessel={neuerSchluessel} fotoMelden={fotoMelden} />}
                  {b.art === 'liste' && <ListeEditor b={b} setzen={setzen} />}
                  {b.art === 'zahlen' && <ZahlenEditor b={b} setzen={setzen} neuerSchluessel={neuerSchluessel} />}
                  {b.art === 'zitat' && <ZitatEditor b={b} setzen={setzen} />}
                  {b.art === 'karten' && <KartenEditor b={b} setzen={setzen} neuerSchluessel={neuerSchluessel} />}
                  {b.art === 'aufruf' && <AufrufEditor b={b} setzen={setzen} />}
                  {b.art === 'meldungen' && <MeldungenEditor b={b} setzen={setzen} />}
                  {b.art === 'unterlagen' && <UnterlagenEditor b={b} setzen={setzen} />}
                </BausteinKarte>
              </div>
            )
          })}

          <BausteinWahl titel="Baustein hinzufügen" onWaehlen={art => einfuegen(inhalt.bausteine.length, art)} />
        </div>

        {unten({ inhalt, anzeige, geaendert })}
      </div>
      </DatenKontext.Provider>
    </BeispielbildKontext.Provider>
  )
}

// ─── Rahmen eines Bausteins ─────────────────────────────────────────────────

function BausteinKarte({
  b,
  index,
  anzahl,
  onSichtbar,
  onVerschieben,
  onEntfernen,
  children,
}: {
  b: EBaustein
  index: number
  anzahl: number
  onSichtbar: (sichtbar: boolean) => void
  onVerschieben: (richtung: -1 | 1) => void
  onEntfernen: () => void
  children: React.ReactNode
}) {
  const Icon = ICONS[b.art]
  const name = bausteinName(b.art)
  return (
    <section
      id={`baustein-${b.schluessel}`}
      className={`scroll-mt-32 bg-white border rounded-sm ${b.sichtbar ? 'border-[#0a0a0a]/10' : 'border-dashed border-[#0a0a0a]/30'}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 md:px-6 py-3 border-b border-[#0a0a0a]/10">
        <Icon size={16} className="text-[#6b6b6b] shrink-0" />
        <h2 className="text-[11px] tracking-[0.18em] uppercase font-semibold">
          {index + 1} · {name}
        </h2>
        {!b.sichtbar && <Badge ton="warnung">ausgeblendet</Badge>}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[#4a4a4a] cursor-pointer select-none">
            <input type="checkbox" checked={b.sichtbar} onChange={e => onSichtbar(e.target.checked)} className="h-4 w-4 accent-[#0a0a0a]" />
            Auf der Website zeigen
          </label>
          <ReihenfolgeKnoepfe index={index} anzahl={anzahl} bezeichnung={`Baustein ${index + 1} (${name})`} onVerschieben={onVerschieben} onEntfernen={onEntfernen} />
        </div>
      </div>
      <div className={`p-5 md:p-6 space-y-5 ${b.sichtbar ? '' : 'opacity-70'}`}>{children}</div>
    </section>
  )
}

/** Unauffälliger Knopf zwischen zwei Bausteinen; öffnet die Auswahl an dieser Stelle. */
function Einfuegen({ offen, onOeffnen, onSchliessen, onWaehlen }: { offen: boolean; onOeffnen: () => void; onSchliessen: () => void; onWaehlen: (art: BausteinArt) => void }) {
  if (offen) return <BausteinWahl titel="Baustein hier einfügen" onWaehlen={onWaehlen} onAbbrechen={onSchliessen} />
  return (
    <div className="flex items-center gap-3 text-[#6b6b6b]">
      <span className="h-px flex-1 bg-[#0a0a0a]/10" />
      <button type="button" onClick={onOeffnen} className="inline-flex items-center gap-1.5 text-xs hover:text-[#0a0a0a] px-2 py-1">
        <Plus size={13} /> Hier einfügen
      </button>
      <span className="h-px flex-1 bg-[#0a0a0a]/10" />
    </div>
  )
}

function BausteinWahl({ titel, onWaehlen, onAbbrechen }: { titel: string; onWaehlen: (art: BausteinArt) => void; onAbbrechen?: () => void }) {
  return (
    <div className="border border-dashed border-[#0a0a0a]/25 rounded-sm p-4 md:p-5 bg-white/60">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[11px] tracking-[0.18em] uppercase font-semibold">{titel}</h2>
        {onAbbrechen && (
          <button type="button" className={knopfKlassen.leise} onClick={onAbbrechen}>
            Abbrechen
          </button>
        )}
      </div>
      {[false, true].map(automatisch => (
        <div key={String(automatisch)} className={automatisch ? 'mt-4' : ''}>
          {automatisch && <p className="text-xs text-[#6b6b6b] mb-2">Automatisch aus der Verwaltung – der Inhalt kommt aus den News bzw. Downloads:</p>}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BAUSTEIN_ARTEN.filter(a => !!a.automatisch === automatisch).map(a => {
              const Icon = ICONS[a.art]
              return (
                <button
                  key={a.art}
                  type="button"
                  onClick={() => onWaehlen(a.art)}
                  className="flex items-start gap-3 text-left bg-white border border-[#0a0a0a]/15 rounded-sm p-3 hover:border-[#0a0a0a]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]"
                >
                  <Icon size={18} className="mt-0.5 shrink-0 text-[#6b6b6b]" />
                  <span>
                    <span className="block text-sm font-medium">{a.name}</span>
                    <span className="block text-xs text-[#6b6b6b] mt-0.5">{a.beschreibung}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Kleine Felder ──────────────────────────────────────────────────────────

function Textfeld({
  id,
  label,
  wert,
  onAendern,
  zeilen,
  platzhalter,
  hinweis,
}: {
  id: string
  label: string
  wert: string
  onAendern: (wert: string) => void
  /** Mit Zeilenzahl wird es ein mehrzeiliges Feld. */
  zeilen?: number
  platzhalter?: string
  hinweis?: React.ReactNode
}) {
  return (
    <Feld label={label} htmlFor={id} hinweis={hinweis}>
      {zeilen ? (
        <textarea id={id} rows={zeilen} value={wert} placeholder={platzhalter} onChange={e => onAendern(e.target.value)} className={`${eingabeKlasse} leading-relaxed`} />
      ) : (
        <input id={id} value={wert} placeholder={platzhalter} onChange={e => onAendern(e.target.value)} className={eingabeKlasse} />
      )}
    </Feld>
  )
}

/** Auswahl der Darstellung als große Kacheln mit kleiner Skizze. */
function Wahl<T extends keyof typeof DARSTELLUNG_NAMEN>({
  name,
  label,
  wert,
  optionen,
  onWahl,
}: {
  name: string
  label: string
  wert: T
  optionen: { wert: T; text: string }[]
  onWahl: (wert: T) => void
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-[#0a0a0a] mb-1.5">{label}</legend>
      <div className={`grid gap-2 ${optionen.length % 3 === 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {optionen.map(o => {
          const aktiv = o.wert === wert
          return (
            <label
              key={o.wert}
              className={`flex items-start gap-3 border rounded-sm p-3 cursor-pointer focus-within:ring-2 focus-within:ring-[#0a0a0a]/70 ${
                aktiv ? 'border-[#0a0a0a] bg-[#0a0a0a]/[0.03]' : 'border-[#0a0a0a]/15 hover:border-[#0a0a0a]/40'
              }`}
            >
              <input type="radio" name={name} value={o.wert} checked={aktiv} onChange={() => onWahl(o.wert)} className="sr-only" />
              <Skizze art={o.wert} />
              <span>
                <span className="block text-sm font-medium">{DARSTELLUNG_NAMEN[o.wert]}</span>
                <span className="block text-xs text-[#6b6b6b] mt-0.5 leading-snug">{o.text}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Winzige Skizze einer Darstellung – damit man ohne Ausprobieren sieht, was gemeint ist. */
function Skizze({ art }: { art: keyof typeof DARSTELLUNG_NAMEN }) {
  const rahmen = 'shrink-0 w-14 h-10 rounded-[2px] border border-[#0a0a0a]/15 p-1 flex gap-0.5 bg-[#f5f5f0]'
  const flaeche = 'bg-[#0a0a0a]/25 rounded-[1px]'
  const zeile = 'h-[3px] bg-[#0a0a0a]/30 rounded-full'
  const zeilen = (n: number, extra = '') => (
    <span className={`flex-1 flex flex-col justify-center gap-1 ${extra}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={zeile} style={{ width: `${100 - i * 18}%` }} />
      ))}
    </span>
  )
  switch (art) {
    case 'kacheln':
      return (
        <span aria-hidden className={rahmen}>
          {[0, 1, 2].map(i => (
            <span key={i} className={`flex-1 ${flaeche}`} />
          ))}
        </span>
      )
    case 'zeitstrahl':
      return (
        <span aria-hidden className={`${rahmen} gap-1.5`}>
          <span className="relative w-px ml-1 bg-[#0a0a0a]/40">
            {[0, 1, 2].map(i => (
              <span key={i} className="absolute -left-[2px] w-[5px] h-[5px] rounded-full bg-[#0a0a0a]/60" style={{ top: `${i * 11 + 2}px` }} />
            ))}
          </span>
          {zeilen(3)}
        </span>
      )
    case 'gross':
      return (
        <span aria-hidden className={`${rahmen} flex-col`}>
          <span className="flex-1 flex gap-1">
            <span className={`w-1/2 ${flaeche}`} />
            {zeilen(2)}
          </span>
          <span className="flex-1 flex gap-1">
            {zeilen(2)}
            <span className={`w-1/2 ${flaeche}`} />
          </span>
        </span>
      )
    case 'zahlenstrahl':
      return (
        <span aria-hidden className={`${rahmen} flex-col items-center gap-0.5`}>
          <span className={`w-6 flex-1 ${flaeche}`} />
          <span className="relative w-full h-[5px] mt-0.5">
            <span className="absolute inset-x-0 top-[2px] h-px bg-[#0a0a0a]/40" />
            {[0, 1, 2, 3, 4].map(i => (
              <span key={i} className={`absolute top-0 w-px h-[5px] ${i === 2 ? 'bg-[#0a0a0a]' : 'bg-[#0a0a0a]/40'}`} style={{ left: `${10 + i * 20}%` }} />
            ))}
          </span>
        </span>
      )
    case 'hell':
      return <span aria-hidden className={`${rahmen} px-2`}>{zeilen(3)}</span>
    case 'dunkel':
      return (
        <span aria-hidden className={`${rahmen} px-2 !bg-[#0a0a0a] border-[#0a0a0a]`}>
          <span className="flex-1 flex flex-col justify-center gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="h-[3px] bg-[#f5f5f0]/50 rounded-full" style={{ width: `${100 - i * 18}%` }} />
            ))}
          </span>
        </span>
      )
    case 'rechts':
      return (
        <span aria-hidden className={`${rahmen} gap-1`}>
          {zeilen(3)}
          <span className={`w-1/2 ${flaeche}`} />
        </span>
      )
    case 'links':
      return (
        <span aria-hidden className={`${rahmen} gap-1`}>
          <span className={`w-1/2 ${flaeche}`} />
          {zeilen(3)}
        </span>
      )
    case 'mosaik':
      return (
        <span aria-hidden className={`${rahmen} gap-0.5`}>
          {[
            ['h-[55%]', 'h-[45%]'],
            ['h-[35%]', 'h-[65%]'],
            ['h-[60%]', 'h-[40%]'],
          ].map((spalte, i) => (
            <span key={i} className="flex-1 flex flex-col gap-0.5">
              {spalte.map((h, j) => (
                <span key={j} className={`${h} ${flaeche}`} />
              ))}
            </span>
          ))}
        </span>
      )
    case 'normal':
      return (
        <span aria-hidden className={`${rahmen} justify-center`}>
          <span className={`w-2/3 ${flaeche}`} />
        </span>
      )
    case 'breit':
      return (
        <span aria-hidden className={rahmen}>
          <span className={`flex-1 ${flaeche}`} />
        </span>
      )
    case 'kaestchen':
      return (
        <span aria-hidden className={`${rahmen} flex-wrap content-center gap-[3px]`}>
          {[60, 35, 45, 55].map((w, i) => (
            <span key={i} className="h-2 border border-[#0a0a0a]/40 rounded-[1px]" style={{ width: `${w}%` }} />
          ))}
        </span>
      )
    case 'zeilen':
      return (
        <span aria-hidden className={`${rahmen} flex-col justify-center gap-1 px-1.5`}>
          {[0, 1, 2].map(i => (
            <span key={i} className="flex items-center gap-1">
              <span className="w-2.5 h-[3px] bg-[#0a0a0a]/40 rounded-full shrink-0" />
              <span className={`${zeile} flex-1`} />
            </span>
          ))}
        </span>
      )
    case 'uebrige':
    case 'alle':
      return (
        <span aria-hidden className={`${rahmen} flex-col justify-center gap-[3px] px-1.5`}>
          {(art === 'alle' ? [0, 1, 2, 3] : [0, 1]).map(i => (
            <span key={i} className="flex items-center gap-1">
              <span className="w-1.5 h-2 border border-[#0a0a0a]/50 rounded-[1px] shrink-0" />
              <span className={`${zeile} flex-1`} />
            </span>
          ))}
        </span>
      )
    case 'punkte':
      return (
        <span aria-hidden className={`${rahmen} gap-1.5 px-1.5`}>
          {[0, 1].map(s => (
            <span key={s} className="flex-1 flex flex-col justify-center gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="flex items-center gap-0.5">
                  <span className="w-[3px] h-[3px] bg-[#0a0a0a]/60 shrink-0" />
                  <span className={`${zeile} flex-1`} />
                </span>
              ))}
            </span>
          ))}
        </span>
      )
  }
}

/** Foto für einen Bildplatz. Optional: erst ein Knopf, damit lange Listen kurz bleiben. */
function FotoWahl({
  schluessel,
  bild,
  optional,
  onAnzeige,
}: {
  schluessel: string
  bild: EditorBild | null
  optional?: boolean
  onAnzeige: (url: string | null) => void
}) {
  const [offen, setOffen] = useState(!optional || !!bild)
  const beispielbild = useContext(BeispielbildKontext)
  const id = `${schluessel}-foto`

  /** Übung: das Beispielbild ins Dateifeld legen, als hätte man es ausgewählt – BildFeld übernimmt den Rest. */
  async function beispielNehmen() {
    const feld = document.getElementById(id)
    if (!beispielbild || !(feld instanceof HTMLInputElement)) return
    const blob = await (await fetch(beispielbild)).blob()
    const liste = new DataTransfer()
    liste.items.add(new File([blob], 'beispielbild.svg', { type: blob.type || 'image/svg+xml' }))
    feld.files = liste.files
    feld.dispatchEvent(new Event('change', { bubbles: true }))
  }

  if (!offen) {
    return (
      <button type="button" className={knopfKlassen.sekundaer} onClick={() => setOffen(true)}>
        <ImagePlus size={15} /> Foto hinzufügen
      </button>
    )
  }
  return (
    <Feld label={optional ? 'Foto (optional)' : 'Foto'} htmlFor={id}>
      <BildFeld aktuell={bild?.url ?? null} name={`bild:${schluessel}`} entfernenName={`bildEntfernen:${schluessel}`} id={id} onAnzeige={onAnzeige} />
      {beispielbild && (
        <button type="button" className={`${knopfKlassen.leise} -ml-2 mt-1 underline underline-offset-4`} onClick={beispielNehmen}>
          <FlaskConical size={14} aria-hidden="true" /> Kein Bild zur Hand? Beispielbild nehmen
        </button>
      )}
    </Feld>
  )
}

/** Rahmen für einen Eintrag in einer Liste (Station, Zahl) mit Knöpfen zum Verschieben und Entfernen. */
function Eintrag({ children, knoepfe }: { children: React.ReactNode; knoepfe: React.ReactNode }) {
  return (
    <li className="border border-[#0a0a0a]/10 rounded-sm p-3 sm:p-4 bg-[#fafaf7]">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-3">{children}</div>
        {knoepfe}
      </div>
    </li>
  )
}

// ─── Editoren je Baustein ───────────────────────────────────────────────────

type FotoMelden = (schluessel: string) => (url: string | null) => void

function ZeitleisteEditor({
  b,
  setzen,
  neuerSchluessel,
  fotoMelden,
}: {
  b: Art<'zeitleiste'>
  setzen: (b: Art<'zeitleiste'>) => void
  neuerSchluessel: (praefix: 'e') => string
  fotoMelden: FotoMelden
}) {
  const k = b.schluessel as string
  const eintraege = (neu: Art<'zeitleiste'>['eintraege']) => setzen({ ...b, eintraege: neu })
  const aendern = (j: number, aenderung: Partial<Art<'zeitleiste'>['eintraege'][number]>) => eintraege(b.eintraege.map((e, x) => (x === j ? { ...e, ...aenderung } : e)))
  return (
    <>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift (optional)" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} platzhalter="z. B. So fing alles an" />
      <Wahl
        name={`${k}-darstellung`}
        label="Darstellung"
        wert={b.darstellung}
        onWahl={d => setzen({ ...b, darstellung: d })}
        optionen={[
          { wert: 'kacheln', text: 'Kästen nebeneinander – kompakt, gut für viele Stationen' },
          { wert: 'zeitstrahl', text: 'Untereinander an einer Linie – liest sich wie eine Geschichte' },
          { wert: 'gross', text: 'Große Stationen, Fotos abwechselnd links und rechts' },
          { wert: 'zahlenstrahl', text: 'Jahre auf einem Strahl, beim Scrollen wird in jede Station hineingezoomt. Das Jahr kommt aus „Zeit“' },
        ]}
      />
      {b.darstellung === 'zahlenstrahl' && (
        <p className="text-xs text-[#6b6b6b] leading-relaxed -mt-1">
          Das Jahr jeder Station steht in „Zeit“ („2013“, „Oktober 2017“, „Heute“); Stationen ohne Jahr kommen zwischen ihre Nachbarn. Zu jeder
          Station zeigt der Zahlenstrahl ihr eigenes Foto.
        </p>
      )}
      <div>
        <div className="text-sm font-medium mb-1.5">Stationen</div>
        <ol className="space-y-3">
          {b.eintraege.map((e, j) => {
            const ek = e.schluessel as string
            const bezeichnung = e.titel || e.zeit || `Station ${j + 1}`
            return (
              <Eintrag
                key={ek}
                knoepfe={
                  <ReihenfolgeKnoepfe
                    index={j}
                    anzahl={b.eintraege.length}
                    bezeichnung={bezeichnung}
                    onVerschieben={r => eintraege(verschieben(b.eintraege, j, r))}
                    onEntfernen={() => eintraege(b.eintraege.filter((_, x) => x !== j))}
                  />
                }
              >
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <Textfeld id={`${ek}-zeit`} label="Zeit" wert={e.zeit} onAendern={v => aendern(j, { zeit: v })} platzhalter="z. B. 2017" />
                  <Textfeld id={`${ek}-titel`} label="Titel" wert={e.titel} onAendern={v => aendern(j, { titel: v })} platzhalter="z. B. Spatenstich" />
                </div>
                <Textfeld id={`${ek}-text`} label="Text" zeilen={3} wert={e.text} onAendern={v => aendern(j, { text: v })} />
                <FotoWahl schluessel={ek} bild={e.bild} optional onAnzeige={fotoMelden(ek)} />
              </Eintrag>
            )
          })}
        </ol>
        <button
          type="button"
          className={`${knopfKlassen.sekundaer} mt-3`}
          onClick={() => eintraege(b.eintraege.concat({ schluessel: neuerSchluessel('e'), zeit: '', titel: '', text: '', bild: null }))}
        >
          <Plus size={15} /> Station hinzufügen
        </button>
      </div>
    </>
  )
}

function TextEditor({ b, setzen, fotoMelden, hatFoto }: { b: Art<'text'>; setzen: (b: Art<'text'>) => void; fotoMelden: FotoMelden; hatFoto: boolean }) {
  const k = b.schluessel as string
  return (
    <>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift (optional)" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} />
      <Textfeld
        id={`${k}-text`}
        label="Text"
        zeilen={8}
        wert={b.text}
        onAendern={v => setzen({ ...b, text: v })}
        hinweis={
          <>
            So geht’s: <code className="font-mono">**fett**</code>, <code className="font-mono">*kursiv*</code>, <code className="font-mono">- Aufzählung</code>,
            Leerzeile = neuer Absatz, Links einfach einfügen.
          </>
        }
      />
      <FotoWahl schluessel={k} bild={b.bild} optional onAnzeige={fotoMelden(k)} />
      <Wahl
        name={`${k}-hintergrund`}
        label="Hintergrund"
        wert={b.hintergrund}
        onWahl={h => setzen({ ...b, hintergrund: h })}
        optionen={[
          { wert: 'hell', text: 'Wie die übrige Seite' },
          { wert: 'dunkel', text: 'Schwarzes Band über die ganze Breite – hebt den Abschnitt hervor' },
        ]}
      />
      {hatFoto && (
        <Wahl
          name={`${k}-position`}
          label="Foto"
          wert={b.bildPosition}
          onWahl={p => setzen({ ...b, bildPosition: p })}
          optionen={[
            { wert: 'rechts', text: 'Text links, Foto rechts' },
            { wert: 'links', text: 'Foto links, Text rechts' },
          ]}
        />
      )}
    </>
  )
}

function FotoEditor({ b, setzen, fotoMelden }: { b: Art<'bild'>; setzen: (b: Art<'bild'>) => void; fotoMelden: FotoMelden }) {
  const k = b.schluessel as string
  return (
    <>
      <FotoWahl schluessel={k} bild={b.bild} onAnzeige={fotoMelden(k)} />
      <Textfeld id={`${k}-unterschrift`} label="Bildunterschrift (optional)" wert={b.unterschrift} onAendern={v => setzen({ ...b, unterschrift: v })} platzhalter="z. B. Spatenstich am 27. Oktober 2017" />
      <Wahl
        name={`${k}-breite`}
        label="Breite"
        wert={b.breite}
        onWahl={w => setzen({ ...b, breite: w })}
        optionen={[
          { wert: 'normal', text: 'Mittig, etwas schmaler als die Seite' },
          { wert: 'breit', text: 'Über die ganze Seitenbreite' },
        ]}
      />
    </>
  )
}

// ─── Bildergalerie ──────────────────────────────────────────────────────────

const KLEINER_KNOPF =
  'inline-flex items-center justify-center w-9 h-9 rounded-sm border border-[#0a0a0a]/15 bg-white text-[#4a4a4a] hover:border-[#0a0a0a]/50 hover:text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]'

function GalerieEditor({
  b,
  setzen,
  neuerSchluessel,
  fotoMelden,
}: {
  b: Art<'galerie'>
  setzen: (b: Art<'galerie'>) => void
  neuerSchluessel: (praefix: 'e') => string
  fotoMelden: FotoMelden
}) {
  const k = b.schluessel as string
  /** Neu gewählte (schon verkleinerte) Dateien je Foto-Schlüssel – das Foto legt sie in sein Dateifeld. */
  const neueDateien = useRef(new Map<string, File>())
  const [vorbereiten, setVorbereiten] = useState<{ fertig: number; von: number } | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [ziehen, setZiehen] = useState(false)
  // Das Verkleinern dauert – danach mit dem dann aktuellen Stand weitermachen (Unterschriften könnten inzwischen getippt sein)
  const aktuell = useRef({ b, setzen })
  aktuell.current = { b, setzen }

  const fotos = (neu: Art<'galerie'>['fotos']) => setzen({ ...b, fotos: neu })
  const aendern = (j: number, unterschrift: string) => fotos(b.fotos.map((f, x) => (x === j ? { ...f, unterschrift } : f)))
  const entfernen = (j: number) => {
    neueDateien.current.delete(b.fotos[j].schluessel as string)
    fotos(b.fotos.filter((_, x) => x !== j))
  }

  async function hinzufuegen(liste: File[]) {
    if (liste.length === 0 || vorbereiten) return
    setHinweis(null)
    const neu: Art<'galerie'>['fotos'] = []
    const abgelehnt: string[] = []
    for (let i = 0; i < liste.length; i++) {
      setVorbereiten({ fertig: i, von: liste.length })
      const datei = liste[i]
      if (!datei.type.startsWith('image/')) {
        abgelehnt.push(`„${datei.name}“ ist kein Foto`)
        continue
      }
      const klein = await fotoVerkleinern(datei)
      if (klein.size > MAX_UPLOAD_BYTES) {
        abgelehnt.push(`„${datei.name}“ ist größer als ${megabyte(MAX_UPLOAD_BYTES)}`)
        continue
      }
      const schluessel = neuerSchluessel('e')
      neueDateien.current.set(schluessel, klein)
      neu.push({ schluessel, bild: null, unterschrift: '' })
    }
    setVorbereiten(null)
    if (abgelehnt.length > 0) setHinweis(`Nicht übernommen: ${abgelehnt.join(', ')}.`)
    if (neu.length > 0) aktuell.current.setzen({ ...aktuell.current.b, fotos: aktuell.current.b.fotos.concat(neu) })
  }

  const neueBytes = b.fotos.reduce((summe, f) => summe + (neueDateien.current.get(f.schluessel as string)?.size ?? 0), 0)
  const neueAnzahl = b.fotos.filter(f => neueDateien.current.has(f.schluessel as string)).length

  return (
    <>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift (optional)" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} platzhalter="z. B. Bilder vom Bau" />
      <Textfeld id={`${k}-text`} label="Kurzer Text (optional)" zeilen={2} wert={b.text} onAendern={v => setzen({ ...b, text: v })} />
      <Wahl
        name={`${k}-darstellung`}
        label="Darstellung"
        wert={b.darstellung}
        onWahl={d => setzen({ ...b, darstellung: d })}
        optionen={[
          { wert: 'kacheln', text: 'Gleich große Kacheln, bis zu vier nebeneinander – ruhig und ordentlich' },
          { wert: 'mosaik', text: 'Jedes Foto in seinem Format, Hoch- und Querformat gemischt, mit Bildunterschrift' },
        ]}
      />
      <div>
        <div className="text-sm font-medium mb-1.5">Fotos{b.fotos.length > 0 && <span className="font-normal text-[#6b6b6b]"> ({b.fotos.length})</span>}</div>
        {b.fotos.length > 0 && (
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
            {b.fotos.map((f, j) => {
              const fk = f.schluessel as string
              return (
                <GalerieFotoKarte
                  key={fk}
                  schluessel={fk}
                  nummer={j + 1}
                  bild={f.bild}
                  datei={neueDateien.current.get(fk) ?? null}
                  unterschrift={f.unterschrift}
                  onUnterschrift={v => aendern(j, v)}
                  onAnzeige={fotoMelden(fk)}
                  knoepfe={
                    <div className="flex gap-1 shrink-0">
                      <button type="button" className={KLEINER_KNOPF} disabled={j === 0} onClick={() => fotos(verschieben(b.fotos, j, -1))} aria-label={`Foto ${j + 1} nach vorn`} title="Nach vorn">
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className={KLEINER_KNOPF}
                        disabled={j === b.fotos.length - 1}
                        onClick={() => fotos(verschieben(b.fotos, j, 1))}
                        aria-label={`Foto ${j + 1} nach hinten`}
                        title="Nach hinten"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button type="button" className={`${KLEINER_KNOPF} hover:!text-red-700 hover:!border-red-300`} onClick={() => entfernen(j)} aria-label={`Foto ${j + 1} entfernen`} title="Entfernen">
                        <X size={16} />
                      </button>
                    </div>
                  }
                />
              )
            })}
          </ol>
        )}

        <label
          htmlFor={`${k}-dateien`}
          onDragOver={e => {
            e.preventDefault()
            setZiehen(true)
          }}
          onDragLeave={() => setZiehen(false)}
          onDrop={e => {
            e.preventDefault()
            setZiehen(false)
            hinzufuegen(Array.from(e.dataTransfer.files))
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-6 text-center cursor-pointer focus-within:ring-2 focus-within:ring-[#0a0a0a] ${
            ziehen ? 'border-[#0a0a0a] bg-[#0a0a0a]/[0.04]' : 'border-[#0a0a0a]/25 hover:border-[#0a0a0a]/50'
          }`}
        >
          <ImagePlus size={22} className="text-[#6b6b6b]" />
          <span className="text-sm font-medium">{vorbereiten ? `Fotos werden vorbereitet … (${vorbereiten.fertig + 1} von ${vorbereiten.von})` : 'Fotos hinzufügen'}</span>
          <span className="text-xs text-[#6b6b6b]">Mehrere auf einmal auswählen oder hierher ziehen. Sie werden dabei auf Webgröße verkleinert.</span>
          {/* Ohne name: Die Dateien gehen über die Dateifelder der einzelnen Fotos mit, nicht über dieses */}
          <input
            id={`${k}-dateien`}
            type="file"
            accept="image/*"
            multiple
            disabled={!!vorbereiten}
            className="sr-only"
            onChange={e => {
              const liste = Array.from(e.target.files ?? [])
              e.target.value = ''
              hinzufuegen(liste)
            }}
          />
        </label>
        {neueAnzahl > 0 && (
          <p className={`mt-2 text-xs ${neueBytes > MAX_UPLOAD_BYTES ? 'text-red-700' : 'text-[#6b6b6b]'}`}>
            {neueAnzahl === 1 ? '1 neues Foto' : `${neueAnzahl} neue Fotos`} ({megabyte(neueBytes)}) – {neueAnzahl === 1 ? 'wird' : 'werden'} beim Speichern hochgeladen.
            {neueBytes > MAX_UPLOAD_BYTES && ` Auf einmal gehen höchstens ${megabyte(MAX_UPLOAD_BYTES)} – bitte in mehreren Schritten speichern.`}
          </p>
        )}
        {hinweis && <p className="mt-2 text-sm text-red-700">{hinweis}</p>}
      </div>
    </>
  )
}

/**
 * Ein Foto der Galerie im Editor. Ein neues Foto legt seine Datei beim Erscheinen in ein eigenes,
 * verstecktes Dateifeld "bild:<schlüssel>" – so geht es beim Speichern mit wie die Fotos aus BildFeld.
 */
function GalerieFotoKarte({
  schluessel,
  nummer,
  bild,
  datei,
  unterschrift,
  onUnterschrift,
  onAnzeige,
  knoepfe,
}: {
  schluessel: string
  nummer: number
  bild: EditorBild | null
  datei: File | null
  unterschrift: string
  onUnterschrift: (wert: string) => void
  onAnzeige: (url: string | null) => void
  knoepfe: React.ReactNode
}) {
  const feld = useRef<HTMLInputElement>(null)
  const [vorschau, setVorschau] = useState<string | null>(null)
  const melden = useRef(onAnzeige)
  melden.current = onAnzeige

  useEffect(() => {
    const el = feld.current
    if (!datei || !el) return
    const liste = new DataTransfer()
    liste.items.add(datei)
    el.files = liste.files
    const url = URL.createObjectURL(datei)
    setVorschau(url)
    melden.current(url)
    return () => URL.revokeObjectURL(url)
  }, [datei])

  const src = vorschau ?? bild?.url ?? null
  return (
    <li className="border border-[#0a0a0a]/10 rounded-sm bg-[#fafaf7] overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-[#0a0a0a]/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt={`Foto ${nummer}`} className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1.5">
          <span className="rounded-sm bg-[#0a0a0a]/70 px-1.5 py-0.5 text-[11px] font-medium text-[#f5f5f0]">{nummer}</span>
          {datei && <Badge ton="erfolg">neu</Badge>}
        </span>
      </div>
      <input ref={feld} type="file" name={`bild:${schluessel}`} tabIndex={-1} aria-hidden="true" className="hidden" />
      <div className="p-3 space-y-3 flex-1 flex flex-col">
        <Textfeld id={`${schluessel}-unterschrift`} label="Bildunterschrift (optional)" wert={unterschrift} onAendern={onUnterschrift} platzhalter="z. B. 2017 Bauschild" />
        <div className="mt-auto flex justify-end">{knoepfe}</div>
      </div>
    </li>
  )
}

function ListeEditor({ b, setzen }: { b: Art<'liste'>; setzen: (b: Art<'liste'>) => void }) {
  const k = b.schluessel as string
  const punkte = (neu: string[]) => setzen({ ...b, punkte: neu })
  return (
    <>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift (optional)" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} platzhalter="z. B. Ideen für die Zukunft" />
      <Textfeld id={`${k}-text`} label="Kurzer Text (optional)" zeilen={2} wert={b.text} onAendern={v => setzen({ ...b, text: v })} />
      <Wahl
        name={`${k}-darstellung`}
        label="Darstellung"
        wert={b.darstellung}
        onWahl={d => setzen({ ...b, darstellung: d })}
        optionen={[
          { wert: 'kaestchen', text: 'Kurze Begriffe in Kästchen nebeneinander' },
          { wert: 'punkte', text: 'Aufzählung in zwei Spalten – auch für ganze Sätze' },
        ]}
      />
      <div>
        <div className="text-sm font-medium mb-1.5">Punkte</div>
        <ol className="space-y-2">
          {b.punkte.map((p, j) => (
            <li key={j} className="flex items-center gap-3">
              <input
                aria-label={`Punkt ${j + 1}`}
                value={p}
                onChange={e => punkte(b.punkte.map((x, y) => (y === j ? e.target.value : x)))}
                className={`${eingabeKlasse} flex-1 min-w-0`}
              />
              <ReihenfolgeKnoepfe
                index={j}
                anzahl={b.punkte.length}
                bezeichnung={p || `Punkt ${j + 1}`}
                onVerschieben={r => punkte(verschieben(b.punkte, j, r))}
                onEntfernen={() => punkte(b.punkte.filter((_, y) => y !== j))}
              />
            </li>
          ))}
        </ol>
        <button type="button" className={`${knopfKlassen.sekundaer} mt-3`} onClick={() => punkte(b.punkte.concat(''))}>
          <Plus size={15} /> Punkt hinzufügen
        </button>
      </div>
    </>
  )
}

function ZahlenEditor({ b, setzen, neuerSchluessel }: { b: Art<'zahlen'>; setzen: (b: Art<'zahlen'>) => void; neuerSchluessel: (praefix: 'e') => string }) {
  const k = b.schluessel as string
  const eintraege = (neu: Art<'zahlen'>['eintraege']) => setzen({ ...b, eintraege: neu })
  const aendern = (j: number, aenderung: { zahl?: string; text?: string }) => eintraege(b.eintraege.map((e, x) => (x === j ? { ...e, ...aenderung } : e)))
  return (
    <>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift (optional)" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} />
      <Wahl
        name={`${k}-hintergrund`}
        label="Hintergrund"
        wert={b.hintergrund}
        onWahl={h => setzen({ ...b, hintergrund: h })}
        optionen={[
          { wert: 'hell', text: 'Wie die übrige Seite' },
          { wert: 'dunkel', text: 'Schwarzes Band über die ganze Breite' },
        ]}
      />
      <div>
        <div className="text-sm font-medium mb-1.5">Zahlen</div>
        <ol className="space-y-3">
          {b.eintraege.map((e, j) => {
            const ek = e.schluessel as string
            return (
              <Eintrag
                key={ek}
                knoepfe={
                  <ReihenfolgeKnoepfe
                    index={j}
                    anzahl={b.eintraege.length}
                    bezeichnung={e.zahl || `Zahl ${j + 1}`}
                    onVerschieben={r => eintraege(verschieben(b.eintraege, j, r))}
                    onEntfernen={() => eintraege(b.eintraege.filter((_, x) => x !== j))}
                  />
                }
              >
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <Textfeld id={`${ek}-zahl`} label="Zahl" wert={e.zahl} onAendern={v => aendern(j, { zahl: v })} platzhalter="z. B. 2,9 ha" />
                  <Textfeld id={`${ek}-text`} label="Was die Zahl bedeutet" wert={e.text} onAendern={v => aendern(j, { text: v })} platzhalter="z. B. Gelände am Tostedter Weg" />
                </div>
              </Eintrag>
            )
          })}
        </ol>
        <button type="button" className={`${knopfKlassen.sekundaer} mt-3`} onClick={() => eintraege(b.eintraege.concat({ schluessel: neuerSchluessel('e'), zahl: '', text: '' }))}>
          <Plus size={15} /> Zahl hinzufügen
        </button>
      </div>
    </>
  )
}

function ZitatEditor({ b, setzen }: { b: Art<'zitat'>; setzen: (b: Art<'zitat'>) => void }) {
  const k = b.schluessel as string
  return (
    <>
      <Textfeld id={`${k}-text`} label="Zitat" zeilen={3} wert={b.text} onAendern={v => setzen({ ...b, text: v })} />
      <Textfeld id={`${k}-quelle`} label="Von wem? (optional)" wert={b.quelle} onAendern={v => setzen({ ...b, quelle: v })} platzhalter="z. B. Jörg Passlack, Vorsitzender" />
    </>
  )
}

function KartenEditor({ b, setzen, neuerSchluessel }: { b: Art<'karten'>; setzen: (b: Art<'karten'>) => void; neuerSchluessel: (praefix: 'e') => string }) {
  const k = b.schluessel as string
  const eintraege = (neu: Art<'karten'>['eintraege']) => setzen({ ...b, eintraege: neu })
  const aendern = (j: number, aenderung: { titel?: string; text?: string }) => eintraege(b.eintraege.map((e, x) => (x === j ? { ...e, ...aenderung } : e)))
  return (
    <>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift (optional)" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} />
      <div>
        <div className="text-sm font-medium mb-1.5">Karten</div>
        <p className="text-xs text-[#6b6b6b] mb-2">Bis zu vier stehen nebeneinander; die Karten einer Reihe füllen immer die ganze Breite.</p>
        <ol className="space-y-3">
          {b.eintraege.map((e, j) => {
            const ek = e.schluessel as string
            return (
              <Eintrag
                key={ek}
                knoepfe={
                  <ReihenfolgeKnoepfe
                    index={j}
                    anzahl={b.eintraege.length}
                    bezeichnung={e.titel || `Karte ${j + 1}`}
                    onVerschieben={r => eintraege(verschieben(b.eintraege, j, r))}
                    onEntfernen={() => eintraege(b.eintraege.filter((_, x) => x !== j))}
                  />
                }
              >
                <Textfeld id={`${ek}-titel`} label="Titel" wert={e.titel} onAendern={v => aendern(j, { titel: v })} platzhalter="z. B. Spenden" />
                <Textfeld id={`${ek}-text`} label="Text" zeilen={3} wert={e.text} onAendern={v => aendern(j, { text: v })} />
              </Eintrag>
            )
          })}
        </ol>
        <button type="button" className={`${knopfKlassen.sekundaer} mt-3`} onClick={() => eintraege(b.eintraege.concat({ schluessel: neuerSchluessel('e'), titel: '', text: '' }))}>
          <Plus size={15} /> Karte hinzufügen
        </button>
      </div>
    </>
  )
}

/** Hinweis, woher ein automatischer Baustein seinen Inhalt holt, mit Link dorthin. */
function Herkunft({ children, href, linkText }: { children: React.ReactNode; href: string; linkText: string }) {
  return (
    <p className="text-sm text-[#4a4a4a] bg-[#f5f5f0] border border-[#0a0a0a]/10 rounded-sm px-3 py-2.5 leading-relaxed">
      {children}{' '}
      <Link href={href} className="underline underline-offset-2 hover:text-[#0a0a0a] whitespace-nowrap">
        {linkText}
      </Link>
    </p>
  )
}

function AufrufEditor({ b, setzen }: { b: Art<'aufruf'>; setzen: (b: Art<'aufruf'>) => void }) {
  const k = b.schluessel as string
  const { downloads } = useContext(DatenKontext)
  // Gewählte Downloads, die es nicht mehr gibt, bleiben erhalten, erscheinen aber nicht – hier sichtbar machen
  const fehlend = b.downloads.filter(id => !downloads.some(d => d.id === id)).length
  function umschalten(id: number, an: boolean) {
    setzen({ ...b, downloads: an ? b.downloads.concat(id) : b.downloads.filter(x => x !== id) })
  }
  return (
    <>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} platzhalter="z. B. Beitrittserklärung" />
      <Textfeld id={`${k}-text`} label="Text" zeilen={3} wert={b.text} onAendern={v => setzen({ ...b, text: v })} />
      <fieldset>
        <legend className="block text-sm font-medium text-[#0a0a0a] mb-1.5">Knöpfe</legend>
        {downloads.length === 0 ? (
          <p className="text-sm text-[#6b6b6b] mb-2">Der Förderverein hat noch keine Downloads – deshalb gibt es hier nur den E-Mail-Knopf.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {downloads.map(d => (
              <label key={d.id} className="flex items-start gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={b.downloads.indexOf(d.id) >= 0} onChange={e => umschalten(d.id, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0a0a0a]" />
                <span>
                  <span className="font-medium">{d.titel}</span> <span className="text-[#6b6b6b]">– Knopf zum Herunterladen</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={b.email} onChange={e => setzen({ ...b, email: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#0a0a0a]" />
          <span>
            <span className="font-medium">E-Mail schreiben</span> <span className="text-[#6b6b6b]">– an {FOERDERVEREIN.email}, Betreff ist die Überschrift</span>
          </span>
        </label>
        {fehlend > 0 && (
          <p className="mt-2 text-xs text-amber-800">
            {fehlend === 1 ? 'Ein gewählter Download wurde inzwischen gelöscht' : `${fehlend} gewählte Downloads wurden inzwischen gelöscht`} – sein Knopf erscheint nicht mehr.
          </p>
        )}
      </fieldset>
      <Herkunft href="/verwaltung/downloads" linkText="Zu den Downloads →">
        Neue PDFs lädst du unter „Downloads“ hoch; sie bekommen dort automatisch die Kategorie „Förderverein“.
      </Herkunft>
      <Wahl
        name={`${k}-hintergrund`}
        label="Hintergrund"
        wert={b.hintergrund}
        onWahl={h => setzen({ ...b, hintergrund: h })}
        optionen={[
          { wert: 'dunkel', text: 'Schwarzer Kasten – fällt am meisten auf' },
          { wert: 'hell', text: 'Heller Kasten mit Rahmen' },
        ]}
      />
    </>
  )
}

function MeldungenEditor({ b, setzen }: { b: Art<'meldungen'>; setzen: (b: Art<'meldungen'>) => void }) {
  const k = b.schluessel as string
  const { news } = useContext(DatenKontext)
  return (
    <>
      <Herkunft href="/verwaltung/news" linkText="Zu den News →">
        {news.length === 0
          ? 'Zurzeit gibt es keine veröffentlichte News mit der Kategorie „Förderverein“ – dann steht hier der Text unten.'
          : news.length === 1
            ? 'Hier steht die veröffentlichte News mit der Kategorie „Förderverein“ (zurzeit eine).'
            : `Hier stehen die veröffentlichten News mit der Kategorie „Förderverein“, die neueste zuerst (zurzeit ${news.length}).`}
      </Herkunft>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift (optional)" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} />
      <Wahl
        name={`${k}-darstellung`}
        label="Darstellung"
        wert={b.darstellung}
        onWahl={d => setzen({ ...b, darstellung: d })}
        optionen={[
          { wert: 'kacheln', text: 'Karten mit Bild, bis zu drei nebeneinander' },
          { wert: 'zeilen', text: 'Kompakte Liste mit Datum, Titel und Vorschautext' },
        ]}
      />
      <Feld label="Wie viele?" htmlFor={`${k}-anzahl`}>
        <select id={`${k}-anzahl`} value={b.anzahl} onChange={e => setzen({ ...b, anzahl: Number(e.target.value) })} className={`${auswahlKlasse} sm:max-w-xs`}>
          {MELDUNGEN_ANZAHLEN.map(n => (
            <option key={n} value={n}>
              {n === 0 ? 'Alle' : `Die neuesten ${n}`}
            </option>
          ))}
        </select>
      </Feld>
      <div className="grid gap-3">
        <Textfeld id={`${k}-leer-titel`} label="Überschrift, solange es keine Meldungen gibt" wert={b.leerTitel} onAendern={v => setzen({ ...b, leerTitel: v })} />
        <Textfeld
          id={`${k}-leer-text`}
          label="Text, solange es keine Meldungen gibt"
          zeilen={3}
          wert={b.leerText}
          onAendern={v => setzen({ ...b, leerText: v })}
          hinweis={
            <>
              Ein Link geht so: <code className="font-mono">[Text](https://…)</code> oder <code className="font-mono">[info@…](mailto:info@…)</code>.
            </>
          }
        />
      </div>
    </>
  )
}

function UnterlagenEditor({ b, setzen }: { b: Art<'unterlagen'>; setzen: (b: Art<'unterlagen'>) => void }) {
  const k = b.schluessel as string
  const { downloads } = useContext(DatenKontext)
  return (
    <>
      <Herkunft href="/verwaltung/downloads" linkText="Zu den Downloads →">
        {downloads.length === 0
          ? 'Der Förderverein hat zurzeit keine Downloads – solange erscheint dieser Baustein nicht.'
          : `Hier stehen die Downloads des Fördervereins (zurzeit ${downloads.length}).`}
      </Herkunft>
      <Textfeld id={`${k}-ueberschrift`} label="Überschrift" wert={b.ueberschrift} onAendern={v => setzen({ ...b, ueberschrift: v })} platzhalter="z. B. Unterlagen" />
      <Wahl
        name={`${k}-auswahl`}
        label="Welche?"
        wert={b.auswahl}
        onWahl={a => setzen({ ...b, auswahl: a })}
        optionen={[
          { wert: 'uebrige', text: 'Ohne die, die schon als Knopf in einem Kasten stehen' },
          { wert: 'alle', text: 'Alle Downloads des Fördervereins' },
        ]}
      />
    </>
  )
}
