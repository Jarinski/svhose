# ARCHITECTURE DECISIONS – SV Holm-Seppensen

Stand: 2026-10-03 (Abschnitt 0 neu; Abschnitte 1–9 historisch, Stand 2026-05-10)  
Scope: Wesentliche Architekturentscheidungen des Projekts, zuletzt der Wechsel von Sanity zu SQLite.

---

## Ziel dieses Dokuments

Dieses Dokument hält wesentliche Architekturentscheidungen fest und unterscheidet bewusst zwischen:

- **Gute Entscheidungen** (tragfähig / zielgerichtet)
- **Technische Kompromisse** (bewusste Trade-offs)
- **Temporäre Lösungen** (Übergang / operativer Hotfix-Charakter)

Zusätzlich werden erkennbare **historische Architekturwechsel** dokumentiert.

---

## 0) Oktober 2026: Wechsel von Sanity zu SQLite

### Entscheidung
Sanity wird **direkt und vollständig** durch eine eigene **SQLite-Datenbank** ersetzt
(`data/svhs.db`, Zugriff über Drizzle ORM, Schema in `lib/db/schema.ts`). Bilder und Dateien liegen
in einem lokalen Medienordner (`data/medien`) und werden unter `/medien/<pfad>` ausgeliefert.
Betrieben wird künftig auf einem **eigenen Server** (geplant: Hetzner) statt auf Vercel.

Da die Website noch nicht produktiv ist, gibt es keinen Parallelbetrieb und keinen Umschalter:
Sanity, `/studio` und das Studio-Handbuch (`/handbuch`) sind entfernt. Die Inhalte wurden am
03.10.2026 einmalig exportiert (`scripts/sanity-export.mjs`) und importiert (`npm run import:sanity`).
Gepflegt wird bis zur eigenen Verwaltung `/verwaltung` per Drizzle Studio (`npm run db:studio`).

### Gründe
- **Registrierung und Bedienung zu kompliziert**: Jede Person brauchte ein eigenes Sanity-Konto
  und eine Einladung über manage.sanity.io. Es gab keine abgestuften Rechte, dafür die
  Entwurf/Publish-Reihenfolge-Falle bei neuen Personen und eine halb englische Oberfläche.
  Details: `CMS_KONZEPT.md`, Abschnitt 2.
- **Eigener Server**: Mit einem eigenen Server liegt eine Datenbank als Datei direkt neben der
  Anwendung. Es braucht keinen zusätzlichen Datenbankdienst und kein Fremdkonto.
- **Kleine Datenmenge**: Der Export vom 03.10.2026 umfasst gut 400 Datensätze (davon 177 Termine)
  und 32 Dateien mit ca. 17 MB. Dafür ist ein externes CMS oder ein Datenbankserver überdimensioniert.
- **Altlasten im Sanity-Modell**: eingebettete Mannschaften neben zentralen Dokumenten,
  Fallback-Felder, Sparten als Freitext, Stichwort-Heuristik auf der Spartenseite (Abschnitte 6 und 7.3).
  Ein relationales Schema mit Fremdschlüsseln und CHECKs löst das an der Wurzel.

### Betrachtete Alternativen

| Option | Bewertung |
|---|---|
| **Sanity behalten** (ggf. mit eigener Oberfläche davor) | Löst die Abhängigkeit, die Altlasten und die Kontenfrage nicht. Verworfen. |
| **JSON-Dateien** (im Repo oder auf dem Server) | Sehr einfach, keine Abhängigkeit. Aber keine Beziehungen und keine Integritätsprüfung, also genau die Probleme des früheren `content/`-Modells. Gleichzeitiges Schreiben ist heikel. Im Repo wären personenbezogene Kontaktdaten öffentlich, und jede Änderung bräuchte ein Deployment. Verworfen. |
| **Postgres** (Neon über Vercel oder selbst betrieben) | Voller Funktionsumfang und war im ersten Konzept vorgesehen. Auf dem eigenen Server aber ein zusätzlicher Dienst, der betrieben, gesichert und aktualisiert werden muss; als Neon ein weiteres Fremdkonto mit Auftragsverarbeitung. Für unsere Datenmenge unnötig. |
| **SQLite** ✅ | Eine Datei, kein Serverprozess, Transaktionen, Fremdschlüssel und CHECK-Constraints. Ein Backup ist eine Dateikopie. Drizzle liefert typsichere Abfragen und Migrationen. Grenze: nur ein Server, keine Serverless-Plattform. |

### Einordnung
✅ **Gute Entscheidung**

