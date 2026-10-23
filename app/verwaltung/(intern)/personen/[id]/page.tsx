import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ChevronRight } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { sichtbareVerwendungen, verwendungenLaden, verwendungVerlinkbar } from '@/lib/verwaltung/person-bearbeiten'
import { kannPerson } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Karte, Meldung, Seitenkopf } from '@/components/verwaltung/ui'
import PersonBearbeiten from './PersonFormular'
import PersonLoeschen from './PersonLoeschen'

export const metadata: Metadata = { title: 'Person bearbeiten' }

export default async function PersonSeite(props: { params: Promise<{ id: string }>; searchParams: Promise<{ neu?: string }> }) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { rechte } = await sitzungErzwingen()
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()
  const db = datenbank()
  const person = db.select().from(schema.personen).where(eq(schema.personen.id, id)).get()
  // Ohne Recht wie "nicht vorhanden" behandeln.
  if (!person || !kannPerson(db, rechte, id)) notFound()

  const verwendung = sichtbareVerwendungen(verwendungenLaden(db).get(id), rechte)
  const oeffentlich = verwendung.some(v => v.oeffentlich)

  return (
    <>
      <Seitenkopf
        titel={person.name}
        zurueck={{ href: '/verwaltung/personen', text: 'Alle Personen' }}
        untertitel={oeffentlich ? 'Erscheint auf der Website – Änderungen sind nach dem Speichern sofort sichtbar.' : 'Steht derzeit nirgends auf der Website.'}
      />

      <div className="space-y-6">
        {searchParams.neu && <Meldung art="erfolg">Die Person ist angelegt. Hier kannst du weitere Angaben und ein Foto ergänzen.</Meldung>}

        <Karte titel="Hier eingetragen" beschreibung={verwendung.length ? undefined : 'Diese Person ist bisher nirgends eingetragen.'}>
          {verwendung.length > 0 && (
            <ul className="divide-y divide-[#0a0a0a]/[0.07] border-y border-[#0a0a0a]/[0.07] -mx-1">
              {verwendung.map(v => (
                <li key={`${v.art}-${v.bezugId}-${v.text}`}>
                  {v.href && verwendungVerlinkbar(rechte, v) ? (
                    <Link href={v.href} className="flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03]">
                      <span className="flex-1 min-w-0">{v.text}</span>
                      <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                    </Link>
                  ) : (
                    <span className="block py-3 px-1">{v.text}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Karte>

        <PersonBearbeiten
          id={person.id}
          stand={person.geaendertAm}
          start={{
            name: person.name,
            email: person.email ?? '',
            telefon: person.telefon ?? '',
            whatsapp: person.whatsapp ?? '',
            notiz: person.notiz ?? '',
          }}
          fotoUrl={medienUrl(person.foto)}
        />

        <p className="text-sm text-[#6b6b6b]">Zuletzt geändert am {zeitpunktDeutsch(person.geaendertAm)}</p>

        {rechte.istAdmin && <PersonLoeschen id={person.id} name={person.name} verwendung={verwendung.map(v => v.text)} />}
      </div>
    </>
  )
}
