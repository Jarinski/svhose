import { getNewsBySlug } from '@/lib/content'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import Markdown, { type Components } from 'react-markdown'
import type { Metadata } from 'next'

// Bei jedem Aufruf frisch aus der Datenbank lesen → Änderungen erscheinen sofort
export const dynamic = 'force-dynamic'

// ─── Fließtext (Markdown) ───────────────────────────────────────────────────

/** Absolute http(s)-Links öffnen in einem neuen Tab, alles andere (intern, mailto, tel) im selben. */
function istExternerLink(href: string | undefined): boolean {
  return !!href && /^https?:\/\//i.test(href)
}

const ZWISCHENUEBERSCHRIFT = 'font-display text-3xl md:text-4xl tracking-tight leading-tight mt-12 mb-4 first:mt-0'
const LISTE = 'pl-6 mb-6 space-y-2 marker:text-[#6b6b6b] [li_&]:mt-2 [li_&]:mb-0'

/**
 * Darstellung der Markdown-Elemente. Die Seite nutzt kein Typography-Plugin,
 * deshalb bekommt jedes Element hier schlichte Tailwind-Stile (Absätze mit Abstand,
 * Zwischenüberschriften in der Display-Schrift, unterstrichene Links).
 */
const MARKDOWN_ELEMENTE: Components = {
  // Die Seite hat schon eine h1 (Titel) – eine "#"-Überschrift im Text wird zur Zwischenüberschrift.
  h1: ({ children }) => <h2 className={ZWISCHENUEBERSCHRIFT}>{children}</h2>,
  h2: ({ children }) => <h2 className={ZWISCHENUEBERSCHRIFT}>{children}</h2>,
  h3: ({ children }) => (
    <h3 className="font-display text-2xl md:text-3xl tracking-tight leading-tight mt-10 mb-3 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => <h4 className="font-medium mt-8 mb-2 first:mt-0">{children}</h4>,
  h5: ({ children }) => <h5 className="font-medium mt-8 mb-2 first:mt-0">{children}</h5>,
  h6: ({ children }) => <h6 className="font-medium mt-8 mb-2 first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="mb-6 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline underline-offset-4 decoration-[#0a0a0a]/30 hover:decoration-[#0a0a0a] transition-colors break-words"
      {...(istExternerLink(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className={`list-disc ${LISTE}`}>{children}</ul>,
  ol: ({ children }) => <ol className={`list-decimal ${LISTE}`}>{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#0a0a0a] pl-6 my-8 text-lg text-[#6b6b6b] font-light">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-[0.9em] bg-[#e9e9e2] px-1 py-0.5 rounded-sm">{children}</code>
  ),
  pre: ({ children }) => <pre className="mb-6 overflow-x-auto bg-[#e9e9e2] p-4 rounded-sm text-sm">{children}</pre>,
  hr: () => <hr className="my-12 border-0 h-px bg-[#0a0a0a]/10" />,
  // Bilder im Text liegen im Medienordner (/medien/…) – normales <img>, volle Breite, Höhe nach Proportion.
  img: ({ src, alt }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ''} loading="lazy" className="block w-full h-auto rounded-sm my-2" />
    ) : null,
}

// ─── Seite ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getNewsBySlug(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: post.image ? { images: [post.image.url] } : undefined,
  }
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
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
        {post.body.trim() && <Markdown components={MARKDOWN_ELEMENTE}>{post.body}</Markdown>}
      </div>
    </div>
  )
}
