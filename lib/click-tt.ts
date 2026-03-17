/**
 * lib/click-tt.ts
 *
 * Fetches and parses upcoming/past games for SV Holm-Seppensen
 * from the public click-tt / nuLiga portal (TTVN table tennis).
 *
 * Data is fetched via an HTML-form POST – same page the browser visits.
 * Page-level ISR (revalidate = 3600) keeps the data fresh.
 */

export interface TischtennisSpiel {
  id: string
  datum: string       // ISO-8601 "2026-03-20"
  uhrzeit: string     // "18:00"
  mannschaft: string  // human-readable: "Jugend 13", "Herren", …
  liga: string        // raw league code: "KL mJ13", "KL mJ19", …
  heim: string        // home team name
  gast: string        // away team name
  ergebnis: string    // match score like "8:8", empty for upcoming
  url: string         // link to click-tt club page
  heimspiel: boolean  // true when SV Holm-Seppensen is the home team
}

const CLUB_ID = '5504'
const MEETINGS_URL =
  'https://ttvn.click-tt.de/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/clubMeetings'
const CLUB_URL =
  `https://ttvn.click-tt.de/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/clubInfoDisplay?club=${CLUB_ID}`

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'text/html,application/xhtml+xml',
}

// ── HTML helpers ──────────────────────────────────────────────────────────

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&auml;/gi, 'ä')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&Uuml;/gi, 'Ü')
    .replace(/&Auml;/gi, 'Ä')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&szlig;/gi, 'ß')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

/** Map a raw liga code like "KL mJ13" to a display label like "Jugend 13" */
function ligazuMannschaft(liga: string, heim: string, gast: string): string {
  const isOurs = (n: string) => n.toLowerCase().includes('holm-seppensen')
  const ourTeam = isOurs(heim) ? heim : gast
  const suffix = ourTeam.trim().match(/\sII\s*$/i) ? ' II' : ''

  const l = liga.toLowerCase()
  if (l.includes('j11') || l.includes('mini'))             return `Jugend 11${suffix}`
  if (l.includes('j13'))                                    return `Jugend 13${suffix}`
  if (l.includes('j15'))                                    return `Jugend 15${suffix}`
  if (l.includes('j17'))                                    return `Jugend 17${suffix}`
  if (l.includes('j19'))                                    return `Jugend 19${suffix}`
  if (l.includes('herren') || l.match(/\bmh\b/))           return `Herren${suffix}`
  if (l.includes('damen')  || l.match(/\bwd\b|\bwh\b/))   return `Damen${suffix}`
  if (l.includes('senioren') || l.includes('sen'))         return `Senioren${suffix}`
  return liga || 'Tischtennis'
}

// ── Parser ────────────────────────────────────────────────────────────────

/**
 * Parse the HTML from the clubMeetings page.
 *
 * Table: <table class="result-set">
 *   Row 0:  header (<th> elements)
 *   Row n:  game row
 *     td[0]  day-name  (or class="tabelle-rowspan" for same-day games)
 *     td[1]  date "DD.MM.YYYY"  (or class="tabelle-rowspan")
 *     td[2]  time "HH:MM" (may include " t/v" suffix for rescheduled)
 *     td[3]  venue link
 *     td[4]  liga code
 *     td[5]  home team
 *     td[6]  away team
 *     td[7]  match score (empty = upcoming)
 *     td[8…] detail links, not needed
 */
