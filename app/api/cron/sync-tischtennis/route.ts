/**
 * app/api/cron/sync-tischtennis/route.ts
 *
 * Cron-Endpunkt: Synchronisiert Tischtennis-Spiele von click-tt als Termine in Sanity.
 *
 * Wird täglich via Vercel Cron aufgerufen (vercel.json).
 * Manueller Aufruf: GET /api/cron/sync-tischtennis
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
  getTischtennisAlleSaison,
  type TischtennisSpiel,
} from '@/lib/click-tt'

// ── Sanity write client ────────────────────────────────────────────────────

function buildWriteClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
    useCdn: false,
    token: process.env.SANITY_API_WRITE_TOKEN,
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Deterministischer Sanity-Dokument-ID aus der click-tt Spiel-ID */
function toDocId(spielId: string): string {
  return `click-tt-${spielId}`
}

/** Konvertiert ein TischtennisSpiel in ein Sanity-Termin-Dokument */
function spielToTermin(spiel: TischtennisSpiel) {
  const gegner       = spiel.heimspiel ? spiel.gast : spiel.heim
  const prefix       = spiel.heimspiel ? 'Heimspiel' : 'Auswärtsspiel'
  const titel        = `${prefix}: SV Holm-Seppensen – ${gegner}`

  const beschreibungsZeilen: string[] = [
    `Liga: ${spiel.liga}`,
    `Mannschaft: ${spiel.mannschaft}`,
  ]
  if (spiel.ergebnis) beschreibungsZeilen.push(`Ergebnis: ${spiel.ergebnis}`)
  beschreibungsZeilen.push(`Details: ${spiel.url}`)

  return {
    _id:          toDocId(spiel.id),
    _type:        'termin' as const,
    titel,
    datum:        spiel.datum,    // ISO-8601 date string
    uhrzeit:      spiel.uhrzeit,
    sparte:       spiel.mannschaft,
    ort:          spiel.heimspiel ? 'Sporthalle Holm-Seppensen' : 'Auswärtsspiel',
    beschreibung: beschreibungsZeilen.join('\n'),
    tags: [
      'Tischtennis',
      spiel.mannschaft,
      spiel.heimspiel ? 'Heimspiel' : 'Auswärtsspiel',
    ],
    clickTtId: spiel.id,
  }
}

/**
 * Findet Termine, die click-tt nicht mehr kennt – verlegte oder abgesagte Spiele.
 *
 * `getTischtennisAlleSaison()` fragt einen Zeitraum ab (kommende sechs Monate plus
 * letzte sieben Tage), nicht die komplette Historie. Ältere Spiele – etwa die
 * Rückrunde der Vorsaison – fehlen in der Antwort, ohne abgesagt zu sein. Gelöscht
 * wird deshalb nur zwischen dem ersten und letzten gelieferten Spieltag; nuLiga gibt
 * einen Datumsbereich vollständig zurück, die Randtage sind also belastbar.
 *
 * Fällt eine der beiden Abfragen aus, schrumpft das Fenster auf die verbliebenen
 * Daten – außerhalb wird dann nichts angefasst.
 */
async function findeVeralteteTermine(
  sanity: ReturnType<typeof buildWriteClient>,
  allSpiele: TischtennisSpiel[],
): Promise<{ ids: string[]; uebersprungen: boolean }> {
  const daten = allSpiele.map(s => s.datum).sort()
  const von   = daten[0]
  const bis   = daten[daten.length - 1]

  // datum ist ein ISO-Datum ("YYYY-MM-DD") und damit lexikografisch vergleichbar.
  const vorhandeneIds: string[] = await sanity.fetch(
    `*[_type == "termin"
       && defined(clickTtId)
       && !(_id in path("drafts.**"))
       && datum >= $von
       && datum <= $bis]._id`,
    { von, bis },
  )

  const aktuelleIds = new Set(allSpiele.map(s => toDocId(s.id)))
  const veraltet    = vorhandeneIds.filter(id => !aktuelleIds.has(id))

  // Notbremse: Ändert sich das ID-Schema oder bricht der Parser, wirken auf einmal
  // alle Termine im Fenster veraltet. Ein einzelner Cron-Lauf soll den Kalender
  // dann nicht leerräumen – lieber Dubletten als Datenverlust.
  if (veraltet.length > vorhandeneIds.length / 2 && vorhandeneIds.length > 0) {
    console.warn(
      `[sync-tischtennis] ${veraltet.length} von ${vorhandeneIds.length} Terminen im Fenster ` +
      `wirken veraltet – Löschen übersprungen, bitte Parser prüfen.`,
    )
    return { ids: [], uebersprungen: true }
  }

  return { ids: veraltet, uebersprungen: false }
}

// ── GET handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Authentifizierung
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 2. Sanity-Konfiguration prüfen
  const projectId  = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const writeToken = process.env.SANITY_API_WRITE_TOKEN
  if (!projectId || !writeToken) {
    return NextResponse.json(
      {
        error:
          'Sanity nicht konfiguriert – NEXT_PUBLIC_SANITY_PROJECT_ID oder SANITY_API_WRITE_TOKEN fehlt.',
      },
      { status: 500 },
    )
  }

  try {
    // 3. Spiele von click-tt laden
    const allSpiele = await getTischtennisAlleSaison()

    if (allSpiele.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Keine Spiele gefunden.',
        synced: 0,
      })
    }

    // 4. Alle Spiele als Termine in Sanity schreiben (upsert)
    const sanity      = buildWriteClient()
    const transaction = sanity.transaction()

    for (const spiel of allSpiele) {
      transaction.createOrReplace(spielToTermin(spiel))
    }

    // 5. Verlegte/abgesagte Spiele entfernen
    const veraltet = await findeVeralteteTermine(sanity, allSpiele)
    for (const id of veraltet.ids) {
      transaction.delete(id)
    }

    await transaction.commit()

    console.log(
      `[sync-tischtennis] ${allSpiele.length} Spiele synchronisiert, ` +
      `${veraltet.ids.length} veraltete Termine gelöscht.`,
    )

    return NextResponse.json({
      success:   true,
      synced:    allSpiele.length,
      kommende:  allSpiele.filter(s => !s.ergebnis).length,
      vergangene: allSpiele.filter(s => !!s.ergebnis).length,
      geloescht:     veraltet.ids.length,
      geloeschteIds: veraltet.ids,
      ...(veraltet.uebersprungen ? { loeschenUebersprungen: true } : {}),
    })
  } catch (err) {
    console.error('[sync-tischtennis] Fehler:', err)
    return NextResponse.json(
      { error: 'Synchronisation fehlgeschlagen', details: String(err) },
      { status: 500 },
    )
  }
}
