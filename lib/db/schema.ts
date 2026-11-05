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
 *   personen ──< foerderverein_vorstand                  (Vorstand des Fördervereins)
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
// Relativ statt "@/…": drizzle-kit liest diese Datei ohne die Pfad-Aliasse aus tsconfig.
import {
  BUCHUNG_ARTEN,
  BUCHUNG_ORTE,
  BUCHUNG_QUELLEN,
  BUCHUNG_STATUS,
  NACHRICHT_KANAELE,
  NACHRICHT_RICHTUNGEN,
  NACHRICHT_ZUORDNUNGEN,
} from '../buchungen/werte'

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

// ─── Vorstand des Fördervereins ─────────────────────────────────────────────

/**
 * Vorstand auf der Seite /foerderverein/vorstand. Eigene Tabelle statt einer weiteren Gruppe in
 * funktionen: Den Vorstand pflegen auch Zugänge mit Förderverein-Recht, die Kontaktseite des SV
 * bleibt Admin-Sache.
 */
export const foerdervereinVorstand = sqliteTable(
  'foerderverein_vorstand',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id')
      .notNull()
      .references(() => personen.id, { onDelete: 'cascade' }),
    /** Funktion, z. B. "1. Vorsitzender" oder "Kassenwartin". */
    bezeichnung: text('bezeichnung').notNull(),
    reihenfolge: integer('reihenfolge').notNull().default(0),
    /**
     * Doppelrolle im Verein und im Förderverein: Ist das gesetzt, zeigt die Vorstandsseite statt der
     * Kontaktdaten der Person die beiden Felder darunter (leer = nicht anzeigen). Sie gehören zum
     * Eintrag, nicht zur Person – deshalb darf sie auch ein Zugang mit Förderverein-Recht pflegen,
     * wenn die Person zusätzlich z. B. im Trainerteam steht.
     */
    eigeneKontaktdaten: integer('eigene_kontaktdaten', { mode: 'boolean' }).notNull().default(false),
    telefon: text('telefon'),
    email: text('email'),
    ...zeitstempel(),
  },
  t => [index('foerderverein_vorstand_person_idx').on(t.personId)],
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

// ─── Frei gestaltete Seiten ─────────────────────────────────────────────────

/**
 * Seiten, deren Inhalt und Aufbau komplett in der Verwaltung entsteht – heute die Förderverein-Seiten
 * Chronik, Aktuelles und Mitglied werden (lib/foerderverein-seiten.ts, Aufbau in lib/seiten.ts). Der Inhalt ist ein
 * JSON-Dokument aus Bausteinen; Bilder darin sind relative Pfade im Medienordner.
 * Fehlt die Zeile, zeigt die Website die Vorlage aus dem Code.
 */
export const seiten = sqliteTable('seiten', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schluessel: text('schluessel').notNull().unique(),
  inhalt: text('inhalt', { mode: 'json' }).notNull(),
  ...zeitstempel(),
})

// ─── Vereinsheim: Buchungen und Regelbelegung ───────────────────────────────

export { BUCHUNG_ARTEN, BUCHUNG_ORTE, BUCHUNG_QUELLEN, BUCHUNG_STATUS, NACHRICHT_KANAELE, NACHRICHT_RICHTUNGEN, NACHRICHT_ZUORDNUNGEN }

const ORTSZEIT_GLOB = '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]'

/**
 * Buchungen von Vereinsheim (Gemeinschaftsraum) und Gelände am Tostedter Weg: Anfragen über die
 * Website (/vereinsheim) und Sonderbelegungen, die die Verwaltung selbst einträgt.
 *
 * Zeiten sind Ortszeit (Europe/Berlin) als "YYYY-MM-DDTHH:MM" – so lassen sie sich als Text
 * vergleichen; "bis" darf auf einem späteren Tag liegen (über Mitternacht, mehrtägig).
 * Die Buchungsnummer ist zufällig; mit ihr und dem Datum ruft man auf /vereinsheim/status den
 * Stand ab. Dort stehen nie Name, E-Mail, Telefon oder Nachricht – die sieht nur die Verwaltung,
 * und sie werden ein Jahr nach der Belegung automatisch gelöscht (anonymisiertAm).
 */
