CREATE TABLE `buchung_nachrichten` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`buchung_id` integer,
	`kanal` text NOT NULL,
	`richtung` text NOT NULL,
	`zeitpunkt` text NOT NULL,
	`von` text,
	`an` text,
	`betreff` text,
	`text` text DEFAULT '' NOT NULL,
	`anhaenge` integer DEFAULT 0 NOT NULL,
	`message_id` text,
	`verweise` text,
	`imap_uid` integer,
	`zuordnung` text,
	`gelesen_am` text,
	`zugang_id` integer,
	`zugang_name` text,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`buchung_id`) REFERENCES `buchungen`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "buchung_nachrichten_kanal_check" CHECK("buchung_nachrichten"."kanal" IN ('email', 'telefon', 'persoenlich', 'notiz')),
	CONSTRAINT "buchung_nachrichten_richtung_check" CHECK("buchung_nachrichten"."richtung" IN ('eingang', 'ausgang', 'intern')),
	CONSTRAINT "buchung_nachrichten_zuordnung_check" CHECK("buchung_nachrichten"."zuordnung" IS NULL OR "buchung_nachrichten"."zuordnung" IN ('antwort', 'nummer', 'absender', 'hand'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buchung_nachrichten_message_id_unique` ON `buchung_nachrichten` (`message_id`);--> statement-breakpoint
CREATE INDEX `buchung_nachrichten_buchung_idx` ON `buchung_nachrichten` (`buchung_id`,`zeitpunkt`);