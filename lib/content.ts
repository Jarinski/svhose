/**
 * lib/content.ts
 *
 * Zentraler Datenzugriff – alle Inhalte kommen aus der SQLite-Datenbank (lib/db).
 *
 * Geliefert wird nur, was auf der Website erscheinen darf (sichtbar bzw. veröffentlicht).
 * Bild- und Dateifelder sind bereits fertige URLs unter /medien/<pfad> (siehe lib/medien.ts).
 * Die Funktionen sind async, damit Seiten sie wie bisher mit await aufrufen können –
 * die Lesezugriffe selbst laufen synchron über better-sqlite3.
 */

import { datenbank, schema } from '@/lib/db'
import { FUNKTIONS_GRUPPEN } from '@/lib/db/schema'
import { medienUrl } from '@/lib/medien'

// ─── Typen ───────────────────────────────────────────────────────────────────

export type WochentagName = 'Montag' | 'Dienstag' | 'Mittwoch' | 'Donnerstag' | 'Freitag' | 'Samstag' | 'Sonntag'

export interface Kontakt {
  id: number
  name: string
  rolle: string
  email: string | null
  telefon: string | null
  whatsapp: string | null
  foto: string | null
}

export interface Trainingseinheit {
  id: number
  tag: WochentagName
  /** "17:00 - 18:30" oder nur "17:00", wenn kein Ende eingetragen ist */
  uhrzeit: string
  /** '' wenn leer */
  ort: string
  /** Saison: ganzjährig, Sommer oder Winter */
  jahreszeit: string
  /** Rhythmus: jede Woche oder alle 2 Wochen */
  frequenz: string
  hinweis: string | null
}

export interface TeamKarte {
  id: number
  art: 'mannschaft' | 'gruppe'
  name: string
  /** Nur bei Mannschaften gesetzt, Gruppen: null */
  bereich: string | null
  altersklasse: string | null
  /** '' wenn leer */
  beschreibung: string
  foto: string | null
  /** Trainerteam in der gepflegten Reihenfolge; rolle aus mannschaft_personen bzw. gruppe_personen */
  trainer: Kontakt[]
  /** Sortiert nach Wochentag, dann Beginn */
  trainingszeiten: Trainingseinheit[]
}

export interface SparteUebersicht {
  slug: string
  name: string
  /** Emoji, '' wenn leer */
  icon: string
  /** Akzentfarbe, Fallback '#0a0a0a' */
  farbe: string
  /** Kurzbeschreibung, '' wenn leer */
  beschreibung: string
}

export interface SparteDetail extends SparteUebersicht {
  /** Ausführliche Beschreibung (sparten.beschreibung), '' wenn leer */
  langbeschreibung: string
  foto: string | null
  ansprechpartner: Kontakt[]
  /** Sortiert nach Reihenfolge, dann Name */
  mannschaften: TeamKarte[]
  /** Sortiert nach Reihenfolge, dann Name */
  gruppen: TeamKarte[]
  downloads: { titel: string; beschreibung: string; datei: string }[]
}

/** Ein Eintrag der flachen Liste für /trainingszeiten. */
export interface TrainingsEintrag {
  sparte: string
  sparteSlug: string
  farbe: string | null
  /** Mannschafts- bzw. Gruppenname inkl. " (Altersklasse)"; bei beidem "Mannschaft / Gruppe" */
  gruppe: string
  tag: WochentagName
  uhrzeit: string
  ort: string
  jahreszeit: string
  frequenz: string
  hinweis: string | null
  /** Namen des Trainerteams, ", "-getrennt ('' wenn keins) */
  trainer: string
  /** Vom ersten Teammitglied, das einen Wert hat ('' sonst) */
  email: string
  telefon: string
}

export interface AnsprechpartnerEintrag {
  id: number
  name: string
  funktion: string
  gruppe: 'Vorstand' | 'Abteilungsleiter' | 'Weitere Ansprechpartner'
  email: string | null
  telefon: string | null
  foto: string | null
}

export interface Termin {
  id: string
  titel: string
  datum: string
  uhrzeit: string
  ort: string
  /** Anzeige- und Filterlabel: Bereich, sonst Spartenname, sonst 'Allgemein' */
  sparte: string
  beschreibung: string
  bild?: string
  tags: string[]
}

