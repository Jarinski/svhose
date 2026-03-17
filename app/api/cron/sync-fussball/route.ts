/**
 * app/api/cron/sync-fussball/route.ts
 *
 * Cron-Endpunkt: Synchronisiert Spiele von fussball.de als Termine in Sanity.
 *
 * Wird täglich via Vercel Cron aufgerufen (vercel.json).
 * Manueller Aufruf: GET /api/cron/sync-fussball
 *   → Header: Authorization: Bearer <CRON_SECRET>
 *
 * Umgebungsvariablen:
 *   CRON_SECRET              – schützt den Endpunkt vor unautorisierten Aufrufen
 *   SANITY_API_WRITE_TOKEN   – Sanity-Token mit Editor/Admin-Rechten
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET
 *   NEXT_PUBLIC_SANITY_API_VERSION
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'next-sanity'
import {
  getFussballKommendeSpiele,
  getFussballVergangeneSpiele,
  type FussballSpiel,
} from '@/lib/fussball-de'

// ── Sanity-Client (mit Schreib-Token) ──────────────────────────────────────
function buildWriteClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
    useCdn: false,
    token: process.env.SANITY_API_WRITE_TOKEN,
  })
}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────

/** Baut einen deterministischen Sanity-Dokument-ID aus der fussball.de Spiel-ID */
function toDocId(spielId: string): string {
  return `fussball-de-${spielId}`
}

/** Konvertiert ein FussballSpiel in ein Sanity-Termin-Dokument */
function spielToTermin(spiel: FussballSpiel) {
  const gegner = spiel.heimspiel ? spiel.gast : spiel.heim
  const prefix = spiel.heimspiel ? 'Heimspiel' : 'Auswärtsspiel'
  const titel = `${prefix}: SV Holm-Seppensen – ${gegner}`

  const beschreibungsZeilen: string[] = [`Liga: ${spiel.liga}`]
  if (spiel.url) beschreibungsZeilen.push(`Details: ${spiel.url}`)
  const beschreibung = beschreibungsZeilen.join('\n')

  return {
    _id: toDocId(spiel.id),
    _type: 'termin' as const,
    titel,
    datum: spiel.datum, // ISO-8601 "YYYY-MM-DD" – passt zum Sanity date-Typ
    uhrzeit: spiel.uhrzeit,
    sparte: spiel.mannschaftsart,
    ort: spiel.heimspiel ? 'Sportplatz Holm-Seppensen' : 'Auswärtsspiel',
    beschreibung,
    tags: [
      'Fußball',
      spiel.mannschaftsart,
      spiel.heimspiel ? 'Heimspiel' : 'Auswärtsspiel',
    ],
    fussballDeId: spiel.id,
  }
}

// ── GET-Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Authentifizierung prüfen
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 2. Konfiguration prüfen
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const writeToken = process.env.SANITY_API_WRITE_TOKEN
  if (!projectId || !writeToken) {
    return NextResponse.json(
      { error: 'Sanity nicht konfiguriert – NEXT_PUBLIC_SANITY_PROJECT_ID oder SANITY_API_WRITE_TOKEN fehlt.' },
      { status: 500 },
    )
  }

  try {
    // 3. Spiele von fussball.de laden (kommende + vergangene)
    const [kommende, vergangene] = await Promise.all([
      getFussballKommendeSpiele(),
      getFussballVergangeneSpiele(),
    ])

    // Deduplizieren nach ID
    const seen = new Set<string>()
    const allSpiele: FussballSpiel[] = []
    for (const spiel of [...kommende, ...vergangene]) {
      if (!seen.has(spiel.id)) {
        seen.add(spiel.id)
        allSpiele.push(spiel)
      }
    }

    if (allSpiele.length === 0) {
      return NextResponse.json({ success: true, message: 'Keine Spiele gefunden.', synced: 0 })
    }

    // 4. Alle Spiele als Termine in Sanity schreiben (createOrReplace = upsert)
    const sanity = buildWriteClient()
    const transaction = sanity.transaction()

    for (const spiel of allSpiele) {
      transaction.createOrReplace(spielToTermin(spiel))
    }

    await transaction.commit()

    console.log(`[sync-fussball] ${allSpiele.length} Spiele synchronisiert.`)

    return NextResponse.json({
      success: true,
      synced: allSpiele.length,
      kommende: kommende.length,
      vergangene: vergangene.length,
    })
  } catch (err) {
    console.error('[sync-fussball] Fehler bei der Synchronisation:', err)
    return NextResponse.json(
      { error: 'Synchronisation fehlgeschlagen', details: String(err) },
      { status: 500 },
    )
  }
}
