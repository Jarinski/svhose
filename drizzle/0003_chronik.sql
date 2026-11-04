CREATE TABLE `seiten` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schluessel` text NOT NULL,
	`inhalt` text NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seiten_schluessel_unique` ON `seiten` (`schluessel`);