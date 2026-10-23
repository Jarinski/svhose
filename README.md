# SV Holm-Seppensen e.V. — Website

Vereinswebsite gebaut mit **Next.js 16** (App Router), **Tailwind CSS** und einer eigenen
**SQLite-Datenbank** (Drizzle ORM). Inhalte liegen in `data/svhs.db`, Bilder und Dateien in
`data/medien`. Ein externes CMS gibt es nicht mehr; Sanity wurde im Oktober 2026 abgelöst.

---

## 🚀 Schnellstart

Voraussetzung: **Node.js 22 oder neuer** (wegen `better-sqlite3`).

```bash
npm install
npm run import:sanity   # nur, wenn data/import/sanity-export.json vorhanden ist
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

- **Mit Sanity-Export**: `npm run import:sanity` baut die Datenbank aus
  `data/import/sanity-export.json` auf und kopiert die Bilder und Dateien in den Medienordner.
  Achtung: Der Import **löscht und ersetzt Datenbank und Medienordner** komplett.
- **Ohne Export**: einfach `npm run dev` starten. Die Datenbank `data/svhs.db` wird beim ersten
  Zugriff automatisch mit allen Tabellen angelegt, ist dann aber leer. Danach mit
  `npm run verwaltung:admin -- "Vorname Nachname"` den ersten Admin anlegen und Inhalte unter
  `/verwaltung` eintragen.
- `data/` ist **nicht im Git**, weil es personenbezogene Daten enthält (das Repository ist
  öffentlich). Export oder Datenbank gibt es bei den Webverantwortlichen, nicht über Git oder Chats.

---

## 📁 Projektstruktur

```
sv-holm-seppensen/
├── app/                        ← Next.js Seiten (App Router)
│   ├── page.tsx                ← Startseite
│   ├── news/                   ← News-Übersicht & Detailseiten
│   ├── sparten/                ← Spartenübersicht & Detailseiten
│   ├── termine/                ← Terminkalender
│   ├── trainingszeiten/        ← Alle Trainingszeiten
│   ├── ansprechpartner/        ← Kontaktseite (Vereinsfunktionen)
│   ├── downloads/              ← Dokumente & PDFs
│   ├── fussball/, tischtennis/ ← Spielpläne (live von fussball.de / click-tt)
│   ├── ueber-uns/, kinderschutz/, impressum/, datenschutz/
│   ├── medien/[...pfad]/       ← liefert Bilder & Dateien aus data/medien aus
│   ├── api/cron/               ← sync-fussball, sync-tischtennis (Spiele → Tabelle termine)
│   └── verwaltung/             ← Verwaltung (eigener Rahmen, nicht in Suchmaschinen)
│       ├── login/              ← Anmeldung: Benutzername + Passwort + App-Code
│       ├── anmelden/           ← Einladung einlösen: Passwort festlegen, App koppeln
│       ├── aktionen.ts         ← Server-Aktionen rund um Anmeldung und Passwort
│       └── (intern)/           ← alles mit Anmeldung: Übersicht, teams/, personen/, sparten/,
│                                 news/, termine/, downloads/, kontakte/, zugaenge/, verlauf/,
│                                 geraete/ („Mein Zugang“)
│
├── components/                 ← Wiederverwendbare Komponenten (Navbar, Footer, …)
│   └── verwaltung/             ← Formularbausteine und Navigation der Verwaltung
│
├── lib/
│   ├── content.ts              ← Datenschicht: alle Seiten lesen hierüber
│   ├── db/schema.ts            ← Datenmodell (Drizzle, SQLite)
│   ├── db/index.ts             ← Datenbankverbindung, spielt Migrationen automatisch ein
│   ├── medien.ts               ← Medienordner und /medien-URLs
│   ├── fussball-de.ts          ← Spiele von fussball.de
│   ├── click-tt.ts             ← Spiele von click-tt
│   └── verwaltung/             ← Anmeldung (Passwort, TOTP, Sitzungen), Rechte, Uploads,
│                                 Verlauf und Speicherlogik der Verwaltung
│
├── drizzle/                    ← SQL-Migrationen (erzeugt mit npm run db:generate)
├── scripts/
│   ├── sanity-export.mjs       ← einmaliger Export aus Sanity
│   ├── import-aus-sanity.ts    ← baut die Datenbank aus dem Export auf
│   └── verwaltung-admin.ts     ← ersten Admin anlegen bzw. Notfall-Zugang (npm run verwaltung:admin)
│
├── data/                       ← NICHT im Git (personenbezogene Daten)
│   ├── svhs.db                 ← die Datenbank
│   ├── medien/                 ← Bilder & Dateien
│   └── import/                 ← Sanity-Export (nur für die Erstbefüllung)
│
└── public/                     ← statische Dateien (Logo, feste Bilder & PDFs)
```

---

## ✏️ Inhalte pflegen

### Die Verwaltung unter `/verwaltung`

Inhalte werden über die eigene, handytaugliche Verwaltung unter **`/verwaltung`** gepflegt:
Mannschaften und Gruppen (mit Trainingszeiten und Trainerteam in einem Formular), Personen,
Sparten, News, Termine, Downloads, Kontaktseite, Zugänge und Verlauf. Gespeichert = sofort live.

**Anmeldung mit Zwei-Faktor:** Benutzername + Passwort + 6-stelliger Code aus einer
Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator, Aegis).

- **Rechte:** Admins dürfen alles. Alle anderen Zugänge bekommen Bereiche – eine ganze Sparte
  (Spartenleitung) oder einzelne Mannschaften/Gruppen (Trainer:innen) – und sehen nur diese.
- **Neuen Zugang einrichten:** Admin → „Zugänge“ → „Neuer Zugang“ → es erscheint ein
  Einladungs-QR-Code (7 Tage gültig, einmal verwendbar). Die Person scannt ihn, legt ihr Passwort
  fest und koppelt die Authenticator-App.
- **Passwort vergessen / Handy verloren:** Admin → „Zugänge“ → Zugang → „Zugang zurücksetzen“.
  Alle Geräte sind sofort abgemeldet, es gibt eine neue Einladung.
- **Der allererste Admin** (oder Notfall, wenn alle Admins ausgesperrt sind) – direkt auf dem
  Rechner bzw. Server mit Zugriff auf die Datenbank:

  ```bash
  npm run verwaltung:admin -- "Vorname Nachname"
  ```

  Zeigt Benutzername und Einladungs-QR-Code im Terminal. Für Links mit der echten Adresse vorher
  `SEITEN_URL` setzen (z. B. `SEITEN_URL=https://www.<vereinsdomain>.de npm run verwaltung:admin -- "…"`).

