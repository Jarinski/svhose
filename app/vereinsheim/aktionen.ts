'use server'

/**
 * Öffentliche Server-Aktionen rund um das Vereinsheim: Anfrage stellen, Stand abrufen und die
 * Belegung eines Tages anzeigen (nur Zeiten, keine Namen oder Anlässe). Logik und Schutz gegen
 * Spam und Raten stehen in lib/buchungen/anfrage.ts.
 */

import { eq } from 'drizzle-orm'
import { after } from 'next/server'
import { datenbank, schema } from '@/lib/db'
import { anfrageEinreichen, standAbrufen, type AnfrageEingabe, type OeffentlicherStand } from '@/lib/buchungen/anfrage'
import { belegungOeffentlich, type FreiBelegt } from '@/lib/buchungen/belegung'
import { eingangsMail, vereinsMail } from '@/lib/buchungen/mails'
import { heute, istDatum, istOrt } from '@/lib/buchungen/zeit'
import { buchungsPostfach, mailEingerichtet, mailSenden } from '@/lib/mail'
import { anfrageIp, basisUrl } from '@/lib/verwaltung/sitzung'

export interface AnfrageZustand {
  ok?: boolean
  meldung?: string
  felder?: Record<string, string>
  nummer?: string
  datum?: string
  ueberschneidung?: boolean
  /** Geht eine Bestätigung per E-Mail raus? */
  mail?: boolean
}

function text(formData: FormData, name: string, mehrzeilig = false): string | null {
  const wert = formData.get(name)
  if (typeof wert !== 'string') return null
  const t = (mehrzeilig ? wert.replace(/\r\n?/g, '\n') : wert.replace(/\s+/g, ' ')).trim()
  return t === '' ? null : t
}

export async function anfrageSenden(_vorher: AnfrageZustand, formData: FormData): Promise<AnfrageZustand> {
  const eingabe: AnfrageEingabe = {
    art: text(formData, 'art'),
    ort: text(formData, 'ort'),
    datum: text(formData, 'datum'),
    beginn: text(formData, 'beginn'),
    ende: text(formData, 'ende'),
    bisDatum: text(formData, 'bisDatum'),
    ganztaegig: formData.get('ganztaegig') === '1',
    titel: text(formData, 'titel'),
    personenzahl: text(formData, 'personenzahl'),
    bereich: text(formData, 'bereich'),
    name: text(formData, 'name'),
    email: text(formData, 'email'),
    telefon: text(formData, 'telefon'),
    nachricht: text(formData, 'nachricht', true),
    datenschutz: formData.get('datenschutz') === '1',
    falle: text(formData, 'webseite'),
  }
  const db = datenbank()
  const ergebnis = anfrageEinreichen(db, eingabe, await anfrageIp())
  if (!ergebnis.ok) return { ok: false, meldung: ergebnis.meldung, felder: ergebnis.felder }

  // E-Mails nach der Antwort verschicken: Das Formular wartet nicht auf den Mailserver.
  const b = db.select().from(schema.buchungen).where(eq(schema.buchungen.nummer, ergebnis.nummer)).get()
  const mail = !!b?.email && mailEingerichtet()
  if (b && mailEingerichtet()) {
    const basis = await basisUrl()
    after(async () => {
      if (b.email) await mailSenden({ an: b.email, ...eingangsMail(b, `${basis}/vereinsheim/status`), antwortAn: buchungsPostfach() })
      const postfach = buchungsPostfach()
      if (postfach) await mailSenden({ an: postfach, ...vereinsMail(b, `${basis}/verwaltung/buchungen/${b.id}`), antwortAn: b.email })
    })
  }
  return { ok: true, nummer: ergebnis.nummer, datum: ergebnis.datum, ueberschneidung: ergebnis.ueberschneidung, mail }
}

export interface StandZustand {
  ok?: boolean
  meldung?: string
  stand?: OeffentlicherStand
}

export async function standAbfragen(_vorher: StandZustand, formData: FormData): Promise<StandZustand> {
  const ergebnis = standAbrufen(datenbank(), text(formData, 'nummer'), text(formData, 'datum'), await anfrageIp())
  return ergebnis.ok ? { ok: true, stand: ergebnis.stand } : { ok: false, meldung: ergebnis.meldung }
}

/** Belegung eines Tages für das Buchungsformular – nur Zeiten und ob regelmäßig, bestätigt oder angefragt. */
export async function belegungAbfragen(datum: string, ort: string): Promise<FreiBelegt[] | null> {
  if (!istDatum(datum) || !istOrt(ort) || datum < heute()) return null
  return belegungOeffentlich(datenbank(), datum, ort)
}