export interface Download {
  id: number
  titel: string
  beschreibung: string
  datei: string
  kategorie: string
  datum: string | null
}

export interface NewsPost {
  slug: string
  title: string
  date: string
  category: string
  /** Name der Mannschaft, Gruppe oder Sparte – sonst 'Verein' */
  sparte: string
  /** width/height sind 0, wenn die Bildmaße nicht bekannt sind */
  image?: { url: string; width: number; height: number }
  excerpt: string
  /** Fließtext als Markdown */
  body: string
}

// ─── Hilfen ──────────────────────────────────────────────────────────────────

const WOCHENTAGE: readonly WochentagName[] = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
]

const FUNKTIONS_GRUPPEN_NAMEN: Record<(typeof FUNKTIONS_GRUPPEN)[number], AnsprechpartnerEintrag['gruppe']> = {
  vorstand: 'Vorstand',
  abteilungsleitung: 'Abteilungsleiter',
  weitere: 'Weitere Ansprechpartner',
}

/** Nur die Personenspalten, die öffentlich angezeigt werden – die interne Notiz bleibt in der Datenbank. */
const KONTAKT_SPALTEN = { id: true, name: true, email: true, telefon: true, whatsapp: true, foto: true } as const

/** Trainerteam und Trainingszeiten einer Mannschaft bzw. Gruppe. */
const TEAM_BEZUEGE = {
  personen: { with: { person: { columns: KONTAKT_SPALTEN } } },
  trainingszeiten: true,
} as const

/** Zuordnung für News: nur die Namen werden gebraucht. */
const NEWS_BEZUEGE = {
  sparte: { columns: { name: true } },
  mannschaft: { columns: { name: true } },
  gruppe: { columns: { name: true } },
} as const

type KontaktDaten = Pick<typeof schema.personen.$inferSelect, keyof typeof KONTAKT_SPALTEN>
type TrainingszeitDaten = typeof schema.trainingszeiten.$inferSelect
type SparteDaten = typeof schema.sparten.$inferSelect

/** Verknüpfung Person ↔ Mannschaft/Gruppe/Sparte mit Rolle. */
interface Zuordnung {
  rolle: string
  reihenfolge: number
  person: KontaktDaten
}

interface TeamDaten {
  id: number
  name: string
  bereich?: string | null
  altersklasse: string | null
  beschreibung: string | null
  foto: string | null
  personen: Zuordnung[]
  trainingszeiten: TrainingszeitDaten[]
}

/** Namen deutsch und mit Zahlen in natürlicher Reihenfolge vergleichen ("U9" vor "U10"). */
function nachName(a: string, b: string): number {
  return a.localeCompare(b, 'de', { numeric: true })
}

function nachReihenfolgeUndName(a: { reihenfolge: number; name: string }, b: { reihenfolge: number; name: string }) {
  return a.reihenfolge - b.reihenfolge || nachName(a.name, b.name)
}

/** Leere oder nur aus Leerzeichen bestehende Texte werden zu null. */
function wert(text: string | null | undefined): string | null {
  const getrimmt = text?.trim()
  return getrimmt ? getrimmt : null
}

function wochentagName(nummer: number): WochentagName {
  return WOCHENTAGE[nummer - 1] ?? 'Montag'
}

function uhrzeitText(beginn: string, ende: string | null): string {
  return ende ? `${beginn} - ${ende}` : beginn
}

function nachTrainingsbeginn(a: TrainingszeitDaten, b: TrainingszeitDaten): number {
  return a.wochentag - b.wochentag || a.beginn.localeCompare(b.beginn) || a.reihenfolge - b.reihenfolge || a.id - b.id
}

/**
 * Datei-URL für Downloads. Externe Links (http/https) bleiben unverändert,
 * alles andere ist ein Pfad im Medienordner.
 */
