import { getNewsBySlug, getAllNews } from '@/lib/content'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export async function generateStaticParams() {
  const news = getAllNews()
  return news.map(post => ({ slug: post.slug }))
}

export default function NewsDetailPage({ params }: { params: { slug: string } }) {
  const post = getNewsBySlug(params.slug)
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

      <div className="w-16 h-px bg-[#0a0a0a] mb-12" />

      <div className="prose prose-lg max-w-none text-[#0a0a0a] leading-relaxed">
        <p className="text-lg text-[#6b6b6b] font-light mb-8">{post.excerpt}</p>
        <div className="whitespace-pre-wrap">{post.content}</div>
      </div>
    </div>
  )
}
