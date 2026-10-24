/**
 * lib/whatsapp.ts
 *
 * WhatsApp-Links für Kontaktdaten – gemeinsam für /ansprechpartner und die Spartenseiten.
 * Regel: Eine eigens gepflegte WhatsApp-Nummer gilt immer. Sonst bekommt nur eine deutsche
 * Mobilnummer einen WhatsApp-Link (Festnetz hat kein WhatsApp).
 */

/** true bei deutschen Mobilnummern (015x, 016x, 017x – national oder mit +49/0049). */
export function istMobilnummer(telefon: string): boolean {
  return /^(?:0|49)1[5-7]\d/.test(nurZiffern(telefon).replace(/^00/, ''))
}

/** Telefonnummer im internationalen Format ohne "+", wie wa.me sie erwartet. */
export function whatsappNummer(telefon: string): string {
  const ziffern = nurZiffern(telefon)
  if (ziffern.startsWith('00')) return ziffern.slice(2)
  if (ziffern.startsWith('0')) return '49' + ziffern.slice(1)
  return ziffern
}

/** Link zu WhatsApp für eine Person – oder null, wenn es keine passende Nummer gibt. */
export function whatsappLink(person: { whatsapp?: string | null; telefon?: string | null }): string | null {
  const nummer = person.whatsapp?.trim() || (person.telefon && istMobilnummer(person.telefon) ? person.telefon : null)
  if (!nummer) return null
  const ziel = whatsappNummer(nummer)
  return ziel.length >= 6 ? `https://wa.me/${ziel}` : null
}

function nurZiffern(telefon: string): string {
  // "+" am Anfang wie "00" behandeln, alles andere außer Ziffern entfernen
  return telefon.trim().replace(/^\+/, '00').replace(/\D/g, '')
}
