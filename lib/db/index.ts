/**
 * lib/db/index.ts
 *
 * Verbindung zur SQLite-Datenbank. Die Datei liegt standardmäßig unter data/svhs.db
 * (anpassbar über DATENBANK_PFAD). Beim ersten Zugriff werden ausstehende Migrationen
 * aus drizzle/ automatisch eingespielt.
 */

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

/** Drizzle-Instanz; über $client ist die rohe better-sqlite3-Verbindung erreichbar. */
export type Datenbank = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

export const DATENBANK_PFAD = path.resolve(process.env.DATENBANK_PFAD ?? path.join('data', 'svhs.db'))
const MIGRATIONEN_PFAD = path.resolve('drizzle')

function verbinden(): Datenbank {
  fs.mkdirSync(path.dirname(DATENBANK_PFAD), { recursive: true })

  const sqlite = new Database(DATENBANK_PFAD)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: MIGRATIONEN_PFAD })
  return db
}

// Eine Verbindung pro Prozess – auch über Hot-Reloads im Dev-Server hinweg.
const globalFuerDb = globalThis as unknown as { __svhsDatenbank?: Datenbank }

/** Liefert die (lazy geöffnete) Datenbankverbindung. */
export function datenbank(): Datenbank {
  if (!globalFuerDb.__svhsDatenbank) globalFuerDb.__svhsDatenbank = verbinden()
  return globalFuerDb.__svhsDatenbank
}

export { schema }
