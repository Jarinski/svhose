/**
 * app/api/cron/postfach/route.ts
 *
 * Cron-Endpunkt: Holt neue Mails aus dem Buchungs-Postfach (IMAP) und ordnet sie den Buchungen zu
 * (lib/buchungen/postfach.ts). Ohne Cron passiert das beim Öffnen der Buchungen in der Verwaltung;
 * mit Cron sind neue Mails auch dann schon zugeordnet. Auf dem Server z. B. alle 5 Minuten:
 *   0-59/5 * * * *  curl -fsS -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3100/api/cron/postfach
 */

import { NextRequest, NextResponse } from 'next/server'
import { datenbank } from '@/lib/db'
import { postfachAbrufen } from '@/lib/buchungen/postfach'
import { imapZugang } from '@/lib/mail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!imapZugang()) return NextResponse.json({ ok: true, uebersprungen: 'Abruf nicht eingerichtet' })
  const ergebnis = await postfachAbrufen(datenbank())
  return NextResponse.json(ergebnis, { status: ergebnis.ok ? 200 : 502 })
}
