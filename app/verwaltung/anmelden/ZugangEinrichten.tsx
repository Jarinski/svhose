'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { einrichten, einrichtungLaden, type EinrichtungsDaten } from '../aktionen'
import { LEER } from '@/lib/verwaltung/formular'
import { FormMeldung, SpeichernKnopf } from '@/components/verwaltung/FormularTeile'
import { eingabeKlasse, Feld, knopfKlassen, Meldung } from '@/components/verwaltung/ui'

type Zustand = { art: 'start' } | { art: 'eingabe' } | { art: 'fehler'; text: string } | { art: 'bereit'; code: string; daten: Extract<EinrichtungsDaten, { name: string }> }

function Schritt({ nummer, titel, children }: { nummer: number; titel: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#0a0a0a]/10 rounded-sm p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-[#0a0a0a] text-[#f5f5f0] text-sm flex items-center justify-center font-medium">{nummer}</span>
        <h2 className="font-medium">{titel}</h2>
      </div>
      {children}
    </section>
  )
}

export default function ZugangEinrichten() {
  const [zustand, setZustand] = useState<Zustand>({ art: 'start' })
  const [eingabe, setEingabe] = useState('')
  const [laeuft, starten] = useTransition()
  const [ergebnis, aktion] = useFormState(einrichten, LEER)

  function laden(code: string) {
    starten(async () => {
      try {
        const r = await einrichtungLaden(code)
        setZustand('name' in r ? { art: 'bereit', code, daten: r } : { art: 'fehler', text: r.fehler })
      } catch {
        setZustand({ art: 'fehler', text: 'Der Code konnte gerade nicht geprüft werden. Bitte später erneut versuchen.' })
      }
    })
  }

  useEffect(() => {
    const ausLink = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    if (ausLink) laden(ausLink)
    else setZustand({ art: 'eingabe' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const kopf = (
    <div className="mb-8">
      <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-2">SV Holm-Seppensen · Vereinsverwaltung</div>
      <h1 className="font-display text-5xl tracking-tight">
        {zustand.art === 'bereit' ? `WILLKOMMEN, ${zustand.daten.name.split(' ')[0].toUpperCase()}!` : 'ZUGANG EINRICHTEN'}
      </h1>
    </div>
  )

  if (zustand.art === 'start' || (laeuft && zustand.art !== 'bereit')) {
    return (
      <>
        {kopf}
        <p className="text-sm text-[#6b6b6b]">Einladung wird geprüft …</p>
      </>
    )
  }

  if (zustand.art === 'eingabe' || zustand.art === 'fehler') {
    return (
      <>
        {kopf}
        <form
          className="space-y-5"
          onSubmit={e => {
            e.preventDefault()
            if (eingabe.trim()) laden(eingabe)
          }}
        >
          {zustand.art === 'fehler' && <Meldung art="fehler">{zustand.text}</Meldung>}
          <Feld label="Einladungs-Code" htmlFor="einladung" hinweis="12 Zeichen, z. B. K7QM-9XTD-2HWP – du hast ihn zusammen mit dem QR-Code bekommen.">
            <input
              id="einladung"
              value={eingabe}
              onChange={e => setEingabe(e.target.value)}
              autoFocus
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXX-XXXX-XXXX"
              className={`${eingabeKlasse} font-mono text-xl tracking-[0.12em] uppercase`}
            />
          </Feld>
          <button type="submit" className={`${knopfKlassen.primaer} w-full py-3`}>
            Weiter
          </button>
          <p className="text-xs text-[#6b6b6b]">
            Schon eingerichtet?{' '}
            <Link href="/verwaltung/login" className="underline underline-offset-4">
              Zur Anmeldung
            </Link>
          </p>
        </form>
      </>
    )
  }

  const { daten, code } = zustand
  return (
    <>
      {kopf}
      <form action={aktion} className="space-y-5">
        <input type="hidden" name="code" value={code} />

        <Schritt nummer={1} titel="Dein Benutzername">
          <p className="text-sm text-[#4a4a4a]">Damit meldest du dich künftig an – am besten merken:</p>
          <div className="mt-3 font-mono text-lg bg-[#f5f5f0] border border-[#0a0a0a]/10 rounded-sm px-3 py-2 select-all">{daten.benutzername}</div>
          {/* Für Passwort-Manager: Benutzername zum Passwort mitspeichern */}
          <input type="text" name="benutzername" autoComplete="username" value={daten.benutzername} readOnly hidden />
        </Schritt>

        <Schritt nummer={2} titel="Passwort festlegen">
          <div className="space-y-4">
            <Feld label="Neues Passwort" htmlFor="passwort" hinweis="Mindestens 10 Zeichen. Ein Satz aus mehreren Wörtern ist sicher und gut zu merken." fehler={ergebnis.felder?.passwort}>
              <input id="passwort" name="passwort" type="password" required minLength={10} autoComplete="new-password" className={eingabeKlasse} />
            </Feld>
            <Feld label="Passwort wiederholen" htmlFor="passwortWdh" fehler={ergebnis.felder?.passwortWdh}>
              <input id="passwortWdh" name="passwortWdh" type="password" required minLength={10} autoComplete="new-password" className={eingabeKlasse} />
            </Feld>
          </div>
        </Schritt>

        <Schritt nummer={3} titel="Authenticator-App koppeln">
          <p className="text-sm text-[#4a4a4a] leading-relaxed">
            Öffne eine Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator oder Aegis – kostenlos im App Store bzw. Play Store),
            tippe auf „+“ bzw. „Konto hinzufügen“ und scanne diesen QR-Code.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-5 sm:items-center">
            <div
              className="w-48 h-48 shrink-0 self-center sm:self-auto border border-[#0a0a0a]/10 p-2 bg-white [&>svg]:w-full [&>svg]:h-full"
              role="img"
              aria-label="QR-Code für die Authenticator-App"
              dangerouslySetInnerHTML={{ __html: daten.qrSvg }}
            />
            <div className="text-xs text-[#6b6b6b] leading-relaxed">
              Bist du gerade auf dem Handy und kannst nicht scannen? Dann in der App „Schlüssel eingeben“ wählen und diesen Schlüssel eintippen:
              <div className="mt-2 font-mono text-sm text-[#0a0a0a] break-all select-all">{daten.totpGeheimnisAnzeige}</div>
            </div>
          </div>
          <div className="mt-5">
            <Feld label="Code aus der App" htmlFor="totpCode" hinweis="Zur Kontrolle: Gib die 6 Ziffern ein, die die App jetzt anzeigt." fehler={ergebnis.felder?.totpCode}>
              <input
                id="totpCode"
                name="totpCode"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                placeholder="123456"
                className={`${eingabeKlasse} font-mono text-xl tracking-[0.3em] max-w-[12rem]`}
              />
            </Feld>
          </div>
        </Schritt>

        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input type="checkbox" name="merken" value="ja" defaultChecked className="w-4 h-4 accent-[#0a0a0a]" />
          Auf diesem Gerät angemeldet bleiben (30 Tage)
        </label>
        <FormMeldung ergebnis={ergebnis} />
        <SpeichernKnopf className="w-full py-3">Zugang einrichten und anmelden</SpeichernKnopf>
      </form>
    </>
  )
}
