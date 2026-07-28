# ARCHITECTURE DECISIONS – SV Holm-Seppensen

Stand: 2026-05-10  
Scope: Analyse der **aktuellen** Projektstruktur (Code + bestehende Doku), ohne funktionale Änderungen.

---

## Ziel dieses Dokuments

Dieses Dokument hält wesentliche Architekturentscheidungen fest und unterscheidet bewusst zwischen:

- **Gute Entscheidungen** (tragfähig / zielgerichtet)
- **Technische Kompromisse** (bewusste Trade-offs)
- **Temporäre Lösungen** (Übergang / operativer Hotfix-Charakter)

Zusätzlich werden erkennbare **historische Architekturwechsel** dokumentiert.

---

## 1) Warum Sanity als zentrale Content-Quelle genutzt wird

### Entscheidung
Sanity wurde als zentraler Content-Hub etabliert; das Frontend liest Inhalte über einen einheitlichen Content-Layer (`lib/content.ts`) und GROQ-Queries (`sanity/lib/queries.ts`).

### Belege in der Struktur
- `lib/content.ts`: Kommentar „**Zentraler Datenzugriff – alle Inhalte kommen aus Sanity CMS**“.
- `sanity/schemas/index.ts`: zentrale Registrierung relevanter Content-Typen (`sparte`, `termin`, `trainingszeit`, `newsPost`, etc.).
- `CONTENT_FLOW.md`: Zielbild „**Sanity als zentrale Content-Quelle**“.

### Einordnung
✅ **Gute Entscheidung**

### Begründung
- Entkoppelt Redaktion von Deployments (Inhaltspflege im Studio statt Git-Commit pro Textänderung).
- Einheitliche Datenquelle für manuelle Inhalte und automatisierte Feeds (Cron-Syncs schreiben ebenfalls nach Sanity).
- Unterstützt strukturierte Weiterentwicklung (Referenzen, Validierungen, Asset-Management).

### Trade-off / Nebenwirkung
- Höhere Modellierungs- und Betriebs-Komplexität als rein file-based Content.
- Abhängigkeit von externem CMS-Betrieb und Tokens/Umgebungsvariablen.

---

## 2) Warum Next.js App Router verwendet wird

### Entscheidung
Das Projekt setzt auf den Next.js App Router (`app/`-Struktur mit serverseitigen, asynchronen Seiten, `generateStaticParams`, segmentbasierte Routen).

### Belege in der Struktur
- Routenstruktur in `app/` inkl. dynamischer Segmente, z. B.:
  - `app/news/[slug]/page.tsx`
  - `app/sparten/[slug]/page.tsx`
- Nutzung von `generateStaticParams()` in dynamischen Seiten.

### Einordnung
✅ **Gute Entscheidung**

### Begründung
- Passt gut zum Content-getriebenen Setup (statische Generierung + inkrementelle Aktualisierung).
- Vereinheitlicht Datenzugriff in Server Components (direkte async-Aufrufe von `lib/content.ts`).
- Saubere URL-Strukturen für redaktionelle Inhalte (News/Sparten als Slug-Routen).

### Trade-off / Nebenwirkung
- Team muss moderne Next.js-Konzepte beherrschen (Server Components, Cache/ISR-Verhalten).

---

## 3) Warum ISR / Revalidation genutzt wird

### Entscheidung
Seiten werden statisch vorgerendert und regelmäßig erneuert (z. B. `export const revalidate = 60` in mehreren Seiten).

### Belege in der Struktur
- `app/news/page.tsx`, `app/news/[slug]/page.tsx`, `app/sparten/[slug]/page.tsx`, `app/trainingszeiten/page.tsx`: `revalidate = 60`.
- Externe Fetches mit Revalidation-Hinweisen, z. B. `lib/fussball-de.ts` (`next: { revalidate: 3600 }`).

### Einordnung
✅ **Gute Entscheidung**

### Begründung
- Performance von statischer Auslieferung bei gleichzeitig hinreichender Aktualität.
- Reduziert Last auf CMS/API gegenüber strikt SSR pro Request.
- Passend für Vereinswebsite-Szenario (Inhalte ändern sich regelmäßig, aber nicht sekündlich).

