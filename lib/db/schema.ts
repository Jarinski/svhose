/**
 * lib/db/schema.ts
 *
 * Datenmodell der Vereinswebsite (SQLite über Drizzle ORM).
 * Löst seit Oktober 2026 das Sanity-CMS ab.
 *
 * Kernbeziehungen:
 *   sparten ──< mannschaften ──< trainingszeiten >── gruppen >── sparten
 *   mannschaften / gruppen ──< *_personen >── personen   (Trainerteam)
 *   sparten ──< sparte_ansprechpartner >── personen
 *   personen ──< funktionen                              (Vereinsfunktionen, Kontaktseite)
 *   news, termine, downloads ──> sparten / mannschaften / gruppen (optional)
 *
 * Bild- und Dateipfade werden relativ zum Medienordner gespeichert
 * (z. B. "personen/max-beispiel.webp") und unter /medien/<pfad> ausgeliefert.
 */

import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

// ─── Wertelisten ─────────────────────────────────────────────────────────────

export const MANNSCHAFT_BEREICHE = ['Herren', 'Damen', 'Junioren', 'Juniorinnen', 'Senioren', 'Freizeit'] as const
export const SAISONS = ['ganzjährig', 'Sommer', 'Winter'] as const
export const RHYTHMEN = ['jede Woche', 'alle 2 Wochen'] as const
export const FUNKTIONS_GRUPPEN = ['vorstand', 'abteilungsleitung', 'weitere'] as const
export const TERMIN_QUELLEN = ['manuell', 'fussball-de', 'click-tt'] as const

/** Vorschläge für Rollen im Trainerteam – bewusst kein DB-Constraint, damit neue Rollen ohne Migration gehen. */
export const TRAINER_ROLLEN = ['Trainer:in', 'Co-Trainer:in', 'Torwarttrainer:in', 'Betreuer:in', 'Übungsleiter:in'] as const

// ─── Hilfen ──────────────────────────────────────────────────────────────────

const jetzt = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

/** Erstellt/geändert-Zeitstempel als ISO-8601 (UTC). Als Funktion, damit jede Tabelle eigene Spalten-Builder bekommt. */
function zeitstempel() {
  return {
    erstelltAm: text('erstellt_am').notNull().default(jetzt),
    geaendertAm: text('geaendert_am')
      .notNull()
      .default(jetzt)
      .$onUpdate(() => new Date().toISOString()),
  }
}

function liste(werte: readonly string[]) {
  return sql.raw(werte.map(w => `'${w.replace(/'/g, "''")}'`).join(', '))
}

// ─── Personen ────────────────────────────────────────────────────────────────

/** Alle Menschen im Verein: Trainer:innen, Ansprechpartner:innen, Vereinsfunktionär:innen. */
export const personen = sqliteTable('personen', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email'),
  telefon: text('telefon'),
  /** Nur nötig, wenn WhatsApp über eine andere Nummer läuft als `telefon`. */
  whatsapp: text('whatsapp'),
  foto: text('foto'),
  /** Interne Notiz, wird nie auf der Website angezeigt. */
  notiz: text('notiz'),
  ...zeitstempel(),
})

// ─── Sparten ─────────────────────────────────────────────────────────────────

export const sparten = sqliteTable('sparten', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** Emoji für Übersichten. */
  icon: text('icon'),
  /** Akzentfarbe als Hex-Wert, z. B. "#0369a1". */
  farbe: text('farbe'),
  kurzbeschreibung: text('kurzbeschreibung'),
  beschreibung: text('beschreibung'),
  foto: text('foto'),
  sichtbar: integer('sichtbar', { mode: 'boolean' }).notNull().default(true),
  reihenfolge: integer('reihenfolge').notNull().default(0),
  ...zeitstempel(),
})

// ─── Mannschaften (Ligabetrieb, z. B. Fußball und Tischtennis) ──────────────

export const mannschaften = sqliteTable(
  'mannschaften',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sparteId: integer('sparte_id')
      .notNull()
      .references(() => sparten.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    bereich: text('bereich', { enum: MANNSCHAFT_BEREICHE }),
    /** Jahrgang oder Altersklasse, z. B. "Jg. 2013". */
    altersklasse: text('altersklasse'),
    beschreibung: text('beschreibung'),
    foto: text('foto'),
    sichtbar: integer('sichtbar', { mode: 'boolean' }).notNull().default(true),
    reihenfolge: integer('reihenfolge').notNull().default(0),
    ...zeitstempel(),
  },
  t => [
    uniqueIndex('mannschaften_sparte_name_unique').on(t.sparteId, t.name),
    check('mannschaften_bereich_check', sql`${t.bereich} IS NULL OR ${t.bereich} IN (${liste(MANNSCHAFT_BEREICHE)})`),
  ],
)

