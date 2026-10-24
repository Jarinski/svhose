CREATE TABLE `anmelde_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zugang_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`zweck` text NOT NULL,
	`laeuft_ab` text NOT NULL,
	`verwendet_am` text,
	`totp_geheimnis` text,
	`erstellt_von` integer,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`zugang_id`) REFERENCES `zugaenge`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "anmelde_codes_zweck_check" CHECK("anmelde_codes"."zweck" IN ('einladung'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `anmelde_codes_code_hash_unique` ON `anmelde_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `anmelde_codes_zugang_idx` ON `anmelde_codes` (`zugang_id`);--> statement-breakpoint
CREATE TABLE `fehlversuche` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schluessel` text NOT NULL,
	`zeitpunkt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fehlversuche_schluessel_idx` ON `fehlversuche` (`schluessel`,`zeitpunkt`);--> statement-breakpoint
CREATE TABLE `geraete` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zugang_id` integer NOT NULL,
	`sitzung_hash` text NOT NULL,
	`name` text NOT NULL,
	`angemeldet_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`zuletzt_aktiv` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`laeuft_ab` text NOT NULL,
	FOREIGN KEY (`zugang_id`) REFERENCES `zugaenge`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `geraete_sitzung_hash_unique` ON `geraete` (`sitzung_hash`);--> statement-breakpoint
CREATE INDEX `geraete_zugang_idx` ON `geraete` (`zugang_id`);--> statement-breakpoint
CREATE TABLE `verlauf` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zeitpunkt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`zugang_id` integer,
	`zugang_name` text,
	`quelle` text DEFAULT 'verwaltung' NOT NULL,
	`aktion` text NOT NULL,
	`objekt_typ` text NOT NULL,
	`objekt_id` integer,
	`bezeichnung` text NOT NULL,
	`vorher` text,
	`nachher` text,
	FOREIGN KEY (`zugang_id`) REFERENCES `zugaenge`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "verlauf_quelle_check" CHECK("verlauf"."quelle" IN ('verwaltung', 'api', 'telegram', 'system')),
	CONSTRAINT "verlauf_aktion_check" CHECK("verlauf"."aktion" IN ('angelegt', 'geaendert', 'geloescht', 'anmeldung', 'abmeldung'))
);
--> statement-breakpoint
CREATE INDEX `verlauf_zeitpunkt_idx` ON `verlauf` (`zeitpunkt`);--> statement-breakpoint
CREATE INDEX `verlauf_objekt_idx` ON `verlauf` (`objekt_typ`,`objekt_id`);--> statement-breakpoint
CREATE TABLE `zugaenge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`benutzername` text,
	`passwort_hash` text,
	`totp_geheimnis` text,
	`totp_letzter_schritt` integer,
	`eingerichtet_am` text,
	`ist_admin` integer DEFAULT false NOT NULL,
	`aktiv` integer DEFAULT true NOT NULL,
	`person_id` integer,
	`erstellt_von` integer,
	`letzte_anmeldung` text,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `personen`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zugaenge_benutzername_unique` ON `zugaenge` (`benutzername`);--> statement-breakpoint
CREATE TABLE `zugang_bereiche` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zugang_id` integer NOT NULL,
	`sparte_id` integer,
	`mannschaft_id` integer,
	`gruppe_id` integer,
	FOREIGN KEY (`zugang_id`) REFERENCES `zugaenge`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sparte_id`) REFERENCES `sparten`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mannschaft_id`) REFERENCES `mannschaften`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gruppe_id`) REFERENCES `gruppen`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "zugang_bereiche_genau_einer_check" CHECK(("zugang_bereiche"."sparte_id" IS NOT NULL) + ("zugang_bereiche"."mannschaft_id" IS NOT NULL) + ("zugang_bereiche"."gruppe_id" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE INDEX `zugang_bereiche_zugang_idx` ON `zugang_bereiche` (`zugang_id`);