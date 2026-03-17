/**
 * lib/fussball-de.ts
 *
 * Fetches and parses upcoming/past games for SV Holm-Seppensen
 * from the public fussball.de AJAX endpoints.
 *
 * Revalidates every hour via Next.js fetch cache.
 */

export interface FussballSpiel {
  id: string
  datum: string        // ISO-8601: "2026-03-20"
  uhrzeit: string      // "15:00"
  mannschaftsart: string // "Herren", "B-Junioren", "Frauen", …
  liga: string         // "3.Kreisklasse", "Bezirksliga", …
  heim: string         // home team name
  gast: string         // away team name
  url: string          // link to the match on fussball.de
  heimspiel: boolean   // true if SV Holm-Seppensen is the home team
}

const CLUB_ID = '00ES8GN7RK00006QVV0AG08LVUPGND5I'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
}

/** Decode common HTML entities that appear in fussball.de output */
function decodeEntities(str: string): string {
  return str
    .replace(/&#8203;/g, '')          // zero-width space
    .replace(/&#xfc;/gi, 'ü')
    .replace(/&#xe4;/gi, 'ä')
    .replace(/&#xf6;/gi, 'ö')
    .replace(/&#xdc;/gi, 'Ü')
    .replace(/&#xc4;/gi, 'Ä')
    .replace(/&#xd6;/gi, 'Ö')
    .replace(/&#xdf;/gi, 'ß')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip all HTML tags from a string */
function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

/**
 * Parse the HTML fragment returned by fussball.de AJAX endpoints.
 *
 * Structure per game:
 *   <tr class="row-headline visible-small">
 *     <td ...>Dienstag, 17.03.2026 - 19:00 Uhr | B-Junioren | Bezirksliga</td>
 *   </tr>
 *   <tr class="(odd?) row-competition hidden-small"> … </tr>
 *   <tr class="(odd?)">
 *     <td class="column-club">…<div class="club-name">Home</div>…</td>
 *     <td class="column-colon">:</td>
 *     <td class="column-club no-border">…<div class="club-name">Away</div>…</td>
 *     <td class="column-score">…</td>
 *     <td class="column-detail"><a href="MATCH_URL">…</a></td>
 *   </tr>
 */
function parseGamesFromHtml(html: string): FussballSpiel[] {
  const games: FussballSpiel[] = []

  // ── 1. Find all row-headline positions ──────────────────────────────────
  const headlineRe =
    /<tr\s+class="row-headline visible-small">\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g
  const headlines: { text: string; index: number }[] = []
  let m: RegExpExecArray | null

  while ((m = headlineRe.exec(html)) !== null) {
    headlines.push({ text: stripTags(m[1]).trim(), index: m.index })
  }

  // ── 2. For each headline extract the game block ──────────────────────────
  for (let i = 0; i < headlines.length; i++) {
    const hl = headlines[i]
    const nextHlIndex = headlines[i + 1]?.index ?? html.length
    const block = html.slice(hl.index, nextHlIndex)

    // ── Parse headline: "Dienstag, 17.03.2026 - 19:00 Uhr | B-Junioren | 3.Kreisklasse"
    const hlMatch = hl.text.match(
      /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}:\d{2})\s*Uhr\s*\|\s*([^|]+?)\s*\|\s*(.+)/
    )
    if (!hlMatch) continue

    const [, dateStr, time, teamType, league] = hlMatch
    const [day, month, year] = dateStr.split('.')
    const datum = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

    // ── Extract team names from club-name divs ───────────────────────────
    const clubNameRe = /<div class="club-name">([\s\S]*?)<\/div>/g
    const teamNames: string[] = []
    let tn: RegExpExecArray | null
    while ((tn = clubNameRe.exec(block)) !== null) {
      const name = decodeEntities(stripTags(tn[1]))
      if (name) teamNames.push(name)
    }

    if (teamNames.length < 2) continue

    const heim = teamNames[0]
    const gast = teamNames[1]

    // ── Extract the fussball.de match URL ────────────────────────────────
    const urlMatch = block.match(
      /class="column-detail">\s*<a\s+href="(https:\/\/www\.fussball\.de\/spiel\/[^"]+)"/
    )

    // ── Determine if our club is the home team ───────────────────────────
    const isOurs = (name: string) =>
      name.toLowerCase().includes('holm-seppensen') ||
      name.toLowerCase().includes('holm-s.')

    const heimspiel = isOurs(heim)

    games.push({
      id: `${datum}-${heim}-${gast}`.replace(/\s+/g, '-').toLowerCase().slice(0, 80),
      datum,
      uhrzeit: time,
      mannschaftsart: teamType.trim(),
      liga: decodeEntities(league.trim()),
      heim,
      gast,
      url: urlMatch?.[1] ?? '',
      heimspiel,
    })
  }

  return games
}

/** Fetch the next upcoming games from fussball.de */
export async function getFussballKommendeSpiele(): Promise<FussballSpiel[]> {
  try {
    const res = await fetch(
      `https://www.fussball.de/ajax.club.next.games/-/id/${CLUB_ID}/mode/PAGE`,
      {
        headers: FETCH_HEADERS,
        next: { revalidate: 3600 }, // revalidate every hour
      }
    )
    if (!res.ok) return []
    const html = await res.text()
    return parseGamesFromHtml(html)
  } catch (err) {
    console.error('[fussball-de] Error fetching next games:', err)
    return []
  }
}

/** Fetch the most recent past games from fussball.de */
export async function getFussballVergangeneSpiele(): Promise<FussballSpiel[]> {
  try {
    const res = await fetch(
      `https://www.fussball.de/ajax.club.prev.games/-/id/${CLUB_ID}/mode/PAGE`,
      {
        headers: FETCH_HEADERS,
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return []
    const html = await res.text()
    return parseGamesFromHtml(html)
  } catch (err) {
    console.error('[fussball-de] Error fetching prev games:', err)
    return []
  }
}