### Folgen
- **Positiv**
  - Keine externe CMS-Abhängigkeit und keine Tokens für das Lesen von Inhalten.
  - Änderungen sind sofort sichtbar: Die Datenbank-Seiten rendern dynamisch (`force-dynamic`),
    ISR und Revalidate-Fenster entfallen.
  - Strenges Datenmodell: Mannschaften und Gruppen als eigene Tabellen, Trainingszeiten fest an
    Mannschaft und/oder Gruppe, Trainerteams mit Rolle pro Zuordnung, Vereinsfunktionen getrennt,
    News, Termine und Downloads mit echten Bezügen statt Freitext (`DATA_MODEL.md`).
  - `lib/content.ts` behält die Funktionsnamen; die Seiten mussten kaum angepasst werden.
  - Weniger Ballast: Pakete `sanity`, `next-sanity`, `@sanity/image-url`, `styled-components`
    sowie alle Patch- und Migrationsskripte sind entfernt.
- **Negativ / Aufwand**
  - Bis zur Verwaltung `/verwaltung` können nur technisch Verantwortliche pflegen (Drizzle Studio),
    ohne Rechte, Verlauf und Rückgängig.
  - Betrieb, Updates, TLS und **Backups** liegen in eigener Verantwortung (`OPERATIONS.md`).
  - Vercel ist mit SQLite nicht mehr nutzbar. Die Cronjobs laufen per crontab auf dem Server.
  - Bilder werden nicht mehr von einem CDN skaliert und ausgeliefert.
- **Auswirkungen auf frühere Entscheidungen**

| Abschnitt | Status |
|---|---|
| 1) Sanity als zentrale Content-Quelle | abgelöst durch SQLite |
| 2) Next.js App Router | gilt weiter |
| 3) ISR / Revalidation | abgelöst: Datenbank-Seiten rendern dynamisch; nur `/fussball` und `/tischtennis` behalten `revalidate = 3600` |
| 4) Scraping externer Sportsysteme | gilt weiter; Ziel ist jetzt die Tabelle `termine` (Upsert über `quelle` + `externe_id`), Aufruf per crontab |
| 5) Patch-Skripte | erledigt: Skripte entfernt; Korrekturen laufen direkt in der Datenbank |
| 6) Referenziert vs. embedded | abgelöst durch das relationale Schema |
| 7) Historische Architekturwechsel | ergänzt um diesen Wechsel |
| 8) und 9) Gesamtklassifikation, Fazit | historisch |

Weitere Folgeentscheidungen: News-Text als Markdown statt Portable Text, Partner entfallen
(wurden nirgends angezeigt), Jahrgänge und Trainingsplätze entfallen (keine Einträge). Für den
späteren Telegram-Bot ist OpenRouter statt der direkten Anthropic-API vorgesehen
(`CMS_KONZEPT.md`).

---

> **Historisch (Stand 2026-05-10):** Die folgenden Abschnitte 1–9 beschreiben die Architektur zur
> Sanity-Zeit. Sie bleiben zur Nachvollziehbarkeit erhalten. Was davon heute noch gilt, steht in
> der Tabelle in Abschnitt 0. Genannte Dateien wie `sanity/lib/queries.ts`, `vercel.json`-Crons oder
> `scripts/patch-*.mjs` gibt es teils nicht mehr.

---

## 1) Warum Sanity als zentrale Content-Quelle genutzt wird (historisch)

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

## 2) Warum Next.js App Router verwendet wird (historisch)

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

## 3) Warum ISR / Revalidation genutzt wird (historisch)

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

## 4) Warum externe Sportsysteme via Scraping integriert wurden (historisch)

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

## 5) Warum Patch-Skripte entstanden sind (historisch)

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

## 6) Warum bestimmte Datenmodelle referenziert statt embedded sind (oder umgekehrt) (historisch)

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

## 7.4 Sanity-first → eigene SQLite-Datenbank (Oktober 2026)

### Vorher
- Sanity-Dataset mit Studio, GROQ-Queries und Mischmodell aus Referenzen, eingebetteten Daten und Fallback-Feldern.

### Heute
- SQLite-Datei mit relationalem Schema (Drizzle), lokaler Medienordner, eigener Server.
- Einmalige Übernahme am 03.10.2026; Sanity, Studio und Altskripte sind entfernt.

### Einordnung
✅ **Gute Entscheidung**. Begründung und Folgen: Abschnitt 0.

---

## 8) Gesamtklassifikation der Architektur (historisch, Stand 2026-05-10)

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

## 9) Fazit (historisch, Stand 2026-05-10)

Die Architektur ist klar in Richtung **Sanity-first + Next.js App Router + ISR** ausgerichtet und für den Vereinskontext sehr gut geeignet. 

Der aktuelle Zustand zeigt einen typischen, nachvollziehbaren Migrationspfad: 
- strategisch richtige Zielarchitektur, 
- ergänzt durch operative Kompromisse und temporäre Brücken, 
- um Bestandssysteme und historische Daten ohne Bruch weiterzuführen.
