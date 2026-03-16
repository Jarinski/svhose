# SV Holm-Seppensen e.V. — Website

Moderne Vereinswebsite gebaut mit **Next.js 14**, **Tailwind CSS** und dateibasiertem Content-Management.

---

## 🚀 Schnellstart

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

---

## 📁 Projektstruktur

```
sv-holm-seppensen/
├── app/                    ← Next.js Seiten (App Router)
│   ├── page.tsx            ← Startseite
│   ├── news/               ← News-Übersicht & Detailseiten
│   ├── sparten/            ← Spartenübersicht & Detailseiten
│   ├── termine/            ← Terminkalender
│   ├── downloads/          ← Dokumente & PDFs
│   ├── ansprechpartner/    ← Kontaktseite
│   ├── trainingszeiten/    ← Trainingszeiten
│   └── ueber-uns/          ← Über den Verein
│
├── components/             ← Wiederverwendbare Komponenten
│   ├── Navbar.tsx
│   └── Footer.tsx
│
├── content/                ← 📝 HIER werden Inhalte gepflegt
│   ├── news/               ← News-Artikel als .mdx Dateien
│   │   └── YYYY-MM-DD-titel.mdx
│   ├── sparten.json        ← Liste aller Sparten
│   ├── termine.json        ← Termine & Events
│   ├── downloads.json      ← Downloadbare Dokumente
│   ├── ansprechpartner.json
│   ├── trainingszeiten.json
│   └── partner.json
│
├── public/
│   ├── pdfs/               ← PDF-Dateien hier ablegen
│   └── images/             ← Bilder hier ablegen
│
└── lib/
    └── content.ts          ← Hilfsfunktionen zum Lesen der Content-Dateien
```

---

## ✏️ Inhalte pflegen (Workflow mit VS Code)

### Neuen News-Artikel erstellen

Erstelle eine neue Datei in `content/news/` nach dem Schema `YYYY-MM-DD-titel.mdx`:

```mdx
---
title: "Spielbericht: 3:1 gegen HSV"
date: "2026-03-20"
category: "Fussball"
sparte: "Fußball"
image: "/images/news/spielbericht-hsv.jpg"
excerpt: "Unsere Herren gewinnen souverän mit 3:1."
---

Hier kommt der Fließtext des Artikels...
```

**Verfügbare Kategorien:** `Fussball`, `Aktionen`, `Allgemein`, `Darts`, `Interviews`, `Akrobatik`

---

### Neuen Termin hinzufügen

Öffne `content/termine.json` und füge einen Eintrag hinzu:

```json
{
  "id": "4",
  "titel": "Jahreshauptversammlung",
  "datum": "2026-05-05",
  "uhrzeit": "19:00",
  "ort": "Vereinsheim, Holm-Seppensen",
  "sparte": "Allgemein",
  "beschreibung": "Jährliche Hauptversammlung aller Mitglieder.",
  "bild": ""
}
```

---

### Neues Dokument/Download hinzufügen

1. PDF in `public/pdfs/` ablegen
2. Eintrag in `content/downloads.json` hinzufügen:

```json
{
  "id": "6",
  "titel": "Trainingsplan Sommer 2026",
  "beschreibung": "Trainingsplan für die Sommersaison.",
  "datei": "/pdfs/Trainingsplan-Sommer-2026.pdf",
  "kategorie": "Formulare",
  "datum": "2026-03-01"
}
```

---

### Ansprechpartner ändern

Öffne `content/ansprechpartner.json` und bearbeite die Einträge.

---

### Trainingszeiten aktualisieren

Öffne `content/trainingszeiten.json`. Jede Sparte hat ein `gruppen`-Array mit Tag, Uhrzeit und Ort.

---

## 🚢 Deployment auf Vercel

### Erstmalig einrichten

1. Repository auf GitHub pushen:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USER/sv-holm-seppensen.git
git push -u origin main
```

2. [vercel.com](https://vercel.com) → "Add New Project" → GitHub-Repo auswählen → Deploy

### Änderungen deployen

```bash
git add .
git commit -m "News: Spielbericht Heimspiel 20.03."
git push
```

→ Vercel deployt automatisch in ~30 Sekunden. ✅

---

## 🎨 Design anpassen

- **Farben & Fonts:** `app/globals.css` und `tailwind.config.js`
- **Navbar:** `components/Navbar.tsx`
- **Footer:** `components/Footer.tsx`
- **Startseite:** `app/page.tsx`

---

## 📦 Tech Stack

| Tool | Zweck |
|------|-------|
| [Next.js 14](https://nextjs.org) | Framework (App Router) |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [MDX / gray-matter](https://github.com/jonschlinkert/gray-matter) | News-Artikel |
| [date-fns](https://date-fns.org) | Datumsformatierung |
| [Lucide React](https://lucide.dev) | Icons |
| [Vercel](https://vercel.com) | Hosting |

---

## 💡 Tipps für VS Code

- **Prettier** installieren für automatische Formatierung
- **Tailwind CSS IntelliSense** Extension für Autocomplete
- **MDX** Extension für Syntax-Highlighting in .mdx Dateien
- Terminal → `npm run dev` laufen lassen während du arbeitest

---

*SV Holm-Seppensen e.V. — Gemeinsam stark.*
