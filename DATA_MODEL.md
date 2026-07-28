# DATA MODEL – SV Holm-Seppensen (Sanity)

Stand: Analyse auf Basis der vorhandenen Schemas, Queries und Content-Zugriffe im Frontend/Skripten.

---

## Zielbild dieser Dokumentation

- **Fachliche Übersicht**: Welche Inhalte gibt es und wofür sind sie gedacht?
- **Technische Übersicht**: Wie sind Dokumenttypen/Felder/Referenzen modelliert?
- **Betriebliche Übersicht**: Was ist öffentlich sichtbar, was intern/systemisch?
- **Übergangssicht**: Wo gibt es Legacy-/Fallback-Strukturen?

---

## 1) Sanity-Dokumenttypen

> Registrierte Typen laut `sanity/schemas/index.ts`:
`sparte`, `person`, `jahrgang`, `mannschaft`, `trainingsplatz`, `termin`, `trainingszeit`, `ansprechpartner`, `download`, `partner`, `newsPost`

## Zielmodell: zentrale CRUD-Modelle im Sanity Studio

Das künftige produktive Zielmodell besteht aus echten zentralen CRUD-Dokumenttypen im Sanity Studio:

1. `person` – zentrale Quelle für Trainer:innen, Ansprechpartner:innen, Vorstand usw.
2. `sparte` – zentrale Quelle für Vereinsabteilungen/Sparten.
3. `mannschaft` – zentrale Quelle für Mannschaften und Trainingsgruppen.
4. `trainingszeit` – zentrale Quelle für Trainingszeiten; referenziert Mannschaft/Trainingsgruppe und Trainingsplatz.
5. `termin` – zentrale Quelle für Termine.
6. `newsPost` – zentrale Quelle für News.

Fachliche Beziehungen im Zielmodell:

- Eine `sparte` hat viele `mannschaft`-Dokumente.
- Eine `mannschaft` gehört zu genau einer `sparte`.
- Eine `mannschaft` hat eine oder mehrere `trainingszeit`-Dokumente.
- Eine `trainingszeit` gehört zu genau einer `mannschaft`.
- Eine `person` kann mehreren `mannschaft`-Dokumenten zugeordnet werden.
- Eine `mannschaft` kann mehrere `person`-Dokumente als Trainer:innen/Ansprechpartner:innen referenzieren.
- Ansprechpartner auf der Kontaktseite können ebenfalls auf zentrale `person`-Dokumente verweisen.

Nicht-Ziel für die produktive Hauptquelle:

- Keine eingebetteten Mannschaften in `sparte.mannschaften[]` als produktive Hauptquelle.
- Keine Trainer-/Telefonnummern als produktive Inline-Freitexte in `trainingszeit`.
- Keine sichtbaren Website-Inhalte aus alten JSON-Dateien.
- Keine Mannschaften, die nur aus `trainingszeit.gruppe` entstehen.
- Keine parallele Pflege derselben Mannschaft in `sparte.mannschaften[]` und `mannschaft`.

Aktueller Übergang: Legacy-/Fallback-Felder bleiben vorhanden, werden aber nur noch als Altbestand/Diagnose betrachtet. Die Migration `scripts/migrate-to-central-crud-models.mjs` normalisiert aus `sparte.mannschaften[]`, Personenquellen und eindeutigen Trainingszeit-Matches in Richtung zentraler Dokumente, ohne Legacy-Felder zu löschen.

## 1.1 sparte

- **Zweck**: Zentrale Quelle für Vereinsabteilungen/Sparten inkl. Darstellung und spartenbezogener Metadaten.
- **Wichtigste Felder**:
  - `slug`, `name`, `icon`, `farbe`, `beschreibung`, `langbeschreibung`, `foto`
  - `trainingszeiten_spartes: string[]` (Matching-Key zu Trainingszeiten)
  - `mannschaften[]` (**embedded objects**, kein Reference-Typ)
  - `ansprechpartner[]` (**embedded objects**, kein Reference-Typ)
  - `downloads[]` (embedded; `datei` + `dateiUrl` Fallback)
