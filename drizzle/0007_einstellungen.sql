CREATE TABLE `einstellungen` (
	`schluessel` text PRIMARY KEY NOT NULL,
	`wert` text NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