### Trade-off / Nebenwirkung
⚖️ **Technischer Kompromiss**
- Es existiert ein bewusstes „Stale Window“ zwischen Inhaltspflege und Sichtbarkeit.
- Unterschiedliche Revalidate-Intervalle (60s Seiten vs. stündliche externe Fetches) können zu kurzzeitig unterschiedlichen Datenständen führen.

---

## 4) Warum externe Sportsysteme via Scraping integriert wurden

### Entscheidung
Spieldaten von fussball.de und click-tt werden via HTML/AJAX-Parsing erfasst und als `termin`-Dokumente in Sanity synchronisiert.

### Belege in der Struktur
- Cronjobs in `vercel.json`:
  - `/api/cron/sync-fussball`
  - `/api/cron/sync-tischtennis`
- Parser/Fetcher:
  - `lib/fussball-de.ts` (Regex/HTML-Struktur)
  - `lib/click-tt.ts` (POST + HTML-Parsing)
- Upsert-Logik in Cron-Routen:
  - `app/api/cron/sync-fussball/route.ts`
  - `app/api/cron/sync-tischtennis/route.ts`

### Einordnung
⚖️ **Technischer Kompromiss**

### Begründung
- Praktische Lösung bei fehlender/stabil nicht genutzter offizieller JSON-API im vorhandenen Setup.
- Vermeidet manuelle Doppelpflege von Spielterminen.
- Vereinheitlicht Ausspielung über bestehenden `termin`-Kanal.

### Risiken
- Fragil gegenüber HTML-/Markup-Änderungen der Quellsysteme.
- Deterministische IDs + `createOrReplace` sind robust für Upserts, können aber manuelle Änderungen an denselben Docs überschreiben.

---

## 5) Warum Patch-Skripte entstanden sind

### Entscheidung
Patch-/Migrationsskripte wurden genutzt, um große Altbestände, Medienzuordnungen und datenqualitative Korrekturen effizient in Sanity zu überführen bzw. nachzuziehen.

### Belege in der Struktur
- Initialmigration: `scripts/migrate-to-sanity.mjs` (JSON/MDX → Sanity).
- Operative Korrekturen: z. B.
  - `scripts/sync-trainingszeiten-from-json.mjs`
  - `scripts/patch-akrobatik-bilder.mjs`
  - `scripts/patch-tischtennis-mannschaften.mjs`
  - weitere `patch-*` / `create-news-*` Skripte.

### Einordnung
- ✅ **Gute Entscheidung** für Migration/Batch-Korrekturen
- ⚖️ **Technischer Kompromiss** bei langfristiger Pflege
- 🧩 **Temporäre Lösungen** bei kampagnenartigen Einmal-Skripten

### Begründung
- Ohne Skripte wären viele Korrekturen (Bilder, Zeiten, Mappings) manuell sehr teuer und fehleranfällig.
- Dry-Run-/Apply-Muster (z. B. Trainingszeiten-Sync) ist sinnvoll für kontrollierte Datenpflege.

### Erkennbarer Nachteil
- Historisch gewachsene Skriptlandschaft mit unterschiedlicher Reife (teils harte Mappings/IDs, teils hardcodierte Defaults/Secrets in einzelnen Skripten).

---

## 6) Warum bestimmte Datenmodelle referenziert statt embedded sind (oder umgekehrt)

## 6.1 Referenzierte Modelle (normalisiert)

### Beobachtung
- `mannschaft` referenziert `sparte`, optional `jahrgang`, sowie `trainer -> person`.
- `trainingszeit` referenziert optional `mannschaft` und `trainingsplatz`.

### Einordnung
✅ **Gute Entscheidung**

### Begründung
- Referenzen schaffen Datenkonsistenz, vermeiden redundante Pflege und ermöglichen zentrale Validierung.
- Besonders sinnvoll bei wiederverwendbaren Entitäten (Personen, Orte, Mannschaften).

---

## 6.2 Embedded-Modelle innerhalb `sparte`

