/**
 * lib/content.ts
 *
 * Zentraler Datenzugriff – alle Inhalte kommen aus Sanity CMS.
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
}

// ─── Sparten ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSparten(): Promise<any[]> {
  return (await sanityFetch<any[]>(spartenQuery)) ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSparteBySlug(slug: string): Promise<any | null> {
  return (await sanityFetch<any | null>(sparteBySlugQuery, { slug })) ?? null
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

// ─── Downloads ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDownloads(): Promise<any[]> {
  return (await sanityFetch<any[]>(downloadsQuery)) ?? []
}

// ─── Partner ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPartner(): Promise<any[]> {
  return (await sanityFetch<any[]>(partnerQuery)) ?? []
}

// ─── News ───────────────────────────────────────────────────────────────────

export async function getAllNews(): Promise<NewsPost[]> {
  return (await sanityFetch<NewsPost[]>(allNewsQuery)) ?? []
}

export async function getNewsBySlug(slug: string): Promise<NewsPost | null> {
  return (await sanityFetch<NewsPost | null>(newsBySlugQuery, { slug })) ?? null
}

export async function getNewsSlugs(): Promise<{ slug: string }[]> {
  return (await sanityFetch<{ slug: string }[]>(newsSlugsQuery)) ?? []
}
