import { groq } from 'next-sanity'

// ─── Sparten ────────────────────────────────────────────────────────────────

export const spartenQuery = groq`
  *[_type == "sparte"] | order(name asc) {
    "slug": slug.current,
    name,
    icon,
    farbe,
    beschreibung,
    langbeschreibung,
    "foto": foto.asset->url,
    trainingszeiten_spartes,
    mannschaften[] {
      name,
      beschreibung,
      "foto": foto.asset->url
    },
    ansprechpartner[] {
      name,
      rolle,
      email,
      telefon,
      whatsapp,
      "foto": foto.asset->url
    }
  }
`

export const sparteBySlugQuery = groq`
  *[_type == "sparte" && slug.current == $slug][0] {
    "slug": slug.current,
    name,
    icon,
    farbe,
    beschreibung,
    langbeschreibung,
    "foto": foto.asset->url,
    trainingszeiten_spartes,
    mannschaften[] {
      name,
      beschreibung,
      "foto": foto.asset->url
    },
    ansprechpartner[] {
      name,
      rolle,
      email,
      telefon,
      whatsapp,
      "foto": foto.asset->url
    }
  }
`

export const spartenSlugsQuery = groq`
  *[_type == "sparte"] { "slug": slug.current }
`

// ─── Termine ────────────────────────────────────────────────────────────────

export const termineQuery = groq`
  *[_type == "termin"] | order(datum asc) {
    "id": _id,
    titel,
    datum,
    uhrzeit,
    ort,
    sparte,
    beschreibung,
    "bild": bild.asset->url,
    tags
  }
`

// ─── Trainingszeiten ────────────────────────────────────────────────────────

export const trainingszeitenQuery = groq`
  *[_type == "trainingszeit"] | order(sparte asc) {
    sparte,
    gruppe,
    tag,
    uhrzeit,
    ort,
    jahreszeit,
    frequenz,
    trainer,
    email,
    telefon
  }
`

// ─── Ansprechpartner ────────────────────────────────────────────────────────

export const ansprechpartnerQuery = groq`
  *[_type == "ansprechpartner"] | order(reihenfolge asc) {
    "id": _id,
    name,
    funktion,
    gruppe,
    sparte,
    email,
    telefon,
    "foto": foto.asset->url
  }
`

// ─── Downloads ──────────────────────────────────────────────────────────────

export const downloadsQuery = groq`
  *[_type == "download"] | order(datum desc) {
    "id": _id,
    titel,
    beschreibung,
    "datei": coalesce(datei.asset->url, dateiUrl),
    kategorie,
    datum
  }
`

// ─── Partner ────────────────────────────────────────────────────────────────

export const partnerQuery = groq`
  *[_type == "partner"] | order(reihenfolge asc) {
    "id": _id,
    name,
    "logo": logo.asset->url,
    url
  }
`

// ─── News ───────────────────────────────────────────────────────────────────

export const allNewsQuery = groq`
  *[_type == "newsPost"] | order(datum desc) {
    "slug": slug.current,
    title,
    "date": datum,
    category,
    sparte,
    "image": image.asset->url,
    excerpt,
    body
  }
`

export const newsBySlugQuery = groq`
  *[_type == "newsPost" && slug.current == $slug][0] {
    "slug": slug.current,
    title,
    "date": datum,
    category,
    sparte,
    "image": image.asset->url,
    excerpt,
    body
  }
`

export const newsSlugsQuery = groq`
  *[_type == "newsPost"] { "slug": slug.current }
`
