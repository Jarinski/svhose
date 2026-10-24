import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { datenbank } from '@/lib/db'
import { medienUrl } from '@/lib/medien'
import { personenListe } from '@/lib/verwaltung/person-bearbeiten'
import { sitzungErzwingen } from '@/lib/verwaltung/sitzung'
import { suchtext } from '@/lib/verwaltung/suche'
import { Karte, knopfKlassen, LeerHinweis, Seitenkopf } from '@/components/verwaltung/ui'
import PersonenListe from './PersonenListe'

export const metadata: Metadata = { title: 'Personen' }

export default async function PersonenSeite() {
  const { rechte } = await sitzungErzwingen()
  const personen = personenListe(datenbank(), rechte).map(p => ({
    id: p.id,
    name: p.name,
    kontakt: [p.telefon, p.email].filter(Boolean).join(' · '),
    fotoUrl: medienUrl(p.foto),
    verwendung: p.verwendung.map(v => v.text),
    suchtext: suchtext(p.name, p.email, p.telefon, ...p.verwendung.map(v => v.text)),
  }))

  return (
    <>
      <Seitenkopf
        titel="PERSONEN"
        untertitel={
          rechte.istAdmin
            ? 'Alle Trainer:innen, Ansprechpartner:innen und Vereinsfunktionen.'
            : 'Die Personen deiner Mannschaften und Gruppen. Kontaktdaten änderst du hier – für alle Stellen auf einmal.'
        }
        aktionen={
          <Link href="/verwaltung/personen/neu" className={knopfKlassen.primaer}>
            <Plus size={16} /> Neue Person
          </Link>
        }
      />
      {personen.length === 0 ? (
        <Karte>
          <LeerHinweis>Noch keine Personen, die du bearbeiten darfst. Personen trägst du am einfachsten direkt im Trainerteam einer Mannschaft ein.</LeerHinweis>
        </Karte>
      ) : (
        <PersonenListe personen={personen} zeigeUnbenutzt={rechte.istAdmin} />
      )}
    </>
  )
}
