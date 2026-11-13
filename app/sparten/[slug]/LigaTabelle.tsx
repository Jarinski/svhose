import type { Tabelle } from '@/lib/tabellen'

// Ligatabelle in der Mannschaftskarte. Zugeklappt nennt sie schon Liga, Platz und Punkte,
// aufgeklappt zeigt sie die ganze Tabelle mit hervorgehobener eigener Zeile.
// Kommt fertig vom Server (lib/tabellen.ts) – <details> braucht kein JavaScript.

export default function LigaTabelle({ tabelle, farbe }: { tabelle: Tabelle; farbe: string }) {
  const eigene = tabelle.zeilen.find(z => z.eigene)
  const fussball = tabelle.quelle === 'fussball.de'
  const kurz = [
    tabelle.liga,
    eigene?.platz != null && `Platz ${eigene.platz} von ${tabelle.zeilen.length}`,
    eigene && `${eigene.punkte} ${fussball && eigene.punkte === '1' ? 'Punkt' : 'Punkte'}`,
  ].filter(Boolean)

  return (
    <details className="group">
      <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="text-sm text-[#4a4a4a] min-w-0">
          {kurz.map((teil, i) => (
            <span key={i} className={i === 0 ? 'font-medium text-[#0a0a0a]' : undefined}>
              {i > 0 && ' · '}
              {teil}
            </span>
          ))}
        </span>
        <span className="ml-auto shrink-0 text-xs text-[#6b6b6b] underline underline-offset-4">
          <span className="group-open:hidden">Tabelle zeigen</span>
          <span className="hidden group-open:inline">Tabelle ausblenden</span>
        </span>
      </summary>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm tabular-nums border-collapse">
          <thead>
            <tr className="text-[10px] tracking-[0.12em] uppercase text-[#6b6b6b] text-right">
              <th scope="col" className="py-1.5 pr-2 font-medium text-left w-8">Pl.</th>
              <th scope="col" className="py-1.5 pr-2 font-medium text-left">Mannschaft</th>
              <th scope="col" className="py-1.5 px-1.5 font-medium" title="Spiele">Sp.</th>
              <th scope="col" className="py-1.5 px-1.5 font-medium max-sm:hidden" title="Siege">S</th>
              <th scope="col" className="py-1.5 px-1.5 font-medium max-sm:hidden" title="Unentschieden">U</th>
              <th scope="col" className="py-1.5 px-1.5 font-medium max-sm:hidden" title="Niederlagen">N</th>
              <th scope="col" className="py-1.5 px-1.5 font-medium">{fussball ? 'Tore' : 'Spiele'}</th>
              <th scope="col" className="py-1.5 px-1.5 font-medium max-sm:hidden" title="Differenz">+/–</th>
              <th scope="col" className="py-1.5 pl-1.5 font-medium">Pkt.</th>
            </tr>
          </thead>
          <tbody>
            {tabelle.zeilen.map((z, i) => (
              <tr
                key={`${z.platz}-${z.mannschaft}-${i}`}
                className={`border-t border-[#0a0a0a]/[0.06] text-right ${z.eigene ? 'font-semibold text-[#0a0a0a]' : 'text-[#4a4a4a]'}`}
                style={z.eigene ? { background: `${farbe}14` } : undefined}
                aria-current={z.eigene ? 'true' : undefined}
              >
                <td className="py-1.5 pr-2 text-left whitespace-nowrap">
                  {z.platz ?? ''}
                  {z.zone && (
                    <span
                      className="ml-1 text-[10px] text-[#6b6b6b]"
                      title={z.zone === 'auf' ? 'Aufstiegsplatz' : 'Abstiegsplatz'}
                      aria-label={z.zone === 'auf' ? 'Aufstiegsplatz' : 'Abstiegsplatz'}
                    >
                      {z.zone === 'auf' ? '↑' : '↓'}
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-left max-w-[16rem] truncate" title={z.mannschaft}>
                  {z.mannschaft}
                </td>
                <td className="py-1.5 px-1.5">{z.spiele}</td>
                <td className="py-1.5 px-1.5 max-sm:hidden">{z.siege}</td>
                <td className="py-1.5 px-1.5 max-sm:hidden">{z.unentschieden}</td>
                <td className="py-1.5 px-1.5 max-sm:hidden">{z.niederlagen}</td>
                <td className="py-1.5 px-1.5 whitespace-nowrap">{z.tore}</td>
                <td className="py-1.5 px-1.5 max-sm:hidden">{z.differenz}</td>
                <td className="py-1.5 pl-1.5 whitespace-nowrap">{z.punkte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <a
        href={tabelle.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-xs text-[#6b6b6b] underline underline-offset-4 hover:text-[#0a0a0a]"
      >
        Tabelle auf {tabelle.quelle} ↗
      </a>
    </details>
  )
}
