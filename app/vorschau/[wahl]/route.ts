/**
 * app/vorschau/[wahl]/route.ts
 *
 * Schaltet die Design-Vorschau um (siehe lib/vorschau.ts):
 *   /vorschau/a, /vorschau/b  → neues Design A bzw. B
 *   /vorschau/aktuell         → Vorschau-Modus mit dem bisherigen Design (zum Vergleichen)
 *   /vorschau/aus             → Vorschau-Modus beenden
 * Danach geht es zurück auf ?zurueck=<pfad> bzw. zur Startseite.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { DESIGN_COOKIE, DESIGN_COOKIE_MAX_ALTER, alsVorschauWahl } from '@/lib/vorschau'

/** Nur Pfade auf dieser Website zulassen – keine fremden Adressen, keine Umleitungsschleife. */
function zielPfad(zurueck: string | null): string {
  if (!zurueck || !zurueck.startsWith('/') || zurueck.startsWith('//') || zurueck.startsWith('/\\')) return '/'
  if (zurueck.startsWith('/vorschau/') || zurueck.startsWith('/verwaltung')) return '/'
  return zurueck
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wahl: string }> }) {
  const { wahl } = await params
  const vorschau = alsVorschauWahl(wahl)
  if (!vorschau && wahl !== 'aus') {
    return new NextResponse('Unbekanntes Design', { status: 404 })
  }

  // Relative Weiterleitung: request.url kann hinter einem Reverse-Proxy eine interne Adresse sein.
  const antwort = new NextResponse(null, {
    status: 307,
    headers: { Location: zielPfad(request.nextUrl.searchParams.get('zurueck')) },
  })
  if (vorschau) {
    // Nicht httpOnly: Das Skript im <head> muss die Wahl lesen können.
    antwort.cookies.set(DESIGN_COOKIE, vorschau, { path: '/', maxAge: DESIGN_COOKIE_MAX_ALTER, sameSite: 'lax' })
  } else {
    antwort.cookies.delete(DESIGN_COOKIE)
  }
  antwort.headers.set('Cache-Control', 'no-store')
  antwort.headers.set('X-Robots-Tag', 'noindex')
  return antwort
}
