CREATE TABLE `downloads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titel` text NOT NULL,
	`beschreibung` text,
	`kategorie` text,
	`datei` text NOT NULL,
	`datum` text,
	`sparte_id` integer,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `downloads_sparte_idx` ON `downloads` (`sparte_id`);--> statement-breakpoint
CREATE TABLE `funktionen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`bezeichnung` text NOT NULL,
	`gruppe` text DEFAULT 'weitere' NOT NULL,
	`sparte_id` integer,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `personen`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "funktionen_gruppe_check" CHECK("funktionen"."gruppe" IN ('vorstand', 'abteilungsleitung', 'weitere'))
);
--> statement-breakpoint
CREATE INDEX `funktionen_person_idx` ON `funktionen` (`person_id`);--> statement-breakpoint
CREATE TABLE `gruppe_personen` (
	`gruppe_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`rolle` text DEFAULT 'Trainer:in' NOT NULL,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`gruppe_id`, `person_id`),
	FOREIGN KEY (`gruppe_id`) REFERENCES `gruppen`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `personen`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gruppe_personen_person_idx` ON `gruppe_personen` (`person_id`);--> statement-breakpoint
CREATE TABLE `gruppen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sparte_id` integer NOT NULL,
	`name` text NOT NULL,
	`altersklasse` text,
	`beschreibung` text,
	`foto` text,
	`sichtbar` integer DEFAULT true NOT NULL,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gruppen_sparte_name_unique` ON `gruppen` (`sparte_id`,`name`);--> statement-breakpoint
CREATE TABLE `mannschaft_personen` (
	`mannschaft_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`rolle` text DEFAULT 'Trainer:in' NOT NULL,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`mannschaft_id`, `person_id`),
	FOREIGN KEY (`mannschaft_id`) REFERENCES `mannschaften`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `personen`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mannschaft_personen_person_idx` ON `mannschaft_personen` (`person_id`);--> statement-breakpoint
CREATE TABLE `mannschaften` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sparte_id` integer NOT NULL,
	`name` text NOT NULL,
	`bereich` text,
	`altersklasse` text,
	`beschreibung` text,
	`foto` text,
	`sichtbar` integer DEFAULT true NOT NULL,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "mannschaften_bereich_check" CHECK("mannschaften"."bereich" IS NULL OR "mannschaften"."bereich" IN ('Herren', 'Damen', 'Junioren', 'Juniorinnen', 'Senioren', 'Freizeit'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mannschaften_sparte_name_unique` ON `mannschaften` (`sparte_id`,`name`);--> statement-breakpoint
CREATE TABLE `news` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`titel` text NOT NULL,
	`teaser` text,
	`inhalt` text DEFAULT '' NOT NULL,
	`bild` text,
	`bild_breite` integer,
	`bild_hoehe` integer,
	`kategorie` text,
	`datum` text NOT NULL,
	`veroeffentlicht` integer DEFAULT false NOT NULL,
	`sparte_id` integer,
	`mannschaft_id` integer,
	`gruppe_id` integer,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mannschaft_id`) REFERENCES `mannschaften`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`gruppe_id`) REFERENCES `gruppen`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_slug_unique` ON `news` (`slug`);--> statement-breakpoint
CREATE INDEX `news_datum_idx` ON `news` (`veroeffentlicht`,`datum`);--> statement-breakpoint
CREATE INDEX `news_sparte_idx` ON `news` (`sparte_id`);--> statement-breakpoint
CREATE INDEX `news_mannschaft_idx` ON `news` (`mannschaft_id`);--> statement-breakpoint
CREATE INDEX `news_gruppe_idx` ON `news` (`gruppe_id`);--> statement-breakpoint
CREATE TABLE `personen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`telefon` text,
	`whatsapp` text,
	`foto` text,
	`notiz` text,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sparte_ansprechpartner` (
	`sparte_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`rolle` text DEFAULT 'Ansprechpartner:in' NOT NULL,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`sparte_id`, `person_id`),
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `personen`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sparte_ansprechpartner_person_idx` ON `sparte_ansprechpartner` (`person_id`);--> statement-breakpoint
CREATE TABLE `sparten` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`farbe` text,
	`kurzbeschreibung` text,
	`beschreibung` text,
	`foto` text,
	`sichtbar` integer DEFAULT true NOT NULL,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sparten_slug_unique` ON `sparten` (`slug`);--> statement-breakpoint
CREATE TABLE `termine` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titel` text NOT NULL,
	`datum` text NOT NULL,
	`uhrzeit` text,
	`ort` text,
	`beschreibung` text,
	`bild` text,
	`bereich` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`sparte_id` integer,
	`mannschaft_id` integer,
	`quelle` text DEFAULT 'manuell' NOT NULL,
	`externe_id` text,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mannschaft_id`) REFERENCES `mannschaften`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "termine_quelle_check" CHECK("termine"."quelle" IN ('manuell', 'fussball-de', 'click-tt')),
	CONSTRAINT "termine_externe_id_check" CHECK("termine"."quelle" = 'manuell' OR "termine"."externe_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `termine_datum_idx` ON `termine` (`datum`);--> statement-breakpoint
CREATE UNIQUE INDEX `termine_quelle_externe_id_unique` ON `termine` (`quelle`,`externe_id`);--> statement-breakpoint
CREATE TABLE `trainingszeiten` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mannschaft_id` integer,
	`gruppe_id` integer,
	`wochentag` integer NOT NULL,
	`beginn` text NOT NULL,
	`ende` text,
	`ort` text,
	`saison` text DEFAULT 'ganzjährig' NOT NULL,
	`rhythmus` text DEFAULT 'jede Woche' NOT NULL,
	`hinweis` text,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`mannschaft_id`) REFERENCES `mannschaften`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gruppe_id`) REFERENCES `gruppen`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "trainingszeiten_zuordnung_check" CHECK("trainingszeiten"."mannschaft_id" IS NOT NULL OR "trainingszeiten"."gruppe_id" IS NOT NULL),
	CONSTRAINT "trainingszeiten_wochentag_check" CHECK("trainingszeiten"."wochentag" BETWEEN 1 AND 7),
	CONSTRAINT "trainingszeiten_beginn_check" CHECK("trainingszeiten"."beginn" GLOB '[0-2][0-9]:[0-5][0-9]'),
	CONSTRAINT "trainingszeiten_ende_check" CHECK("trainingszeiten"."ende" IS NULL OR ("trainingszeiten"."ende" GLOB '[0-2][0-9]:[0-5][0-9]' AND "trainingszeiten"."ende" > "trainingszeiten"."beginn")),
	CONSTRAINT "trainingszeiten_saison_check" CHECK("trainingszeiten"."saison" IN ('ganzjährig', 'Sommer', 'Winter')),
	CONSTRAINT "trainingszeiten_rhythmus_check" CHECK("trainingszeiten"."rhythmus" IN ('jede Woche', 'alle 2 Wochen'))
);
--> statement-breakpoint
CREATE INDEX `trainingszeiten_mannschaft_idx` ON `trainingszeiten` (`mannschaft_id`);--> statement-breakpoint
CREATE INDEX `trainingszeiten_gruppe_idx` ON `trainingszeiten` (`gruppe_id`);