- **Referenzen**: Keine echten Sanity-References innerhalb von `sparte`.
- **Besonderheiten**:
  - `sparte.mannschaften[]` bleibt als Legacy-/Übergangsbestand erhalten, ist aber nicht mehr produktive Hauptquelle für Mannschaften/Trainingsgruppen.
  - Mannschaften/Gruppen sollen künftig über zentrale `mannschaft`-Dokumente gepflegt werden.
  - `trainingszeiten_spartes` steuert Frontend-Zuordnung von Trainingszeiten über String-Vergleich.

## 1.2 person

- **Zweck**: Zentrale Personendaten (Trainer, Betreuer, Ansprechpartner etc.) für referenzierte Nutzung.
- **Wichtigste Felder**: `name`, `rollen[]`, `email`, `telefon`, `whatsapp`, `foto`, `reihenfolge`.
- **Referenzen**: Wird von `jahrgang.trainer[]` und `mannschaft.trainer[]` referenziert.
- **Besonderheiten**:
  - Rollen sind kontrollierte Werte (Liste), aber nicht strikt required.

## 1.3 jahrgang

- **Zweck**: Alters-/Jahrgangscluster (v. a. Jugendbereich).
- **Wichtigste Felder**: `name`, `jahrgangVon`, `jahrgangBis`, `altersklasse`, `beschreibung`, `trainer[]`, `reihenfolge`.
- **Referenzen**:
  - `trainer[] -> person`
  - Wird von `mannschaft.jahrgang` referenziert.
- **Besonderheiten**:
  - Trainer können sowohl auf Jahrgangs- als auch Mannschaftsebene hängen.

## 1.4 mannschaft

- **Zweck**: Zentrale Quelle für Mannschaften und Trainingsgruppen.
- **Wichtigste Felder**: `name`, `bereich`, `sparte`, `jahrgang`, `beschreibung`, `trainer[]`, `foto`, `reihenfolge`.
- **Referenzen**:
  - `sparte -> sparte`
  - `jahrgang -> jahrgang`
  - `trainer[] -> person`
  - Wird von `trainingszeit.mannschaft` referenziert.
- **Besonderheiten**:
  - Produktive Mannschaften/Trainingsgruppen werden hier gepflegt, nicht parallel in `sparte.mannschaften[]`.
  - `trainer[]` referenziert zentrale `person`-Dokumente; eine Person kann in mehreren Mannschaften verwendet werden.
  - Validierung: Wenn `bereich == Junioren`, muss `jahrgang` gesetzt sein.

## 1.5 trainingsplatz

- **Zweck**: Zentrale Orts-/Platzdaten für Trainingszeiten.
- **Wichtigste Felder**: `name`, `typ`, `adresse`, `beschreibung`, `reihenfolge`.
- **Referenzen**: Wird von `trainingszeit.trainingsplatz` referenziert.
- **Besonderheiten**:
  - Unterstützt Standardisierung von Orten, ersetzt freie Ortstexte.

## 1.6 trainingszeit

- **Zweck**: Zentrale Quelle für Trainings-Slots (Tag, Zeit, Ort) mit Referenz auf Mannschaft/Trainingsgruppe und Trainingsplatz.
- **Wichtigste Felder**:
  - **Aktuell**: `mannschaft` (ref), `trainingsplatz` (ref)
  - **Fallback/Legacy**: `sparte`, `gruppe`, `ort`, `trainer`, `email`, `telefon`
  - Allgemein: `tag`, `uhrzeit`, `jahreszeit`, `frequenz`, `foto`
- **Referenzen**:
  - `mannschaft -> mannschaft`
  - `trainingsplatz -> trainingsplatz`
- **Besonderheiten**:
  - Trainingszeiten bleiben eigene Dokumente und werden nicht in Mannschaften eingebettet.
  - Produktiv sollen Trainer:innen/Kontakte über `mannschaft.trainer[] -> person` gepflegt werden, nicht über Inline-Freitextfelder.
  - Dokumentvalidierung erlaubt **entweder** Referenzmodell **oder** Legacy-Fallback:
    - `mannschaft` ODER (`sparte` + `gruppe`)
    - `trainingsplatz` ODER `ort`
  - Query nutzt `coalesce(...)`, um Referenzdaten gegenüber Legacy-Feldern zu bevorzugen.

