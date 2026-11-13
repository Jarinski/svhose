/**
 * lib/tabellen.ts
 *
 * Aktuelle Ligatabellen für die Mannschaftskarten auf den Spartenseiten.
 *
 * Pro Mannschaft wird in der Verwaltung ein Link hinterlegt (mannschaften.tabelle_url):
 * - fussball.de: die Mannschaftsseite („https://www.fussball.de/mannschaft/…/team-id/…“) –
 *   dort steht die Tabelle der aktuellen Staffel unverschlüsselt, die eigene Zeile ist markiert.
 * - click-tt: die Staffelseite („…/nuLigaTTDE.woa/wa/groupPage?championship=…&group=…“).
 *
 * Abgerufen wird beim Seitenaufruf, über den Fetch-Cache von Next.js höchstens stündlich.
 * Fehlt die Quelle oder hat sie (noch) keine Tabelle – z. B. Kinderfußball ohne Wertung –,
 * kommt null zurück und die Karte zeigt einfach keine Tabelle.
 */

export type TabellenQuelle = 'fussball.de' | 'click-tt'

export interface TabellenZeile {
  platz: number | null
  mannschaft: string
  spiele: string
  siege: string
  unentschieden: string
  niederlagen: string
  /** Fußball: Torverhältnis „62 : 13“, Tischtennis: Spiele „18:2“ */
  tore: string
  differenz: string
  /** Fußball „34“, Tischtennis „4:0“ */
  punkte: string
  /** Zeile von SV Holm-Seppensen */
  eigene: boolean
  /** Aufstiegs- bzw. Abstiegsplatz, soweit die Quelle ihn markiert */
  zone: 'auf' | 'ab' | null
}

export interface Tabelle {
  quelle: TabellenQuelle
  /** „2.Kreisklasse Harburg“, „Jugend 19 Kreisliga Vorrunde West“ */
  liga: string
  /** Seite der Tabelle bei der Quelle – zum Weiterklicken */
  url: string
  zeilen: TabellenZeile[]
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
}

// ─── Link prüfen ─────────────────────────────────────────────────────────────

/**
 * Erkennt, ob ein Link auf eine Tabelle zeigt, die wir lesen können. Liefert die
 * bereinigte Adresse (https, ohne Leerzeichen) oder null.
 */