// ─── Gruppen (Trainings- und Kursgruppen ohne Ligabetrieb) ──────────────────

export const gruppen = sqliteTable(
  'gruppen',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sparteId: integer('sparte_id')
      .notNull()
      .references(() => sparten.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    /** Für wen die Gruppe gedacht ist, z. B. "5–7 Jahre" oder "Erwachsene". */
    altersklasse: text('altersklasse'),
    beschreibung: text('beschreibung'),
    foto: text('foto'),
    sichtbar: integer('sichtbar', { mode: 'boolean' }).notNull().default(true),
    reihenfolge: integer('reihenfolge').notNull().default(0),
    ...zeitstempel(),
  },
  t => [uniqueIndex('gruppen_sparte_name_unique').on(t.sparteId, t.name)],
)

// ─── Trainerteams und Ansprechpartner (n:m mit Rolle) ───────────────────────

export const mannschaftPersonen = sqliteTable(
  'mannschaft_personen',
  {
    mannschaftId: integer('mannschaft_id')
      .notNull()
      .references(() => mannschaften.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => personen.id, { onDelete: 'cascade' }),
    rolle: text('rolle').notNull().default('Trainer:in'),
    reihenfolge: integer('reihenfolge').notNull().default(0),
  },
  t => [primaryKey({ columns: [t.mannschaftId, t.personId] }), index('mannschaft_personen_person_idx').on(t.personId)],
)

export const gruppePersonen = sqliteTable(
  'gruppe_personen',
  {
    gruppeId: integer('gruppe_id')
      .notNull()
      .references(() => gruppen.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => personen.id, { onDelete: 'cascade' }),
    rolle: text('rolle').notNull().default('Trainer:in'),
    reihenfolge: integer('reihenfolge').notNull().default(0),
  },
  t => [primaryKey({ columns: [t.gruppeId, t.personId] }), index('gruppe_personen_person_idx').on(t.personId)],
)

/** Ansprechpartner:innen einer Sparte (z. B. Abteilungsleitung). */
export const sparteAnsprechpartner = sqliteTable(
  'sparte_ansprechpartner',
  {
    sparteId: integer('sparte_id')
      .notNull()
      .references(() => sparten.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => personen.id, { onDelete: 'cascade' }),
    rolle: text('rolle').notNull().default('Ansprechpartner:in'),
    reihenfolge: integer('reihenfolge').notNull().default(0),
  },
  t => [primaryKey({ columns: [t.sparteId, t.personId] }), index('sparte_ansprechpartner_person_idx').on(t.personId)],
)

// ─── Vereinsfunktionen (Kontaktseite) ───────────────────────────────────────

/**
 * Funktionen im Verein, unabhängig von Mannschaften: Vorstand, Abteilungsleitungen,
 * Mitgliederverwaltung usw. Eine Person kann mehrere Funktionen haben.
 */
export const funktionen = sqliteTable(
  'funktionen',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id')
      .notNull()
      .references(() => personen.id, { onDelete: 'cascade' }),
    /** Bezeichnung, z. B. "1. Vorsitzender" oder "Abteilungsleitung Judo". */
    bezeichnung: text('bezeichnung').notNull(),
    gruppe: text('gruppe', { enum: FUNKTIONS_GRUPPEN }).notNull().default('weitere'),
    /** Optional: Sparte, auf die sich die Funktion bezieht (z. B. bei Abteilungsleitungen). */
    sparteId: integer('sparte_id').references(() => sparten.id, { onDelete: 'set null' }),
    reihenfolge: integer('reihenfolge').notNull().default(0),
    ...zeitstempel(),
  },
  t => [
    index('funktionen_person_idx').on(t.personId),
    check('funktionen_gruppe_check', sql`${t.gruppe} IN (${liste(FUNKTIONS_GRUPPEN)})`),
  ],
)

// ─── Trainingszeiten ────────────────────────────────────────────────────────