export const buchungen = sqliteTable(
  'buchungen',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** z. B. "K7M2-Q9XD" (Großbuchstaben und Ziffern ohne Verwechsler) */
    nummer: text('nummer').notNull().unique(),
    quelle: text('quelle', { enum: BUCHUNG_QUELLEN }).notNull(),
    art: text('art', { enum: BUCHUNG_ARTEN }).notNull(),
    ort: text('ort', { enum: BUCHUNG_ORTE }).notNull(),
    /** Anlass, z. B. "Elternabend U11" oder "Geburtstagsfeier" */
    titel: text('titel').notNull(),
    von: text('von').notNull(),
    bis: text('bis').notNull(),
    personenzahl: integer('personenzahl'),
    status: text('status', { enum: BUCHUNG_STATUS }).notNull().default('angefragt'),
    /** Sparte oder Mannschaft (Mitglieder), Verein oder Firma (Externe) */
    bereich: text('bereich'),
    name: text('name'),
    email: text('email'),
    telefon: text('telefon'),
    /** Nachricht der buchenden Person – nur in der Verwaltung sichtbar */
    nachricht: text('nachricht'),
    /** Rückmeldung des Vereins – steht öffentlich auf der Statusseite, daher ohne personenbezogene Daten */
    rueckmeldung: text('rueckmeldung'),
    /** Interne Notiz, nur in der Verwaltung */
    notiz: text('notiz'),
    /** Wann Name, E-Mail, Telefon und Nachricht gelöscht wurden */
    anonymisiertAm: text('anonymisiert_am'),
    ...zeitstempel(),
  },
  t => [
    index('buchungen_von_idx').on(t.von),
    index('buchungen_status_idx').on(t.status),
    check('buchungen_quelle_check', sql`${t.quelle} IN (${liste(BUCHUNG_QUELLEN)})`),
    check('buchungen_art_check', sql`${t.art} IN (${liste(BUCHUNG_ARTEN)})`),
    check('buchungen_ort_check', sql`${t.ort} IN (${liste(BUCHUNG_ORTE)})`),
    check('buchungen_status_check', sql`${t.status} IN (${liste(BUCHUNG_STATUS)})`),
    check(
      'buchungen_zeit_check',
      sql`${t.von} GLOB '${sql.raw(ORTSZEIT_GLOB)}' AND ${t.bis} GLOB '${sql.raw(ORTSZEIT_GLOB)}' AND ${t.bis} > ${t.von}`,
    ),
    check('buchungen_personenzahl_check', sql`${t.personenzahl} IS NULL OR ${t.personenzahl} > 0`),
  ],
)

/**
 * Regelbelegung: was jede Woche zur selben Zeit stattfindet (Dart, Yoga, Training …). Ist "ende"
 * nicht später als "beginn", reicht die Belegung bis in den Folgetag (20:00–00:00 = bis Mitternacht).
 */
export const belegungRegeln = sqliteTable(
  'belegung_regeln',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titel: text('titel').notNull(),
    ort: text('ort', { enum: BUCHUNG_ORTE }).notNull(),
    /** 1 = Montag … 7 = Sonntag */
    wochentag: integer('wochentag').notNull(),
    /** "HH:MM" */
    beginn: text('beginn').notNull(),
    /** "HH:MM" */
    ende: text('ende').notNull(),
    /** "YYYY-MM-DD", optional */
    gueltigAb: text('gueltig_ab'),
    /** "YYYY-MM-DD", optional */
    gueltigBis: text('gueltig_bis'),
    hinweis: text('hinweis'),
    ...zeitstempel(),
  },
  t => [
    check('belegung_regeln_ort_check', sql`${t.ort} IN (${liste(BUCHUNG_ORTE)})`),
    check('belegung_regeln_wochentag_check', sql`${t.wochentag} BETWEEN 1 AND 7`),
    check('belegung_regeln_beginn_check', sql`${t.beginn} GLOB '[0-2][0-9]:[0-5][0-9]'`),
    check('belegung_regeln_ende_check', sql`${t.ende} GLOB '[0-2][0-9]:[0-5][0-9]'`),
    check('belegung_regeln_gueltig_check', sql`${t.gueltigAb} IS NULL OR ${t.gueltigBis} IS NULL OR ${t.gueltigBis} >= ${t.gueltigAb}`),
  ],
)

/**
 * Kontaktverlauf einer Buchung: E-Mails (ein- und ausgehend), Telefonate, Gespräche und Notizen.
 * Eingehende Mails holt lib/buchungen/postfach.ts per IMAP aus dem Buchungs-Postfach und ordnet sie
 * zu; ohne Treffer bleibt buchungId leer (Eingang „nicht zugeordnet“). Inhalte sind personenbezogen:
 * Sie werden mit den Kontaktdaten der Buchung gelöscht, nicht zugeordnete Mails nach 90 Tagen.
 */
