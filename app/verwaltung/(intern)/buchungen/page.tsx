import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { and, asc, desc, gte, inArray, like, lt, or, type SQL } from 'drizzle-orm'
import { after } from 'next/server'
import { AlertTriangle, CalendarDays, ChevronRight, Inbox, Mail, Plus, Repeat, Search } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { personendatenLoeschen } from '@/lib/buchungen/anfrage'
import { ueberschneidungen } from '@/lib/buchungen/belegung'
import { ART_NAMEN, jetztOrtszeit, OFFENE_STATUS, ORT_NAMEN, zeitraumText, type BuchungStatus } from '@/lib/buchungen/zeit'
import { nichtZugeordnet, ungeleseneMails } from '@/lib/buchungen/nachrichten'
import { abrufFaellig, postfachAbrufen } from '@/lib/buchungen/postfach'
import { imapZugang, mailEingerichtet } from '@/lib/mail'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { StatusMarke } from '@/components/verwaltung/buchungen/Anzeige'
import { eingabeKlasse, Karte, knopfKlassen, LeerHinweis, Meldung, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'Buchungen' }

type Buchung = typeof schema.buchungen.$inferSelect

const ANSICHTEN = {
  kommend: 'Kommend',
  vergangen: 'Vergangen',
  abgesagt: 'Abgelehnt & storniert',
  alle: 'Alle',
} as const
type Ansicht = keyof typeof ANSICHTEN

function einzeln(wert: string | string[] | undefined): string {
  return (Array.isArray(wert) ? wert[0] : wert)?.trim() ?? ''
}

function Zeile({ b, ueberschneidung, jetzt, neueMails = 0 }: { b: Buchung; ueberschneidung: boolean; jetzt: string; neueMails?: number }) {
  const vorbei = b.bis <= jetzt
  return (
    <li>
      <Link href={`/verwaltung/buchungen/${b.id}`} className="flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03]">
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{b.titel}</span>
            <StatusMarke status={b.status} />
            {ueberschneidung && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700">
                <AlertTriangle size={12} /> Überschneidung
              </span>
            )}
            {vorbei && (OFFENE_STATUS as string[]).indexOf(b.status) >= 0 && <span className="text-[11px] text-[#6b6b6b]">Termin ist vorbei</span>}
            {neueMails > 0 && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-sky-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
                <Mail size={11} /> {neueMails} neue Mail{neueMails === 1 ? '' : 's'}
              </span>
            )}
          </span>
          <span className="block text-xs text-[#6b6b6b] mt-1">
            {zeitraumText(b)} · {ORT_NAMEN[b.ort]}
          </span>
          <span className="block text-xs text-[#6b6b6b] mt-0.5">
            {[ART_NAMEN[b.art], b.bereich, b.name, b.personenzahl ? `${b.personenzahl} Personen` : null, b.nummer].filter(Boolean).join(' · ')}
          </span>
        </span>
        <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
      </Link>
    </li>
  )
}

