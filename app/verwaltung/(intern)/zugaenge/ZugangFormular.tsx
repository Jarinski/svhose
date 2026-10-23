'use client'

/**
 * Formular für Name, Benutzername, eigene Person und Rechte eines Zugangs – zum Anlegen und Bearbeiten.
 * Nach dem Anlegen erscheint statt des Formulars direkt der Einladungs-Code (nur in dieser Antwort),
 * über den die Person Passwort und Authenticator-App einrichtet.
 */

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { LEER } from '@/lib/verwaltung/formular'
import AnmeldeCodeKarte from '@/components/verwaltung/AnmeldeCodeKarte'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import PersonSuche, { type PersonKurz } from '@/components/verwaltung/PersonSuche'
import { eingabeKlasse, Feld, Karte, knopfKlassen, Meldung } from '@/components/verwaltung/ui'
import { benutzernameVorschlagAktion, zugangAnlegenAktion, zugangSpeichernAktion, type ZugangErgebnis } from './aktionen'
import type { SparteMitTeams } from './logik'
import { BENUTZERNAME_HINWEIS, einladungsHinweis } from './texte'

export interface ZugangFormDaten {
  id: number
  name: string
  /** Aktueller Benutzername – oder ein Vorschlag, falls noch keiner gesetzt ist. */
  benutzername: string
  /** true, wenn der Zugang noch keinen Benutzernamen hat (dann ist das Feld nur ein Vorschlag). */
  benutzernameFehlt?: boolean
  personId: number | null
  personName: string | null
  istAdmin: boolean
  sparten: number[]
  mannschaften: number[]
  gruppen: number[]
}

interface Props {
  modus: 'neu' | 'bearbeiten'
  zugang?: ZugangFormDaten
  /** Bearbeitet die angemeldete Person gerade ihren eigenen Zugang? */
  istSelbst?: boolean
  personen: PersonKurz[]
  baum: SparteMitTeams[]
}

const LEER_ERGEBNIS: ZugangErgebnis = LEER

