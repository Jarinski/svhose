import { getAnsprechpartner } from '@/lib/content'
import { Mail, Phone } from 'lucide-react'
import Image from 'next/image'
import type { Metadata } from 'next'

/** Gibt true zurück, wenn die Nummer eine deutsche Mobilnummer ist (015x, 016x, 017x) */
function isMobileNumber(tel: string): boolean {
  const digits = tel.replace(/[\s\-\(\)\+]/g, '')
  // Internationales Format: 4915x, 4916x, 4917x
  if (/^49(15|16|17)\d/.test(digits)) return true
  // Nationales Format: 015x, 016x, 017x
  if (/^0(15|16|17)\d/.test(digits)) return true
  return false
}

/** Wandelt eine Telefonnummer ins internationale Format für wa.me um */
function toWhatsAppNumber(tel: string): string {
  const digits = tel.replace(/[\s\-\(\)]/g, '')
  if (digits.startsWith('+')) return digits.slice(1)
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return '49' + digits.slice(1)
  return digits
}

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
          <a href="tel:+491722970187" className="flex items-center gap-3 group">
            <Phone size={16} className="text-[#6b6b6b] shrink-0" />
            <span className="text-base sm:text-lg hover:text-[#f5f5f0]/60 transition-colors break-all">+49 172 2970187</span>
          </a>
          <a href="https://wa.me/491722970187" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#6b6b6b] shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            <span className="text-base sm:text-lg hover:text-[#f5f5f0]/60 transition-colors">WhatsApp</span>
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
              <div key={p.id} className="bg-[#f5f5f0] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
                {/* Foto */}
                {p.foto && (
                  <div className="shrink-0">
                    <Image
                      src={p.foto}
                      alt={p.name}
                      width={72}
                      height={72}
                      className="w-[72px] h-[72px] rounded-full object-cover grayscale"
                    />
                  </div>
                )}
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
                    <>
                      <a href={`tel:${p.telefon}`} className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                        <Phone size={13} /> {p.telefon}
                      </a>
                      {isMobileNumber(p.telefon) && (
                        <a href={`https://wa.me/${toWhatsAppNumber(p.telefon)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                          WhatsApp
                        </a>
                      )}
                    </>
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