/** Gehört immer zu einer Mannschaft und/oder einer Gruppe. */
export const trainingszeiten = sqliteTable(
  'trainingszeiten',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mannschaftId: integer('mannschaft_id').references(() => mannschaften.id, { onDelete: 'cascade' }),
    gruppeId: integer('gruppe_id').references(() => gruppen.id, { onDelete: 'cascade' }),
    /** 1 = Montag … 7 = Sonntag */
    wochentag: integer('wochentag').notNull(),
    /** Uhrzeit "HH:MM" */
    beginn: text('beginn').notNull(),
    /** Uhrzeit "HH:MM", optional */
    ende: text('ende'),
    ort: text('ort'),
    saison: text('saison', { enum: SAISONS }).notNull().default('ganzjährig'),
    rhythmus: text('rhythmus', { enum: RHYTHMEN }).notNull().default('jede Woche'),
    /** Ausnahmen und Zusätze, z. B. "ab Februar". */
    hinweis: text('hinweis'),
    reihenfolge: integer('reihenfolge').notNull().default(0),
    ...zeitstempel(),
  },
  t => [
    index('trainingszeiten_mannschaft_idx').on(t.mannschaftId),
    index('trainingszeiten_gruppe_idx').on(t.gruppeId),
    check('trainingszeiten_zuordnung_check', sql`${t.mannschaftId} IS NOT NULL OR ${t.gruppeId} IS NOT NULL`),
    check('trainingszeiten_wochentag_check', sql`${t.wochentag} BETWEEN 1 AND 7`),
    check('trainingszeiten_beginn_check', sql`${t.beginn} GLOB '[0-2][0-9]:[0-5][0-9]'`),
    check(
      'trainingszeiten_ende_check',
      sql`${t.ende} IS NULL OR (${t.ende} GLOB '[0-2][0-9]:[0-5][0-9]' AND ${t.ende} > ${t.beginn})`,
    ),
    check('trainingszeiten_saison_check', sql`${t.saison} IN (${liste(SAISONS)})`),
    check('trainingszeiten_rhythmus_check', sql`${t.rhythmus} IN (${liste(RHYTHMEN)})`),
  ],
)

// ─── News ───────────────────────────────────────────────────────────────────

/**
 * Gehört zu einer Sparte und/oder Mannschaft bzw. Gruppe – oder, wenn nichts davon
 * gesetzt ist, dem ganzen Verein.
 */
export const news = sqliteTable(
  'news',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    titel: text('titel').notNull(),
    teaser: text('teaser'),
    /** Fließtext als Markdown. */
    inhalt: text('inhalt').notNull().default(''),
    bild: text('bild'),
    bildBreite: integer('bild_breite'),
    bildHoehe: integer('bild_hoehe'),
    kategorie: text('kategorie'),
    /** Veröffentlichungsdatum "YYYY-MM-DD". */
    datum: text('datum').notNull(),
    /** Nur veröffentlichte News erscheinen auf der Website. */
    veroeffentlicht: integer('veroeffentlicht', { mode: 'boolean' }).notNull().default(false),
    sparteId: integer('sparte_id').references(() => sparten.id, { onDelete: 'set null' }),
    mannschaftId: integer('mannschaft_id').references(() => mannschaften.id, { onDelete: 'set null' }),
    gruppeId: integer('gruppe_id').references(() => gruppen.id, { onDelete: 'set null' }),
    ...zeitstempel(),
  },
  t => [
    index('news_datum_idx').on(t.veroeffentlicht, t.datum),
    index('news_sparte_idx').on(t.sparteId),
    index('news_mannschaft_idx').on(t.mannschaftId),
    index('news_gruppe_idx').on(t.gruppeId),
  ],
)

// ─── Termine ────────────────────────────────────────────────────────────────

/** Vereinstermine und automatisch synchronisierte Spiele (fussball.de, click-tt). */
export const termine = sqliteTable(
  'termine',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titel: text('titel').notNull(),
    /** "YYYY-MM-DD" */
    datum: text('datum').notNull(),
    /** Freitext, z. B. "18:30", "10:00–13:00" oder "ganztägig". */
    uhrzeit: text('uhrzeit'),
    ort: text('ort'),
    beschreibung: text('beschreibung'),
    bild: text('bild'),
    /** Anzeige- und Filterbegriff, z. B. "Herren", "A-Junioren" oder "Gesamtverein". */
    bereich: text('bereich'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    sparteId: integer('sparte_id').references(() => sparten.id, { onDelete: 'set null' }),
    mannschaftId: integer('mannschaft_id').references(() => mannschaften.id, { onDelete: 'set null' }),
    quelle: text('quelle', { enum: TERMIN_QUELLEN }).notNull().default('manuell'),
    /** Spiel-ID der Quelle; macht den nächtlichen Abgleich eindeutig. */
    externeId: text('externe_id'),
    ...zeitstempel(),
  },
  t => [
    index('termine_datum_idx').on(t.datum),
    uniqueIndex('termine_quelle_externe_id_unique').on(t.quelle, t.externeId),
    check('termine_quelle_check', sql`${t.quelle} IN (${liste(TERMIN_QUELLEN)})`),
    check('termine_externe_id_check', sql`${t.quelle} = 'manuell' OR ${t.externeId} IS NOT NULL`),
  ],
)