export function tabellenLink(eingabe: string): { quelle: TabellenQuelle; url: string } | null {
  let url: URL
  try {
    url = new URL(eingabe.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  url.protocol = 'https:'

  if (/^(www\.)?fussball\.de$/i.test(url.hostname) && /^\/mannschaft\/.+\/team-id\/[A-Z0-9]+/i.test(url.pathname)) {
    url.hostname = 'www.fussball.de'
    url.hash = ''
    url.search = ''
    // Ohne „/saison/2627“ leitet fussball.de auf die jeweils aktuelle Saison weiter –
    // so bleibt der Link nach dem Saisonwechsel nicht auf der alten Tabelle stehen.
    url.pathname = url.pathname.replace(/\/saison\/\d+(?=\/)/, '')
    return { quelle: 'fussball.de', url: url.toString() }
  }

  if (
    /(^|\.)click-tt\.de$/i.test(url.hostname) &&
    /\/wa\/groupPage$/.test(url.pathname) &&
    url.searchParams.get('championship') &&
    url.searchParams.get('group')
  ) {
    url.hash = ''
    return { quelle: 'click-tt', url: url.toString() }
  }

  return null
}

// ─── HTML-Hilfen ─────────────────────────────────────────────────────────────

function text(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&#8203;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dez) => String.fromCodePoint(Number(dez)))
    .replace(/&(auml|ouml|uuml|Auml|Ouml|Uuml|szlig);/g, (_, n: string) =>
      ({ auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß' })[n] ?? '',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function zellen(zeile: string): { attrs: string; html: string }[] {
  return [...zeile.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map(z => ({ attrs: z[1], html: z[2] }))
}

function platzZahl(wert: string): number | null {
  const zahl = parseInt(wert, 10)
  return Number.isNaN(zahl) ? null : zahl
}

const ISTUNSER = /holm-seppensen|holm-s\./i

// ─── fussball.de ─────────────────────────────────────────────────────────────

/**
 * Tabelle von der Mannschaftsseite. Sie steht in der Tabelle mit der Spalte „Mannschaft“
 * (class="column-large"); Zeilen tragen row-promotion / row-relegation und „own“ für die
 * eigene Mannschaft. Den Namen der Staffel nennt die Auswahl „Wettbewerb“ darüber.
 */
export function fussballTabelleLesen(html: string, url: string): Tabelle | null {
  const start = html.indexOf('class="column-large">Mannschaft')
  if (start === -1) return null
  const tabelle = html.slice(start, html.indexOf('</table>', start))

  const zeilen: TabellenZeile[] = []
  for (const tr of tabelle.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)) {
    const klassen = tr[1].match(/class="([^"]*)"/)?.[1] ?? ''
    const td = zellen(tr[2])
    if (td.length < 10 || !/column-rank/.test(td[1].attrs)) continue
    const mannschaft = text(tr[2].match(/<div class="club-name">([\s\S]*?)<\/div>/)?.[1] ?? td[2].html)
    zeilen.push({
      platz: platzZahl(text(td[1].html)),
      mannschaft,
      spiele: text(td[3].html),
      siege: text(td[4].html),
      unentschieden: text(td[5].html),
      niederlagen: text(td[6].html),
      tore: text(td[7].html).replace(/\s*:\s*/, ':'),
      differenz: text(td[8].html),
      punkte: text(td[9].html),
      eigene: /\bown\b/.test(klassen),
      zone: /row-promotion/.test(klassen) ? 'auf' : /row-relegation|row-demotion/.test(klassen) ? 'ab' : null,
    })
  }
  if (zeilen.length === 0) return null

  const staffel = html.match(/<select[^>]*name="staffel"[^>]*>[\s\S]*?<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/)?.[1]
  return { quelle: 'fussball.de', liga: staffel ? text(staffel) : '', url, zeilen }
}

// ─── click-tt ────────────────────────────────────────────────────────────────

/**
 * Tabelle der Staffelseite: erste <table class="result-set">. Spalten: (Tendenz), Rang,
 * Mannschaft, Begegnungen, S, U, N, Spiele, +/-, Punkte. Die Überschrift <h1> nennt Verband,
 * Staffel und „Tabelle und Spielplan“ – gebraucht wird nur die mittlere Zeile.
 */
export function clickTtTabelleLesen(html: string, url: string): Tabelle | null {
  const start = html.indexOf('<table class="result-set"')
  if (start === -1) return null
  const tabelle = html.slice(start, html.indexOf('</table>', start))

  const zeilen: TabellenZeile[] = []
  for (const tr of tabelle.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)) {
    const td = zellen(tr[2])
    if (td.length < 10) continue
    const mannschaft = text(td[2].html)
    // click-tt markiert Auf-/Abstiegsplätze über die Hintergrundfarbe der Zeile oder ein Bild in der ersten Spalte
    const markierung = `${tr[1]} ${td[0].html}`
    zeilen.push({
      platz: platzZahl(text(td[1].html)),
      mannschaft,
      spiele: text(td[3].html),
      siege: text(td[4].html),
      unentschieden: text(td[5].html),
      niederlagen: text(td[6].html),
      tore: text(td[7].html),
      differenz: text(td[8].html),
      punkte: text(td[9].html),
      eigene: ISTUNSER.test(mannschaft),
      zone: /aufstieg|up\.gif/i.test(markierung) ? 'auf' : /abstieg|down\.gif/i.test(markierung) ? 'ab' : null,
    })
  }
  if (zeilen.length === 0) return null

  const ueberschrift = html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ''
  const teile = ueberschrift.split(/<br\s*\/?>/i).map(text).filter(Boolean)
  const liga = teile.length >= 2 ? teile[1] : (teile[0] ?? '')
  return { quelle: 'click-tt', liga, url, zeilen }
}

// ─── Abruf ───────────────────────────────────────────────────────────────────

/** Lädt die Tabelle hinter einem Link aus der Verwaltung; null, wenn es (gerade) keine gibt. */
export async function ladeTabelle(link: string | null): Promise<Tabelle | null> {
  const ziel = link ? tabellenLink(link) : null
  if (!ziel) return null
  try {
    const res = await fetch(ziel.url, { headers: FETCH_HEADERS, next: { revalidate: 3600 } })
    if (!res.ok) return null
    const html = await res.text()
    return ziel.quelle === 'fussball.de' ? fussballTabelleLesen(html, ziel.url) : clickTtTabelleLesen(html, ziel.url)
  } catch (err) {
    console.error('[tabellen] Abruf fehlgeschlagen:', ziel.url, err)
    return null
  }
}
