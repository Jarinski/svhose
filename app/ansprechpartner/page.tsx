import { getAnsprechpartner } from '@/lib/content'
import { Mail, Phone } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ansprechpartner' }

const GRUPPEN_REIHENFOLGE = ['Vorstand', 'Abteilungsleiter', 'Weitere Ansprechpartner']

export default async function AnsprechpartnerPage() {
  const personen = await getAnsprechpartner()

  // Gruppieren nach "gruppe"-Feld (Fallback auf "sparte" für ältere Einträge)
  const grouped = GRUPPEN_REIHENFOLGE.reduce<Record<string, any[]>>((acc, g) => {
    const members = personen.filter((p: any) => (p.gruppe || p.sparte) === g)
    if (members.length > 0) acc[g] = members
    return acc
  }, {})

  // Einträge, die keiner bekannten Gruppe zugeordnet sind
  const ungrouped = personen.filter(
    (p: any) => !GRUPPEN_REIHENFOLGE.includes(p.gruppe || p.sparte)
  )
  if (ungrouped.length > 0) grouped['Sonstige'] = ungrouped

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Wir helfen dir</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">KONTAKT</h1>
      </div>

      {/* Direktkontakt */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] p-8 md:p-12 mb-16">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Allgemeiner Kontakt</div>
        <div className="flex flex-col sm:flex-row gap-6">
          <a href="tel:00491722970187" className="flex items-center gap-3 group">
            <Phone size={16} className="text-[#6b6b6b] shrink-0" />
            <span className="text-base sm:text-lg hover:text-[#f5f5f0]/60 transition-colors break-all">+49 172 2970187</span>
          </a>
          <a href="mailto:info@sv-holm-seppensen.de" className="flex items-center gap-3 group">
            <Mail size={16} className="text-[#6b6b6b] shrink-0" />
            <span className="text-base sm:text-lg hover:text-[#f5f5f0]/60 transition-colors break-all">info@sv-holm-seppensen.de</span>
          </a>
        </div>
      </div>

      {/* Ansprechpartner nach Gruppen */}
      {Object.entries(grouped).map(([gruppenName, mitglieder]) => (
        <div key={gruppenName} className="mb-12">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-4">{gruppenName}</div>
          <div className="space-y-px bg-[#0a0a0a]/10">
            {mitglieder.map((p: any) => (
              <div key={p.id} className="bg-[#f5f5f0] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium text-lg">{p.name}</div>
                  <div className="text-sm text-[#6b6b6b] mt-0.5">{p.funktion}</div>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                      <Mail size={13} /> {p.email}
                    </a>
                  )}
                  {p.telefon && (
                    <a href={`tel:${p.telefon}`} className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                      <Phone size={13} /> {p.telefon}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
