import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import NewsThumbnail from '@/components/NewsThumbnail'
import type { NewsPost } from '@/lib/content'

// News-Kacheln des Fördervereins (Übersicht und Aktuelles).
export default function NewsKarten({ news }: { news: NewsPost[] }) {
  // Bei 1–2 News keine leeren Rasterzellen
  const spalten = news.length === 1 ? 'max-w-md' : news.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${spalten} gap-px bg-[#0a0a0a]/10`}>
      {news.map(post => (
        <Link
          key={post.slug}
          href={`/news/${post.slug}`}
          className="bg-[#f5f5f0] group hover:bg-[#0a0a0a] hover:text-[#f5f5f0] transition-all duration-300 flex flex-col"
        >
          <NewsThumbnail bild={post.image} alt={post.title} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
          <div className="p-8 flex flex-col flex-1">
            <div className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] group-hover:text-[#f5f5f0]/50 mb-4">
              {format(new Date(post.date), 'd. MMMM yyyy', { locale: de })}
            </div>
            <h3 className="font-display text-2xl tracking-tight leading-tight mb-4">{post.title}</h3>
            <p className="text-sm text-[#6b6b6b] group-hover:text-[#f5f5f0]/60 leading-relaxed flex-1">{post.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