function parseGamesFromHtml(html: string): TischtennisSpiel[] {
  const games: TischtennisSpiel[] = []

  // Find the result-set table
  const tStart = html.indexOf('<table class="result-set"')
  if (tStart === -1) return games
  const tEnd = html.indexOf('</table>', tStart)
  if (tEnd === -1) return games
  const tableHtml = html.slice(tStart, tEnd + 8)

  // Extract every <tr>…</tr> block
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  let currentDate = ''
  let headerSkipped = false

  while ((m = rowRe.exec(tableHtml)) !== null) {
    const rowContent = m[1]

    // Skip the header row (contains <th> not <td>)
    if (!headerSkipped) {
      headerSkipped = true
      if (rowContent.includes('<th')) continue
    }

    // Extract every <td attrs>content</td>
    const tdRe = /<td([^>]*)>([\s\S]*?)<\/td>/g
    const rawCells: { attrs: string; text: string }[] = []
    let td: RegExpExecArray | null
    while ((td = tdRe.exec(rowContent)) !== null) {
      rawCells.push({
        attrs: td[1],
        text: decodeEntities(stripTags(td[2])),
      })
    }

    if (rawCells.length < 7) continue

    // Determine if this row reuses the previous date (rowspan pattern)
    const isRowspan = rawCells[0].attrs.includes('tabelle-rowspan')

    if (!isRowspan) {
      const dateMatch = rawCells[1].text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (dateMatch) {
        currentDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      }
    }

    if (!currentDate) continue

    // Time: strip any " t/v" (rescheduled marker) and trim
    const timeMatch = rawCells[2].text.match(/(\d{2}:\d{2})/)
    if (!timeMatch) continue
    const uhrzeit = timeMatch[1]

    const liga     = rawCells[4].text
    const heim     = rawCells[5].text
    const gast     = rawCells[6].text
    const ergebnis = (rawCells[7]?.text ?? '').replace(/\s+/g, '').trim()

    if (!heim || !gast || !liga) continue

    const isOurs = (n: string) => n.toLowerCase().includes('holm-seppensen')
    if (!isOurs(heim) && !isOurs(gast)) continue  // not our club

    const heimspiel = isOurs(heim)
    const mannschaft = ligazuMannschaft(liga, heim, gast)

    // Stable, URL-safe ID
    const id = `tt-${currentDate}-${liga}-${heim}-${gast}`
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 80)

    games.push({
      id,
      datum: currentDate,
      uhrzeit,
      mannschaft,
      liga,
      heim,
      gast,
      ergebnis,
      url: CLUB_URL,
      heimspiel,
    })
  }

  return games
}

// ── HTTP fetch ─────────────────────────────────────────────────────────────

/**
 * POST the club-meetings search form.
 *
 * searchTimeRange values:
 *   "-1"       → last  7 days
 *   "1"        → next  7 days
 *   "2"        → next 14 days
 *   "3"        → next 31 days
 *   "4"        → next  3 months
 *   "5"        → next  6 months
 *   "13-6349"  → 2025/26 full season
 */
async function fetchGames(searchTimeRange: string): Promise<TischtennisSpiel[]> {
  const body = new URLSearchParams({
    searchType: '0',
    searchTimeRange,
    selectedTeamId: 'WONoSelectionString',
    club: CLUB_ID,
    searchMeetings: 'Suchen',
  })

  try {
    const res = await fetch(MEETINGS_URL, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: body.toString(),
      // POST requests are not cached by Next.js – page-level ISR handles freshness.
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`[click-tt] HTTP error ${res.status}`)
      return []
    }
    const html = await res.text()
    return parseGamesFromHtml(html)
  } catch (err) {
    console.error('[click-tt] Fetch error:', err)
    return []
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Upcoming games (next 3 months, no result yet). */
export async function getTischtennisKommendeSpiele(): Promise<TischtennisSpiel[]> {
  const today = new Date().toISOString().slice(0, 10)
  const games = await fetchGames('4')
  return games.filter(g => g.datum >= today)
}

/** Recent past games (last 7 days). */
export async function getTischtennisVergangeneSpiele(): Promise<TischtennisSpiel[]> {
  const today = new Date().toISOString().slice(0, 10)
  const games = await fetchGames('-1')
  return games.filter(g => g.datum < today || g.ergebnis !== '')
}

/** All games for cron sync (upcoming 6 months + last 7 days, deduplicated). */
export async function getTischtennisAlleSaison(): Promise<TischtennisSpiel[]> {
  const [upcoming, past] = await Promise.all([
    fetchGames('5'),
    fetchGames('-1'),
  ])
  const seen = new Set<string>()
  const all: TischtennisSpiel[] = []
  for (const g of [...upcoming, ...past]) {
    if (!seen.has(g.id)) {
      seen.add(g.id)
      all.push(g)
    }
  }
  return all
}
