import { getNewsBySlug } from '@/lib/content'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import MarkdownText from '@/components/MarkdownText'
import type { Metadata } from 'next'

// Bei jedem Aufruf frisch aus der Datenbank lesen → Änderungen erscheinen sofort
export const dynamic = 'force-dynamic'

// ─── Seite ──────────────────────────────────────────────────────────────────

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const post = await getNewsBySlug(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: post.image ? { images: [post.image.url] } : undefined,
  }
}

export default async function NewsDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const post = await getNewsBySlug(params.slug)
  if (!post) notFound()

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <Link href="/news" className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors mb-12">
        <ArrowLeft size={12} /> Zurück zu News
      </Link>

      <div className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-4">
        {post.category} — {format(new Date(post.date), 'd. MMMM yyyy', { locale: de })}
      </div>
      <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-tight mb-12">{post.title}</h1>

      {post.image && (
        <div
          className="relative w-full rounded-sm overflow-hidden mb-12"
          style={{
            aspectRatio: post.image.width && post.image.height ? `${post.image.width} / ${post.image.height}` : '16 / 9',
          }}
        >
          <Image
            src={post.image.url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        </div>
      )}

      <div className="w-16 h-px bg-[#0a0a0a] mb-12" />

      <div className="text-[#0a0a0a] leading-relaxed">
        {post.excerpt && <p className="text-lg text-[#6b6b6b] font-light mb-8">{post.excerpt}</p>}

        {/* Fließtext ist Markdown; rohes HTML im Text wird nicht gerendert */}
        {post.body.trim() && <MarkdownText text={post.body} />}
      </div>
    </div>
  )
}