export default function ZugangFormular({ modus, zugang, istSelbst = false, personen, baum }: Props) {
  const speichern: (vorher: ZugangErgebnis, formData: FormData) => Promise<ZugangErgebnis> = modus === 'neu' ? zugangAnlegenAktion : zugangSpeichernAktion
  const [ergebnis, aktion] = useActionState(speichern, LEER_ERGEBNIS)
  const [name, setName] = useState(zugang?.name ?? '')
  const automatischerName = useRef<string | null>(null)
  const [person, setPerson] = useState<PersonKurz | null>(
    zugang?.personId != null ? { id: zugang.personId, name: zugang.personName ?? `Person Nr. ${zugang.personId}` } : null,
  )
  const [rolle, setRolle] = useState<'admin' | 'bereiche'>(zugang?.istAdmin ? 'admin' : 'bereiche')
  const [auswahl, setAuswahl] = useState<string[]>(
    zugang ? zugang.sparten.map(id => `s${id}`).concat(zugang.mannschaften.map(id => `m${id}`), zugang.gruppen.map(id => `g${id}`)) : [],
  )
  const [benutzername, setBenutzername] = useState(zugang?.benutzername ?? '')
  // Beim Anlegen folgt der Benutzername dem Namen, bis er von Hand geändert wird.
  const benutzernameVonHand = useRef(modus === 'bearbeiten')
  const anfrage = useRef(0)
  const f = ergebnis.felder ?? {}

  useEffect(() => {
    if (benutzernameVonHand.current || modus !== 'neu') return
    const nummer = ++anfrage.current
    if (!name.trim()) {
      setBenutzername('')
      return
    }
    const zeit = setTimeout(async () => {
      try {
        const vorschlag = await benutzernameVorschlagAktion(name)
        if (nummer === anfrage.current && !benutzernameVonHand.current) setBenutzername(vorschlag)
      } catch {
        // Kein Vorschlag – das Feld bleibt einfach zum Selbst-Ausfüllen.
      }
    }, 350)
    return () => clearTimeout(zeit)
  }, [name, modus])

  // ─── Nach dem Anlegen: Einladungs-Code anzeigen ───
  const erg = ergebnis
  if (modus === 'neu' && erg.ok && erg.zugangId) {
    return (
      <div className="space-y-6">
        <Meldung art="erfolg">
          {erg.meldung}
          {erg.benutzername && (
            <>
              {' '}
              Benutzername: <strong className="font-mono">{erg.benutzername}</strong>
            </>
          )}
        </Meldung>
        {erg.code && <AnmeldeCodeKarte daten={erg.code} hinweis={einladungsHinweis(erg.code.name)} />}
        <div className="flex flex-wrap gap-2">
          <Link href={`/verwaltung/zugaenge/${erg.zugangId}`} className={knopfKlassen.primaer}>
            Zum Zugang
          </Link>
          {/* Absichtlich ein voller Seitenaufruf: setzt das Formular zurück und der Code verschwindet. */}
          <a href="/verwaltung/zugaenge/neu" className={knopfKlassen.sekundaer}>
            Weiteren Zugang anlegen
          </a>
          <Link href="/verwaltung/zugaenge" className={knopfKlassen.sekundaer}>
            Alle Zugänge
          </Link>
        </div>
      </div>
    )
  }

  function personWaehlen(p: PersonKurz | null) {
    setPerson(p)
    // Name vorbelegen, solange er leer ist oder noch der automatisch übernommene Name drinsteht
    if (p && (name.trim() === '' || name === automatischerName.current)) {
      setName(p.name)
      automatischerName.current = p.name
    }
  }

  return (
    <form action={aktion} onReset={eingabenBehalten} className="space-y-6">
      {zugang && <input type="hidden" name="id" value={zugang.id} />}

      <Karte titel="Wer?">
        <div className="space-y-5">
          <Feld label="Name" htmlFor="name" fehler={f.name} hinweis="So erscheint der Zugang in der Verwaltung und im Verlauf, z. B. „Anna Beispiel“.">
            <input
              id="name"
              name="name"
              required
              maxLength={80}
              value={name}
              autoFocus={modus === 'neu'}
              onChange={e => setName(e.target.value)}
              className={eingabeKlasse}
            />
          </Feld>
          <Feld
            label="Benutzername"
            htmlFor="benutzername"
            fehler={f.benutzername}
            hinweis={
              zugang?.benutzernameFehlt
                ? `Noch nicht festgelegt – das ist ein Vorschlag. ${BENUTZERNAME_HINWEIS}`
                : modus === 'bearbeiten'
                  ? `${BENUTZERNAME_HINWEIS} Bei einer Änderung bitte der Person Bescheid geben.`
                  : BENUTZERNAME_HINWEIS
            }
          >
            <input
              id="benutzername"
              name="benutzername"
              required
              maxLength={40}
              value={benutzername}
              onChange={e => {
                benutzernameVonHand.current = true
                setBenutzername(e.target.value.toLowerCase().replace(/\s+/g, ''))
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              placeholder="anna.beispiel"
              className={`${eingabeKlasse} font-mono`}
            />
          </Feld>
          <div>
            <div className="text-sm font-medium mb-1.5">
              Eigene Person <span className="font-normal text-[#6b6b6b]">(optional)</span>
            </div>
            <input type="hidden" name="personId" value={person?.id ?? ''} />
            {person ? (
              <div className="flex flex-wrap items-center gap-3 border border-[#0a0a0a]/15 rounded-sm px-3 py-2 bg-white">
                <span className="flex-1 min-w-0 font-medium">{person.name}</span>
                <button type="button" onClick={() => setPerson(null)} className={knopfKlassen.leise}>
                  <X size={14} /> Entfernen
                </button>
              </div>
            ) : (
              <PersonSuche personen={personen} onWaehlen={p => personWaehlen(p)} neuLink={false} placeholder="Person suchen …" />
            )}
            <p className="mt-1.5 text-xs text-[#6b6b6b] leading-relaxed">
              Die Person aus der Personenliste, die zu diesem Zugang gehört („das bin ich“). Dann kann sie ihre eigenen Kontaktdaten und ihr Foto selbst pflegen.
            </p>
          </div>
        </div>
      </Karte>

      <Karte titel="Darf bearbeiten">
        <div className="space-y-4">
          {istSelbst && <input type="hidden" name="rolle" value="admin" />}
          <fieldset className="space-y-2" disabled={istSelbst}>
            <legend className="sr-only">Rechte</legend>
            <label className={`flex items-start gap-3 border rounded-sm p-3 cursor-pointer ${rolle === 'admin' ? 'border-[#0a0a0a] bg-[#0a0a0a]/[0.03]' : 'border-[#0a0a0a]/15'}`}>
              <input type="radio" name="rolle" value="admin" checked={rolle === 'admin'} onChange={() => setRolle('admin')} className="mt-0.5 w-5 h-5" />
              <span>
                <span className="block font-medium text-sm">Alles (Admin)</span>
                <span className="block text-xs text-[#6b6b6b]">Alle Inhalte, Kontaktseite, Zugänge und Verlauf. Nur für den Vorstand.</span>
              </span>
            </label>
            <label
              className={`flex items-start gap-3 border rounded-sm p-3 cursor-pointer ${rolle === 'bereiche' ? 'border-[#0a0a0a] bg-[#0a0a0a]/[0.03]' : 'border-[#0a0a0a]/15'}`}
            >
              <input type="radio" name="rolle" value="bereiche" checked={rolle === 'bereiche'} onChange={() => setRolle('bereiche')} className="mt-0.5 w-5 h-5" />
              <span>
                <span className="block font-medium text-sm">Bestimmte Bereiche</span>
                <span className="block text-xs text-[#6b6b6b]">Nur ausgewählte Sparten, Mannschaften oder Gruppen – z. B. für Trainer:innen und Spartenleitungen.</span>
              </span>
            </label>
          </fieldset>
          {istSelbst && <p className="text-xs text-[#6b6b6b]">Du kannst dir nicht selbst die Admin-Rechte entziehen.</p>}
          {rolle === 'bereiche' && <BereichAuswahl baum={baum} auswahl={auswahl} setAuswahl={setAuswahl} fehler={f.bereiche} />}
        </div>
      </Karte>

      <div className="sticky bottom-0 z-10 py-3 bg-[#f5f5f0]/95 backdrop-blur-sm border-t border-[#0a0a0a]/10 space-y-3">
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf className="w-full sm:w-auto">{modus === 'neu' ? 'Zugang anlegen und Einladungs-Code erstellen' : 'Speichern'}</SpeichernKnopf>
      </div>
    </form>
  )
}

// ─── Auswahl der Bereiche ───────────────────────────────────────────────────

function normalisieren(text: string) {
  return text.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

function BereichAuswahl({
  baum,
  auswahl,
  setAuswahl,
  fehler,
}: {
  baum: SparteMitTeams[]
  auswahl: string[]
  setAuswahl: (a: string[]) => void
  fehler?: string
}) {
  const [suche, setSuche] = useState('')
  const [offen, setOffen] = useState<number[]>(() =>
    baum.filter(s => s.mannschaften.some(m => auswahl.indexOf(`m${m.id}`) >= 0) || s.gruppen.some(g => auswahl.indexOf(`g${g.id}`) >= 0)).map(s => s.id),
  )
  const hat = (k: string) => auswahl.indexOf(k) >= 0
  const umschalten = (k: string, an: boolean) => setAuswahl(an ? (hat(k) ? auswahl : auswahl.concat(k)) : auswahl.filter(x => x !== k))
  const s = normalisieren(suche.trim())
  const passt = (text: string) => s === '' || normalisieren(text).indexOf(s) >= 0

  // Lesbare Zusammenfassung der Auswahl
  const zusammenfassung = useMemo(() => {
    const texte: string[] = []
    baum.forEach(sp => {
      if (auswahl.indexOf(`s${sp.id}`) >= 0) {
        texte.push(`${sp.name} (ganze Sparte)`)
        return
      }
      sp.mannschaften.forEach(m => auswahl.indexOf(`m${m.id}`) >= 0 && texte.push(`${sp.name} · ${m.name}`))
      sp.gruppen.forEach(g => auswahl.indexOf(`g${g.id}`) >= 0 && texte.push(`${sp.name} · ${g.name}`))
    })
    return texte
  }, [baum, auswahl])

  return (
    <div className="space-y-3">
      <div className={`rounded-sm px-3 py-2.5 text-sm ${zusammenfassung.length ? 'bg-emerald-50 text-emerald-950' : 'bg-[#0a0a0a]/[0.04] text-[#6b6b6b]'}`}>
        {zusammenfassung.length ? (
          <>
            <span className="font-medium">Ausgewählt:</span> {zusammenfassung.join(', ')}
          </>
        ) : (
          'Noch nichts ausgewählt.'
        )}
      </div>
      {fehler && <p className="text-sm text-red-700">{fehler}</p>}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] pointer-events-none" />
        <input
          type="search"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder="Sparte, Mannschaft oder Gruppe suchen …"
          aria-label="Bereiche durchsuchen"
          className={`${eingabeKlasse} pl-9`}
        />
      </div>
      <ul className="border border-[#0a0a0a]/10 rounded-sm divide-y divide-[#0a0a0a]/[0.07] bg-white">
        {baum.map(sp => {
          const ganz = hat(`s${sp.id}`)
          const teams: { art: 'mannschaft' | 'gruppe'; schluessel: string; id: number; name: string }[] = []
          sp.mannschaften.forEach(m => teams.push({ art: 'mannschaft', schluessel: `m${m.id}`, id: m.id, name: m.name }))
          sp.gruppen.forEach(g => teams.push({ art: 'gruppe', schluessel: `g${g.id}`, id: g.id, name: g.name }))
          const sparteTrifft = passt(sp.name)
          const teamsTreffer = teams.filter(t => sparteTrifft || passt(t.name))
          const sichtbar = sparteTrifft || teamsTreffer.length > 0
          const aufgeklappt = (s !== '' && teamsTreffer.length > 0 && !sparteTrifft) || offen.indexOf(sp.id) >= 0
          const einzeln = teams.filter(t => hat(t.schluessel)).length
          return (
            // Ausgeblendete Einträge bleiben im Formular, damit gewählte Häkchen mitgesendet werden.
            <li key={sp.id} className={sichtbar ? 'p-3' : 'hidden'}>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                  <input type="checkbox" name="sparte" value={sp.id} checked={ganz} onChange={e => umschalten(`s${sp.id}`, e.target.checked)} className="w-5 h-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-medium text-[15px]">{sp.name}</span>
                    <span className="block text-xs text-[#6b6b6b]">
                      {ganz ? 'ganze Sparte – mit allen Mannschaften und Gruppen' : einzeln > 0 ? `${einzeln} einzeln ausgewählt` : 'ganze Sparte'}
                    </span>
                  </span>
                </label>
                {teams.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOffen(offen.indexOf(sp.id) >= 0 ? offen.filter(x => x !== sp.id) : offen.concat(sp.id))}
                    className={`${knopfKlassen.leise} shrink-0`}
                    aria-expanded={aufgeklappt}
                  >
                    {aufgeklappt ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <span className="hidden sm:inline">einzeln</span> ({teams.length})
                  </button>
                )}
              </div>
              {teams.length > 0 && (
                <div className={`mt-2 pl-8 gap-1 sm:grid-cols-2 ${aufgeklappt ? 'grid' : 'hidden'}`}>
                  {teams.map(t => (
                    <label
                      key={t.schluessel}
                      className={`items-center gap-2.5 py-1.5 text-sm ${sparteTrifft || passt(t.name) ? 'flex' : 'hidden'} ${ganz ? 'text-[#6b6b6b]' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        name={t.art}
                        value={t.id}
                        checked={ganz || hat(t.schluessel)}
                        disabled={ganz}
                        onChange={e => umschalten(t.schluessel, e.target.checked)}
                        className="w-[18px] h-[18px] shrink-0"
                      />
                      <span>
                        {t.name}
                        {t.art === 'gruppe' && <span className="text-xs text-[#6b6b6b]"> (Gruppe)</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
