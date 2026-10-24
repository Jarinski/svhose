/**
 * app/api/cron/sync-tischtennis/route.ts
 *
 * Cron-Endpunkt: Synchronisiert Tischtennis-Spiele von click-tt als Termine in die
 * SQLite-Datenbank (Tabelle termine, quelle = 'click-tt').
 *
 * Wird täglich auf dem eigenen Server per crontab aufgerufen, z. B.:
 *   0 5 * * *  curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/sync-tischtennis
 * Manueller Aufruf: GET /api/cron/sync-tischtennis
 *   → Header: Authorization: Bearer <CRON_SECRET>
 *
 * Umgebungsvariablen:
 *   CRON_SECRET – schützt den Endpunkt vor unautorisierten Aufrufen
 */

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { datenbank, type Datenbank } from '@/lib/db'
import { sparten, termine } from '@/lib/db/schema'
import {
  getTischtennisAlleSaison,
  type TischtennisSpiel,
} from '@/lib/click-tt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Konstanten ──────────────────────────────────────────────────────────────

const QUELLE      = 'click-tt' as const
const SPARTE_SLUG = 'tischtennis'

/** Transaktions-Handle von Drizzle (better-sqlite3, synchron). */
type Transaktion = Parameters<Parameters<Datenbank['transaction']>[0]>[0]

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Konvertiert ein TischtennisSpiel in die Felder eines Termins (ohne quelle/externe_id). */
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
    titel,
    datum:        spiel.datum,    // ISO-8601 "YYYY-MM-DD"
    uhrzeit:      spiel.uhrzeit,
    ort:          spiel.heimspiel ? 'Sporthalle Holm-Seppensen' : 'Auswärtsspiel',
    beschreibung: beschreibungsZeilen.join('\n'),
    bereich:      spiel.mannschaft,
    tags: [
      'Tischtennis',
      spiel.mannschaft,
      spiel.heimspiel ? 'Heimspiel' : 'Auswärtsspiel',
    ],
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
 *
 * Liefert externe_ids (= click-tt-Spiel-IDs). Muss vor dem Upsert laufen, damit
 * die >50%-Notbremse den Stand vor diesem Lauf bewertet.
 */
function findeVeralteteTermine(
  tx: Transaktion,
  allSpiele: TischtennisSpiel[],
): { ids: string[]; uebersprungen: boolean } {
  const daten = allSpiele.map(s => s.datum).sort()
  const von   = daten[0]
  const bis   = daten[daten.length - 1]

  // datum ist ein ISO-Datum ("YYYY-MM-DD") und damit lexikografisch vergleichbar –
  // in SQLite genauso wie in JavaScript. Manuell gepflegte Termine (quelle 'manuell')
  // werden nie angefasst.
  const vorhandeneIds = tx
    .select({ externeId: termine.externeId })
    .from(termine)
    .where(and(eq(termine.quelle, QUELLE), gte(termine.datum, von), lte(termine.datum, bis)))
    .all()
    .map(t => t.externeId)
    .filter((id): id is string => id !== null)

  const aktuelleIds = new Set(allSpiele.map(s => s.id))
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

// ─── GET-Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Authentifizierung
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // 2. Spiele von click-tt laden
    const allSpiele = await getTischtennisAlleSaison()

    if (allSpiele.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Keine Spiele gefunden.',
        synced: 0,
      })
    }

    // 3. Abgleich in einer Transaktion: veraltete Termine ermitteln, alle Spiele
    //    upserten (quelle + externe_id eindeutig), verlegte/abgesagte löschen.
    //    better-sqlite3 arbeitet synchron – der Callback darf nicht async sein.
    const geaendertAm = new Date().toISOString()
    const veraltet = datenbank().transaction(
      tx => {
        const ergebnis = findeVeralteteTermine(tx, allSpiele)

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
