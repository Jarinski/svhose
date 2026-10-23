/**
 * components/MarkdownText.tsx
 *
 * Darstellung von Fließtext in Markdown – gemeinsam genutzt von der öffentlichen News-Seite
 * (app/news/[slug]/page.tsx) und der Vorschau im News-Formular der Verwaltung, damit die
 * Vorschau genau so aussieht wie später auf der Website.
 *
 * Ohne Hooks und ohne 'use client': funktioniert in Server- und Client-Komponenten.
 * Rohes HTML im Text wird nicht gerendert (Standard von react-markdown).
 */

import Markdown, { type Components } from 'react-markdown'

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
export const MARKDOWN_ELEMENTE: Components = {
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
  // Bilder im Text liegen im Medienordner (/medien/…) – normales <img>, zentriert, höchstens so breit
  // wie der Text und nie größer als die Datei selbst; Hochformate höchstens drei Viertel der Fensterhöhe.
  img: ({ src, alt }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        className="block w-auto max-w-full h-auto max-h-[75vh] mx-auto rounded-sm my-2"
      />
    ) : null,
}

/**
 * Macht eingefügte Adressen klickbar: Ohne GFM-Erweiterung verlinkt Markdown nur "<https://…>".
 * Nackte http(s)-Adressen bekommen deshalb spitze Klammern – außer sie stehen schon in einem
 * Link ("[Text](https://…)", auch als Linktext, oder "<https://…>") oder in Code (`…` bzw. ```…```).
 * Sternchen oder Unterstriche direkt am Ende gehören zur Hervorhebung, nicht zur Adresse ("**https://…**").
 */
export function linksErgaenzen(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`|!?\[[^\]\n]*\]\([^)\n]*\)|<https?:\/\/[^>\s]*>)/)
    .map((teil, i) =>
      i % 2 === 1
        ? teil
        : teil.replace(/(^|[^(<[\]"'=/\w])(https?:\/\/[^\s<>()[\]]*[^\s<>()[\].,;:!?"'*_])/g, '$1<$2>'),
    )
    .join('')
}

/** Text ohne Markdown, Satzzeichen und Akzente – nur zum Vergleichen. */
function vergleichstext(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ß]+/g, '')
}

/**
 * Wiederholt der Teaser nur den Anfang des Textes (etwa bei übernommenen News)? Dann zeigt die
 * Detailseite ihn nicht zusätzlich als Einleitung, sonst stünde derselbe Text zweimal untereinander.
 */
export function teaserWiederholtText(teaser: string, markdown: string): boolean {
  const kurz = vergleichstext(teaser.replace(/\s*…\s*$/, ''))
  if (!kurz) return false
  return vergleichstext(markdown).slice(0, kurz.length + 400).includes(kurz)
}

/** Markdown-Fließtext mit den Stilen der Website. */
export default function MarkdownText({ text }: { text: string }) {
  return <Markdown components={MARKDOWN_ELEMENTE}>{linksErgaenzen(text)}</Markdown>
}
