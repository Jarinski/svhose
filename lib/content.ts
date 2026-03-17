/**
 * lib/content.ts
 *
 * Zentraler Datenzugriff – alle Inhalte kommen aus Sanity CMS.
 * Als Fallback werden die lokalen JSON-/MDX-Dateien verwendet,
 * solange die Sanity-Zugangsdaten noch nicht konfiguriert sind.
 */

import { sanityFetch } from '@/sanity/lib/client'
import {
  spartenQuery,
  sparteBySlugQuery,
  spartenSlugsQuery,
  termineQuery,
  trainingszeitenQuery,
  ansprechpartnerQuery,
  downloadsQuery,
  partnerQuery,
  allNewsQuery,
  newsBySlugQuery,
  newsSlugsQuery,
} from '@/sanity/lib/queries'

// ─── Legacy MDX fallback (nur für News ohne Sanity-Daten) ───────────────────
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewsPost {
  slug: string
  title: string
  date: string
  category: string
  sparte: string
  image?: string
  excerpt: string
  /** Sanity Portable Text blocks – wird in News-Detail-Page gerendert */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any[]
  /** Nur für MDX-Fallback (Rohtext) */
  content?: string
}

// ─── Sparten ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSparten(): Promise<any[]> {
  return (await sanityFetch<any[]>(spartenQuery)) ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSparteBySlug(slug: string): Promise<any | null> {
  const sanityData = (await sanityFetch<any | null>(sparteBySlugQuery, { slug })) ?? null
  if (!sanityData) return null

  // Fallback: Fotos für Mannschaften aus lokaler JSON-Datei, wenn Sanity kein Foto hat
  try {
    const spartenPath = path.join(process.cwd(), 'content', 'sparten.json')
    const raw = fs.readFileSync(spartenPath, 'utf8')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sparten: any[] = JSON.parse(raw)
    const localSparte = sparten.find((s: any) => s.slug === slug)

    if (localSparte && sanityData.mannschaften && localSparte.mannschaften) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sanityData.mannschaften = sanityData.mannschaften.map((mann: any) => {
        if (!mann.foto) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const localMann = localSparte.mannschaften.find((m: any) => m.name === mann.name)
          if (localMann?.foto) {
            return { ...mann, foto: localMann.foto }
          }
        }
        return mann
      })
    }
  } catch {
    // Fallback fehlgeschlagen – Sanity-Daten unverändert zurückgeben
  }

  return sanityData
}

export async function getSpartenSlugs(): Promise<{ slug: string }[]> {
  return (await sanityFetch<{ slug: string }[]>(spartenSlugsQuery)) ?? []
}

// ─── Termine ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTermine(): Promise<any[]> {
  return (await sanityFetch<any[]>(termineQuery)) ?? []
}

// ─── Trainingszeiten ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTrainingszeiten(): Promise<any[]> {
  return (await sanityFetch<any[]>(trainingszeitenQuery)) ?? []
}

// ─── Ansprechpartner ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAnsprechpartner(): Promise<any[]> {
  return (await sanityFetch<any[]>(ansprechpartnerQuery)) ?? []
}

// ─── Sparten Downloads (always from local JSON, independent of Sanity) ──────

export interface SparteDownload {
  titel: string
  beschreibung: string
  datei: string
}

export function getSparteDownloadsFromJson(slug: string): SparteDownload[] {
  try {
    const spartenPath = path.join(process.cwd(), 'content', 'sparten.json')
    const raw = fs.readFileSync(spartenPath, 'utf8')
    const sparten: Array<{ slug: string; downloads?: SparteDownload[] }> = JSON.parse(raw)
    const sparte = sparten.find(s => s.slug === slug)
    return sparte?.downloads ?? []
  } catch {
    return []
  }
}

