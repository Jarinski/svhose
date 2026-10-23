'use client'

import { useActionState, useState } from 'react'
import type { AuswahlGruppe } from '@/lib/verwaltung/inhalte/gemeinsam'
import { neuererStand, type AktionsErgebnis } from '@/lib/verwaltung/inhalte/stand'
import { slugify } from '@/lib/verwaltung/text'
import { eingabenBehalten, FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import BildFeld from '@/components/verwaltung/inhalte/BildFeld'
import LoeschenFormular from '@/components/verwaltung/inhalte/LoeschenFormular'
import MarkdownFeld from '@/components/verwaltung/inhalte/MarkdownFeld'
import Schalter from '@/components/verwaltung/inhalte/Schalter'
import { auswahlKlasse, eingabeKlasse, Feld, Karte, Meldung } from '@/components/verwaltung/ui'
import { newsEntfernen, newsSichern } from './aktionen'

export interface NewsFormDaten {
  id: number
  titel: string
  slug: string
  datum: string
  kategorie: string
  teaser: string
  inhalt: string
  bildUrl: string | null
  veroeffentlicht: boolean
  zuordnung: string
  geaendertAm: string
}

const LEER_ERGEBNIS: AktionsErgebnis = {}

export default function NewsFormular({
  news,
  heute,
  zuordnungen,
  kategorien,
  hinweis,
}: {
  /** null = neue News */
  news: NewsFormDaten | null
  /** Heutiges Datum (deutsche Zeit) als Standard für neue News */
  heute: string
  zuordnungen: AuswahlGruppe[]
  kategorien: string[]
  /** Erfolgsmeldung nach dem Anlegen (bis zum nächsten Speichern) */
  hinweis?: string
}) {
  const [ergebnis, speichern] = useActionState(newsSichern, LEER_ERGEBNIS)
  const [titel, setTitel] = useState(news?.titel ?? '')
  const f = ergebnis.felder ?? {}
  const ersteZuordnung = zuordnungen[0]?.optionen[0]?.wert ?? ''

  return (
    <div className="space-y-6">
      {/* key: nach dem Speichern (neue Daten vom Server) zeigt das Formular wieder genau den gespeicherten Stand */}
      <form key={news?.geaendertAm ?? 'neu'} action={speichern} onReset={eingabenBehalten} className="space-y-6">
        {news && <input type="hidden" name="id" value={news.id} />}
        <input type="hidden" name="stand" value={neuererStand(news?.geaendertAm, ergebnis.stand)} />

        <Karte titel="Text">
          <div className="space-y-5">
            <Feld label="Überschrift" htmlFor="titel" fehler={f.titel}>
              <input
                id="titel"
                name="titel"
                required
                maxLength={200}
                defaultValue={news?.titel ?? ''}
                onChange={e => setTitel(e.target.value)}
                className={`${eingabeKlasse} text-lg`}
              />
            </Feld>

            {news ? (
              <Feld
                label="Adresse auf der Website"
                htmlFor="slug"
                fehler={f.slug}
                hinweis="Nach dem Veröffentlichen möglichst nicht mehr ändern – sonst funktionieren geteilte Links nicht mehr."
              >
                <div className="flex items-stretch">
                  <span className="inline-flex items-center px-3 border border-r-0 border-[#0a0a0a]/20 rounded-l-sm bg-[#f0f0ea] text-sm text-[#6b6b6b]">
                    /news/
                  </span>
                  <input id="slug" name="slug" defaultValue={news.slug} spellCheck={false} className={`${eingabeKlasse} rounded-l-none`} />
                </div>
              </Feld>
            ) : (
              <p className="text-xs text-[#6b6b6b] -mt-2">
                Adresse auf der Website: <span className="font-mono">/news/{slugify(titel) || '…'}</span> (wird automatisch aus der
                Überschrift erzeugt)
              </p>
            )}

            <Feld label="Kurzbeschreibung (Teaser)" htmlFor="teaser" hinweis="Ein bis zwei Sätze – erscheint in der News-Übersicht und über dem Text.">
              <textarea id="teaser" name="teaser" rows={3} defaultValue={news?.teaser ?? ''} className={eingabeKlasse} />
            </Feld>

            <Feld label="Text" htmlFor="inhalt">
              <MarkdownFeld id="inhalt" name="inhalt" standardwert={news?.inhalt ?? ''} />
            </Feld>
          </div>
        </Karte>

        <Karte titel="Einordnung">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feld label="Datum" htmlFor="datum" fehler={f.datum}>
              <input id="datum" name="datum" type="date" required defaultValue={news?.datum ?? heute} className={eingabeKlasse} />
            </Feld>
            <Feld label="Kategorie" htmlFor="kategorie" hinweis="Zum Beispiel „Verein“ oder „Fußball“ – eintippen oder Vorschlag wählen.">
              <input id="kategorie" name="kategorie" list="news-kategorien" defaultValue={news?.kategorie ?? ''} className={eingabeKlasse} />
              <datalist id="news-kategorien">
                {kategorien.map(k => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </Feld>
            <Feld
              label="Gehört zu"
              htmlFor="zuordnung"
              fehler={f.zuordnung}
              className="sm:col-span-2"
              hinweis="Bestimmt, wer die News später bearbeiten darf und wo sie zugeordnet wird."
            >
              <select id="zuordnung" name="zuordnung" required defaultValue={news?.zuordnung ?? ersteZuordnung} className={auswahlKlasse}>
                {zuordnungen.map(g => (
                  <optgroup key={g.titel} label={g.titel}>
                    {g.optionen.map(o => (
                      <option key={o.wert} value={o.wert}>
                        {o.text}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Feld>
          </div>
        </Karte>

        <Karte titel="Beitragsbild" beschreibung="Optional. Wird oben in der News und in der Übersicht gezeigt.">
          <BildFeld aktuell={news?.bildUrl ?? null} />
          {f.bild && <p className="mt-2 text-sm text-red-700">{f.bild}</p>}
        </Karte>

        <Karte>
          <Schalter
            name="veroeffentlicht"
            label="Veröffentlicht"
            standard={news?.veroeffentlicht ?? false}
            hinweisAn="Die News erscheint nach dem Speichern auf der Website."
            hinweisAus="Entwurf – erscheint nicht auf der Website."
          />
        </Karte>

        {hinweis && !ergebnis.meldung && <Meldung art="erfolg">{hinweis}</Meldung>}
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf className="w-full sm:w-auto py-3">Speichern</SpeichernKnopf>
      </form>

      {news && (
        <div className="pt-6 border-t border-[#0a0a0a]/10">
          <LoeschenFormular aktion={newsEntfernen} id={news.id} frage={`Die News „${news.titel}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`}>
            News löschen
          </LoeschenFormular>
        </div>
      )}
    </div>
  )
}
