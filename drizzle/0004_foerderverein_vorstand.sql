CREATE TABLE `foerderverein_vorstand` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`bezeichnung` text NOT NULL,
	`reihenfolge` integer DEFAULT 0 NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `personen`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `foerderverein_vorstand_person_idx` ON `foerderverein_vorstand` (`person_id`);