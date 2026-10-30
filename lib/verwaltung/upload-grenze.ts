/**
 * lib/verwaltung/upload-grenze.ts
 *
 * Höchstgröße einer hochgeladenen Datei (Bild oder PDF). Steht in einer eigenen Datei ohne
 * Server-Abhängigkeiten, damit auch die Formulare im Browser sie prüfen können: Next.js nimmt
 * Anfragen nur bis 16 MB an (next.config.js, serverActions.bodySizeLimit). Eine größere Datei
 * bricht sonst die ganze Seite ab, bevor die Verwaltung eine Meldung zeigen kann.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
