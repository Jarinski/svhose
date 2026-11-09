import { redirect } from 'next/navigation'
import { FOERDERVEREIN_START } from '@/lib/foerderverein'

// Frühere Übersichtsseite des Fördervereins – wer /foerderverein aufruft (alte Links, Lesezeichen),
// landet beim ersten Reiter "Was ist der Förderverein".
export default function FoerdervereinPage() {
  redirect(FOERDERVEREIN_START)
}