// ─── Downloads ──────────────────────────────────────────────────────────────

export const downloads = sqliteTable(
  'downloads',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titel: text('titel').notNull(),
    beschreibung: text('beschreibung'),
    kategorie: text('kategorie'),
    /** Pfad im Medienordner, z. B. "downloads/satzung.pdf". */
    datei: text('datei').notNull(),
    datum: text('datum'),
    /** Optional: Download gehört zu einer Sparte und erscheint auf deren Seite. */
    sparteId: integer('sparte_id').references(() => sparten.id, { onDelete: 'set null' }),
    reihenfolge: integer('reihenfolge').notNull().default(0),
    ...zeitstempel(),
  },
  t => [index('downloads_sparte_idx').on(t.sparteId)],
)

// ─── Beziehungen (für db.query … with) ──────────────────────────────────────

export const personenRelations = relations(personen, ({ many }) => ({
  mannschaften: many(mannschaftPersonen),
  gruppen: many(gruppePersonen),
  sparten: many(sparteAnsprechpartner),
  funktionen: many(funktionen),
}))

export const spartenRelations = relations(sparten, ({ many }) => ({
  mannschaften: many(mannschaften),
  gruppen: many(gruppen),
  ansprechpartner: many(sparteAnsprechpartner),
  funktionen: many(funktionen),
  news: many(news),
  termine: many(termine),
  downloads: many(downloads),
}))

export const mannschaftenRelations = relations(mannschaften, ({ one, many }) => ({
  sparte: one(sparten, { fields: [mannschaften.sparteId], references: [sparten.id] }),
  personen: many(mannschaftPersonen),
  trainingszeiten: many(trainingszeiten),
  news: many(news),
  termine: many(termine),
}))

export const gruppenRelations = relations(gruppen, ({ one, many }) => ({
  sparte: one(sparten, { fields: [gruppen.sparteId], references: [sparten.id] }),
  personen: many(gruppePersonen),
  trainingszeiten: many(trainingszeiten),
  news: many(news),
}))

export const mannschaftPersonenRelations = relations(mannschaftPersonen, ({ one }) => ({
  mannschaft: one(mannschaften, { fields: [mannschaftPersonen.mannschaftId], references: [mannschaften.id] }),
  person: one(personen, { fields: [mannschaftPersonen.personId], references: [personen.id] }),
}))

export const gruppePersonenRelations = relations(gruppePersonen, ({ one }) => ({
  gruppe: one(gruppen, { fields: [gruppePersonen.gruppeId], references: [gruppen.id] }),
  person: one(personen, { fields: [gruppePersonen.personId], references: [personen.id] }),
}))

export const sparteAnsprechpartnerRelations = relations(sparteAnsprechpartner, ({ one }) => ({
  sparte: one(sparten, { fields: [sparteAnsprechpartner.sparteId], references: [sparten.id] }),
  person: one(personen, { fields: [sparteAnsprechpartner.personId], references: [personen.id] }),
}))

export const funktionenRelations = relations(funktionen, ({ one }) => ({
  person: one(personen, { fields: [funktionen.personId], references: [personen.id] }),
  sparte: one(sparten, { fields: [funktionen.sparteId], references: [sparten.id] }),
}))

export const trainingszeitenRelations = relations(trainingszeiten, ({ one }) => ({
  mannschaft: one(mannschaften, { fields: [trainingszeiten.mannschaftId], references: [mannschaften.id] }),
  gruppe: one(gruppen, { fields: [trainingszeiten.gruppeId], references: [gruppen.id] }),
}))

export const newsRelations = relations(news, ({ one }) => ({
  sparte: one(sparten, { fields: [news.sparteId], references: [sparten.id] }),
  mannschaft: one(mannschaften, { fields: [news.mannschaftId], references: [mannschaften.id] }),
  gruppe: one(gruppen, { fields: [news.gruppeId], references: [gruppen.id] }),
}))

export const termineRelations = relations(termine, ({ one }) => ({
  sparte: one(sparten, { fields: [termine.sparteId], references: [sparten.id] }),
  mannschaft: one(mannschaften, { fields: [termine.mannschaftId], references: [mannschaften.id] }),
}))

export const downloadsRelations = relations(downloads, ({ one }) => ({
  sparte: one(sparten, { fields: [downloads.sparteId], references: [sparten.id] }),
}))
