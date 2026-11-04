import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { FOERDERVEREIN_SEITEN } from '@/lib/foerderverein-seiten'
import { darfFoerdervereinSeiten } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { Badge, Karte, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'Förderverein-Seiten' }

export default async function FoerdervereinSeitenUebersicht() {
  const { rechte } = await sitzungErzwingen()
  if (!darfFoerdervereinSeiten(rechte)) redirect('/verwaltung')
  const gespeichert = new Map(
    datenbank()
      .select({ schluessel: schema.seiten.schluessel, geaendertAm: schema.seiten.geaendertAm })
      .from(schema.seiten)
      .all()
      .map(z => [z.schluessel, z.geaendertAm] as const),
  )

  return (
    <>
      <Seitenkopf
        titel="FÖRDERVEREIN-SEITEN"
        untertitel="Die Seiten unter Förderverein auf der Website – Inhalt und Aufbau gestaltest du hier selbst. Den Vorstand pflegst du im eigenen Menüpunkt."
      />
      <Karte>
        <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
          {FOERDERVEREIN_SEITEN.map(seite => {
            const stand = gespeichert.get(seite.schluessel)
            return (
              <li key={seite.slug} className="flex items-center gap-2">
                <Link href={`/verwaltung/foerderverein-seiten/${seite.slug}`} className="flex flex-1 min-w-0 items-center gap-3 py-4 px-1 hover:bg-[#0a0a0a]/[0.03]">
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{seite.name}</span>
                      {!stand && <Badge>ursprünglicher Stand</Badge>}
                    </span>
                    <span className="block text-sm text-[#6b6b6b] mt-0.5">{seite.beschreibung}</span>
                    {stand && <span className="block text-xs text-[#6b6b6b] mt-1">Zuletzt gespeichert {zeitpunktDeutsch(stand)}</span>}
                  </span>
                  <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                </Link>
                <a
                  href={seite.pfad}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 text-[#6b6b6b] hover:text-[#0a0a0a]"
                  aria-label={`${seite.name} auf der Website ansehen`}
                  title="Auf der Website ansehen"
                >
                  <ExternalLink size={16} />
                </a>
              </li>
            )
          })}
        </ul>
      </Karte>
    </>
  )
}