Jede Änderung landet im **Verlauf** (wer, wann, vorher/nachher).

### Für Technik: Drizzle Studio

```bash
npm run db:studio
```

Drizzle Studio öffnet sich im Browser unter `https://local.drizzle.studio` und zeigt alle Tabellen
direkt. Gedacht für Technik und Notfälle – Änderungen hier umgehen Rechte und Verlauf. Jede
gespeicherte Änderung ist **sofort** auf der Website sichtbar (Bilder und Dateien unter `/medien`
werden dagegen gecacht, siehe Tabelle).
Auf dem Server läuft das über einen SSH-Tunnel (siehe `OPERATIONS.md`, Abschnitt 7.2).

| Ich möchte … | Tabelle |
|---|---|
| eine Trainingszeit ändern oder hinzufügen | `trainingszeiten` (Wochentag 1 = Montag … 7 = Sonntag, Uhrzeiten als `HH:MM`, gehört zu `mannschaft_id` und/oder `gruppe_id`) |
| eine:n Trainer:in zuordnen | ggf. erst `personen`, dann `mannschaft_personen` bzw. `gruppe_personen` (mit Rolle) |
| Ansprechpartner:innen einer Sparte festlegen | `sparte_ansprechpartner` |
| Vorstand und Kontaktseite pflegen | `funktionen` (Gruppe `vorstand`, `abteilungsleitung` oder `weitere`) |
| eine News veröffentlichen | `news`: `slug`, `titel`, `datum` (`YYYY-MM-DD`), Text als Markdown in `inhalt`, dann `veroeffentlicht` auf `true` |
| einen Termin eintragen | `termine` mit `quelle` = `manuell` |
| ein Bild oder Dokument einbinden | Datei nach `data/medien/<ordner>/` kopieren und den relativen Pfad (z. B. `downloads/satzung.pdf`) ins Feld eintragen |
| ein Bild oder Dokument ersetzen | neue Fassung unter **neuem Dateinamen** ablegen (z. B. `downloads/satzung-2026-10.pdf`) und den Pfad im Feld ändern – nie unter gleichem Namen überschreiben, Medien werden gecacht (Details: `CONTENT_FLOW.md`, Abschnitt 1) |
| eine Mannschaft oder Gruppe ausblenden | `sichtbar` auf `false` (besser als Löschen) |

Wichtig:

- **In Drizzle Studio gibt es kein Rückgängig.** Eine gelöschte Person verschwindet aus allen
  Trainerteams und Funktionen, eine gelöschte Mannschaft nimmt ihre Trainingszeiten mit. Lieber
  ausblenden – oder gleich die Verwaltung benutzen.
- Spiele von fussball.de und click-tt kommen automatisch (nächtliche Cronjobs). Änderungen an
  diesen Terminen werden beim nächsten Lauf überschrieben.
- Alle Felder und Regeln: [`DATA_MODEL.md`](DATA_MODEL.md). Konzept der Verwaltung:
  [`CMS_KONZEPT.md`](CMS_KONZEPT.md).

---

## 🗄️ Datenbank

