/**
 * lib/suche/quellen.ts
 *
 * Alles, was in der Datenbank steht und auf der Website erscheint, als Dokumente für die Suche:
 * News, Sparten, Mannschaften und Gruppen (mit Trainerteam und Trainingszeiten), Termine,
 * Ansprechpartner:innen, der Vorstand des Fördervereins, Downloads und die Förderverein-Seiten.
 * Es gelten dieselben Regeln wie auf der Website (lib/content.ts): nur Sichtbares und Veröffentlichtes.
 *
 * Die festen Seiten (Kinderschutz, Impressum …) liest lib/suche/seiten.ts.
 */

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  getAllNews,
  getAnsprechpartner,
  getDownloads,
  getFoerdervereinVorstand,
  getSparteBySlug,
  getSparten,
  getTermine,
  type TeamKarte,
} from '@/lib/content'
import { datenbank } from '@/lib/db'
import { FOERDERVEREIN_MENUE, istFoerderverein } from '@/lib/foerderverein'
import { FOERDERVEREIN_SEITEN } from '@/lib/foerderverein-seiten'
import { seiteLesen, type Baustein } from '@/lib/seiten'
import { markdownAbsaetze, zeilen } from './text'
import type { SuchArt } from './typen'

/** Ein Absatz Text; `ueberschrift` ist der Abschnitt, in dem er steht (für die Zeile über dem Treffer). */
export interface Absatz {
  text: string
  ueberschrift?: string
}

export interface SuchDokument {
  id: string
  art: SuchArt
  /** Nur wenn abweichend vom Namen der Art, z. B. "Gruppe" */
  artName?: string
  titel: string
  url: string
  extern?: boolean
  /** Zeile über dem Titel */
  zusatz?: string
  /** Wörter mit mehr Gewicht als der Fließtext, die nicht angezeigt werden (Kategorie, Sparte …) */
  stichworte?: string
  absaetze: Absatz[]
  /** ISO-Datum – neuere News und kommende Termine stehen weiter oben */
  datum?: string
  /** Seite, auf der dieser Treffer steht: ein Seitentreffer dafür ist dann überflüssig (siehe suchen.ts) */
  gehoertZu?: string
  /** Auch ein Treffer nur im Titel bekommt einen Sprung dorthin (Titel steht in einer Liste, nicht oben) */
  titelSprung?: boolean
}

function datumText(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : format(d, 'd. MMMM yyyy', { locale: de })
}

function absaetze(texte: (string | null | undefined)[], ueberschrift?: string): Absatz[] {
  return texte.filter((t): t is string => !!t && !!t.trim()).map(text => ({ text: text.trim(), ueberschrift }))
}

const verbinden = (...teile: (string | null | undefined)[]) => teile.filter(Boolean).join(' · ')

// ─── News ───────────────────────────────────────────────────────────────────

async function news(): Promise<SuchDokument[]> {
  return (await getAllNews()).map(n => ({
    id: `news:${n.slug}`,
    art: 'news',
    titel: n.title,
    url: `/news/${n.slug}`,
    zusatz: verbinden(n.sparte, datumText(n.date)),
    stichworte: verbinden(n.category, n.sparte),
    absaetze: absaetze([n.excerpt, ...markdownAbsaetze(n.body)]),
    datum: n.date,
  }))
}

// ─── Sparten, Mannschaften und Gruppen ──────────────────────────────────────

function teamDokument(team: TeamKarte, sparte: { slug: string; name: string }): SuchDokument {
  const art = team.art === 'mannschaft' ? 'mannschaft' : 'gruppe'
  const zeiten = team.trainingszeiten.map(z => verbinden(`${z.tag} ${z.uhrzeit}`, z.ort, z.hinweis))
  return {
    id: `${art}:${team.id}`,
    art: 'team',
    artName: team.art === 'mannschaft' ? 'Mannschaft' : 'Gruppe',
    titel: team.name,
    // Die Karte hat eine eigene Adresse; bei vielen Mannschaften wählt ?mannschaft= sie gleich aus
    url: `/sparten/${sparte.slug}${team.art === 'mannschaft' ? `?mannschaft=${team.id}` : ''}#${art}-${team.id}`,
    zusatz: verbinden(sparte.name, team.altersklasse),
    stichworte: verbinden(sparte.name, team.bereich, team.altersklasse),
    absaetze: [
      ...absaetze(zeilen(team.beschreibung)),
      ...absaetze([team.trainer.length > 0 ? `Trainerteam: ${team.trainer.map(t => t.name).join(', ')}` : null]),
      ...absaetze(zeiten, 'Trainingszeiten'),
    ],
    titelSprung: true,
  }
}

