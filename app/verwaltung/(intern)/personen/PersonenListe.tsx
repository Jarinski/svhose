'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { passtZurSuche } from '@/lib/verwaltung/suche'
import { Badge, eingabeKlasse, Karte, LeerHinweis } from '@/components/verwaltung/ui'

export interface PersonenListenEintrag {
  id: number
  name: string
  kontakt: string
  fotoUrl: string | null
  verwendung: string[]
  suchtext: string
}

function Initialen({ name }: { name: string }) {
  const teile = name.trim().split(/\s+/)
  const text = ((teile[0]?.[0] ?? '') + (teile.length > 1 ? teile[teile.length - 1][0] : '')).toUpperCase()
  return <span className="text-xs font-semibold text-[#4a4a4a]">{text}</span>
}

export default function PersonenListe({ personen, zeigeUnbenutzt }: { personen: PersonenListenEintrag[]; zeigeUnbenutzt: boolean }) {
  const [suche, setSuche] = useState('')
  const [nurUnbenutzt, setNurUnbenutzt] = useState(false)
  const unbenutzt = personen.filter(p => p.verwendung.length === 0).length
  const treffer = personen.filter(p => passtZurSuche(p.suchtext, suche) && (!nurUnbenutzt || p.verwendung.length === 0))

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="personen-suche" className="sr-only">
          Person suchen
        </label>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] pointer-events-none" />
        <input
          id="personen-suche"
          type="search"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          placeholder="Suchen: Name, Telefon, E-Mail oder Mannschaft …"
          className={`${eingabeKlasse} pl-9 py-3`}
          autoComplete="off"
        />
      </div>
      {zeigeUnbenutzt && unbenutzt > 0 && (
        <label className="inline-flex items-center gap-2 text-sm text-[#4a4a4a] cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={nurUnbenutzt} onChange={e => setNurUnbenutzt(e.target.checked)} className="h-5 w-5 accent-[#0a0a0a]" />
          Nur Personen zeigen, die nirgends eingetragen sind ({unbenutzt})
        </label>
      )}

      <Karte>
        {treffer.length === 0 ? (
          <LeerHinweis>{suche.trim() ? `Niemand gefunden für „${suche.trim()}“.` : 'Keine Personen.'}</LeerHinweis>
        ) : (
          <ul className="divide-y divide-[#0a0a0a]/[0.07] -my-2">
            {treffer.map(p => (
              <li key={p.id}>
                <Link href={`/verwaltung/personen/${p.id}`} className="flex items-center gap-3 py-3 px-1 hover:bg-[#0a0a0a]/[0.03]">
                  <span className="w-10 h-10 rounded-full bg-[#f0f0ea] border border-[#0a0a0a]/10 overflow-hidden flex items-center justify-center shrink-0">
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.fotoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Initialen name={p.name} />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-[#6b6b6b] mt-0.5 break-words">
                      {p.verwendung.length ? p.verwendung.join(' · ') : <Badge>nirgends eingetragen</Badge>}
                    </span>
                    {p.kontakt && <span className="block text-xs text-[#6b6b6b] mt-0.5 truncate">{p.kontakt}</span>}
                  </span>
                  <ChevronRight size={16} className="text-[#6b6b6b] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Karte>
      <p className="text-xs text-[#6b6b6b]">
        {treffer.length} von {personen.length} Person{personen.length === 1 ? '' : 'en'}
      </p>
    </div>
  )
}