### Beobachtung
- `sparte` enthält `mannschaften[]`, `ansprechpartner[]`, `downloads[]` als eingebettete Objekte.
- Parallel existieren dedizierte Dokumenttypen (`mannschaft`, `ansprechpartner`, `download`).

### Einordnung
⚖️ **Technischer Kompromiss** (historisch bedingt)

### Begründung
- Embedded-Strukturen waren für schnellen Import/Weiterbetrieb pragmatisch (nahe am alten JSON-Modell).
- Für spartenlokale Darstellung zunächst einfach konsumierbar.

### Nachteile
- Doppelpflege-Risiko zwischen embedded und globalen Dokumenten.
- Geringere referentielle Integrität und schwerere langfristige Wartbarkeit.

---

## 6.3 Legacy-Fallback-Felder in `trainingszeit`, `download`, `ansprechpartner`

### Beobachtung
- `trainingszeit` erlaubt entweder Referenzmodell **oder** Fallback (`sparte`, `gruppe`, `ort`, Kontaktfelder).
- Downloads mit `datei` **oder** `dateiUrl`.
- Ansprechpartner mit `gruppe` + veraltetem `sparte`-Feld.

### Einordnung
🧩 **Temporäre Lösung** (Übergangsarchitektur)

### Zweck
- Sichere Migration ohne sofortige Voll-Normalisierung.
- Kompatibilität mit Bestanddaten und schrittweiser Modellhärtung.

---

## 7) Historische Architekturwechsel (erkennbar)

## 7.1 File-based Content → Sanity-first

### Vorher
- README beschreibt dateibasierte Pflege in `content/` (JSON + MDX).

### Heute
- `lib/content.ts` und Queries sind auf Sanity als zentrale Quelle ausgerichtet.
- `scripts/migrate-to-sanity.mjs` dokumentiert den Übergangspfad.

### Einordnung
✅ **Guter strategischer Wechsel**

---

## 7.2 Lokale Datenhaltung → Zentrale CMS-Struktur

### Vorher
- Inhalte lokal im Repo, teils manuell gepflegt.

### Heute
- Zentrales Sanity-Dataset als gemeinsamer Speicher für redaktionelle und automatisiert synchronisierte Inhalte.

### Einordnung
✅ **Gute Entscheidung**

---

## 7.3 Monolithisch-stringbasiert → Teilweise referenzbasiert (mit Legacy-Koexistenz)

### Vorher
- Stärker string-/json-basiertes Modell (z. B. Trainingszeiten als freie Felder).

### Heute
- Referenzmodelle für `mannschaft`, `person`, `trainingsplatz` sind eingeführt.
- Gleichzeitig bleiben Fallbacks aktiv (`coalesce(...)` in Queries, Legacy-Felder in Schemas).

### Einordnung
⚖️ **Sinnvoller Zwischenstand**, aber noch nicht Endzustand.

---

## 8) Gesamtklassifikation der aktuellen Architektur

## Gute Entscheidungen
- Sanity als zentrale Content-Plattform.
- Next.js App Router für content-getriebene, statisch generierbare Routen.
- ISR/Revalidation als Performance-/Freshness-Balance.
- Einführung referenzierter Kernmodelle (`mannschaft`, `person`, `trainingsplatz`).

## Technische Kompromisse
- Scraping statt stabiler API-Integration für externe Sportsysteme.
- Koexistenz von embedded und referenzierten Strukturen.
- Stringfelder für `sparte` in `termin`/`newsPost` statt Referenz.

## Temporäre Lösungen
- Umfangreiche Patch-/Einmal-Skripte für Migration/Korrekturen.
- Legacy-Fallbacks (`trainingszeit`, `download`, `ansprechpartner`) zur Sicherung des laufenden Betriebs.

---

## 9) Fazit

Die Architektur ist klar in Richtung **Sanity-first + Next.js App Router + ISR** ausgerichtet und für den Vereinskontext sehr gut geeignet. 

Der aktuelle Zustand zeigt einen typischen, nachvollziehbaren Migrationspfad: 
- strategisch richtige Zielarchitektur, 
- ergänzt durch operative Kompromisse und temporäre Brücken, 
- um Bestandssysteme und historische Daten ohne Bruch weiterzuführen.
