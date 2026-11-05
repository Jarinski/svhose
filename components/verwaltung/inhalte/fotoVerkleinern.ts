/**
 * components/verwaltung/inhalte/fotoVerkleinern.ts
 *
 * Verkleinert ein Foto im Browser, bevor es hochgeladen wird – für Bildergalerien, in denen viele
 * Fotos auf einmal gespeichert werden. Next.js nimmt eine Anfrage nur bis 16 MB an
 * (next.config.js); fünf Handyfotos in voller Größe wären schon zu viel. Der Server verkleinert
 * ohnehin auf 1600 px (lib/verwaltung/medien-upload.ts), es geht also nichts verloren.
 */

/** Wie MAX_KANTE in lib/verwaltung/medien-upload.ts. */
const MAX_KANTE = 1600
/** Kleine Fotos, die schon in die Grenze passen, gehen unverändert hoch. */
const KLEIN_GENUG = 1024 * 1024

/** WebP (klein), wo der Browser es erzeugen kann – sonst JPEG. */
function alsBlob(leinwand: HTMLCanvasElement): Promise<Blob | null> {
  const als = (typ: string) => new Promise<Blob | null>(fertig => leinwand.toBlob(fertig, typ, 0.9))
  return als('image/webp').then(b => (b && b.type === 'image/webp' ? b : als('image/jpeg')))
}

/**
 * Liefert das Foto mit höchstens 1600 px Kantenlänge (Drehung aus den Kameradaten übernommen).
 * Kann der Browser das Format nicht lesen (z. B. HEIC außerhalb von Safari), bleibt die Datei, wie sie
 * ist – dann versucht es der Server.
 */
export async function fotoVerkleinern(datei: File): Promise<File> {
  let bild: ImageBitmap
  try {
    bild = await createImageBitmap(datei)
  } catch {
    return datei
  }
  try {
    const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height))
    if (faktor === 1 && datei.size <= KLEIN_GENUG) return datei
    const leinwand = document.createElement('canvas')
    leinwand.width = Math.max(1, Math.round(bild.width * faktor))
    leinwand.height = Math.max(1, Math.round(bild.height * faktor))
    const zeichnen = leinwand.getContext('2d')
    if (!zeichnen) return datei
    // Weiß darunter, falls es als JPEG endet (JPEG kennt keine Transparenz)
    zeichnen.fillStyle = '#ffffff'
    zeichnen.fillRect(0, 0, leinwand.width, leinwand.height)
    zeichnen.imageSmoothingQuality = 'high'
    zeichnen.drawImage(bild, 0, 0, leinwand.width, leinwand.height)
    const blob = await alsBlob(leinwand)
    if (!blob || blob.size >= datei.size) return datei
    const name = `${datei.name.replace(/\.[^.]*$/, '') || 'foto'}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
    return new File([blob], name, { type: blob.type })
  } finally {
    bild.close()
  }
}
