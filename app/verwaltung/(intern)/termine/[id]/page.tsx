import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { namensVerzeichnis } from '@/lib/verwaltung/inhalte/gemeinsam'
import { QUELLEN_NAMEN, SYNC_HINWEIS, terminBearbeitbar, terminFormularDaten } from '@/lib/verwaltung/inhalte/termine'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { datumDeutsch, zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Badge, Karte, Meldung, Seitenkopf } from '@/components/verwaltung/ui'
import TerminFormular from '../TerminFormular'

export const metadata: Metadata = { title: 'Termin' }

export default function TerminSeite({ params, searchParams }: { params: { id: string }; searchParams: { neu?: string } }) {
  const { rechte } = sitzungErzwingen()
  const db = datenbank()
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  const termin = db.select().from(schema.termine).where(eq(schema.termine.id, id)).get()
  if (!termin) notFound()

  const zurueck = { href: '/verwaltung/termine', text: 'Alle Termine' }

  if (terminBearbeitbar(rechte, termin)) {
    return (
      <>
        <Seitenkopf titel="TERMIN BEARBEITEN" zurueck={zurueck} untertitel={`Zuletzt gespeichert ${zeitpunktDeutsch(termin.geaendertAm)}`} />
        <TerminFormular
          termin={{
            id: termin.id,
            titel: termin.titel,
            datum: termin.datum,
            uhrzeit: termin.uhrzeit ?? '',
            ort: termin.ort ?? '',
            beschreibung: termin.beschreibung ?? '',
            bereich: termin.bereich ?? '',
            sparteId: termin.sparteId,
            tags: Array.isArray(termin.tags) ? termin.tags : [],
            bildUrl: medienUrl(termin.bild),
            geaendertAm: termin.geaendertAm,
          }}
          {...terminFormularDaten(db, rechte)}
          hinweis={searchParams.neu ? 'Der Termin ist angelegt und auf der Website zu sehen.' : undefined}
        />
      </>
    )
  }

  // Nur ansehen: automatisch abgeglichene Spiele oder Termine ohne Berechtigung
  const namen = namensVerzeichnis(db)
  const sparte = termin.sparteId != null ? namen.sparten.get(termin.sparteId) ?? null : null
  const bild = medienUrl(termin.bild)
  const zeilen: [string, string | null][] = [
    ['Datum', datumDeutsch(termin.datum)],
    ['Uhrzeit', termin.uhrzeit],
    ['Ort', termin.ort],
    ['Bereich', termin.bereich],
    ['Sparte', sparte],
    ['Stichwörter', Array.isArray(termin.tags) && termin.tags.length ? termin.tags.join(', ') : null],
    ['Quelle', QUELLEN_NAMEN[termin.quelle]],
  ]

  return (
    <>
      <Seitenkopf titel="TERMIN" zurueck={zurueck} untertitel={<Badge>nur ansehen</Badge>} />
      <div className="space-y-6">
        <Meldung art="hinweis">
          {termin.quelle !== 'manuell'
            ? SYNC_HINWEIS
            : `Diesen Termin können nur Admins${sparte ? ` und die Verantwortlichen der Sparte ${sparte}` : ''} ändern.`}
        </Meldung>
        <Karte titel={termin.titel}>
          <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
            {zeilen
              .filter(([, wert]) => wert)
              .map(([name, wert]) => (
                <div key={name} className="contents">
                  <dt className="text-[#6b6b6b]">{name}</dt>
                  <dd>{wert}</dd>
                </div>
              ))}
          </dl>
          {termin.beschreibung && <p className="mt-4 text-sm whitespace-pre-line leading-relaxed">{termin.beschreibung}</p>}
          {bild && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bild} alt="" className="mt-4 block max-h-72 w-auto max-w-full rounded-sm border border-[#0a0a0a]/10" />
          )}
        </Karte>
      </div>
    </>
  )
}
