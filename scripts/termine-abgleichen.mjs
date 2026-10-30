/**
 * scripts/termine-abgleichen.mjs
 *
 * Stößt den Abgleich der Spieltermine mit fussball.de und click-tt an – dieselben Endpunkte,
 * die auf dem Server nachts per crontab laufen. Gedacht für den Betrieb auf dem eigenen Rechner,
 * solange es noch keinen Server gibt. Die Website muss dafür laufen (npm run lokal oder npm run dev).
 *
 * Aufruf: npm run termine:abgleichen
 * Liest CRON_SECRET aus .env.local; Adresse aus SEITEN_URL, sonst http://localhost:3000.
 */

import fs from 'node:fs'

function leseEnv() {
  const env = { ...process.env }
  if (fs.existsSync('.env.local')) {
    for (const zeile of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim()
    }
  }
  return env
}

const env = leseEnv()
const basis = (env.SEITEN_URL || 'http://localhost:3000').replace(/\/+$/, '')
const kopf = env.CRON_SECRET ? { Authorization: `Bearer ${env.CRON_SECRET}` } : {}

let fehler = false
for (const [name, pfad] of [
  ['Fußball (fussball.de)', '/api/cron/sync-fussball'],
  ['Tischtennis (click-tt)', '/api/cron/sync-tischtennis'],
]) {
  try {
    const res = await fetch(basis + pfad, { headers: kopf })
    const daten = await res.json().catch(() => ({}))
    if (!res.ok) {
      fehler = true
      console.error(`✗ ${name}: HTTP ${res.status} ${daten.error ?? ''}`)
      continue
    }
    const geloescht = daten.loeschenUebersprungen ? 'Löschen übersprungen (Sicherheitsgrenze)' : `${daten.geloescht ?? 0} gelöscht`
    console.log(`✓ ${name}: ${daten.synced ?? 0} Spiele abgeglichen, ${geloescht}`)
  } catch (e) {
    fehler = true
    console.error(`✗ ${name}: ${basis} nicht erreichbar – läuft die Website? (${e.cause?.code ?? e.message})`)
  }
}
// exitCode statt process.exit(): Unter Windows stürzt Node sonst beim Beenden offener fetch-Verbindungen ab.
process.exitCode = fehler ? 1 : 0