function dateiUrl(pfad: string): string {
  if (/^https?:\/\//i.test(pfad)) return pfad
  return medienUrl(pfad) ?? ''
}

function kontakt(person: KontaktDaten, rolle: string): Kontakt {
  return {
    id: person.id,
    name: person.name,
    rolle,
    email: wert(person.email),
    telefon: wert(person.telefon),
    whatsapp: wert(person.whatsapp),
    foto: medienUrl(person.foto),
  }
}

function sortierteZuordnungen(zuordnungen: Zuordnung[]): Zuordnung[] {
  return [...zuordnungen].sort((a, b) => a.reihenfolge - b.reihenfolge || nachName(a.person.name, b.person.name))
}

function kontakte(zuordnungen: Zuordnung[]): Kontakt[] {
  return sortierteZuordnungen(zuordnungen).map(z => kontakt(z.person, z.rolle))
}

function trainingseinheit(zeit: TrainingszeitDaten): Trainingseinheit {
  return {
    id: zeit.id,
    tag: wochentagName(zeit.wochentag),
    uhrzeit: uhrzeitText(zeit.beginn, zeit.ende),
    ort: wert(zeit.ort) ?? '',
    jahreszeit: zeit.saison,
    frequenz: zeit.rhythmus,
    hinweis: wert(zeit.hinweis),
  }
}

function teamKarte(art: TeamKarte['art'], team: TeamDaten): TeamKarte {
  return {
    id: team.id,
    art,
    name: team.name,
    bereich: art === 'mannschaft' ? (team.bereich ?? null) : null,
    altersklasse: wert(team.altersklasse),
    beschreibung: wert(team.beschreibung) ?? '',
    foto: medienUrl(team.foto),
    trainer: kontakte(team.personen),
    trainingszeiten: [...team.trainingszeiten].sort(nachTrainingsbeginn).map(trainingseinheit),
  }
}

function sparteUebersicht(sparte: SparteDaten): SparteUebersicht {
  return {
    slug: sparte.slug,
    name: sparte.name,
    icon: sparte.icon || '',
    farbe: sparte.farbe || '#0a0a0a',
    beschreibung: wert(sparte.kurzbeschreibung) ?? '',
  }
}

// ─── Sparten ────────────────────────────────────────────────────────────────

export async function getSparten(): Promise<SparteUebersicht[]> {
  const sparten = await datenbank().query.sparten.findMany({
    where: (s, { eq }) => eq(s.sichtbar, true),
  })
  return sparten.sort(nachReihenfolgeUndName).map(sparteUebersicht)
}

export async function getSpartenSlugs(): Promise<{ slug: string }[]> {
  const sparten = await datenbank().query.sparten.findMany({
    columns: { slug: true, name: true, reihenfolge: true },
    where: (s, { eq }) => eq(s.sichtbar, true),
  })
  return sparten.sort(nachReihenfolgeUndName).map(s => ({ slug: s.slug }))
}

export async function getSparteBySlug(slug: string): Promise<SparteDetail | null> {
  const sparte = await datenbank().query.sparten.findFirst({
    where: (s, { and, eq }) => and(eq(s.slug, slug), eq(s.sichtbar, true)),
    with: {
      ansprechpartner: { with: { person: { columns: KONTAKT_SPALTEN } } },
      mannschaften: { where: (m, { eq }) => eq(m.sichtbar, true), with: TEAM_BEZUEGE },
      gruppen: { where: (g, { eq }) => eq(g.sichtbar, true), with: TEAM_BEZUEGE },
      downloads: true,
    },
  })
  if (!sparte) return null

  return {
    ...sparteUebersicht(sparte),
    langbeschreibung: wert(sparte.beschreibung) ?? '',
    foto: medienUrl(sparte.foto),
    ansprechpartner: kontakte(sparte.ansprechpartner),
    mannschaften: [...sparte.mannschaften].sort(nachReihenfolgeUndName).map(m => teamKarte('mannschaft', m)),
    gruppen: [...sparte.gruppen].sort(nachReihenfolgeUndName).map(g => teamKarte('gruppe', g)),
    downloads: [...sparte.downloads]
      .sort((a, b) => a.reihenfolge - b.reihenfolge || nachName(a.titel, b.titel))
      .map(d => ({ titel: d.titel, beschreibung: wert(d.beschreibung) ?? '', datei: dateiUrl(d.datei) })),
  }
}

// ─── Trainingszeiten ────────────────────────────────────────────────────────

/** Mannschaft oder Gruppe mit Sparte und Trainerteam, wie sie an einer Trainingszeit hängt. */
interface TeamMitSparte {
  name: string
  altersklasse: string | null
  sichtbar: boolean
  reihenfolge: number
  sparte: SparteDaten
  personen: Zuordnung[]
}

/** Nur Teams, die selbst sichtbar sind und deren Sparte sichtbar ist. */
function sichtbaresTeam<T extends TeamMitSparte>(team: T | null): T | null {
  return team && team.sichtbar && team.sparte.sichtbar ? team : null
}

function teamName(team: TeamMitSparte): string {
  const altersklasse = wert(team.altersklasse)
  return altersklasse ? `${team.name} (${altersklasse})` : team.name
}

export async function getTrainingszeiten(): Promise<TrainingsEintrag[]> {
  const teamBezuege = {
    sparte: true,
    personen: { with: { person: { columns: KONTAKT_SPALTEN } } },
  } as const

  const zeiten = await datenbank().query.trainingszeiten.findMany({
    with: {
      mannschaft: { with: teamBezuege },
      gruppe: { with: teamBezuege },
    },
  })

  const eintraege: { zeit: TrainingszeitDaten; sparte: SparteDaten; art: number; team: TeamMitSparte; eintrag: TrainingsEintrag }[] = []

  for (const zeit of zeiten) {
    const mannschaft = sichtbaresTeam(zeit.mannschaft)
    const gruppe = sichtbaresTeam(zeit.gruppe)
    // Mannschaft geht vor: Sie bestimmt Sparte und Einsortierung, wenn beides gesetzt ist.
    const team = mannschaft ?? gruppe
    if (!team) continue

    const teams = [mannschaft, gruppe].filter((t): t is NonNullable<typeof t> => t !== null)

    // Trainerteam beider Teams, ohne doppelte Personen
    const gesehen = new Set<number>()
    const personen: KontaktDaten[] = []
    for (const t of teams) {
      for (const z of sortierteZuordnungen(t.personen)) {
        if (gesehen.has(z.person.id)) continue
        gesehen.add(z.person.id)
        personen.push(z.person)
      }
    }

    const einheit = trainingseinheit(zeit)
    eintraege.push({
      zeit,
      sparte: team.sparte,
      art: mannschaft ? 0 : 1,
      team,
      eintrag: {
        sparte: team.sparte.name,
        sparteSlug: team.sparte.slug,
        farbe: team.sparte.farbe || null,
        gruppe: teams.map(teamName).join(' / '),
        tag: einheit.tag,
        uhrzeit: einheit.uhrzeit,
        ort: einheit.ort,
        jahreszeit: einheit.jahreszeit,
        frequenz: einheit.frequenz,
        hinweis: einheit.hinweis,
        trainer: personen.map(p => p.name).join(', '),
        email: personen.map(p => wert(p.email)).find(Boolean) ?? '',
        telefon: personen.map(p => wert(p.telefon)).find(Boolean) ?? '',
      },
    })
  }

  return eintraege
    .sort(
      (a, b) =>
        nachReihenfolgeUndName(a.sparte, b.sparte) ||
        a.art - b.art ||
        nachReihenfolgeUndName(a.team, b.team) ||
        nachTrainingsbeginn(a.zeit, b.zeit),
    )
    .map(e => e.eintrag)
}

// ─── Ansprechpartner (Vereinsfunktionen) ────────────────────────────────────

export async function getAnsprechpartner(): Promise<AnsprechpartnerEintrag[]> {
  const funktionen = await datenbank().query.funktionen.findMany({
    with: { person: { columns: KONTAKT_SPALTEN } },
  })

  return funktionen
    .sort(
      (a, b) =>
        FUNKTIONS_GRUPPEN.indexOf(a.gruppe) - FUNKTIONS_GRUPPEN.indexOf(b.gruppe) ||
        a.reihenfolge - b.reihenfolge ||
        nachName(a.person.name, b.person.name) ||
        a.id - b.id,
    )
    .map(f => ({
      id: f.id,
      name: f.person.name,
      funktion: f.bezeichnung,
      gruppe: FUNKTIONS_GRUPPEN_NAMEN[f.gruppe] ?? 'Weitere Ansprechpartner',
      email: wert(f.person.email),
      telefon: wert(f.person.telefon),
      foto: medienUrl(f.person.foto),
    }))
}

// ─── Termine ────────────────────────────────────────────────────────────────

export async function getTermine(): Promise<Termin[]> {
  const termine = await datenbank().query.termine.findMany({
    with: {
      sparte: { columns: { name: true } },
      mannschaft: { columns: { id: true }, with: { sparte: { columns: { name: true } } } },
    },
  })

  return termine
    .sort(
      (a, b) =>
        a.datum.localeCompare(b.datum) ||
        // Uhrzeit ist Freitext ("9:00", "18:30", "ganztägig") – numerisch vergleichen, damit 9 vor 18 kommt
        (a.uhrzeit ?? '').localeCompare(b.uhrzeit ?? '', 'de', { numeric: true }) ||
        a.id - b.id,
    )
    .map(t => ({
      id: String(t.id),
      titel: t.titel,
      datum: t.datum,
      uhrzeit: wert(t.uhrzeit) ?? '',
      ort: wert(t.ort) ?? '',
      sparte: wert(t.bereich) ?? t.sparte?.name ?? t.mannschaft?.sparte.name ?? 'Allgemein',
      beschreibung: wert(t.beschreibung) ?? '',
      bild: medienUrl(t.bild) ?? undefined,
      tags: Array.isArray(t.tags) ? t.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    }))
}

// ─── Downloads ──────────────────────────────────────────────────────────────

export async function getDownloads(): Promise<Download[]> {
  const downloads = await datenbank().query.downloads.findMany()

  return downloads
    .sort((a, b) => {
      // Neueste zuerst, Downloads ohne Datum ans Ende
      if (a.datum !== b.datum) {
        if (!a.datum) return 1
        if (!b.datum) return -1
        return b.datum.localeCompare(a.datum)
      }
      return a.reihenfolge - b.reihenfolge || nachName(a.titel, b.titel)
    })
    .map(d => ({
      id: d.id,
      titel: d.titel,
      beschreibung: wert(d.beschreibung) ?? '',
      datei: dateiUrl(d.datei),
      kategorie: wert(d.kategorie) ?? '',
      datum: wert(d.datum),
    }))
}

// ─── News ───────────────────────────────────────────────────────────────────

type NewsDaten = typeof schema.news.$inferSelect & {
  sparte: { name: string } | null
  mannschaft: { name: string } | null
  gruppe: { name: string } | null
}

function newsPost(n: NewsDaten): NewsPost {
  const bild = medienUrl(n.bild)
  return {
    slug: n.slug,
    title: n.titel,
    date: n.datum,
    category: wert(n.kategorie) ?? 'News',
    sparte: n.mannschaft?.name ?? n.gruppe?.name ?? n.sparte?.name ?? 'Verein',
    image: bild ? { url: bild, width: n.bildBreite ?? 0, height: n.bildHoehe ?? 0 } : undefined,
    excerpt: wert(n.teaser) ?? '',
    body: n.inhalt,
  }
}

export async function getAllNews(): Promise<NewsPost[]> {
  const news = await datenbank().query.news.findMany({
    where: (n, { eq }) => eq(n.veroeffentlicht, true),
    with: NEWS_BEZUEGE,
    orderBy: (n, { desc }) => [desc(n.datum), desc(n.id)],
  })
  return news.map(newsPost)
}

export async function getNewsBySlug(slug: string): Promise<NewsPost | null> {
  const news = await datenbank().query.news.findFirst({
    where: (n, { and, eq }) => and(eq(n.slug, slug), eq(n.veroeffentlicht, true)),
    with: NEWS_BEZUEGE,
  })
  return news ? newsPost(news) : null
}

export async function getNewsSlugs(): Promise<{ slug: string }[]> {
  const news = await datenbank().query.news.findMany({
    columns: { slug: true },
    where: (n, { eq }) => eq(n.veroeffentlicht, true),
    orderBy: (n, { desc }) => [desc(n.datum), desc(n.id)],
  })
  return news.map(n => ({ slug: n.slug }))
}
