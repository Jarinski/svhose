import { redirect } from 'next/navigation'

// Frühere Adresse des Chronik-Editors – die Förderverein-Seiten liegen jetzt gemeinsam unter /verwaltung/foerderverein-seiten.
export default function AlteChronikAdresse() {
  redirect('/verwaltung/foerderverein-seiten/chronik')
}
