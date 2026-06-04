# CONTENT FLOW – SV Holm-Seppensen

Stand: 2026-05-10  
Scope: Analyse der Datenflüsse in diesem Repository (ohne Code-/Datenänderungen).

---

## Zielbild (Kurzfassung)

- **Primäres Zielsystem**: Sanity (`production` Dataset) als zentrale Content-Quelle für das Frontend.
- **Datenquellen**: 
  1) manuelle Pflege im Sanity Studio,  
  2) externe Spielplandaten (fussball.de, click-tt) via Cron/API,  
  3) lokale Importquellen (historisch: JSON/MDX, Excel→JSON, PDFs/Bilder aus `public`).
- **Ausgabe**: Next.js Seiten lesen über `lib/content.ts` + `sanity/lib/queries.ts` ausschließlich aus Sanity.

---

## 0) End-to-End Überblick

```mermaid
flowchart LR
  A[Sanity Studio
  manuelle Pflege] --> S[(Sanity Dataset: production)]
  B[fussball.de HTML/AJAX] --> C[/api/cron/sync-fussball]
  D[click-tt HTML POST] --> E[/api/cron/sync-tischtennis]
  C --> S
  E --> S
  F[Legacy content/*.json + content/news/*.mdx] --> G[scripts/migrate-to-sanity.mjs]
  H[Excel .xlsx] --> I[scripts/read-excel.py]
  I --> J[scripts/trainingszeiten-with-times.json]
  J --> K[sync/patch trainingszeiten scripts]
  K --> S
  L[public/pdfs + public/images] --> M[upload/create/patch scripts]
  M --> S
  S --> Q[sanity/lib/queries.ts]
  Q --> R[lib/content.ts]
  R --> U[Next.js Pages]
```

---

## 1) Manuelle Datenpflege (direkt im Sanity Studio)

### Wo sichtbar/strukturiert
- Studio-Konfiguration: `sanity.config.ts`
  - Navigation: News-Beiträge, Termine, Sparten, Trainingszeiten, Ansprechpartner, Downloads, Partner

### Typische manuelle Inhalte
- `newsPost` (`sanity/schemas/newsPost.ts`): Titel, Datum, Kategorie, Sparte, Bild, Textinhalt.
- `sparte` (`sanity/schemas/sparte.ts`): Stammdaten, Teamfoto, embedded Mannschaften, embedded Ansprechpartner, embedded Downloads.
- `trainingszeit` (`sanity/schemas/trainingszeit.ts`): Wochentag/Uhrzeit, entweder Referenzmodell (`mannschaft`,`trainingsplatz`) oder Legacy-Fallback (`sparte`,`gruppe`,`ort`, Kontaktfelder).
- `ansprechpartner` (`sanity/schemas/ansprechpartner.ts`): globale Ansprechpartner.
- `download` (`sanity/schemas/download.ts`): Datei-Asset oder `dateiUrl`-Fallback.
- `termin` (`sanity/schemas/termin.ts`): manuelle Termine + automatisierte Fußball-/TT-Termine.

### Wichtige Studio-Spezifika
- `termin.fussballDeId` ist read-only und als automatisch markiert (`sanity/schemas/termin.ts`), nur für Admin sichtbar.
- Mehrere Schemas haben explizite Legacy-/Fallback-Felder, die weiterhin aktiv sind.

---

## 2) Automatische Datenflüsse

## 2.1 Cronjobs (Vercel)

Quelle: `vercel.json`
- `0 4,5 * * *` → `/api/cron/sync-fussball`
- `0 4,5 * * *` → `/api/cron/sync-tischtennis`

### A) Fußball-Sync
- Endpoint: `app/api/cron/sync-fussball/route.ts`
- Externe Quelle: `lib/fussball-de.ts`
  - Ruft AJAX-Endpunkte von fussball.de ab (`next.games`, `prev.games`)
  - Parsed HTML via Regex/Heuristik in `FussballSpiel`
- Transformation:
  - Dedup nach Spiel-ID
  - Mapping `FussballSpiel -> termin`
  - `_id = fussball-de-<spielId>`
  - Upsert via `transaction.createOrReplace(...)`
- Ziel in Sanity: Dokumenttyp `termin`

### B) Tischtennis-Sync
- Endpoint: `app/api/cron/sync-tischtennis/route.ts`
- Externe Quelle: `lib/click-tt.ts`
  - POST auf click-tt/nuLiga (`clubMeetings`), HTML-Parsing
  - saisonweite + vergangene Spiele kombiniert, dedupliziert
- Transformation:
  - Mapping `TischtennisSpiel -> termin`
  - `_id = click-tt-<spielId>`
  - Upsert via `transaction.createOrReplace(...)`
