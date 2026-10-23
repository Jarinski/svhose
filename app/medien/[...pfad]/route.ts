/**
 * app/medien/[...pfad]/route.ts
 *
 * Liefert Bilder und Dateien aus dem Medienordner (siehe lib/medien.ts) unter /medien/<pfad> aus.
 *
 * Caching: Nur Dateinamen mit Inhalts-Hash ("<name>-<hash8>.<ext>", so legt der Import Bilder ab)
 * ändern unter derselben URL nie ihren Inhalt und dürfen dauerhaft gecacht werden. Alle anderen
 * Dateien (z. B. Downloads wie downloads/satzung.pdf oder von Hand kopierte Bilder) können unter
 * gleichem Namen ersetzt werden – sie werden bei jedem Abruf nachgeprüft (ETag/Last-Modified, 304).
 * Der Bildoptimierer von next/image übernimmt diese Cache-Dauer für seinen Server-Cache.
 */

import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { medienDatei } from '@/lib/medien'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Dateitypen ─────────────────────────────────────────────────────────────

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
}

// ─── Hilfen ──────────────────────────────────────────────────────────────────

/**
 * Erkennt Dateinamen mit 8-stelligem Hash-Suffix ("max-beispiel-1a2b3c4d.webp").
 * Das Suffix muss mindestens einen Buchstaben a–f enthalten – so zählen Datumsangaben wie
 * "beitragstabelle-20250312.pdf" nicht als Hash. Ein Hash nur aus Ziffern bekommt dann
 * lediglich den kurzen Cache, das ist unschädlich.
 */
function hatHashImNamen(datei: string): boolean {
  const treffer = /-([0-9a-f]{8})\.[a-z0-9]+$/.exec(path.basename(datei))
  return !!treffer && /[a-f]/.test(treffer[1])
}

/** Prüft If-None-Match bzw. (ohne If-None-Match) If-Modified-Since auf exakte Übereinstimmung. */
function unveraendert(anfrage: Request, etag: string, zuletztGeaendert: string): boolean {
  const ifNoneMatch = anfrage.headers.get('if-none-match')
  if (ifNoneMatch) {
    return ifNoneMatch.split(',').some(teil => {
      const wert = teil.trim()
      return wert === '*' || wert === etag || `W/${wert}` === etag
    })
  }
  // Nur Gleichheit, nicht „älter als“: rsync -a übernimmt das Änderungsdatum der Quelle,
  // eine ersetzte Datei kann also älter datiert sein als die zwischengespeicherte Fassung.
  return anfrage.headers.get('if-modified-since') === zuletztGeaendert
}

function nichtGefunden(): Response {
  return new Response('Nicht gefunden', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/**
 * Ermittelt den relativen Medienpfad aus der Anfrage. Die Segmente werden aus der
 * (noch kodierten) URL gelesen und genau einmal dekodiert – so ist eindeutig, was
 * im Dateisystem gesucht wird. Leere Segmente, versteckte Dateien (".", "..", ".env")
 * sowie Segmente mit Pfadtrennern oder Nullbytes werden abgelehnt.
 */
function relativerPfad(anfrage: Request, anzahlSegmente: number): string | null {
  if (anzahlSegmente < 1) return null
  const roh = new URL(anfrage.url).pathname.split('/').slice(-anzahlSegmente)

  const segmente: string[] = []
  for (const segment of roh) {
    let dekodiert: string
    try {
      dekodiert = decodeURIComponent(segment)
    } catch {
      return null
    }
    if (!dekodiert || dekodiert.startsWith('.') || /[\\/\0]/.test(dekodiert)) return null
    segmente.push(dekodiert)
  }
  return segmente.join('/')
}

async function antwort(anfrage: Request, pfad: string[] | undefined, mitInhalt: boolean): Promise<Response> {
  const relativ = relativerPfad(anfrage, pfad?.length ?? 0)
  // medienDatei() verhindert zusätzlich, dass ein Pfad aus dem Medienordner herausführt.
  const datei = relativ ? medienDatei(relativ) : null
  if (!datei) return nichtGefunden()

  const info = await fs.promises.stat(datei).catch(() => null)
  if (!info?.isFile()) return nichtGefunden()

  const endung = path.extname(datei).toLowerCase()
  const zuletztGeaendert = info.mtime.toUTCString()
  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`
  const headers = new Headers({
    'Cache-Control': hatHashImNamen(datei) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
    ETag: etag,
    'Last-Modified': zuletztGeaendert,
    'X-Content-Type-Options': 'nosniff',
  })

  if (unveraendert(anfrage, etag, zuletztGeaendert)) return new Response(null, { status: 304, headers })

  headers.set('Content-Type', CONTENT_TYPES[endung] ?? 'application/octet-stream')
  headers.set('Content-Length', String(info.size))
  // SVGs können Skripte enthalten – direkt aufgerufen dürfen sie nichts ausführen.
  if (endung === '.svg') {
    headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
  }

  if (!mitInhalt) return new Response(null, { status: 200, headers })

  const strom = Readable.toWeb(fs.createReadStream(datei)) as unknown as ReadableStream<Uint8Array>
  return new Response(strom, { status: 200, headers })
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(anfrage: Request, { params }: { params: Promise<{ pfad?: string[] }> }) {
  return antwort(anfrage, (await params).pfad, true)
}

export async function HEAD(anfrage: Request, { params }: { params: Promise<{ pfad?: string[] }> }) {
  return antwort(anfrage, (await params).pfad, false)
}