## 1.7 termin

- **Zweck**: Veranstaltungstermine/Kalender.
- **Wichtigste Felder**: `titel`, `datum`, `uhrzeit`, `ort`, `sparte`, `beschreibung`, `bild`, `tags`, `fussballDeId`.
- **Referenzen**: Keine; `sparte` ist String.
- **Besonderheiten**:
  - `fussballDeId` ist read-only und nur für Admin sichtbar (Sync-Metadatum).

## 1.8 ansprechpartner

- **Zweck**: Allgemeine Kontaktpersonen (z. B. Vorstand, Abteilungsleiter).
- **Wichtigste Felder**: `name`, `funktion`, `gruppe`, `sparte (veraltet)`, `email`, `telefon`, `foto`, `reihenfolge`.
- **Referenzen**: Optional `person -> person` für zentrale Kontaktperson.
- **Besonderheiten**:
  - Feld `sparte` ist explizit als **veraltet** markiert.
  - Frontend nutzt `gruppe` mit Fallback auf `sparte`.

## 1.9 download

- **Zweck**: Globale Downloads/Dokumente.
- **Wichtigste Felder**: `titel`, `beschreibung`, `datei`, `dateiUrl`, `kategorie`, `datum`, `reihenfolge`.
- **Referenzen**: Keine.
- **Besonderheiten**:
  - Duale Dateiablage: Sanity-Asset (`datei`) oder URL-Fallback (`dateiUrl`).

## 1.10 partner

- **Zweck**: Partner/Sponsoren-Links.
- **Wichtigste Felder**: `name`, `logo`, `url`, `reihenfolge`.
- **Referenzen**: Keine.

## 1.11 newsPost

- **Zweck**: News/Blogbeiträge.
- **Wichtigste Felder**: `title`, `slug`, `datum`, `category`, `sparte`, `image`, `excerpt`, `body` (Portable Text).
- **Referenzen**: Keine; `sparte` als String.
- **Besonderheiten**:
  - `body` erlaubt Block-Content + Bilder.

---

## 2) Beziehungen zwischen Modellen

## 2.1 Ziel-Referenzmodell (produktiv)

- `mannschaft -> sparte`
- `mannschaft -> jahrgang`
- `mannschaft -> person (trainer[])`
- `jahrgang -> person (trainer[])`
- `trainingszeit -> mannschaft`
- `trainingszeit -> trainingsplatz`
- `ansprechpartner -> person` optional für Kontaktseite

## 2.2 Legacy-/Übergangsbeziehungen (string-basiert / embedded)

- `trainingszeit.sparte/gruppe/ort/trainer/...` statt Referenzen
- `sparte.mannschaften[]` (embedded, nicht `-> mannschaft`)
- `sparte.ansprechpartner[]` (embedded, nicht `-> ansprechpartner`/`person`)
- `sparte.downloads[]` (embedded, nicht `-> download`)
- `termin.sparte` als String
- `newsPost.sparte` als String
- `ansprechpartner.sparte` als legacy String-Fallback

## 2.3 Mermaid-Übersicht

```mermaid
graph TD
  SP[sparte]
  MA[mannschaft]
  JG[jahrgang]
  PE[person]
  TZ[trainingszeit]
  TP[trainingsplatz]
  AP[ansprechpartner]
  DL[download]
  TE[termin]
  NW[newsPost]

  MA -->|ref: sparte| SP
  MA -->|ref: jahrgang| JG
  MA -->|ref: trainer[]| PE
  JG -->|ref: trainer[]| PE
  TZ -->|ref: mannschaft| MA
  TZ -->|ref: trainingsplatz| TP

  TZ -.legacy sparte/gruppe/ort/trainer.-> SP
  SP -.embedded mannschaften[].-> MA
  SP -.embedded ansprechpartner[].-> AP
  SP -.embedded downloads[].-> DL
  TE -.string sparte.-> SP
  NW -.string sparte.-> SP
  AP -.legacy sparte.-> SP
```

