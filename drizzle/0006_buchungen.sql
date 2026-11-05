CREATE TABLE `belegung_ausfaelle` (
	`regel_id` integer NOT NULL,
	`datum` text NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`regel_id`, `datum`),
	FOREIGN KEY (`regel_id`) REFERENCES `belegung_regeln`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `belegung_regeln` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titel` text NOT NULL,
	`ort` text NOT NULL,
	`wochentag` integer NOT NULL,
	`beginn` text NOT NULL,
	`ende` text NOT NULL,
	`gueltig_ab` text,
	`gueltig_bis` text,
	`hinweis` text,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "belegung_regeln_ort_check" CHECK("belegung_regeln"."ort" IN ('vereinsheim', 'gelaende', 'beides')),
	CONSTRAINT "belegung_regeln_wochentag_check" CHECK("belegung_regeln"."wochentag" BETWEEN 1 AND 7),
	CONSTRAINT "belegung_regeln_beginn_check" CHECK("belegung_regeln"."beginn" GLOB '[0-2][0-9]:[0-5][0-9]'),
	CONSTRAINT "belegung_regeln_ende_check" CHECK("belegung_regeln"."ende" GLOB '[0-2][0-9]:[0-5][0-9]'),
	CONSTRAINT "belegung_regeln_gueltig_check" CHECK("belegung_regeln"."gueltig_ab" IS NULL OR "belegung_regeln"."gueltig_bis" IS NULL OR "belegung_regeln"."gueltig_bis" >= "belegung_regeln"."gueltig_ab")
);
--> statement-breakpoint
CREATE TABLE `buchungen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nummer` text NOT NULL,
	`quelle` text NOT NULL,
	`art` text NOT NULL,
	`ort` text NOT NULL,
	`titel` text NOT NULL,
	`von` text NOT NULL,
	`bis` text NOT NULL,
	`personenzahl` integer,
	`status` text DEFAULT 'angefragt' NOT NULL,
	`bereich` text,
	`name` text,
	`email` text,
	`telefon` text,
	`nachricht` text,
	`rueckmeldung` text,
	`notiz` text,
	`anonymisiert_am` text,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "buchungen_quelle_check" CHECK("buchungen"."quelle" IN ('website', 'verwaltung')),
	CONSTRAINT "buchungen_art_check" CHECK("buchungen"."art" IN ('verein', 'mitglied', 'extern')),
	CONSTRAINT "buchungen_ort_check" CHECK("buchungen"."ort" IN ('vereinsheim', 'gelaende', 'beides')),
	CONSTRAINT "buchungen_status_check" CHECK("buchungen"."status" IN ('angefragt', 'rueckfrage', 'bestaetigt', 'abgelehnt', 'storniert')),
	CONSTRAINT "buchungen_zeit_check" CHECK("buchungen"."von" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]' AND "buchungen"."bis" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]' AND "buchungen"."bis" > "buchungen"."von"),
	CONSTRAINT "buchungen_personenzahl_check" CHECK("buchungen"."personenzahl" IS NULL OR "buchungen"."personenzahl" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buchungen_nummer_unique` ON `buchungen` (`nummer`);--> statement-breakpoint
CREATE INDEX `buchungen_von_idx` ON `buchungen` (`von`);--> statement-breakpoint
CREATE INDEX `buchungen_status_idx` ON `buchungen` (`status`);--> statement-breakpoint
ALTER TABLE `zugaenge` ADD `buchungen` integer DEFAULT false NOT NULL;