'use server'

/** Liefert eine frische Captcha-Aufgabe für das Anfrageformular (lib/buchungen/captcha.ts). */

import { captchaAufgabe, type CaptchaAufgabe } from '@/lib/buchungen/captcha'

export async function captchaHolen(): Promise<CaptchaAufgabe> {
  return captchaAufgabe()
}
