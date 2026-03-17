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
    },
    downloads[] {
      titel,
      beschreibung,
      "datei": coalesce(datei.asset->url, dateiUrl)
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
    },
    downloads[] {
      titel,
      beschreibung,
      "datei": coalesce(datei.asset->url, dateiUrl)
    }
  }
`

export const spartenSlugsQuery = groq`
  *[_type == "sparte"] { "slug": slug.current }
`

// ─── Personen / Jahrgänge / Mannschaften ───────────────────────────────────

export const personenQuery = groq`
  *[_type == "person"] | order(reihenfolge asc, name asc) {
    "id": _id,
    name,
    rollen,
    email,
    telefon,
    whatsapp,
    "foto": foto.asset->url,
    reihenfolge
  }
`

export const jahrgaengeQuery = groq`
  *[_type == "jahrgang"] | order(reihenfolge asc, name asc) {
    "id": _id,
    name,
    jahrgangVon,
    jahrgangBis,
    altersklasse,
    beschreibung,
    trainer[]->{
      "id": _id,
      name,
      rollen,
      email,
      telefon,
      whatsapp,
      "foto": foto.asset->url
    },
    reihenfolge
  }
`

export const mannschaftenQuery = groq`
  *[_type == "mannschaft"] | order(reihenfolge asc, name asc) {
    "id": _id,
    name,
    bereich,
    "sparte": sparte->{
      "id": _id,
      name,
      "slug": slug.current
    },
    "jahrgang": jahrgang->{
      "id": _id,
      name,
      jahrgangVon,
      jahrgangBis
    },
    beschreibung,
    trainer[]->{
      "id": _id,
      name,
      rollen,
      email,
      telefon,
      whatsapp,
      "foto": foto.asset->url
    },
    "foto": foto.asset->url,
    reihenfolge
  }
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
    "sparte": coalesce(mannschaft->sparte->name, sparte),
    "gruppe": coalesce(mannschaft->name, gruppe),
    tag,
    uhrzeit,
    "ort": coalesce(trainingsplatz->name, ort),
    jahreszeit,
    frequenz,
    "trainer": coalesce(mannschaft->trainer[0]->name, trainer),
    "email": coalesce(mannschaft->trainer[0]->email, email),
    "telefon": coalesce(mannschaft->trainer[0]->telefon, telefon),
    "foto": foto.asset->url
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
