import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { ChevronRight, Plus } from 'lucide-react'
import { datenbank, schema } from '@/lib/db'
import { kannSparte } from '@/lib/verwaltung/rechte'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { Badge, Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'

export const metadata: Metadata = { title: 'Sparten' }

function mehrzahl(n: number, eins: string, viele: string) {
  return `${n} ${n === 1 ? eins : viele}`
}

export default async function SpartenSeite() {
  const { rechte } = await sitzungErzwingen()
  if (!rechte.istAdmin && rechte.sparten.length === 0) redirect('/verwaltung')

  const db = datenbank()
  const sparten = db
    .select()
    .from(schema.sparten)
    .orderBy(asc(schema.sparten.reihenfolge), asc(schema.sparten.name))
    .all()
    .filter(s => kannSparte(rechte, s.id))
  const mannschaften = db.select({ sparteId: schema.mannschaften.sparteId }).from(schema.mannschaften).all()
  const gruppen = db.select({ sparteId: schema.gruppen.sparteId }).from(schema.gruppen).all()
  const ansprechpartner = db.select({ sparteId: schema.sparteAnsprechpartner.sparteId }).from(schema.sparteAnsprechpartner).all()
  const zaehlen = (liste: { sparteId: number }[], id: number) => liste.filter(x => x.sparteId === id).length

  return (
    <>
      <Seitenkopf
        titel="SPARTEN"
        untertitel={rechte.istAdmin ? 'Alle Sparten des Vereins – Texte, Bild, Farbe und Ansprechpartner:innen.' : 'Die Sparten, die du bearbeiten darfst.'}
        aktionen={
          rechte.istAdmin ? (
            <Link href="/verwaltung/sparten/neu" className={knopfKlassen.primaer}>
              <Plus size={15} /> Neue Sparte
            </Link>
          ) : undefined
        }
      />
      <Karte>
        {sparten.length === 0 ? (
          <LeerHinweis>Noch keine Sparten angelegt.</LeerHinweis>
        ) : (
          <ul className="divide-y divide-[#0a0a0a]/[0.07]">
            {sparten.map(s => {
              const m = zaehlen(mannschaften, s.id)
              const g = zaehlen(gruppen, s.id)
              const a = zaehlen(ansprechpartner, s.id)
              return (
                <li key={s.id}>
                  <Link href={`/verwaltung/sparten/${s.id}`} className="flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03]">
                    <span
                      className="w-10 h-10 shrink-0 rounded-sm flex items-center justify-center text-xl border border-[#0a0a0a]/10"
                      style={{ backgroundColor: s.farbe ? `${s.farbe}1f` : undefined }}
                      aria-hidden
                    >
                      {s.icon || s.name.slice(0, 1)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{s.name}</span>
                      <span className="block text-xs text-[#6b6b6b]">
                        {[m > 0 ? mehrzahl(m, 'Mannschaft', 'Mannschaften') : '', g > 0 ? mehrzahl(g, 'Gruppe', 'Gruppen') : '']
                          .filter(Boolean)
                          .join(' · ') || 'noch keine Mannschaften oder Gruppen'}
                      </span>
                    </span>
                    <span className="hidden sm:flex flex-wrap gap-1.5 justify-end">
                      {!s.sichtbar && <Badge>ausgeblendet</Badge>}
                      {a === 0 && <Badge ton="warnung">keine Ansprechpartner:in</Badge>}
                    </span>
                    <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Karte>
    </>
  )
}