- Ziel in Sanity: Dokumenttyp `termin`

### Sicherheit / Betrieb
- Beide Cron-Endpoints prüfen `Authorization: Bearer <CRON_SECRET>` (falls gesetzt).
- Schreibzugriff über `SANITY_API_WRITE_TOKEN`.

## 2.2 API/Scraper-Charakter
- **fussball.de** und **click-tt** sind HTML-/AJAX-basierte Scrapes, keine stabile offiziell versionierte JSON-API im Code.
- Parsing ist regex-/strukturabhängig (`lib/fussball-de.ts`, `lib/click-tt.ts`).

---

## 3) Import-/Migrationsprozesse

## 3.1 Legacy JSON + MDX → Sanity (Initialmigration)
- Script: `scripts/migrate-to-sanity.mjs`
- Eingang:
  - `content/*.json` (sparten, termine, trainingszeiten, ansprechpartner, downloads, partner)
  - `content/news/*.mdx`
- Transformation:
  - IDs via `makeId(...)`
  - MDX Frontmatter + Textblöcke → `newsPost` Portable-Text-Blöcke (vereinfacht)
  - Downloads initial als `dateiUrl`-Fallback
- Ziel:
  - `sparte`, `termin`, `trainingszeit`, `ansprechpartner`, `download`, `partner`, `newsPost`
- Charakter:
  - klar als **einmalige Initialmigration** dokumentiert.

## 3.2 Excel → JSON → Trainingszeiten-Korrektur
- Excel-Extraktion: `scripts/read-excel.py`
  - Quelle: lokale Datei `C:/Users/jarig/Desktop/Trainingszeiten angepasst.xlsx`
  - Ziel: `scripts/trainingszeiten-with-times.json`
- Weiterverarbeitung/Abgleich:
  - `scripts/sync-trainingszeiten-from-json.mjs` (Dry-Run/`--apply`, Matching-Logik mit Scores)
  - `scripts/patch-trainingszeiten-uhrzeiten.mjs` (direkter Patch nach Feld-Match)
  - `scripts/patch-uhrzeiten-final.mjs` (harte ID-basierte Korrekturen + Neuanlagen)

## 3.3 PDFs → Sanity Assets + Dokumentverknüpfung
- Script: `scripts/upload-pdfs-to-sanity.mjs`
- Eingang: `public/pdfs/*.pdf` (explizites Mapping `docId -> localFile`)
- Transformation:
  - Upload als Sanity File Asset
  - Patch `download.datei` mit Asset-Ref
- Ziel: bestehende `download`-Dokumente

## 3.4 Legacy-Content Charakter
- README beschreibt noch dateibasiertes `content/`-Pflegebild, produktiv ist aber Sanity-first (`lib/content.ts`: „alle Inhalte kommen aus Sanity CMS“).

---

## 4) Patch-/Korrekturprozesse (Klassifikation)

## 4.1 Einmalaktionen / kampagnenartige Skripte
- `scripts/migrate-to-sanity.mjs` – Initialmigration.
- `scripts/patch-fussball.mjs` – punktuelle Nachpflege Fußball (Kontakt + 2 Bilder).
- `scripts/patch-akrobatik-bilder.mjs` – spezifische Bild-/Textzuordnung Akrobatik.
- `scripts/patch-tischtennis-mannschaften.mjs` – spezifisches Ergänzen + Bilder für TT-Jugendteams.
- `scripts/patch-uhrzeiten-final.mjs` – große, konkrete ID-Liste inkl. Neuanlagen.
- `scripts/create-news-schiris-2026.mjs` – einmalige News-Erstellung.
- `scripts/create-news-ostern-2026.mjs` – einmalige News-Erstellung.

## 4.2 Wiederholt nutzbare operative Skripte
- `scripts/sync-trainingszeiten-from-json.mjs` – wiederholbarer Diff-/Patch-Prozess mit Dry-Run.
- `scripts/patch-trainingszeiten-uhrzeiten.mjs` – wiederholbares Match-basiertes Setzen von `uhrzeit`.
- `scripts/upload-pdfs-to-sanity.mjs` – wiederholbar, sofern Mapping gepflegt wird.
- `scripts/dump-sanity-tz.mjs` – Analyse/Export, read-oriented.
- `scripts/read-excel.py` – wiederholbarer Extraktionsschritt (bei neuer Excel-Version).

## 4.3 Regelmäßig automatisiert
- Nur die beiden Cron-APIs (`sync-fussball`, `sync-tischtennis`) sind eindeutig als regelmäßige Automation konfiguriert.

---

## 5) Risiken

