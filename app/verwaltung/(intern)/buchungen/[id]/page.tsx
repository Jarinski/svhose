import Link from 'next/link'
import type { Metadata } from 'next'
import { and, desc, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, CalendarDays, Mail, Phone } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { ueberschneidungen } from '@/lib/buchungen/belegung'
import { rueckmeldungsMail } from '@/lib/buchungen/mails'
import { alsGelesenMarkieren, verlaufLaden, zitatAbtrennen } from '@/lib/buchungen/nachrichten'
import { ORT_NAMEN, STATUS_NAMEN, uhrzeitAmTag, zeitraumFelder, zeitraumText } from '@/lib/buchungen/zeit'
import { mailEingerichtet } from '@/lib/mail'
import { darfBuchungen } from '@/lib/verwaltung/rechte'
import { basisUrl, sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import LoeschenFormular from '@/components/verwaltung/inhalte/LoeschenFormular'
import { StatusMarke } from '@/components/verwaltung/buchungen/Anzeige'
import Kontaktverlauf from '@/components/verwaltung/buchungen/Kontaktverlauf'
import { Karte, knopfKlassen, Meldung, Seitenkopf } from '@/components/verwaltung/ui'
import { buchungEntfernen } from '../aktionen'
import BuchungFormular from '../BuchungFormular'
import KontaktFormular, { type MailVorlage } from '../KontaktFormular'

export const metadata: Metadata = { title: 'Buchung' }

export default async function BuchungSeite(props: { params: Promise<{ id: string }>; searchParams: Promise<{ neu?: string; antwort?: string }> }) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  if (!darfBuchungen(rechte)) redirect('/verwaltung')
  const db = datenbank()
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  const b = db.select().from(schema.buchungen).where(eq(schema.buchungen.id, id)).get()
  if (!b) notFound()

  const aktiv = b.status !== 'abgelehnt' && b.status !== 'storniert'
  const treffer = aktiv ? ueberschneidungen(db, b, b.id) : []
  const verlauf = db
    .select()
    .from(schema.verlauf)
    .where(and(eq(schema.verlauf.objektTyp, 'buchungen'), eq(schema.verlauf.objektId, b.id)))
    .orderBy(desc(schema.verlauf.id))
    .limit(30)
    .all()
  const statusAdresse = `${await basisUrl()}/vereinsheim/status`
  const mail = b.email ? rueckmeldungsMail(b, rechte.name, statusAdresse) : null

  // Kontaktverlauf: erst laden (für die Markierung „neu“), dann als gelesen markieren
  const kontakte = verlaufLaden(db, b.id)
  const ungelesen = new Set(kontakte.filter(k => k.richtung === 'eingang' && !k.gelesenAm).map(k => k.id))
  if (ungelesen.size > 0) alsGelesenMarkieren(db, b.id)
  const versandBereit = mailEingerichtet()
  const mailMoeglich = versandBereit && !!b.email && !b.anonymisiertAm
  const vorname = b.name ? b.name.trim().split(/\s+/)[0] : ''
  const gruss = `\n\nViele Grüße\n${rechte.name}\nSV Holm-Seppensen e.V.`
  const antwortAuf = kontakte.find(k => k.richtung === 'eingang' && String(k.id) === searchParams.antwort)
  let vorlage: MailVorlage = { betreff: `Vereinsheim – Buchung ${b.nummer}`, text: `Hallo${vorname ? ` ${vorname}` : ''},\n\n${gruss}` }
  if (antwortAuf) {
    const alt = antwortAuf.betreff ?? `Vereinsheim – Buchung ${b.nummer}`
    const betreff = /^(re|aw|antw):/i.test(alt) ? alt : `Re: ${alt}`
    const zitat = zitatAbtrennen(antwortAuf.text)
      .neu.split('\n')
      .slice(0, 30)
      .map(z => `> ${z}`)
      .join('\n')
    vorlage = {
      betreff: betreff.indexOf(b.nummer) >= 0 ? betreff : `${betreff} [${b.nummer}]`,
      text: `Hallo${vorname ? ` ${vorname}` : ''},\n\n${gruss}\n\nAm ${zeitpunktDeutsch(antwortAuf.zeitpunkt)} schrieb ${antwortAuf.von ?? ''}:\n${zitat}`,
      antwortAuf: antwortAuf.id,
      antwortHinweis: `Antwort auf „${antwortAuf.betreff ?? 'ohne Betreff'}“`,
    }
  }
  const felder = zeitraumFelder(b)
  const kalender = `/verwaltung/buchungen/kalender?monat=${b.von.slice(0, 7)}&tag=${b.von.slice(0, 10)}#tag`

  return (
    <>
      <Seitenkopf
        titel={b.titel.toUpperCase()}
        zurueck={{ href: '/verwaltung/buchungen', text: 'Alle Buchungen' }}
        untertitel={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusMarke status={b.status} gross />
            <span>
              Nr. <span className="font-mono text-[#0a0a0a]">{b.nummer}</span>
            </span>
            <span>
              · {zeitraumText(b)} · {ORT_NAMEN[b.ort]}
            </span>
            <span>
              · {b.quelle === 'website' ? 'angefragt über die Website' : 'eingetragen in der Verwaltung'} am {zeitpunktDeutsch(b.erstelltAm)}
            </span>
          </span>
        }
        aktionen={
          <>
            {mailMoeglich ? (
              <a href="#kontakt" className={knopfKlassen.sekundaer}>
                <Mail size={15} /> E-Mail schreiben
              </a>
            ) : (
              mail && (
                <a
                  href={`mailto:${b.email}?subject=${encodeURIComponent(mail.betreff)}&body=${encodeURIComponent(mail.text)}`}
                  className={knopfKlassen.sekundaer}
                >
                  <Mail size={15} /> E-Mail schreiben
                </a>
              )
            )}
            {b.telefon && (
              <a href={`tel:${b.telefon.replace(/[^\d+]/g, '')}`} className={knopfKlassen.sekundaer}>
                <Phone size={15} /> Anrufen
              </a>
            )}
            <Link href={kalender} className={knopfKlassen.sekundaer}>
              <CalendarDays size={15} /> Im Kalender
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        {treffer.length > 0 && (
          <Meldung art="hinweis">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle size={15} /> Überschneidet sich mit:
            </span>
            <ul className="mt-1.5 space-y-0.5">
              {treffer.map(t => (
                <li key={t.typ === 'regel' ? `r${t.regelId}-${t.datum}` : `b${t.buchung.id}`}>
                  {t.typ === 'buchung' ? (
                    <Link href={`/verwaltung/buchungen/${t.buchung.id}`} className="underline underline-offset-2">
                      {t.titel}
                    </Link>
                  ) : (
                    <span>{t.titel}</span>
                  )}{' '}
                  – {uhrzeitAmTag(t, t.von.slice(0, 10))}, {ORT_NAMEN[t.ort]}
                  {t.typ === 'regel' ? ' (Regelbelegung – im Kalender kannst du sie für den Tag ausfallen lassen)' : ` (${STATUS_NAMEN[t.status]})`}
                </li>
              ))}
            </ul>
          </Meldung>
        )}

        <BuchungFormular
          buchung={{
            id: b.id,
            status: b.status,
            art: b.art,
            ort: b.ort,
            titel: b.titel,
            ...felder,
            personenzahl: b.personenzahl,
            bereich: b.bereich ?? '',
            name: b.name ?? '',
            email: b.email ?? '',
            telefon: b.telefon ?? '',
            nachricht: b.nachricht ?? '',
            rueckmeldung: b.rueckmeldung ?? '',
            notiz: b.notiz ?? '',
            anonymisiert: !!b.anonymisiertAm,
            geaendertAm: b.geaendertAm,
          }}
          mailEingerichtet={mailEingerichtet()}
          hinweis={searchParams.neu ? `Eingetragen – Buchungsnummer ${b.nummer}.` : undefined}
        />

        <div id="kontakt" className="scroll-mt-20">
          <Karte
            titel={`Kontaktverlauf${kontakte.length ? ` (${kontakte.length})` : ''}`}
            beschreibung="E-Mails mit der buchenden Person, Telefonate und Notizen. Antworten an das Buchungs-Postfach landen automatisch hier."
          >
            <KontaktFormular
              buchungId={b.id}
              an={b.email}
              mailMoeglich={mailMoeglich}
              mailHinweis={
                !b.email || b.anonymisiertAm
                  ? 'Für diese Buchung ist keine E-Mail-Adresse eingetragen.'
                  : 'Der E-Mail-Versand ist nicht eingerichtet oder ausgeschaltet (Admins: Menü „E-Mail-Versand“).'
              }
              vorlage={vorlage}
              abbrechenHref={antwortAuf ? `/verwaltung/buchungen/${b.id}#kontakt` : undefined}
            />
            <div className="mt-8 pt-6 border-t border-[#0a0a0a]/10">
              <Kontaktverlauf eintraege={kontakte} ungelesen={ungelesen} antwortHref={n => `/verwaltung/buchungen/${b.id}?antwort=${n.id}#kontakt`} />
            </div>
          </Karte>
        </div>

        <Karte titel="Verlauf" beschreibung="Wer hat wann was geändert. Kontaktdaten stehen hier bewusst nicht.">
          <ul className="space-y-1.5 text-sm">
            {verlauf.map(v => (
              <li key={v.id} className="flex flex-wrap gap-x-3">
                <span className="text-[#6b6b6b] tabular-nums">{zeitpunktDeutsch(v.zeitpunkt)}</span>
                <span>
                  {v.zugangName ?? (v.quelle === 'system' ? 'Website' : 'System')} · {v.bezeichnung}
                </span>
              </li>
            ))}
          </ul>
        </Karte>

        <div className="pt-6 border-t border-[#0a0a0a]/10 space-y-2">
          <p className="text-sm text-[#6b6b6b]">
            Abgesagte Buchungen besser auf „Abgelehnt“ oder „Storniert“ setzen statt löschen – dann sieht die buchende Person den Stand noch. Löschen ist für
            Spam und Versehen.
          </p>
          <LoeschenFormular aktion={buchungEntfernen} id={b.id} frage={`Die Buchung „${b.titel}“ (${b.nummer}) wirklich löschen? Das lässt sich nicht rückgängig machen.`}>
            Buchung löschen
          </LoeschenFormular>
        </div>
      </div>
    </>
  )
}
