/**
 * app/api/suche/route.ts
 *
 * Schnellsuche für das Suchfenster (components/suche/SuchFenster.tsx):
 *   GET /api/suche?q=<Suchbegriff>[&art=news][&n=8][&je=3]
 * n: höchstens so viele Treffer, je: gruppiert mit höchstens so vielen je Art.
 * Antwortet mit einem SuchErgebnis (lib/suche/typen.ts). Die ausführliche Trefferliste ist /suche.
 */

import { NextRequest, NextResponse } from 'next/server'
import { suchen } from '@/lib/suche/suchen'
import { istSuchArt } from '@/lib/suche/typen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  // Lange Eingaben kürzen – niemand sucht nach ganzen Absätzen
  const eingabe = (params.get('q') ?? '').trim().slice(0, 120)
  const art = params.get('art')
  const grenze = Math.min(Math.max(Number(params.get('n')) || 8, 1), 30)
  const jeArt = Math.min(Math.max(Number(params.get('je')) || 0, 0), 10)

  const ergebnis = await suchen(eingabe, { art: istSuchArt(art) ? art : null, grenze, jeArt })
  return NextResponse.json(ergebnis, { headers: { 'Cache-Control': 'no-store' } })
}