---

## 3) Öffentlich relevante Daten

Direkt im Website-Frontend genutzt (Query + Rendering):

- **Sparte**: Name/Icon/Farbe/Beschreibungen/Foto, eingebettete Mannschaften/Kontakte/Downloads
- **Trainingszeit**: Sparte/Gruppe/Tag/Uhrzeit/Ort/Frequenz/Jahreszeit, Trainerkontakt, Foto
- **NewsPost**: Titel, Datum, Kategorie, Sparte, Bild, Excerpt, Body
- **Termin**: Titel, Datum, Uhrzeit, Ort, Sparte, Beschreibung, Bild, Tags
- **Ansprechpartner**: Name, Funktion, Gruppe, Kontakt, Foto
- **Download**: Titel, Beschreibung, Datei/URL, Kategorie, Datum
- **Partner**: Name, Logo, URL
- **(teilweise indirekt)** Mannschaft/Jahrgang/Person via `trainingszeit`-Coalesce im Query

Hinweis: Öffentlich heißt hier „frontend-seitig angezeigt“, nicht zwingend „ohne Zugriffsschutz auf Rohdaten“.

---

## 4) Intern/systemisch wirksame Daten

- `termin.fussballDeId`: technische Synchronisations-ID (fussball.de)
- `reihenfolge`-Felder: redaktionelle Sortiersteuerung
- `trainingszeiten_spartes`: interner Matching-Mechanismus für Frontend-Zuordnung
- Migrations-/Patch-Skripte mit impliziten Datenregeln (z. B. `scripts/sync-trainingszeiten-from-json.mjs`)
- Fallback-Felder (`dateiUrl`, `trainingszeit.*` legacy Kontakt-/Ortsfelder) als technische Übergangshilfen

---

## 5) Fallback-/Legacy-Strukturen

## 5.1 Klar identifizierbar

1. **Trainingszeit duales Modell**
   - Neu: `mannschaft` + `trainingsplatz` Referenzen
   - Alt: `sparte`, `gruppe`, `ort`, `trainer`, `email`, `telefon`
   - Aktiv genutzt über `coalesce(...)` in `trainingszeitenQuery`

2. **Downloads duale Dateiquelle**
   - Neu: `datei.asset->url`
   - Alt/Fallback: `dateiUrl` (oft statischer `/pdfs/...` Pfad)

3. **Ansprechpartner-Gruppierung**
   - Primär: `gruppe`
   - Fallback: `sparte` (im Schema als veraltet markiert)

4. **Sparte als Aggregat mit embedded Daten**
   - `sparte.mannschaften[]`, `sparte.ansprechpartner[]`, `sparte.downloads[]`
   - Parallel existieren globale Dokumenttypen `mannschaft`, `ansprechpartner`, `download`

5. **String statt Referenz für Sparte**
   - In `termin` und `newsPost` keine Referenz auf `sparte`, sondern freier String

## 5.2 Übergangscharakter im Code sichtbar

- `scripts/migrate-to-sanity.mjs` migriert primär aus JSON in legacy-nahe Feldstrukturen.
- `scripts/sync-trainingszeiten-from-json.mjs` arbeitet weiterhin auf String-Feldern in `trainingszeit`.
- Frontend `app/sparten/[slug]/page.tsx` nutzt Heuristiken (Keyword-Matching), um Trainingszeiten Mannschaften zuzuordnen.

---

## 6) Mögliche Inkonsistenzen

## 6.1 Hohe Relevanz

1. **Doppeltes Mannschaftsmodell**
   - `sparte.mannschaften[]` (embedded) vs. `mannschaft`-Dokumente.
   - Risiko: Unterschiedliche Namen/Beschreibungen/Bilder, auseinanderlaufende Pflege.

2. **Doppelte Ansprechpartnerdaten**
   - `sparte.ansprechpartner[]` vs. globale `ansprechpartner`-Dokumente bzw. `person`.
   - Risiko: Kontaktinfos inkonsistent.

