import { getAllNews } from '@/lib/content'
import Link from 'next/link'
import NewsThumbnail from '@/components/NewsThumbnail'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'News' }

// Bei jedem Aufruf frisch aus der Datenbank lesen → Änderungen erscheinen sofort
export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const news = await getAllNews()

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Aktuelles</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight">NEWS</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
        {news.map(post => (
          <Link key={post.slug} href={`/news/${post.slug}`} className="group flex flex-col">
            <div className="relative">
              <NewsThumbnail
                bild={post.image}
                alt={post.title}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <span className="absolute left-3 bottom-3 bg-[#0a0a0a]/80 text-[#f5f5f0] text-[10px] tracking-[0.15em] uppercase px-2.5 py-1">
                {post.sparte}
              </span>
            </div>
            <div className="mt-5 text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]">
              {format(new Date(post.date), 'd. MMMM yyyy', { locale: de })}
            </div>
            <h2 className="mt-2 font-display text-2xl md:text-[1.75rem] tracking-tight leading-[1.05] group-hover:underline decoration-1 underline-offset-4">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="mt-3 text-sm text-[#6b6b6b] leading-relaxed line-clamp-4">{post.excerpt}</p>
            )}
            <span className="mt-5 self-start inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-4 py-2 text-[11px] tracking-[0.15em] uppercase transition-colors group-hover:bg-[#333]">
              Weiterlesen <ArrowRight size={12} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {news.length === 0 && (
        <p className="text-[#6b6b6b] text-center py-20">Noch keine News vorhanden.</p>
      )}
    </div>
  )
}
