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

/** Normalisiert einen Wert zu einem Sanity-sicheren ID-Bestandteil */
function toSanityIdPart(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Baut einen deterministischen Sanity-Dokument-ID aus der fussball.de Spiel-ID */
function toDocId(spielId: string): string {
  return `fussball-de-${toSanityIdPart(spielId)}`
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

/**
 * Findet Termine, die fussball.de nicht mehr kennt – verlegte oder abgesagte Spiele.
 *
 * Die beiden AJAX-Endpunkte liefern jeweils nur die nächsten bzw. letzten zehn
 * Spiele. "Nicht in der Antwort" heißt also nicht "existiert nicht mehr" – die
 * meisten Termine in Sanity liegen schlicht außerhalb dieses Fensters.
 *
 * Verlässlich ist nur der Bereich *zwischen* den beiden Rändern: der älteste Tag
 * der vergangenen und der jüngste Tag der kommenden Spiele sind durch die
 * Zehnerkappung angeschnitten (von einem Spieltag mit zehn Partien schafft es
 * womöglich nur ein Teil in die Liste). Beide Randtage bleiben deshalb außen vor,
 * und ohne beide Ränder wird gar nicht gelöscht.
 */
async function findeVeralteteTermine(
  sanity: ReturnType<typeof buildWriteClient>,
  kommende: FussballSpiel[],
  vergangene: FussballSpiel[],
  allSpiele: FussballSpiel[],
): Promise<{ ids: string[]; uebersprungen: boolean }> {
  const nichts = { ids: [], uebersprungen: false }
  if (kommende.length === 0 || vergangene.length === 0) return nichts

  const von = vergangene.reduce((min, s) => (s.datum < min ? s.datum : min), vergangene[0].datum)
  const bis = kommende.reduce((max, s) => (s.datum > max ? s.datum : max), kommende[0].datum)
  if (von >= bis) return nichts

  // datum ist ein ISO-Datum ("YYYY-MM-DD") und damit lexikografisch vergleichbar.
  const vorhandeneIds: string[] = await sanity.fetch(
    `*[_type == "termin"
       && defined(fussballDeId)
       && !(_id in path("drafts.**"))
       && datum > $von
       && datum < $bis]._id`,
    { von, bis },
  )

  const aktuelleIds = new Set(allSpiele.map((s) => toDocId(s.id)))
  const veraltet = vorhandeneIds.filter((id) => !aktuelleIds.has(id))

  // Notbremse: Ändert sich das ID-Schema oder bricht der Parser, wirken auf einmal
  // alle Termine im Fenster veraltet. Ein einzelner Cron-Lauf soll den Kalender
  // dann nicht leerräumen – lieber Dubletten als Datenverlust.
  if (veraltet.length > vorhandeneIds.length / 2 && vorhandeneIds.length > 0) {
    console.warn(
      `[sync-fussball] ${veraltet.length} von ${vorhandeneIds.length} Terminen im Fenster ` +
        `wirken veraltet – Löschen übersprungen, bitte Parser prüfen.`,
    )
    return { ids: [], uebersprungen: true }
  }

  return { ids: veraltet, uebersprungen: false }
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

    // 5. Verlegte/abgesagte Spiele entfernen
    const veraltet = await findeVeralteteTermine(sanity, kommende, vergangene, allSpiele)
    for (const id of veraltet.ids) {
      transaction.delete(id)
    }

    await transaction.commit()

    console.log(
      `[sync-fussball] ${allSpiele.length} Spiele synchronisiert, ${veraltet.ids.length} veraltete Termine gelöscht.`,
    )

    return NextResponse.json({
      success: true,
      synced: allSpiele.length,
      kommende: kommende.length,
      vergangene: vergangene.length,
      geloescht: veraltet.ids.length,
      geloeschteIds: veraltet.ids,
      ...(veraltet.uebersprungen ? { loeschenUebersprungen: true } : {}),
    })
  } catch (err) {
    console.error('[sync-fussball] Fehler bei der Synchronisation:', err)
    return NextResponse.json(
      { error: 'Synchronisation fehlgeschlagen', details: String(err) },
      { status: 500 },
    )
  }
}
