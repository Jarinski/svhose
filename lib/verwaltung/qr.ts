/**
 * lib/verwaltung/qr.ts
 *
 * QR-Codes als SVG – serverseitig erzeugt, kein Scanner auf der Website nötig:
 * die normale Handykamera öffnet den Link.
 */

import QRCode from 'qrcode'

export async function qrSvg(inhalt: string): Promise<string> {
  return QRCode.toString(inhalt, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0a0a0a', light: '#ffffff' } })
}
