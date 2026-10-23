'use client'

/**
 * Formular "Person bearbeiten". Nach erfolgreichem Speichern lädt die Seite den neuen Stand
 * vom Server und das Formular startet frisch (key = Stand).
 */

import { useActionState, useEffect, useState } from 'react'
import { LEER, type FormErgebnis } from '@/lib/verwaltung/formular'
import FotoFeld from '@/components/verwaltung/FotoFeld'
import { eingabenBehalten } from '@/components/verwaltung/FormularTeile'
import SpeicherLeiste from '@/components/verwaltung/SpeicherLeiste'
import { eingabeKlasse, Feld, Karte, Meldung } from '@/components/verwaltung/ui'
import { useUngespeichertWarnung } from '@/components/verwaltung/useUngespeichert'
import { personSpeichernAktion } from '../aktionen'

interface PersonStart {
  name: string
  email: string
  telefon: string
  whatsapp: string
  notiz: string
}

interface Props {
  id: number
  stand: string
  start: PersonStart
  fotoUrl: string | null
}

export default function PersonBearbeiten(props: Props) {
  const [ergebnis, aktion] = useActionState(personSpeichernAktion, LEER)
  return <PersonFormular key={props.stand} {...props} ergebnis={ergebnis} aktion={aktion} />
}

function PersonFormular({ id, stand, start, fotoUrl, ergebnis, aktion }: Props & { ergebnis: FormErgebnis; aktion: (formData: FormData) => void }) {
  const [werte, setWerte] = useState<PersonStart>(start)
  const [fotoGeaendert, setFotoGeaendert] = useState(false)
  const geaendert = fotoGeaendert || JSON.stringify(werte) !== JSON.stringify(start)
  useUngespeichertWarnung(geaendert)

  const felder = ergebnis.ok ? {} : (ergebnis.felder ?? {})

  useEffect(() => {
    if (ergebnis.ok || !ergebnis.felder) return
    const erstes = document.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (erstes) {
      erstes.scrollIntoView({ behavior: 'smooth', block: 'center' })
      erstes.focus({ preventScroll: true })
    }
  }, [ergebnis])

  const feld = (name: keyof PersonStart) => ({
    id: name,
    name,
    value: werte[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setWerte(alt => ({ ...alt, [name]: e.target.value })),
    'aria-invalid': !!felder[name] || undefined,
    className: eingabeKlasse,
  })

  return (
    <form action={aktion} onReset={eingabenBehalten} className="space-y-6" noValidate>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="geaendertAm" value={stand} />

      <Karte titel="Kontaktdaten">
        <div className="space-y-5">
          <Meldung art="hinweis">
            Name, Telefon, E-Mail, WhatsApp und Foto erscheinen auf der Website, sobald die Person in einem Trainerteam oder auf der
            Kontaktseite steht. Bitte nur mit Einverständnis der Person eintragen.
          </Meldung>
          <Feld label="Name" htmlFor="name" fehler={felder.name}>
            <input {...feld('name')} required maxLength={100} autoComplete="off" />
          </Feld>
          <div className="grid gap-5 md:grid-cols-2">
            <Feld label="Telefon" htmlFor="telefon" fehler={felder.telefon} hinweis="Optional, z. B. 0171 1234567">
              <input {...feld('telefon')} type="tel" inputMode="tel" maxLength={50} autoComplete="off" />
            </Feld>
            <Feld label="E-Mail" htmlFor="email" fehler={felder.email} hinweis="Optional">
              <input {...feld('email')} type="email" inputMode="email" maxLength={200} autoComplete="off" />
            </Feld>
          </div>
          <Feld
            label="WhatsApp (nur falls abweichend)"
            htmlFor="whatsapp"
            fehler={felder.whatsapp}
            hinweis="Nur ausfüllen, wenn WhatsApp über eine andere Nummer läuft als das Telefon oben."
          >
            <input {...feld('whatsapp')} type="tel" inputMode="tel" maxLength={50} autoComplete="off" />
          </Feld>
          <div>
            <span className="block text-sm font-medium text-[#0a0a0a] mb-1.5">Foto</span>
            <FotoFeld aktuell={fotoUrl} fehler={felder.foto} onAenderung={setFotoGeaendert} hochformat />
          </div>
        </div>
      </Karte>

      <Karte titel="Interne Notiz">
        <Feld label="Notiz" htmlFor="notiz" fehler={felder.notiz} hinweis="Nur für die Verwaltung – wird nie auf der Website angezeigt.">
          <textarea {...feld('notiz')} rows={3} maxLength={2000} className={`${eingabeKlasse} leading-relaxed`} />
        </Feld>
      </Karte>

      <SpeicherLeiste geaendert={geaendert} ergebnis={ergebnis} />
    </form>
  )
}