export const buchungNachrichten = sqliteTable(
  'buchung_nachrichten',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** null = eingegangen, aber noch keiner Buchung zugeordnet */
    buchungId: integer('buchung_id').references(() => buchungen.id, { onDelete: 'cascade' }),
    kanal: text('kanal', { enum: NACHRICHT_KANAELE }).notNull(),
    richtung: text('richtung', { enum: NACHRICHT_RICHTUNGEN }).notNull(),
    /** ISO-Zeitstempel (UTC) – bei Mails das Datum der Mail */
    zeitpunkt: text('zeitpunkt').notNull(),
    von: text('von'),
    an: text('an'),
    betreff: text('betreff'),
    text: text('text').notNull().default(''),
    /** Anzahl der Anhänge – die Anhänge selbst bleiben im Postfach */
    anhaenge: integer('anhaenge').notNull().default(0),
    /** Message-ID der Mail (ein- und ausgehend) – für Antworten und gegen doppelten Abruf */
    messageId: text('message_id').unique(),
    /** In-Reply-To und References der Mail, Leerzeichen-getrennt */
    verweise: text('verweise'),
    /** UID im IMAP-Postfach (nur eingehend) */
    imapUid: integer('imap_uid'),
    zuordnung: text('zuordnung', { enum: NACHRICHT_ZUORDNUNGEN }),
    /** Wann jemand die eingegangene Mail in der Verwaltung gesehen hat */
    gelesenAm: text('gelesen_am'),
    /** Wer geschrieben oder eingetragen hat (ohne Fremdschlüssel, damit Löschen nie blockiert) */
    zugangId: integer('zugang_id'),
    zugangName: text('zugang_name'),
    erstelltAm: text('erstellt_am').notNull().default(jetzt),
  },
  t => [
    index('buchung_nachrichten_buchung_idx').on(t.buchungId, t.zeitpunkt),
    check('buchung_nachrichten_kanal_check', sql`${t.kanal} IN (${liste(NACHRICHT_KANAELE)})`),
    check('buchung_nachrichten_richtung_check', sql`${t.richtung} IN (${liste(NACHRICHT_RICHTUNGEN)})`),
    check('buchung_nachrichten_zuordnung_check', sql`${t.zuordnung} IS NULL OR ${t.zuordnung} IN (${liste(NACHRICHT_ZUORDNUNGEN)})`),
  ],
)

/** Tage, an denen eine Regelbelegung ausfällt (Ferien, Feiertag, Sonderbelegung statt Training). */
export const belegungAusfaelle = sqliteTable(
  'belegung_ausfaelle',
  {
    regelId: integer('regel_id')
      .notNull()
      .references(() => belegungRegeln.id, { onDelete: 'cascade' }),
    /** "YYYY-MM-DD" */
    datum: text('datum').notNull(),
    erstelltAm: text('erstellt_am').notNull().default(jetzt),
  },
  t => [primaryKey({ columns: [t.regelId, t.datum] })],
)

// ─── Einstellungen ───────────────────────────────────────────────────────────

/**
 * Einstellungen, die Admins in der Verwaltung pflegen – ein JSON-Dokument je Schlüssel, z. B. "mail"
 * für den SMTP-Zugang (lib/mail.ts). Passwörter stehen darin nur verschlüsselt (lib/verwaltung/geheimnis.ts).
 */
export const einstellungen = sqliteTable('einstellungen', {
  schluessel: text('schluessel').primaryKey(),
  wert: text('wert', { mode: 'json' }).notNull(),
  ...zeitstempel(),
})

// ─── Verwaltung: Zugänge, Anmeldung, Verlauf ────────────────────────────────

export const CODE_ZWECKE = ['einladung'] as const
export const VERLAUF_QUELLEN = ['verwaltung', 'api', 'telegram', 'system'] as const
export const VERLAUF_AKTIONEN = ['angelegt', 'geaendert', 'geloescht', 'anmeldung', 'abmeldung'] as const

/**
 * Wer die Verwaltung unter /verwaltung benutzen darf. Angemeldet wird mit Zwei-Faktor:
 * Benutzername + Passwort + 6-stelliger Code aus einer Authenticator-App (TOTP).
 * Eingerichtet wird beides einmalig über einen Einladungs-Code (siehe anmelde_codes).
 */
