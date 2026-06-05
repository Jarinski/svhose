import { groq } from 'next-sanity'

// ─── Sparten ────────────────────────────────────────────────────────────────

export const spartenQuery = groq`
  *[_type == "sparte" && !(_id in path("drafts.**"))] | order(name asc) {
    "slug": slug.current,
    name,
    icon,
    farbe,
    beschreibung,
    langbeschreibung,
    "foto": foto.asset->url,
    trainingszeiten_spartes,
    mannschaften[] {
      "id": _key,
      name,
      bereich,
      jahrgangText,
      beschreibung,
      "foto": foto.asset->url,
      trainer[] {
        _type == "reference" => @->{
          "id": _id,
          name,
          "rolle": coalesce(rollen[0], "Trainer"),
          email,
          telefon,
          whatsapp,
          "foto": foto.asset->url
        },
        _type != "reference" => {
          "id": _key,
          name,
          rolle,
          email,
          telefon,
          whatsapp,
          "foto": foto.asset->url
        }
      }
    },
    "zentraleMannschaften": *[_type == "mannschaft" && sparte._ref == ^._id && !(_id in path("drafts.**"))] | order(reihenfolge asc, name asc) {
      "id": _id,
      name,
      bereich,
      "jahrgangText": jahrgang->name,
      beschreibung,
      "foto": foto.asset->url,
      trainer[]->{
        "id": _id,
        name,
        "rolle": coalesce(rollen[0], "Trainer"),
        email,
        telefon,
        whatsapp,
        "foto": foto.asset->url
      }
    },
    ansprechpartner[] {
      _type == "reference" => @->{
        "id": _id,
        name,
        "rolle": coalesce(rollen[0], "Ansprechpartner"),
        email,
        telefon,
        whatsapp,
        "foto": foto.asset->url
      },
      _type != "reference" => {
        "id": _key,
        name,
        rolle,
        email,
        telefon,
        whatsapp,
        "foto": foto.asset->url
      }
    },
    downloads[] {
      titel,
      beschreibung,
      "datei": coalesce(datei.asset->url, dateiUrl)
    }
  }
`

export const sparteBySlugQuery = groq`
  *[_type == "sparte" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    "slug": slug.current,
    name,
    icon,
    farbe,
    beschreibung,
    langbeschreibung,
    "foto": foto.asset->url,
    trainingszeiten_spartes,
    mannschaften[] {
      "id": _key,
      name,
      bereich,
      jahrgangText,
      beschreibung,
      "foto": foto.asset->url,
      trainer[] {
        _type == "reference" => @->{
          "id": _id,
          name,
          "rolle": coalesce(rollen[0], "Trainer"),
          email,
          telefon,
          whatsapp,
          "foto": foto.asset->url
        },
        _type != "reference" => {
          "id": _key,
          name,
          rolle,
          email,
          telefon,
          whatsapp,
          "foto": foto.asset->url
        }
      }
    },
    "zentraleMannschaften": *[_type == "mannschaft" && sparte._ref == ^._id && !(_id in path("drafts.**"))] | order(reihenfolge asc, name asc) {
      "id": _id,
      name,
      bereich,
      "jahrgangText": jahrgang->name,
      beschreibung,
      "foto": foto.asset->url,
      trainer[]->{
        "id": _id,
        name,
        "rolle": coalesce(rollen[0], "Trainer"),
        email,
        telefon,
        whatsapp,
        "foto": foto.asset->url
      }
    },
    ansprechpartner[] {
      _type == "reference" => @->{
        "id": _id,
        name,
        "rolle": coalesce(rollen[0], "Ansprechpartner"),
        email,
        telefon,
        whatsapp,
        "foto": foto.asset->url
      },
      _type != "reference" => {
        "id": _key,
        name,
        rolle,
        email,
        telefon,
        whatsapp,
        "foto": foto.asset->url
      }
    },
    downloads[] {
      titel,
      beschreibung,
      "datei": coalesce(datei.asset->url, dateiUrl)
    }
  }
`

export const spartenSlugsQuery = groq`
  *[_type == "sparte" && !(_id in path("drafts.**"))] { "slug": slug.current }
`

// ─── Personen / Jahrgänge / Mannschaften ───────────────────────────────────

export const personenQuery = groq`
  *[_type == "person" && !(_id in path("drafts.**"))] | order(reihenfolge asc, name asc) {
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
  *[_type == "jahrgang" && !(_id in path("drafts.**"))] | order(reihenfolge asc, name asc) {
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
  *[_type == "mannschaft" && !(_id in path("drafts.**"))] | order(reihenfolge asc, name asc) {
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
  *[_type == "termin" && !(_id in path("drafts.**"))] | order(datum asc) {
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
  *[_type == "trainingszeit" && !(_id in path("drafts.**"))] | order(sparte asc) {
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
    "trainerFoto": mannschaft->trainer[0]->foto.asset->url,
    "foto": foto.asset->url
  }
`

// ─── Ansprechpartner ────────────────────────────────────────────────────────

export const ansprechpartnerQuery = groq`
  *[_type == "ansprechpartner" && !(_id in path("drafts.**"))] | order(reihenfolge asc) {
    "id": _id,
    "name": coalesce(person->name, name),
    funktion,
    gruppe,
    sparte,
    "email": coalesce(person->email, email),
    "telefon": coalesce(person->telefon, telefon),
    "foto": coalesce(person->foto.asset->url, foto.asset->url)
  }
`

// ─── Downloads ──────────────────────────────────────────────────────────────

export const downloadsQuery = groq`
  *[_type == "download" && !(_id in path("drafts.**"))] | order(datum desc) {
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
  *[_type == "partner" && !(_id in path("drafts.**"))] | order(reihenfolge asc) {
    "id": _id,
    name,
    "logo": logo.asset->url,
    url
  }
`

// ─── News ───────────────────────────────────────────────────────────────────

export const allNewsQuery = groq`
  *[_type == "newsPost" && !(_id in path("drafts.**"))] | order(datum desc) {
    "slug": slug.current,
    title,
    "date": datum,
    category,
    sparte,
    "image": image.asset->{
      "url": url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height
    },
    excerpt,
    body
  }
`

export const newsBySlugQuery = groq`
  *[_type == "newsPost" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    "slug": slug.current,
    title,
    "date": datum,
    category,
    sparte,
    "image": image.asset->{
      "url": url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height
    },
    excerpt,
    body
  }
`

export const newsSlugsQuery = groq`
  *[_type == "newsPost" && !(_id in path("drafts.**"))] { "slug": slug.current }
`