async function sparten(): Promise<SuchDokument[]> {
  const uebersicht = await getSparten()
  const details = await Promise.all(uebersicht.map(s => getSparteBySlug(s.slug)))
  return details.flatMap(sparte => {
    if (!sparte) return []
    const ansprechpartner = sparte.ansprechpartner.map(a => verbinden(a.name, a.rolle))
    return [
      {
        id: `sparte:${sparte.slug}`,
        art: 'sparte' as const,
        titel: sparte.name,
        url: `/sparten/${sparte.slug}`,
        absaetze: [
          ...absaetze([sparte.beschreibung, ...zeilen(sparte.langbeschreibung)]),
          ...absaetze(ansprechpartner, 'Ansprechpartner:innen'),
          // Die Mannschaften sind eigene Treffer – hier nur als Text, damit "Herren" zuerst die Mannschaft findet
          ...absaetze([[...sparte.mannschaften, ...sparte.gruppen].map(t => t.name).join(', ')]),
        ],
      },
      ...sparte.mannschaften.map(m => teamDokument(m, sparte)),
      ...sparte.gruppen.map(g => teamDokument(g, sparte)),
    ]
  })
}

// ─── Termine ────────────────────────────────────────────────────────────────

async function termine(): Promise<SuchDokument[]> {
  return (await getTermine()).map(t => ({
    id: `termin:${t.id}`,
    art: 'termin',
    titel: t.titel,
    url: `/termine#termin-${t.id}`,
    // Uhrzeit ist Freitext ("18:30", "18:30 Uhr", "ganztägig")
    zusatz: verbinden(datumText(t.datum), /^\d{1,2}[:.]\d{2}$/.test(t.uhrzeit) ? `${t.uhrzeit} Uhr` : t.uhrzeit, t.ort),
    stichworte: verbinden(t.sparte, ...t.tags),
    // Abgeglichene Spiele haben Zeilen wie "Details: https://…" – Adressen sucht niemand
    absaetze: absaetze([
      ...zeilen(t.beschreibung).map(z => z.replace(/https?:\/\/\S+/g, '').replace(/^Details\s*:\s*$/i, '').trim()),
      t.ort,
    ]),
    datum: t.datum,
    gehoertZu: '/termine',
    titelSprung: true,
  }))
}

// ─── Personen ───────────────────────────────────────────────────────────────

/** Eine Person mit mehreren Funktionen erscheint einmal, die Funktionen nebeneinander. */
async function ansprechpartner(): Promise<SuchDokument[]> {
  const personen = new Map<string, { name: string; funktionen: string[]; gruppen: Set<string> }>()
  for (const a of await getAnsprechpartner()) {
    const p = personen.get(a.name) ?? { name: a.name, funktionen: [], gruppen: new Set<string>() }
    if (!p.funktionen.includes(a.funktion)) p.funktionen.push(a.funktion)
    p.gruppen.add(a.gruppe)
    personen.set(a.name, p)
  }
  return [...personen.values()].map(p => ({
    id: `person:${p.name}`,
    art: 'person',
    titel: p.name,
    url: '/ansprechpartner',
    zusatz: p.funktionen.join(' · '),
    stichworte: [...p.gruppen].join(' '),
    absaetze: [],
    gehoertZu: '/ansprechpartner',
    titelSprung: true,
  }))
}

async function foerdervereinVorstand(): Promise<SuchDokument[]> {
  return (await getFoerdervereinVorstand()).map(v => ({
    id: `foerderverein-vorstand:${v.id}`,
    art: 'person',
    titel: v.name,
    url: '/foerderverein/vorstand',
    zusatz: verbinden(v.funktion, 'Förderverein'),
    stichworte: 'Förderverein Vorstand',
    absaetze: absaetze([v.aufgabe]),
    gehoertZu: '/foerderverein/vorstand',
    titelSprung: true,
  }))
}

