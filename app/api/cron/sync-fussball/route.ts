/**
 * app/api/cron/sync-fussball/route.ts
 *
 * Cron-Endpunkt: Synchronisiert Spiele von fussball.de als Termine in die
 * SQLite-Datenbank (Tabelle termine, quelle = 'fussball-de').
 *
 * Wird täglich auf dem eigenen Server per crontab aufgerufen, z. B.:
 *   0 4 * * *  curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/sync-fussball
 * Manueller Aufruf: GET /api/cron/sync-fussball
 *   → Header: Authorization: Bearer <CRON_SECRET>
 *
 * Umgebungsvariablen:
 *   CRON_SECRET – schützt den Endpunkt vor unautorisierten Aufrufen
 */

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, inArray, lt } from 'drizzle-orm'
import { datenbank, type Datenbank } from '@/lib/db'
import { sparten, termine } from '@/lib/db/schema'
import {
  getFussballKommendeSpiele,
  getFussballVergangeneSpiele,
  type FussballSpiel,
} from '@/lib/fussball-de'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Konstanten ──────────────────────────────────────────────────────────────

const QUELLE = 'fussball-de' as const
const SPARTE_SLUG = 'fussball'

/** Transaktions-Handle von Drizzle (better-sqlite3, synchron). */
type Transaktion = Parameters<Parameters<Datenbank['transaction']>[0]>[0]

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Konvertiert ein FussballSpiel in die Felder eines Termins (ohne quelle/externe_id). */
function spielToTermin(spiel: FussballSpiel) {
  const gegner = spiel.heimspiel ? spiel.gast : spiel.heim
  const prefix = spiel.heimspiel ? 'Heimspiel' : 'Auswärtsspiel'
  const titel = `${prefix}: SV Holm-Seppensen – ${gegner}`

  const beschreibungsZeilen: string[] = [`Liga: ${spiel.liga}`]
  if (spiel.url) beschreibungsZeilen.push(`Details: ${spiel.url}`)
  const beschreibung = beschreibungsZeilen.join('\n')

  return {
    titel,
    datum: spiel.datum, // ISO-8601 "YYYY-MM-DD"
    uhrzeit: spiel.uhrzeit,
    ort: spiel.heimspiel ? 'Sportplatz Holm-Seppensen' : 'Auswärtsspiel',
    beschreibung,
    bereich: spiel.mannschaftsart,
    tags: [
      'Fußball',
      spiel.mannschaftsart,
      spiel.heimspiel ? 'Heimspiel' : 'Auswärtsspiel',
    ],
  }
}

/**
 * Findet Termine, die fussball.de nicht mehr kennt – verlegte oder abgesagte Spiele.
 *
 * Die beiden AJAX-Endpunkte liefern jeweils nur die nächsten bzw. letzten zehn
 * Spiele. "Nicht in der Antwort" heißt also nicht "existiert nicht mehr" – die
 * meisten Termine in der Datenbank liegen schlicht außerhalb dieses Fensters.
 *
 * Verlässlich ist nur der Bereich *zwischen* den beiden Rändern: der älteste Tag
 * der vergangenen und der jüngste Tag der kommenden Spiele sind durch die
 * Zehnerkappung angeschnitten (von einem Spieltag mit zehn Partien schafft es
 * womöglich nur ein Teil in die Liste). Beide Randtage bleiben deshalb außen vor,
 * und ohne beide Ränder wird gar nicht gelöscht.
 *
 * Liefert externe_ids (= fussball.de-Spiel-IDs). Muss vor dem Upsert laufen, damit
 * die >50%-Notbremse den Stand vor diesem Lauf bewertet.
 */
function findeVeralteteTermine(
  tx: Transaktion,
  kommende: FussballSpiel[],
  vergangene: FussballSpiel[],
  allSpiele: FussballSpiel[],
): { ids: string[]; uebersprungen: boolean } {
  const nichts = { ids: [], uebersprungen: false }
  if (kommende.length === 0 || vergangene.length === 0) return nichts

  const von = vergangene.reduce((min, s) => (s.datum < min ? s.datum : min), vergangene[0].datum)
  const bis = kommende.reduce((max, s) => (s.datum > max ? s.datum : max), kommende[0].datum)
  if (von >= bis) return nichts

  // datum ist ein ISO-Datum ("YYYY-MM-DD") und damit lexikografisch vergleichbar –
  // in SQLite genauso wie in JavaScript. Manuell gepflegte Termine (quelle 'manuell')
  // werden nie angefasst.
  const vorhandeneIds = tx
    .select({ externeId: termine.externeId })
    .from(termine)
    .where(and(eq(termine.quelle, QUELLE), gt(termine.datum, von), lt(termine.datum, bis)))
    .all()
    .map((t) => t.externeId)
    .filter((id): id is string => id !== null)

  const aktuelleIds = new Set(allSpiele.map((s) => s.id))
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

// ─── GET-Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Authentifizierung prüfen
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // 2. Spiele von fussball.de laden (kommende + vergangene)
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

    // 3. Abgleich in einer Transaktion: veraltete Termine ermitteln, alle Spiele
    //    upserten (quelle + externe_id eindeutig), verlegte/abgesagte löschen.
    //    better-sqlite3 arbeitet synchron – der Callback darf nicht async sein.
    const geaendertAm = new Date().toISOString()
    const veraltet = datenbank().transaction(
      (tx) => {
        const ergebnis = findeVeralteteTermine(tx, kommende, vergangene, allSpiele)

        const sparteId =
          tx.select({ id: sparten.id }).from(sparten).where(eq(sparten.slug, SPARTE_SLUG)).get()?.id ?? null

        for (const spiel of allSpiele) {
          const termin = { ...spielToTermin(spiel), sparteId, geaendertAm }
          // mannschaft_id und bild bleiben beim Update unangetastet (manuell pflegbar).
          tx.insert(termine)
            .values({ ...termin, quelle: QUELLE, externeId: spiel.id })
            .onConflictDoUpdate({ target: [termine.quelle, termine.externeId], set: termin })
            .run()
        }

        if (ergebnis.ids.length > 0) {
          tx.delete(termine)
            .where(and(eq(termine.quelle, QUELLE), inArray(termine.externeId, ergebnis.ids)))
            .run()
        }

        return ergebnis
      },
      { behavior: 'immediate' },
    )

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
