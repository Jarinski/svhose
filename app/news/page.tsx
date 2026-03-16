import { getAllNews } from '@/lib/content'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'News' }

export default function NewsPage() {
  const news = getAllNews()
  const categories = ['Alle', ...Array.from(new Set(news.map(n => n.category)))]

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Aktuelles</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">NEWS</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0a0a0a]/10">
        {news.map(post => (
          <Link
            key={post.slug}
            href={`/news/${post.slug}`}
            className="bg-[#f5f5f0] p-8 group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-300"
          >
            <div className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] group-hover:text-[#f5f5f0]/50 mb-4">
              {post.category} — {format(new Date(post.date), 'd. MMMM yyyy', { locale: de })}
            </div>
            <h2 className="font-display text-2xl tracking-tight leading-tight mb-4">{post.title}</h2>
            <p className="text-sm text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 leading-relaxed">{post.excerpt}</p>
            <div className="mt-6 flex items-center gap-2 text-xs tracking-[0.1em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Weiterlesen <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {news.length === 0 && (
        <p className="text-[#6b6b6b] text-center py-20">Noch keine News vorhanden.</p>
      )}
    </div>
  )
}