// ─── Downloads ──────────────────────────────────────────────────────────────

async function downloads(): Promise<SuchDokument[]> {
  return (await getDownloads()).map(d => ({
    id: `download:${d.id}`,
    art: 'download',
    titel: d.titel,
    url: d.datei,
    extern: true,
    zusatz: verbinden(d.kategorie || 'Download', datumText(d.datum)),
    stichworte: d.kategorie,
    absaetze: absaetze(zeilen(d.beschreibung)),
    datum: d.datum ?? undefined,
    gehoertZu: '/downloads',
  }))
}

// ─── Förderverein-Seiten ────────────────────────────────────────────────────

/** Der lesbare Text eines Bausteins, so wie er auf der Seite steht. */
function bausteinAbsaetze(b: Baustein): Absatz[] {
  switch (b.art) {
    case 'text':
      return absaetze([b.ueberschrift, ...markdownAbsaetze(b.text)], b.ueberschrift || undefined)
    case 'zeitleiste':
      return b.eintraege.flatMap(e => absaetze([e.zeit, e.titel, ...markdownAbsaetze(e.text)], e.titel || b.ueberschrift || undefined))
    case 'bild':
      return absaetze([b.unterschrift])
    case 'galerie':
      return absaetze([b.ueberschrift, ...markdownAbsaetze(b.text), ...b.fotos.map(f => f.unterschrift)], b.ueberschrift || undefined)
    case 'liste':
      return absaetze([b.ueberschrift, ...markdownAbsaetze(b.text), ...b.punkte], b.ueberschrift || undefined)
    case 'zahlen':
      return absaetze([b.ueberschrift, ...b.eintraege.map(e => `${e.zahl} ${e.text}`)], b.ueberschrift || undefined)
    case 'zitat':
      return absaetze([...markdownAbsaetze(b.text), b.quelle])
    case 'karten':
      return absaetze([b.ueberschrift, ...b.eintraege.flatMap(e => [e.titel, ...markdownAbsaetze(e.text)])], b.ueberschrift || undefined)
    case 'aufruf':
      return absaetze([b.ueberschrift, ...markdownAbsaetze(b.text)], b.ueberschrift || undefined)
    // Die Meldungen und Unterlagen selbst sind eigene Treffer (News, Downloads)
    case 'meldungen':
    case 'unterlagen':
      return absaetze([b.ueberschrift])
  }
}

async function foerdervereinSeiten(): Promise<SuchDokument[]> {
  const unterlagen = (await getDownloads()).filter(d => istFoerderverein(d.kategorie))
  const gespeichert = await datenbank().query.seiten.findMany()
  return FOERDERVEREIN_SEITEN.map(seite => {
    const zeile = gespeichert.find(s => s.schluessel === seite.schluessel)
    const inhalt = zeile ? seiteLesen(zeile.inhalt) : seite.vorlage(unterlagen)
    const menue = FOERDERVEREIN_MENUE.kinder.find(k => k.href === seite.pfad)
    return {
      id: `seite:${seite.pfad}`,
      art: 'seite' as const,
      titel: menue?.label ?? seite.name,
      url: seite.pfad,
      zusatz: 'Förderverein',
      stichworte: 'Förderverein',
      absaetze: [
        ...absaetze(markdownAbsaetze(inhalt.einleitung)),
        ...inhalt.bausteine.filter(b => b.sichtbar).flatMap(bausteinAbsaetze),
      ],
    }
  })
}

// ─── Zusammen ───────────────────────────────────────────────────────────────

/**
 * Alle Dokumente aus der Datenbank. Fällt eine Quelle aus (z. B. fussball.de bei den Terminen),
 * fehlen nur ihre Treffer.
 */
export async function datenbankDokumente(): Promise<SuchDokument[]> {
  const quellen = [news, sparten, termine, ansprechpartner, foerdervereinVorstand, downloads, foerdervereinSeiten]
  const ergebnisse = await Promise.allSettled(quellen.map(q => q()))
  return ergebnisse.flatMap((e, i) => {
    if (e.status === 'fulfilled') return e.value
    console.error(`Suche: Quelle ${quellen[i].name} nicht lesbar`, e.reason)
    return []
  })
}