## 5.1 Potenzielle Datenverluste / Überschreiben
- **Cron-Upserts überschreiben Termin-Dokumente deterministisch** (`createOrReplace` mit fixer `_id`).
  - Manuelle Änderungen an solchen Terminen können beim nächsten Sync verloren gehen.
- **Patch-Skripte mit `createOrReplace`/direkten `patch`** können Inhalte überschreiben, wenn ID/Mapping falsch ist.

## 5.2 Kritische Upstream-Abhängigkeiten
- **HTML-Strukturänderungen bei fussball.de / click-tt** können Parser brechen (`lib/fussball-de.ts`, `lib/click-tt.ts`).
- IDs werden aus geparsten Strings erzeugt; Struktur-/Textänderungen können neue IDs erzeugen (Duplikatrisiko statt Update).

## 5.3 Inkonsistenzrisiken im Modell
- Mischmodell aus Referenzen und Legacy-Fallback in `trainingszeit` (`sanity/schemas/trainingszeit.ts`, `sanity/lib/queries.ts` mit `coalesce`).
- Doppelpflege-Pfade:
  - `sparte.mannschaften[]` (embedded) vs. eigener Typ `mannschaft`
  - `sparte.ansprechpartner[]` (embedded) vs. eigener Typ `ansprechpartner`/`person`
  - `sparte.downloads[]` (embedded) vs. eigener Typ `download`
- Stringbasierte Sparte in `termin`/`newsPost` statt Referenz → keine referentielle Integrität bei Umbenennungen.
- Frontend-Matching-Heuristik in `app/sparten/[slug]/page.tsx` (Keyword-Match Gruppe↔Mannschaft) kann falsch zuordnen.

## 5.4 Betriebs-/Security-Risiken
- Mehrere Scripts enthalten Hardcoded-Token-Fallbacks (z. B. `patch-fussball.mjs`, `patch-akrobatik-bilder.mjs`, `patch-tischtennis-mannschaften.mjs`) → hohes Secret-Leak-Risiko.
- Einige Importpfade sind lokal/hart kodiert (`read-excel.py` Desktop-Pfad) → geringe Portabilität, hoher Bedienfehlerfaktor.

---

## 6) Detailfluss: Termine-Automation

```mermaid
flowchart TD
  V[vercel.json crons] --> F[/api/cron/sync-fussball]
  V --> T[/api/cron/sync-tischtennis]
  F --> F1[lib/fussball-de.ts: fetch + parse HTML]
  T --> T1[lib/click-tt.ts: POST + parse HTML]
  F1 --> M1[Mapping auf termin-Dokument]
  T1 --> M2[Mapping auf termin-Dokument]
  M1 --> S[(Sanity: _type=termin)]
  M2 --> S
  S --> Q[sanity/lib/queries.ts termineQuery]
  Q --> FE[app/termine/* Frontend]
```

---

## 7) Relevante Dateien (Index)

- **Datenzugriff Frontend**: `lib/content.ts`, `sanity/lib/queries.ts`
- **Cron-Automation**: `vercel.json`, `app/api/cron/sync-fussball/route.ts`, `app/api/cron/sync-tischtennis/route.ts`
- **Externe Parser/Scraper**: `lib/fussball-de.ts`, `lib/click-tt.ts`
- **Migration/Import/Patches**: 
  - `scripts/migrate-to-sanity.mjs`
  - `scripts/read-excel.py`
  - `scripts/trainingszeiten-with-times.json`
  - `scripts/sync-trainingszeiten-from-json.mjs`
  - `scripts/patch-trainingszeiten-uhrzeiten.mjs`
  - `scripts/patch-uhrzeiten-final.mjs`
  - `scripts/upload-pdfs-to-sanity.mjs`
  - `scripts/patch-fussball.mjs`
  - `scripts/patch-akrobatik-bilder.mjs`
  - `scripts/patch-tischtennis-mannschaften.mjs`
  - `scripts/create-news-schiris-2026.mjs`
  - `scripts/create-news-ostern-2026.mjs`
- **Schema-/Studio-Modellierung**: `sanity.config.ts`, `sanity/schemas/*.ts`

---

## 8) Fazit

Das Projekt ist operativ **Sanity-zentriert**, mit zwei klaren, regelmäßigen externen Syncs (Fußball/Tischtennis) und mehreren historischen bzw. kampagnenartigen Import-/Patch-Skripten. Die größten Risiken liegen in:

1. **Scraper-Fragilität** gegenüber Upstream-HTML-Änderungen,  
2. **Mischmodell aus Legacy + Referenzdaten**,  
3. **überschreibenden Upserts** bei automatisierten Terminflüssen,  
4. **harten Mappings/IDs/Secrets** in Einmal-Skripten.
