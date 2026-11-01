/**
 * lib/sparten-bilder.ts
 *
 * Symbolbilder für die Spartenübersicht, abgelegt unter public/images/sparten/<slug>.webp.
 * Alle Fotos stammen von Unsplash (Unsplash-Lizenz: kostenlos, auch kommerziell, ohne
 * Namensnennungspflicht). Fotograf und Quelle stehen trotzdem hier, damit sich die Herkunft
 * jederzeit nachvollziehen lässt.
 *
 * Sparten ohne Eintrag zeigen weiter ihr Emoji bzw. das Vereinswappen.
 */

interface SparteBild {
  fotograf: string
  quelle: string
}

const SPARTEN_BILDER: Record<string, SparteBild> = {
  'akrobatik':          { fotograf: 'Leo_Visions',               quelle: 'https://unsplash.com/photos/PPAUipTDMgc' },
  'badminton':          { fotograf: 'Muktasim Azlan',            quelle: 'https://unsplash.com/photos/rjWfNR_AC5g' },
  'bogenschiessen':     { fotograf: 'Bill Fairs',                quelle: 'https://unsplash.com/photos/0iA5B6g_vXo' },
  'boule':              { fotograf: 'Michał Parzuchowski',       quelle: 'https://unsplash.com/photos/xM22VQKpFsw' },
  'dart':               { fotograf: 'Anastase Maragos',          quelle: 'https://unsplash.com/photos/X4zx5Vc_LZU' },
  'fitness':            { fotograf: 'Geert Pieters',             quelle: 'https://unsplash.com/photos/3RnkZpDqsEI' },
  'fussball':           { fotograf: 'Emilio Garcia',             quelle: 'https://unsplash.com/photos/AWdCgDDedH0' },
  'judo':               { fotograf: 'Konstantinos Papadopoulos', quelle: 'https://unsplash.com/photos/cKPNZuKi-wo' },
  'kinderturnen':       { fotograf: 'Brett Wharton',             quelle: 'https://unsplash.com/photos/YIydUsQL3v0' },
  'mutter-kind-turnen': { fotograf: 'Brett Wharton',             quelle: 'https://unsplash.com/photos/ionpZWo5grA' },
  'nordic-walking':     { fotograf: 'Gábor Kárpáti',             quelle: 'https://unsplash.com/photos/FjT3HkVpC88' },
  'seniorensport':      { fotograf: 'Centre for Ageing Better',  quelle: 'https://unsplash.com/photos/kB4FXX1KXhQ' },
  'sportabzeichen':     { fotograf: 'Steven Lelham',             quelle: 'https://unsplash.com/photos/atSaEOeE8Nk' },
  'step-aerobic':       { fotograf: 'Kaspars Eglitis',           quelle: 'https://unsplash.com/photos/Vdx-2lsuhm0' },
  'tischtennis':        { fotograf: 'Inkiipow',                  quelle: 'https://unsplash.com/photos/JwxatcF2Oec' },
  'volleyball':         { fotograf: 'Vince Fleming',             quelle: 'https://unsplash.com/photos/aZVpxRydiJk' },
  'yoga':               { fotograf: 'Vitaly Gariev',             quelle: 'https://unsplash.com/photos/CAMTvmtpuCE' },
}

/** Öffentliche URL des Symbolbilds einer Sparte – oder null, wenn es keins gibt. */
export function spartenBild(slug: string): string | null {
  return slug in SPARTEN_BILDER ? `/images/sparten/${slug}.webp` : null
}
