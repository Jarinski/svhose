/**
 * scripts/verwaltung-admin.ts
 *
 * Legt einen Admin-Zugang für /verwaltung an und zeigt den Einladungs-QR-Code im Terminal.
 * Über die Einladung legt die Person einmalig ihr Passwort fest und koppelt die Authenticator-App.
 * Gedacht für den allerersten Admin und als Notfall-Zugang, falls alle Admins ausgesperrt sind.
 * Braucht direkten Zugriff auf die Datenbank.
 *
 * Aufruf:
 *   npm run verwaltung:admin -- "Vorname Nachname"
 *   SEITEN_URL=https://… npm run verwaltung:admin -- "Vorname Nachname"   (Adresse für den Link im QR-Code)
 *
 * Gibt es schon einen Zugang mit genau diesem Namen, wird er (wieder) aktiviert, zum Admin gemacht
 * und zurückgesetzt: alle Geräte abgemeldet, Passwort und App-Kopplung ungültig, neue Einladung.
 */

import QRCode from 'qrcode'
import { eq } from 'drizzle-orm'
import { datenbank, schema } from '@/lib/db'
import { anmeldeCodeErstellen, anmeldeLink, benutzernameVorschlag, zugangZuruecksetzen } from '@/lib/verwaltung/anmeldung'
import { codeFormatieren } from '@/lib/verwaltung/codes'
import { protokollieren } from '@/lib/verwaltung/verlauf'

async function main() {
  const name = process.argv.slice(2).join(' ').trim()
  if (!name) {
    console.error('Bitte einen Namen angeben: npm run verwaltung:admin -- "Vorname Nachname"')
    process.exit(1)
  }

  const db = datenbank()
  let zugang = db.select().from(schema.zugaenge).where(eq(schema.zugaenge.name, name)).get()
  if (zugang) {
    const benutzername = zugang.benutzername ?? benutzernameVorschlag(db, name)
    db.transaction(tx => {
      tx.update(schema.zugaenge).set({ istAdmin: true, aktiv: true, benutzername }).where(eq(schema.zugaenge.id, zugang!.id)).run()
      zugangZuruecksetzen(tx, zugang!.id)
      protokollieren(tx, null, { aktion: 'geaendert', objektTyp: 'zugaenge', objektId: zugang!.id, bezeichnung: `Admin-Zugang ${name} per Skript zurückgesetzt`, quelle: 'system' })
    })
    zugang = db.select().from(schema.zugaenge).where(eq(schema.zugaenge.id, zugang.id)).get()!
    console.log(`Vorhandener Zugang "${name}" ist jetzt aktiv, Admin und zurückgesetzt (alle Geräte abgemeldet).`)
  } else {
    zugang = db.insert(schema.zugaenge).values({ name, istAdmin: true, benutzername: benutzernameVorschlag(db, name) }).returning().get()
    protokollieren(db, null, { aktion: 'angelegt', objektTyp: 'zugaenge', objektId: zugang.id, bezeichnung: `Admin-Zugang ${name} (per Skript)`, quelle: 'system' })
    console.log(`Admin-Zugang "${name}" angelegt.`)
  }

  const { code, laeuftAb } = anmeldeCodeErstellen(db, zugang.id, 'einladung', null)
  const link = anmeldeLink(process.env.SEITEN_URL?.trim() || 'http://localhost:3000', code)

  console.log('')
  console.log(await QRCode.toString(link, { type: 'terminal', small: true }))
  console.log(`Benutzername:     ${zugang.benutzername}`)
  console.log(`Einladungs-Code:  ${codeFormatieren(code)}`)
  console.log(`Link:             ${link}`)
  console.log(`Gültig bis:       ${new Date(laeuftAb).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} (einmal verwendbar)`)
  console.log('')
  console.log('QR-Code mit dem Handy scannen (oder Link öffnen), dann Passwort festlegen und die Authenticator-App koppeln.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
