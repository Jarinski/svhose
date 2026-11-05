/**
 * components/verwaltung/buchungen/Kontaktverlauf.tsx
 *
 * Zeitleiste des Kontaktverlaufs einer Buchung (oder des Eingangs): Mails, Telefonate, Gespräche,
 * Notizen – neueste oben. Zitate in Mails sind eingeklappt. Die Knöpfe sind schlichte Formulare
 * mit Server-Aktionen (ohne Client-Code).
 */

import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, MessageSquare, Paperclip, Phone, StickyNote, Users } from 'lucide-react'
import { zitatAbtrennen, type Nachricht } from '@/lib/buchungen/nachrichten'
import { zeitpunktDeutsch } from '@/lib/verwaltung/text'
import { SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { knopfKlassen } from '@/components/verwaltung/ui'
import { nachrichtLoeschen, nachrichtLoesen } from '@/app/verwaltung/(intern)/buchungen/kontakt-aktionen'

const ZUORDNUNG_TEXT: Record<string, string> = {
  antwort: 'als Antwort erkannt',
  nummer: 'über die Buchungsnummer zugeordnet',
  absender: 'über die Absenderadresse zugeordnet',
  hand: 'von Hand zugeordnet',
}

function kopf(n: Nachricht): { icon: React.ReactNode; text: string; farbe: string } {
  if (n.kanal === 'email' && n.richtung === 'eingang') return { icon: <ArrowDownLeft size={15} />, text: `E-Mail von ${n.von ?? 'unbekannt'}`, farbe: 'bg-sky-100 text-sky-900' }
  if (n.kanal === 'email') return { icon: <ArrowUpRight size={15} />, text: `E-Mail an ${n.an ?? ''} · ${n.zugangName ?? 'automatisch'}`, farbe: 'bg-emerald-100 text-emerald-900' }
  if (n.kanal === 'telefon') return { icon: <Phone size={15} />, text: `Telefonat · ${n.zugangName ?? ''}`, farbe: 'bg-amber-100 text-amber-900' }
  if (n.kanal === 'persoenlich') return { icon: <Users size={15} />, text: `Gespräch · ${n.zugangName ?? ''}`, farbe: 'bg-amber-100 text-amber-900' }
  return { icon: <StickyNote size={15} />, text: `Notiz · ${n.zugangName ?? ''}`, farbe: 'bg-[#0a0a0a]/[0.06] text-[#4a4a4a]' }
}

export function MailText({ text }: { text: string }) {
  const { neu, zitat } = zitatAbtrennen(text)
  return (
    <div className="mt-2 text-sm leading-relaxed">
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{neu || <span className="text-[#6b6b6b]">(kein Text)</span>}</p>
      {zitat && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-[#6b6b6b] hover:text-[#0a0a0a]">Zitierten Verlauf anzeigen</summary>
          <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] border-l-2 border-[#0a0a0a]/15 pl-3 text-[#6b6b6b]">{zitat}</p>
        </details>
      )}
    </div>
  )
}

export default function Kontaktverlauf({
  eintraege,
  antwortHref,
  ungelesen,
}: {
  eintraege: Nachricht[]
  /** Link zum Antworten auf eine eingegangene Mail, z. B. `?antwort=12#schreiben` */
  antwortHref?: (n: Nachricht) => string
  /** IDs, die vor dem Öffnen noch ungelesen waren (für die Markierung „neu“) */
  ungelesen?: Set<number>
}) {
  if (eintraege.length === 0) return <p className="text-sm text-[#6b6b6b] py-4 text-center">Noch kein Kontakt eingetragen.</p>
  return (
    <ol className="space-y-4">
      {eintraege.map(n => {
        const k = kopf(n)
        return (
          <li key={n.id} className="relative pl-10">
            <span className={`absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full ${k.farbe}`} aria-hidden="true">
              {k.icon}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#6b6b6b]">
              <span className="font-medium text-[#0a0a0a] text-sm [overflow-wrap:anywhere]">{k.text}</span>
              <span className="tabular-nums">{zeitpunktDeutsch(n.zeitpunkt)}</span>
              {ungelesen?.has(n.id) && <span className="rounded-sm bg-sky-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">neu</span>}
              {n.richtung === 'eingang' && n.zuordnung && <span>{ZUORDNUNG_TEXT[n.zuordnung]}</span>}
            </div>
            {n.betreff && <div className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">{n.betreff}</div>}
            {n.kanal === 'email' ? <MailText text={n.text} /> : <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">{n.text}</p>}
            {n.anhaenge > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#6b6b6b]">
                <Paperclip size={12} /> {n.anhaenge} Anhang{n.anhaenge === 1 ? '' : 'änge'} – liegt im Postfach
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {n.richtung === 'eingang' && antwortHref && (
                <Link href={antwortHref(n)} className={knopfKlassen.leise} scroll={false}>
                  <MessageSquare size={14} /> Antworten
                </Link>
              )}
              {n.richtung === 'eingang' && n.buchungId != null && (
                <form action={nachrichtLoesen}>
                  <input type="hidden" name="nachrichtId" value={n.id} />
                  <button type="submit" className={knopfKlassen.leise} title="Die Mail gehört nicht hierher – zurück in den Eingang">
                    Zuordnung lösen
                  </button>
                </form>
              )}
              {n.richtung !== 'ausgang' && (
                <form action={nachrichtLoeschen}>
                  <input type="hidden" name="nachrichtId" value={n.id} />
                  <SpeichernKnopf art="leise" className="hover:text-red-700" bestaetigen={n.richtung === 'eingang' ? 'Diese Mail aus der Verwaltung löschen? Im Postfach bleibt sie erhalten.' : 'Diesen Eintrag löschen?'}>
                    Löschen
                  </SpeichernKnopf>
                </form>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