export default async function BuchungenSeite(props: { searchParams: Promise<{ ansicht?: string; suche?: string; geloescht?: string }> }) {
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  const db = datenbank()
  personendatenLoeschen(db)
  // Neue Mails im Hintergrund abrufen (höchstens alle 5 Minuten) – sie erscheinen beim nächsten Laden
  if (imapZugang() && abrufFaellig(db, 5)) after(() => postfachAbrufen(db).then(() => undefined))
  const neueMails = ungeleseneMails(db)
  const ohneBuchung = nichtZugeordnet(db)

  const jetzt = jetztOrtszeit()
  const suche = einzeln(searchParams.suche)
  const ansichtRoh = einzeln(searchParams.ansicht)
  const ansicht: Ansicht | null = ansichtRoh in ANSICHTEN ? (ansichtRoh as Ansicht) : suche ? 'alle' : null

  const offen = db
    .select()
    .from(schema.buchungen)
    .where(inArray(schema.buchungen.status, OFFENE_STATUS as BuchungStatus[]))
    .orderBy(asc(schema.buchungen.von))
    .all()

  // Startansicht: offene Anfragen und die nächsten Zusagen. Sonst eine gefilterte Liste.
  let liste: Buchung[] = []
  if (ansicht) {
    const bedingungen: SQL[] = []
    if (ansicht === 'kommend') bedingungen.push(gte(schema.buchungen.bis, jetzt), inArray(schema.buchungen.status, ['angefragt', 'rueckfrage', 'bestaetigt']))
    if (ansicht === 'vergangen') bedingungen.push(lt(schema.buchungen.bis, jetzt), inArray(schema.buchungen.status, ['angefragt', 'rueckfrage', 'bestaetigt']))
    if (ansicht === 'abgesagt') bedingungen.push(inArray(schema.buchungen.status, ['abgelehnt', 'storniert']))
    if (suche) {
      const muster = `%${suche.replace(/[%_]/g, '')}%`
      const suchBedingung = or(
        like(schema.buchungen.nummer, muster),
        like(schema.buchungen.titel, muster),
        like(schema.buchungen.name, muster),
        like(schema.buchungen.email, muster),
        like(schema.buchungen.bereich, muster),
      )
      if (suchBedingung) bedingungen.push(suchBedingung)
    }
    liste = db
      .select()
      .from(schema.buchungen)
      .where(bedingungen.length ? and(...bedingungen) : undefined)
      .orderBy(ansicht === 'kommend' ? asc(schema.buchungen.von) : desc(schema.buchungen.von))
      .limit(200)
      .all()
  }
  const demnaechst = ansicht
    ? []
    : db
        .select()
        .from(schema.buchungen)
        .where(and(gte(schema.buchungen.bis, jetzt), inArray(schema.buchungen.status, ['bestaetigt'])))
        .orderBy(asc(schema.buchungen.von))
        .limit(10)
        .all()

  const mitUeberschneidung = (b: Buchung) => b.bis > jetzt && (b.status === 'bestaetigt' || (OFFENE_STATUS as string[]).indexOf(b.status) >= 0) && ueberschneidungen(db, b, b.id).length > 0

  const chip = (wert: Ansicht | null, text: string) => {
    const aktiv = ansicht === wert
    const href = wert ? `/verwaltung/buchungen?ansicht=${wert}` : '/verwaltung/buchungen'
    return (
      <Link
        key={wert ?? 'start'}
        href={href}
        className={`rounded-full px-3 py-1.5 text-sm border ${aktiv ? 'bg-[#0a0a0a] text-[#f5f5f0] border-[#0a0a0a]' : 'bg-white border-[#0a0a0a]/15 hover:border-[#0a0a0a]/40'}`}
      >
        {text}
      </Link>
    )
  }

  return (
    <>
      <Seitenkopf
        titel="BUCHUNGEN"
        untertitel="Vereinsheim und Gelände am Tostedter Weg: Anfragen über die Website und eigene Belegungen."
        aktionen={
          <>
            <Link href="/verwaltung/buchungen/kalender" className={knopfKlassen.sekundaer}>
              <CalendarDays size={15} /> Kalender
            </Link>
            <Link href="/verwaltung/buchungen/eingang" className={knopfKlassen.sekundaer}>
              <Inbox size={15} /> Eingang{ohneBuchung > 0 ? ` (${ohneBuchung})` : ''}
            </Link>
            <Link href="/verwaltung/buchungen/regeln" className={knopfKlassen.sekundaer}>
              <Repeat size={15} /> Regelbelegung
            </Link>
            <Link href="/verwaltung/buchungen/neu" className={knopfKlassen.primaer}>
              <Plus size={15} /> Belegung eintragen
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        {searchParams.geloescht && <Meldung art="erfolg">Die Buchung wurde gelöscht.</Meldung>}
        {ohneBuchung > 0 && (
          <Meldung art="hinweis">
            {ohneBuchung} Mail{ohneBuchung === 1 ? '' : 's'} an das Buchungs-Postfach {ohneBuchung === 1 ? 'passt' : 'passen'} zu keiner Buchung.{' '}
            <Link href="/verwaltung/buchungen/eingang" className="underline underline-offset-2">
              Im Eingang zuordnen oder beantworten
            </Link>
          </Meldung>
        )}
        {!mailEingerichtet() && (
          <Meldung art="hinweis">
            Der E-Mail-Versand ist nicht eingerichtet oder ausgeschaltet: Es gehen keine Bestätigungen an Buchende und keine Meldungen über neue Anfragen raus.
            Neue Anfragen siehst du hier und an der Zahl im Menü.{' '}
            {rechte.istAdmin ? (
              <Link href="/verwaltung/e-mail" className="underline underline-offset-2">
                Postfach einrichten
              </Link>
            ) : (
              'Einrichten können das Admins unter „E-Mail-Versand“.'
            )}
          </Meldung>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {chip(null, offen.length ? `Offen (${offen.length})` : 'Offen')}
          {(Object.keys(ANSICHTEN) as Ansicht[]).map(a => chip(a, ANSICHTEN[a]))}
          <form action="/verwaltung/buchungen" className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <input type="hidden" name="ansicht" value={ansicht ?? 'alle'} />
            <label htmlFor="suche" className="sr-only">
              Suchen
            </label>
            <input id="suche" name="suche" defaultValue={suche} placeholder="Nummer, Name, Anlass …" className={`${eingabeKlasse} sm:w-64 py-2`} />
            <button type="submit" className={knopfKlassen.sekundaer} aria-label="Suchen">
              <Search size={15} />
            </button>
          </form>
        </div>

        {ansicht ? (
          <Karte titel={suche ? `${ANSICHTEN[ansicht]} · Suche „${suche}“` : ANSICHTEN[ansicht]}>
            {liste.length === 0 ? (
              <LeerHinweis>Keine Buchungen gefunden.</LeerHinweis>
            ) : (
              <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
                {liste.map(b => (
                  <Zeile key={b.id} b={b} ueberschneidung={mitUeberschneidung(b)} jetzt={jetzt} neueMails={neueMails.get(b.id) ?? 0} />
                ))}
              </ul>
            )}
          </Karte>
        ) : (
          <>
            <Karte titel="Offene Anfragen" beschreibung="Angefragt oder mit Rückfrage – bitte bestätigen, ablehnen oder klären.">
              {offen.length === 0 ? (
                <LeerHinweis>Keine offenen Anfragen.</LeerHinweis>
              ) : (
                <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
                  {offen.map(b => (
                    <Zeile key={b.id} b={b} ueberschneidung={mitUeberschneidung(b)} jetzt={jetzt} neueMails={neueMails.get(b.id) ?? 0} />
                  ))}
                </ul>
              )}
            </Karte>
            <Karte
              titel="Demnächst bestätigt"
              aktionen={
                <Link href="/verwaltung/buchungen?ansicht=kommend" className="text-sm text-[#6b6b6b] hover:text-[#0a0a0a] underline underline-offset-4">
                  Alle kommenden
                </Link>
              }
            >
              {demnaechst.length === 0 ? (
                <LeerHinweis>Keine bestätigten Buchungen in nächster Zeit.</LeerHinweis>
              ) : (
                <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
                  {demnaechst.map(b => (
                    <Zeile key={b.id} b={b} ueberschneidung={mitUeberschneidung(b)} jetzt={jetzt} neueMails={neueMails.get(b.id) ?? 0} />
                  ))}
                </ul>
              )}
            </Karte>
          </>
        )}
      </div>
    </>
  )
}