// ─── Downloads ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDownloads(): Promise<any[]> {
  const sanityDownloads = (await sanityFetch<any[]>(downloadsQuery)) ?? []
  // Nur Downloads mit gültiger Datei-URL verwenden
  const validSanityDownloads = sanityDownloads.filter((d: any) => d.datei)

  // Lokale JSON-Datei immer laden
  let localDownloads: any[] = []
  try {
    const downloadsPath = path.join(process.cwd(), 'content', 'downloads.json')
    const raw = fs.readFileSync(downloadsPath, 'utf8')
    localDownloads = JSON.parse(raw)
  } catch {
    localDownloads = []
  }

  if (validSanityDownloads.length === 0) return localDownloads

  // Merge: Sanity hat Vorrang; lokale Downloads, die in Sanity fehlen, werden ergänzt
  const sanityTitles = new Set(
    validSanityDownloads.map((d: any) => (d.titel ?? '').toLowerCase())
  )
  const missingLocal = localDownloads.filter(
    (d: any) => !sanityTitles.has((d.titel ?? '').toLowerCase())
  )
  return [...validSanityDownloads, ...missingLocal]
}

// ─── Partner ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPartner(): Promise<any[]> {
  return (await sanityFetch<any[]>(partnerQuery)) ?? []
}

// ─── News ───────────────────────────────────────────────────────────────────

/**
 * Gibt alle News zurück.
 * Zuerst wird Sanity abgefragt. Wenn Sanity leer oder nicht konfiguriert ist,
 * wird auf die lokalen MDX-Dateien zurückgefallen.
 */
export async function getAllNews(): Promise<NewsPost[]> {
  const sanityNews = (await sanityFetch<NewsPost[]>(allNewsQuery)) ?? []
  if (sanityNews.length > 0) return sanityNews
  // Fallback: lokale MDX-Dateien
  return getAllNewsFromMdx()
}

export async function getNewsBySlug(slug: string): Promise<NewsPost | null> {
  const post = (await sanityFetch<NewsPost | null>(newsBySlugQuery, { slug })) ?? null
  if (post) return post
  // Fallback: lokale MDX-Datei
  return getNewsBySlugFromMdx(slug)
}

export async function getNewsSlugs(): Promise<{ slug: string }[]> {
  const sanitySlugs = (await sanityFetch<{ slug: string }[]>(newsSlugsQuery)) ?? []
  if (sanitySlugs.length > 0) return sanitySlugs
  // Fallback: lokale MDX-Dateien
  return getAllNewsFromMdx().map((p: NewsPost) => ({ slug: p.slug }))
}

// ─── MDX Fallback Helpers ────────────────────────────────────────────────────

const contentDir = path.join(process.cwd(), 'content')
const newsDir = path.join(contentDir, 'news')

function getAllNewsFromMdx(): NewsPost[] {
  if (!fs.existsSync(newsDir)) return []
  const files = fs.readdirSync(newsDir).filter(f => f.endsWith('.mdx'))
  const posts = files.map(filename => {
    const slug = filename.replace(/\.mdx$/, '')
    const fullPath = path.join(newsDir, filename)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    // Datum als String sicherstellen
    const rawDate = data.date
    const dateStr = rawDate instanceof Date
      ? rawDate.toISOString().split('T')[0]
      : String(rawDate ?? '')
    return {
      slug,
      title: data.title || '',
      date: dateStr,
      category: data.category || 'Allgemein',
      sparte: data.sparte || 'Allgemein',
      image: data.image,
      excerpt: data.excerpt || '',
      content,
    } as NewsPost
  })
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function getNewsBySlugFromMdx(slug: string): NewsPost | null {
  const fullPath = path.join(newsDir, `${slug}.mdx`)
  if (!fs.existsSync(fullPath)) return null
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)
  // Datum als String sicherstellen
  const rawDate = data.date
  const dateStr = rawDate instanceof Date
    ? rawDate.toISOString().split('T')[0]
    : String(rawDate ?? '')
  return {
    slug,
    title: data.title || '',
    date: dateStr,
    category: data.category || 'Allgemein',
    sparte: data.sparte || 'Allgemein',
    image: data.image,
    excerpt: data.excerpt || '',
    content,
  }
}
