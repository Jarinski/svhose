/**
 * app/api/cron/instagram/route.ts
 *
 * Cron-Endpunkt: Holt die neuesten Instagram-Beiträge für die Kachel der Startseite und verlängert
 * dabei den Zugangsschlüssel (lib/instagram.ts). Ohne Cron passiert das beim Aufruf der Startseite
 * (höchstens stündlich); mit Cron bleibt der Schlüssel auch ohne Besuche gültig. Z. B. stündlich:
 *   23 * * * *  curl -fsS -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3000/api/cron/instagram
 */

import { NextRequest, NextResponse } from 'next/server'
import { instagramAbgleichen } from '@/lib/instagram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const ergebnis = await instagramAbgleichen()
  if (!ergebnis.ok && ergebnis.nichtVerbunden) return NextResponse.json({ ok: true, uebersprungen: ergebnis.fehler })
  return NextResponse.json(ergebnis, { status: ergebnis.ok ? 200 : 502 })
}
