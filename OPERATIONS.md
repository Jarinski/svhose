# OPERATIONS.md

Technische Betriebs- und Wartungsdokumentation für das Projekt **sv-holm-seppensen**.

---

## Ziel / Scope

Dieses Dokument beschreibt den produktiven Betrieb auf Vercel, die relevanten Umgebungsvariablen, automatisierte Synchronisationen (Cronjobs), externe Abhängigkeiten, typische Deployment-Risiken sowie Recovery-/Wartungsabläufe.

Stand der Analyse: auf Basis der aktuellen Repository-Konfiguration (u. a. `vercel.json`, `app/api/cron/*`, `lib/*`, `sanity/lib/client.ts`, `scripts/*`).

---

## 1) Hosting

### 1.1 Vercel Setup

- **Framework**: Next.js (`vercel.json` → `"framework": "nextjs"`)
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Automatische Deployments**: über Git-Push (gemäß README-Workflow)

### 1.2 Wichtige Build-Einstellungen

- In `vercel.json` sind Build-Env-Werte gesetzt für:
  - `NEXT_PUBLIC_SANITY_PROJECT_ID`
  - `NEXT_PUBLIC_SANITY_DATASET`
  - `NEXT_PUBLIC_SANITY_API_VERSION`
- `next.config.js`:
  - `transpilePackages`: `sanity`, `@sanity/ui`, `next-sanity`, `styled-components`
  - `images.remotePatterns`: erlaubt `https://cdn.sanity.io/**`

### 1.3 ISR / Revalidation

Projekt nutzt ISR auf mehreren Ebenen:

1. **Page-Level ISR** per `export const revalidate = ...`
   - Viele Seiten: `revalidate = 60` (z. B. `app/news/page.tsx`, `app/page.tsx`, `app/termine/page.tsx`)
   - Fußball/Tischtennis-Seiten: `revalidate = 3600`

2. **Fetch-Level ISR**
   - `lib/fussball-de.ts`: `fetch(..., { next: { revalidate: 3600 } })`

3. **Sanity Query Revalidation**
   - `sanity/lib/client.ts`: `sanityFetch(..., revalidate = 60)` als Standard

4. **Sonderfall Studio**
   - `app/studio/[[...tool]]/page.tsx`: `dynamic = 'force-dynamic'`

Hinweis: `click-tt`-Datenzugriffe verwenden POST + `cache: 'no-store'`; Aktualität wird dort primär über Page-Level-ISR und Cron-Sync nach Sanity erreicht.

---

## 2) Environment-Variablen

Quelle: `.env.local.example`, Cron-Routen, Sanity-Client, Scripts.

### 2.1 Variablenübersicht

