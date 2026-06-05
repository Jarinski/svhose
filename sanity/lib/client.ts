import { createClient } from 'next-sanity'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'
const readToken = process.env.SANITY_API_READ_TOKEN

/**
 * Sanity-Client – wird nur instanziiert, wenn eine Projekt-ID vorhanden ist.
 * Ohne konfigurierte Umgebungsvariablen wird ein Dummy-Client erstellt,
 * der keine echten Anfragen stellt (sanityFetch gibt dann leere Arrays zurück).
 */
export const client = createClient({
  // Fallback auf 'placeholder' verhindert einen Laufzeitfehler während des Builds,
  // wenn die Umgebungsvariable noch nicht gesetzt ist.
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  // Für Website-Inhalte bewusst nicht das Sanity-CDN verwenden:
  // Neue/aktualisierte Studio-Inhalte (z. B. News auf der Landing Page) sollen
  // spätestens nach der Next.js-Revalidierung sichtbar sein und nicht zusätzlich
  // durch den Sanity-CDN-Cache verzögert werden.
  useCdn: false,
  // Optionaler serverseitiger Read-Token für nicht öffentlich lesbare Published-Dokumente.
  // Wichtig: Für normale Website-Reads niemals SANITY_API_WRITE_TOKEN verwenden.
  ...(readToken ? { token: readToken } : {}),
})

/**
 * Führt einen Sanity-Fetch durch und gibt ein leeres Array zurück,
 * wenn keine Sanity-Zugangsdaten konfiguriert sind.
 *
 * @param revalidate  ISR-Revalidierungszeit in Sekunden (Standard: 60).
 *                    Übergib 0 für No-Cache oder false für unbegrenzte Gültigkeit.
 */
export async function sanityFetch<T = unknown>(
  query: string,
  params?: Record<string, unknown>,
  revalidate: number | false = 60,
): Promise<T> {
  if (!projectId) {
    // Sanity nicht konfiguriert → null zurückgeben.
    // Listenabfragen nutzen `?? []` in lib/content.ts als Fallback.
    return null as unknown as T
  }
  return client.fetch<T>(query, params ?? {}, {
    next: { revalidate },
  })
}