3. **Trainingszeit-Mix aus Referenz + Stringfallbacks**
   - Query priorisiert Referenzen, fällt aber auf Legacy zurück.
   - Risiko: Uneinheitliche Datenqualität, schwer vorhersagbares Verhalten.

4. **Stringbasierte Sparte in `termin`/`newsPost`**
   - Keine referentielle Integrität bei Umbenennungen von Sparten.

5. **Sparten-Zuordnung per `trainingszeiten_spartes` + Stringgleichheit**
   - Fragil bei Tippfehlern/Schreibvarianten.

## 6.2 Mittlere Relevanz

6. **Trainerableitung aus `mannschaft->trainer[0]`**
   - Query nimmt nur den ersten Trainer als primären Kontakt.

7. **Heuristische Zuordnung in Sparte-Detailseite**
   - Keyword-Matching zwischen Mannschaftsname und Trainingsgruppe kann Fehlzuordnungen erzeugen.

8. **Dateiquelle Download (`datei` vs. `dateiUrl`)**
   - Unterschiedliches Verhalten möglich, falls eines von beidem fehlt/inkonsistent ist.

---

## Aktuelles Modell vs. Legacy-/Übergangsmodell (Kurzvergleich)

## Zielmodell (präferiert)

- Referenzbasierte Kernkette:
  - `trainingszeit -> mannschaft -> sparte`
  - `trainingszeit -> trainingsplatz`
  - `mannschaft/jahrgang -> person`
- Kontaktseite optional über `ansprechpartner -> person`.
- Ziel: zentrale, normalisierte Datenpflege mit referentieller Konsistenz.

## Sicherer Migrationsplan zum Zielmodell

Das Skript `scripts/migrate-to-central-crud-models.mjs` ist der konsolidierte, sichere Migrationspfad zum zentralen CRUD-Modell.

- Standardmodus ist Dry-Run; Schreibzugriff nur mit `--apply`.
- `SANITY_API_WRITE_TOKEN` wird nur aus `process.env` gelesen; im Apply-Modus bricht das Skript ohne Token hart ab.
- Keine Legacy-Felder und kein `sparte.mannschaften[]` werden gelöscht.
- Bestehende Inhalte werden nicht überschrieben; es werden nur fehlende Referenzen/Felder gezielt gesetzt.
- Zentrale `mannschaft`-Dokumente entstehen aus eingebetteten `sparte.mannschaften[]`, nicht aus `trainingszeit.gruppe` allein.
- Zentrale `person`-Dokumente entstehen aus eingebetteten Mannschaftstrainern, Sparten-Ansprechpartnern, globalen Ansprechpartnern und eindeutigen Trainingszeit-Kontakten.
- `trainingszeit.mannschaft` wird nur bei eindeutigem Match nach Sparte + Gruppe gesetzt bzw. bei kaputter Referenz eindeutig repariert.

## Legacy-/Übergangsmodell (aktuell weiterhin aktiv)

- String- und embedded-basierte Datenhaltung:
  - Trainingszeiten via `sparte/gruppe/ort/trainer`
  - Sparten enthalten eigene eingebettete Mannschaften/Kontakte/Downloads
  - Termine/News referenzieren Sparten nicht technisch, sondern textuell
- Ziel historisch: schnelle Migration/Weiterbetrieb; technisch jedoch inkonsistenzanfälliger.

---

## Quellen (analysiert)

- Schemas: `sanity/schemas/*.ts`, `sanity/schemas/index.ts`
- Queries: `sanity/lib/queries.ts`
- Content-Layer: `lib/content.ts`
- Frontend-Zugriffe:
  - `app/page.tsx`
  - `app/sparten/[slug]/page.tsx`
  - `app/trainingszeiten/page.tsx`
  - `app/ansprechpartner/page.tsx`
  - `app/downloads/page.tsx`
  - `app/termine/page.tsx`
  - `app/news/page.tsx`, `app/news/[slug]/page.tsx`
- Migrations-/Sync-Skripte:
  - `scripts/migrate-to-sanity.mjs`
  - `scripts/sync-trainingszeiten-from-json.mjs`
  - sowie weitere Patch-/Create-Skripte im `scripts/`-Ordner