export const zugaenge = sqliteTable('zugaenge', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  /** Anmeldename, klein geschrieben (a–z, 0–9, . - _). In der Datenbank nullable, in der App Pflicht. */
  benutzername: text('benutzername').unique(),
  /** scrypt-Hash des Passworts ("scrypt$N$r$p$salt$hash"); null = noch nicht eingerichtet oder zurückgesetzt. */
  passwortHash: text('passwort_hash'),
  /** Base32-Geheimnis der Authenticator-App; null = noch nicht gekoppelt. */
  totpGeheimnis: text('totp_geheimnis'),
  /** Zuletzt akzeptierter 30-Sekunden-Schritt – derselbe Code gilt nur einmal. */
  totpLetzterSchritt: integer('totp_letzter_schritt'),
  /** Wann Passwort und App zuletzt eingerichtet wurden; null = Einrichtung ausstehend. */
  eingerichtetAm: text('eingerichtet_am'),
  /** Admins dürfen alles, alle anderen nur ihre Bereiche (zugang_bereiche). */
  istAdmin: integer('ist_admin', { mode: 'boolean' }).notNull().default(false),
  /** Darf News und Downloads des Fördervereins pflegen (Kategorie "Förderverein"), unabhängig von den Bereichen. */
  foerderverein: integer('foerderverein', { mode: 'boolean' }).notNull().default(false),
  /** Darf die Buchungen von Vereinsheim und Gelände bearbeiten (Anfragen, Kalender, Regelbelegung), unabhängig von den Bereichen. */
  buchungen: integer('buchungen', { mode: 'boolean' }).notNull().default(false),
  /** Deaktivierte Zugänge sind sofort auf allen Geräten abgemeldet. */
  aktiv: integer('aktiv', { mode: 'boolean' }).notNull().default(true),
  /** Optional: die eigene Person ("das bin ich"). */
  personId: integer('person_id').references(() => personen.id, { onDelete: 'set null' }),
  /** Zugang, der diesen angelegt hat (ohne Fremdschlüssel, damit Löschen nie blockiert). */
  erstelltVon: integer('erstellt_von'),
  letzteAnmeldung: text('letzte_anmeldung'),
  ...zeitstempel(),
})

/** Was ein Zugang ohne Adminrechte bearbeiten darf: je Zeile genau eine Sparte, Mannschaft oder Gruppe. */
export const zugangBereiche = sqliteTable(
  'zugang_bereiche',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    zugangId: integer('zugang_id')
      .notNull()
      .references(() => zugaenge.id, { onDelete: 'cascade' }),
    sparteId: integer('sparte_id').references(() => sparten.id, { onDelete: 'cascade' }),
    mannschaftId: integer('mannschaft_id').references(() => mannschaften.id, { onDelete: 'cascade' }),
    gruppeId: integer('gruppe_id').references(() => gruppen.id, { onDelete: 'cascade' }),
  },
  t => [
    index('zugang_bereiche_zugang_idx').on(t.zugangId),
    check(
      'zugang_bereiche_genau_einer_check',
      sql`(${t.sparteId} IS NOT NULL) + (${t.mannschaftId} IS NOT NULL) + (${t.gruppeId} IS NOT NULL) = 1`,
    ),
  ],
)

/**
 * Einladungs-Codes (neuer Zugang oder Zurücksetzen): einmal verwendbar, damit werden Passwort und
 * Authenticator-App eingerichtet. Gespeichert wird nur der SHA-256-Hash, nie der Code selbst.
 */
export const anmeldeCodes = sqliteTable(
  'anmelde_codes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    zugangId: integer('zugang_id')
      .notNull()
      .references(() => zugaenge.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull().unique(),
    zweck: text('zweck', { enum: CODE_ZWECKE }).notNull(),
    laeuftAb: text('laeuft_ab').notNull(),
    verwendetAm: text('verwendet_am'),
    /** Beim Öffnen der Einladung erzeugtes App-Geheimnis – wird erst mit Abschluss der Einrichtung übernommen. */
    totpGeheimnis: text('totp_geheimnis'),
    erstelltVon: integer('erstellt_von'),
    erstelltAm: text('erstellt_am').notNull().default(jetzt),
  },
  t => [
    index('anmelde_codes_zugang_idx').on(t.zugangId),
    check('anmelde_codes_zweck_check', sql`${t.zweck} IN (${liste(CODE_ZWECKE)})`),
  ],
)

