/**
 * components/news/NewsModalArtikel.tsx
 *
 * Inhalt des News-Fensters auf der Startseite (components/news/GlasModal.tsx): Foto, Sparte, Datum,
 * Titel, Teaser und Fließtext – derselbe Inhalt wie auf der Seite app/news/[slug], nur kompakter.
 * Server-Komponente; dazu die Ladeanzeige, solange der Beitrag noch kommt.
 */

import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { NewsPost } from '@/lib/content'
import MarkdownText, { teaserWiederholtText } from '@/components/MarkdownText'
import { datumLang } from '@/components/vorschau/b/hilfen'
import b from '@/components/vorschau/b/bento.module.css'
import { NEWS_MODAL_TITEL } from './titelId'
import s from './NewsModal.module.css'

export default function NewsModalArtikel({ post }: { post: NewsPost }) {
  const bild = post.image
  const seiten = bild?.width && bild.height ? `${bild.width} / ${bild.height}` : '16 / 9'

  return (
    <article className={s.artikel}>
      {bild ? (
        <div className={s.bild} style={{ '--seiten': seiten } as CSSProperties}>
          <Image src={bild.url} alt="" fill priority sizes="(max-width: 720px) 100vw, 760px" />
        </div>
      ) : (
        <div className={s.ohneBild} />
      )}
      <div className={s.text}>
        <div className={s.meta}>
          <span className={`${b.tag} ${s.tag}`}>{post.category}</span>
          <time dateTime={post.date.slice(0, 10)}>{datumLang(post.date)}</time>
        </div>
        <h2 id={NEWS_MODAL_TITEL} className={s.titel}>
          {post.title}
        </h2>
        {post.excerpt && !teaserWiederholtText(post.excerpt, post.body) && <p className={s.teaser}>{post.excerpt}</p>}
        {post.body.trim() && (
          <div className={s.fliesstext}>
            <MarkdownText text={post.body} />
          </div>
        )}
        <div className={s.fuss}>
          <Link href="/news" className={`${b.btn} ${b.btnDunkel}`}>
            Alle News
          </Link>
        </div>
      </div>
    </article>
  )
}

/** Platzhalter im Fenster, bis der Beitrag geladen ist */
export function NewsModalLaden() {
  return (
    <div className={s.laden} aria-busy="true">
      <span className={b.sr}>Beitrag wird geladen …</span>
      <div className={`${s.bild} ${s.schimmer}`} style={{ '--seiten': '16 / 9' } as CSSProperties} />
      <div className={s.text}>
        <div className={`${s.zeile} ${s.schimmer}`} style={{ width: '30%' }} />
        <div className={`${s.zeile} ${s.zeileGross} ${s.schimmer}`} style={{ width: '85%' }} />
        <div className={`${s.zeile} ${s.schimmer}`} />
        <div className={`${s.zeile} ${s.schimmer}`} style={{ width: '70%' }} />
      </div>
    </div>
  )
}
