import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getNewsBySlug } from '@/lib/content'
import NewsModalArtikel from '@/components/news/NewsModalArtikel'

// News im Glas-Fenster über der Startseite – nur bei einem Klick auf der Startseite.
// Die eigenständige Seite dazu ist app/news/[slug]/page.tsx.

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params
  const post = await getNewsBySlug(slug)
  return post ? { title: post.title } : {}
}

export default async function NewsFenster(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const post = await getNewsBySlug(slug)
  if (!post) notFound()
  return <NewsModalArtikel post={post} />
}
