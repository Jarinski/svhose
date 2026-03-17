import { createClient } from 'next-sanity'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'

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
  useCdn: process.env.NODE_ENV === 'production',
  // Token für schreibenden Zugriff (z. B. Migration)
  token: process.env.SANITY_API_WRITE_TOKEN,
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