1. `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - Zweck: Sanity-Projektidentifikation (Read + Write-Client-Konfiguration)
   - Sensibilität: **niedrig bis mittel** (public-prefix)

2. `NEXT_PUBLIC_SANITY_DATASET`
   - Zweck: Dataset-Auswahl (i. d. R. `production`)
   - Sensibilität: **niedrig**

3. `NEXT_PUBLIC_SANITY_API_VERSION`
   - Zweck: API-Versionierung für Sanity-Requests
   - Sensibilität: **niedrig**

4. `SANITY_API_WRITE_TOKEN`
   - Zweck: Schreibzugriff auf Sanity (Cron-Upserts, Migrationen, Patch-/Upload-Skripte)
   - Sensibilität: **kritisch / hochsensibel**

5. `CRON_SECRET`
   - Zweck: Absicherung von `/api/cron/*` via `Authorization: Bearer <secret>`
   - Sensibilität: **kritisch / hochsensibel**

### 2.2 Kritische Hinweise

- `SANITY_API_WRITE_TOKEN` und `CRON_SECRET` dürfen nur in sicherem Secret-Store (Vercel Env, lokale `.env.local`) liegen.
- Public-Variablen mit `NEXT_PUBLIC_` sind clientseitig sichtbar und **nicht** für Geheimnisse geeignet.

---

## 3) Cronjobs

Quelle: `vercel.json`, `app/api/cron/*`.

### 3.1 Existierende Cronjobs

1. `GET /api/cron/sync-fussball`
   - Schedule: `0 4,5 * * *`
   - Läuft täglich um **04:00** und **05:00** (Server-/Vercel-Zeitzone beachten)
   - Funktion:
     - lädt kommende + vergangene Spiele von fussball.de
     - dedupliziert
     - schreibt per `createOrReplace` als `termin`-Dokumente nach Sanity

2. `GET /api/cron/sync-tischtennis`
   - Schedule: `0 4,5 * * *`
   - Läuft täglich um **04:00** und **05:00**
   - Funktion:
     - lädt Saison-/Vergangenheitsdaten aus click-tt
     - dedupliziert
     - schreibt per `createOrReplace` als `termin`-Dokumente nach Sanity

### 3.2 Authentifizierung / Sicherheit

- Beide Endpunkte prüfen optional `CRON_SECRET`.
- Bei gesetztem Secret wird ein exakter Bearer-Vergleich erzwungen.
- Falscher/missing Token ⇒ `401 Unauthorized`.

### 3.3 Betriebsverhalten bei Fehlern

- Fehlende Sanity-Konfiguration/Write-Token ⇒ `500`.
- Externe Fetch-/Parser-Fehler werden geloggt; Route liefert Fehler-JSON.

---

## 4) Externe Abhängigkeiten

### 4.1 fussball.de

- Modul: `lib/fussball-de.ts`
- Zugriff auf öffentliche AJAX-Endpunkte:
  - `https://www.fussball.de/ajax.club.next.games/...`
  - `https://www.fussball.de/ajax.club.prev.games/...`
- Parsing über HTML/Regex (struktursensitiv)
- Risiko: HTML-Strukturänderungen brechen Extraktion.

### 4.2 click-tt (nuLiga/TTVN)

- Modul: `lib/click-tt.ts`
- Zugriff via POST auf:
  - `https://ttvn.click-tt.de/cgi-bin/WebObjects/nuLigaTTDE.woa/wa/clubMeetings`
- Parsing aus HTML-Tabelle (`result-set`)
- Risiko: Markup- oder Formularänderungen brechen Parsing.

### 4.3 Sanity APIs

- Read/Fetch: `next-sanity` Client (`sanity/lib/client.ts`)
- Write: Cron-Routen + diverse Node-Skripte via `@sanity/client`
- Abhängigkeit von:
  - gültiger Project-ID / Dataset
  - API-Version
  - gültigem Write-Token

---

## 5) Deployment-Risiken

### 5.1 Build-Failures

- Falsche/fehlende Env-Konfiguration (insb. Sanity-Parameter) kann zu Funktionseinschränkungen führen.
- `sanity/lib/client.ts` hat Fallback `projectId: 'placeholder'`, wodurch Build nicht zwingend failt, aber Datenzugriffe leer laufen können.
- Änderungen an `next.config.js` (`transpilePackages`, image-remotePatterns) können Runtime-/Build-Probleme verursachen.

### 5.2 Token-Probleme

- Ungültiges/abgelaufenes `SANITY_API_WRITE_TOKEN` ⇒ Cron-/Patch-/Migrationsskripte schlagen fehl.
- Falsches `CRON_SECRET` ⇒ Cron-Aufrufe liefern 401.
- Token-Rotation ohne gleichzeitige Anpassung in Vercel + lokal führt zu partiellen Ausfällen.

### 5.3 Scraper-/Datenquellenprobleme

- HTML-Änderungen bei fussball.de / click-tt führen zu `0` Treffern oder fehlerhaften Daten.
- Netzwerk-/Rate-Limit-/bot-protection-Effekte möglich.
- Parser sind nicht API-contract-basiert, sondern markupsensitiv.

---

## 6) Recovery / Wartung

### 6.1 Vorhandene Reparatur-/Patch-Skripte

Wichtige Skripte im Ordner `scripts/`:

- `migrate-to-sanity.mjs`
  - Initiale oder erneute Übernahme lokaler Inhaltsdaten nach Sanity
- `sync-trainingszeiten-from-json.mjs`
  - Abgleich/Korrektur von Trainingszeiten
  - unterstützt Dry-Run und `--apply` für echte Updates
- `dump-sanity-tz.mjs`
  - Export/Inspection der Trainingszeit-Datensätze
- `upload-pdfs-to-sanity.mjs`
  - Upload + Verknüpfung von Download-PDFs
- `patch-*.mjs` (z. B. Fußball, Tischtennis, Akrobatik, Uhrzeiten)
  - gezielte Korrekturen einzelner Inhalte/Assets

### 6.2 Typischer Recovery-Ablauf bei Datenfehlern

1. **Fehlerbild eingrenzen** (welcher Content-Type, welche Quelle).
2. **Ist-Stand prüfen** (Sanity Studio + ggf. `dump-sanity-tz.mjs`).
3. **Dry-Run** bei unterstützten Skripten (ohne `--apply`).
4. **Gezielten Patch/Migration ausführen**.
5. **Ergebnis validieren** (Studio + Frontend-Seite nach Revalidation).

### 6.3 Manuelle Datenkorrekturen

- Kleinere Korrekturen direkt in Sanity Studio möglich.
- Wiederholbare technische Korrekturen bevorzugt als Skript (Nachvollziehbarkeit).

---

## 7) Sicherheitsbewertung

### 7.1 Umgang mit Tokens (Ist-Stand)

- Positiv:
  - Hauptpfad nutzt Env-Variablen (`.env.local`, Vercel Env).
  - Cron-Endpunkte mit Bearer-Secret absicherbar.

- Kritisch:
  - In mehreren Patch-Skripten sind **harte Sanity-Tokens im Quellcode hinterlegt** (Fallback oder direkt gesetzt).
  - Das ist ein erhebliches Geheimnis-Leak-Risiko (Repository, Logs, lokale Kopien).

### 7.2 Aktuelle Risiken (Priorisiert)

1. **Hoch**: Hardcoded Write-Token in `scripts/patch-fussball.mjs`, `scripts/patch-tischtennis-mannschaften.mjs`, `scripts/patch-akrobatik-bilder.mjs`.
2. **Mittel-Hoch**: Scraper-Abhängigkeit von externem HTML (fussball.de/click-tt).
3. **Mittel**: Cron-Ausfälle bei Secret-Mismatch oder Token-Rotation.
4. **Mittel**: Silent Data Staleness durch ISR/Caching bei ausbleibender Cron-Synchronisation.

### 7.3 Empfehlungen

1. **Sofortmaßnahme**
   - Hardcoded Tokens entfernen und kompromittierte Tokens rotieren.
   - Nur `process.env.SANITY_API_WRITE_TOKEN` erlauben; bei Fehlen hart abbrechen.

2. **Secret-Management härten**
   - Vercel Environment Variables als Single Source of Truth.
   - Regelmäßige Token-Rotation + dokumentierter Rollout-Prozess.

3. **Monitoring verbessern**
   - Cron-Responses überwachen (Statuscodes, synced counts).
   - Alerts bei `synced = 0` über mehrere Läufe oder bei 5xx.

4. **Scraper-Robustheit**
   - Parser-Healthchecks (z. B. Mindestanzahl Spiele).
   - Fail-safe Verhalten mit klaren Logs und unveränderten Bestandsdaten.

5. **Runbooks ergänzen**
   - Operative Checklisten für „Token-Rotation“, „Cron defekt“, „Scraper defekt“, „Sanity write fail“.

---

## Anhang: Relevante Betriebsdateien

- `vercel.json`
- `next.config.js`
- `.env.local.example`
- `app/api/cron/sync-fussball/route.ts`
- `app/api/cron/sync-tischtennis/route.ts`
- `lib/fussball-de.ts`
- `lib/click-tt.ts`
- `sanity/lib/client.ts`
- `scripts/*.mjs`
