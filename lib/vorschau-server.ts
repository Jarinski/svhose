/**
 * lib/vorschau-server.ts
 *
 * Serverseitiger Teil der Design-Vorschau (siehe lib/vorschau.ts). Liest das Cookie –
 * nur in Seiten aufrufen, die ohnehin dynamisch gerendert werden (z. B. die Startseite).
 */

import { cookies } from 'next/headers'
import { DESIGN_COOKIE, alsDesign, type Design } from '@/lib/vorschau'

/** Das gewählte Vorschau-Design oder null (bisheriges Design). */
export async function vorschauDesign(): Promise<Design | null> {
  const cookieSpeicher = await cookies()
  return alsDesign(cookieSpeicher.get(DESIGN_COOKIE)?.value)
}