/** Angemeldete Geräte (Sitzungen). Das Cookie enthält ein Zufallstoken, hier liegt nur dessen Hash. */
export const geraete = sqliteTable(
  'geraete',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    zugangId: integer('zugang_id')
      .notNull()
      .references(() => zugaenge.id, { onDelete: 'cascade' }),
    sitzungHash: text('sitzung_hash').notNull().unique(),
    /** Lesbarer Gerätename, z. B. "iPhone · Safari". */
    name: text('name').notNull(),
    angemeldetAm: text('angemeldet_am').notNull().default(jetzt),
    zuletztAktiv: text('zuletzt_aktiv').notNull().default(jetzt),
    laeuftAb: text('laeuft_ab').notNull(),
  },
  t => [index('geraete_zugang_idx').on(t.zugangId)],
)

/** Fehlversuche (Anmeldung, Einladung, Passwort ändern) – Grundlage für die Sperre pro IP bzw. pro Benutzername+IP (nur gehasht gespeichert). */
export const fehlversuche = sqliteTable(
  'fehlversuche',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schluessel: text('schluessel').notNull(),
    zeitpunkt: text('zeitpunkt').notNull().default(jetzt),
  },
  t => [index('fehlversuche_schluessel_idx').on(t.schluessel, t.zeitpunkt)],
)

/** Änderungsprotokoll: wer hat wann was geändert, mit Stand vorher und nachher. */
export const verlauf = sqliteTable(
  'verlauf',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    zeitpunkt: text('zeitpunkt').notNull().default(jetzt),
    zugangId: integer('zugang_id').references(() => zugaenge.id, { onDelete: 'set null' }),
    /** Name zum Zeitpunkt der Änderung – bleibt lesbar, auch wenn der Zugang später gelöscht wird. */
    zugangName: text('zugang_name'),
    quelle: text('quelle', { enum: VERLAUF_QUELLEN }).notNull().default('verwaltung'),
    aktion: text('aktion', { enum: VERLAUF_AKTIONEN }).notNull(),
    /** Tabellenname, z. B. "mannschaften". */
    objektTyp: text('objekt_typ').notNull(),
    objektId: integer('objekt_id'),
    /** Lesbare Bezeichnung, z. B. "Fußball · U13". */
    bezeichnung: text('bezeichnung').notNull(),
    vorher: text('vorher', { mode: 'json' }),
    nachher: text('nachher', { mode: 'json' }),
  },
  t => [
    index('verlauf_zeitpunkt_idx').on(t.zeitpunkt),
    index('verlauf_objekt_idx').on(t.objektTyp, t.objektId),
    check('verlauf_quelle_check', sql`${t.quelle} IN (${liste(VERLAUF_QUELLEN)})`),
    check('verlauf_aktion_check', sql`${t.aktion} IN (${liste(VERLAUF_AKTIONEN)})`),
  ],
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

export const foerdervereinVorstandRelations = relations(foerdervereinVorstand, ({ one }) => ({
  person: one(personen, { fields: [foerdervereinVorstand.personId], references: [personen.id] }),
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

export const zugaengeRelations = relations(zugaenge, ({ one, many }) => ({
  person: one(personen, { fields: [zugaenge.personId], references: [personen.id] }),
  bereiche: many(zugangBereiche),
  geraete: many(geraete),
  codes: many(anmeldeCodes),
}))

export const zugangBereicheRelations = relations(zugangBereiche, ({ one }) => ({
  zugang: one(zugaenge, { fields: [zugangBereiche.zugangId], references: [zugaenge.id] }),
  sparte: one(sparten, { fields: [zugangBereiche.sparteId], references: [sparten.id] }),
  mannschaft: one(mannschaften, { fields: [zugangBereiche.mannschaftId], references: [mannschaften.id] }),
  gruppe: one(gruppen, { fields: [zugangBereiche.gruppeId], references: [gruppen.id] }),
}))

export const anmeldeCodesRelations = relations(anmeldeCodes, ({ one }) => ({
  zugang: one(zugaenge, { fields: [anmeldeCodes.zugangId], references: [zugaenge.id] }),
}))

export const geraeteRelations = relations(geraete, ({ one }) => ({
  zugang: one(zugaenge, { fields: [geraete.zugangId], references: [zugaenge.id] }),
}))