| Befehl | Zweck |
|---|---|
| `npm run db:studio` | Tabellen-Editor im Browser (Drizzle Studio) |
| `npm run db:generate` | erzeugt nach einer Änderung an `lib/db/schema.ts` eine neue Migration in `drizzle/` |
| `npm run db:migrate` | spielt ausstehende Migrationen ein (passiert sonst automatisch beim ersten Zugriff) |
| `npm run export:sanity` | einmaliger Export aus Sanity nach `data/import/` (braucht die Sanity-Variablen in `.env.local`) |
| `npm run import:sanity` | baut Datenbank und Medienordner aus `data/import/sanity-export.json` neu auf (**überschreibt alles**, auch Zugänge und Verlauf; bricht ab, sobald es Zugänge gibt – dann nur mit `-- --alles-ueberschreiben`; Bericht in `data/import/import-bericht.md`) |
| `npm run verwaltung:admin -- "Name"` | legt einen Admin-Zugang an bzw. setzt ihn zurück und zeigt den Einladungs-QR-Code |

Pfade lassen sich über `DATENBANK_PFAD` (Standard `data/svhs.db`) und `MEDIEN_PFAD`
(Standard `data/medien`) ändern. `npm run import:sanity` liest dafür keine Env-Datei, abweichende
Pfade dort beim Aufruf setzen (siehe `OPERATIONS.md`, Abschnitt 2.2).

---

## 🚢 Betrieb & Deployment

### Vorerst: auf dem eigenen Rechner

Solange es noch keinen Server gibt, läuft die Website auf einem PC im Vereins- bzw. Heimnetz:

```bash
npm run lokal                # baut die Seite und startet sie auf Port 3000
npm run termine:abgleichen   # Spiele von fussball.de/click-tt holen (zweites Terminal, z. B. 1× täglich)
```

- Erreichbar unter `http://localhost:3000` und – für Handys im selben WLAN – unter
  `http://<IP-des-PCs>:3000` (IP z. B. mit `ipconfig` nachsehen). Beim ersten Start fragt die
  Windows-Firewall, ob Node.js im **privaten** Netzwerk erreichbar sein darf: zulassen.
- Die Verwaltung am PC am besten auch über `http://<IP-des-PCs>:3000/verwaltung` öffnen. Dann zeigen
  die Einladungs-QR-Codes auf eine Adresse, die das Handy erreicht. Alternativ in `.env.local`
  `SEITEN_URL=http://<IP-des-PCs>:3000` setzen (gilt auch für `npm run verwaltung:admin`).
- Nach Code-Änderungen erneut `npm run lokal`. Die Daten in `data/` bleiben dabei erhalten.
- Die Seite ist nur erreichbar, solange der PC läuft, und nur im eigenen Netz. Für einen
  öffentlichen Betrieb siehe unten.

### Später: eigener Server

Die Website läuft künftig auf einem **eigenen Server** (geplant: Hetzner) mit `npm run build` und
`npm run start` hinter nginx. Vercel ist mit SQLite nicht mehr nutzbar, weil die Datenbankdatei
ein dauerhaft beschreibbares Dateisystem braucht.

Kurzfassung für ein Update auf dem Server:

```bash
git pull
npm ci
npm run build
sudo systemctl restart svhs
```

Einrichtung, Umgebungsvariablen, crontab für die Spiel-Synchronisation, Backups und
Wiederherstellung: [`OPERATIONS.md`](OPERATIONS.md).

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
| [Next.js 16](https://nextjs.org) | Framework (App Router) |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [SQLite](https://sqlite.org) über [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Datenbank (eine Datei) |
| [Drizzle ORM](https://orm.drizzle.team) + drizzle-kit | Schema, Abfragen, Migrationen, Drizzle Studio |
| [react-markdown](https://github.com/remarkjs/react-markdown) | News-Text (Markdown) |
| [date-fns](https://date-fns.org) | Datumsformatierung |
| [Lucide React](https://lucide.dev) | Icons |
| [sharp](https://sharp.pixelplumbing.com) | Bilder beim Hochladen verkleinern (WebP), Bildoptimierung |
| [qrcode](https://github.com/soldair/node-qrcode) | QR-Codes für Einladungen und die Authenticator-App |
| [tsx](https://github.com/privatenumber/tsx) | TypeScript-Skripte (z. B. Import) |
| eigener Server (geplant: Hetzner) | Hosting mit Node.js und nginx |

---

## 📚 Weitere Dokumentation

| Dokument | Inhalt |
|---|---|
| [`DATA_MODEL.md`](DATA_MODEL.md) | Tabellen, Beziehungen, Constraints, Zuordnungsregeln |
| [`CONTENT_FLOW.md`](CONTENT_FLOW.md) | Wie Inhalte in die Datenbank und auf die Website kommen |
| [`OPERATIONS.md`](OPERATIONS.md) | Betrieb, Cronjobs, Backups, Deployment, Sicherheit |
| [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) | Architekturentscheidungen, u. a. Wechsel von Sanity zu SQLite |
| [`CMS_KONZEPT.md`](CMS_KONZEPT.md) | Konzept der eigenen Verwaltung, REST-API und Telegram-Bot |

---

## 💡 Tipps für VS Code

- **Prettier** installieren für automatische Formatierung
- **Tailwind CSS IntelliSense** Extension für Autocomplete
- Terminal → `npm run dev` laufen lassen während du arbeitest
- In einem zweiten Terminal `npm run db:studio`, um Daten nachzusehen oder zu ändern

---

*SV Holm-Seppensen e.V. — Gemeinsam stark.*
