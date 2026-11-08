/**
 * lib/verwaltung/inhalte/instagram.ts
 *
 * Zugang zu Instagram in der Verwaltung eintragen oder trennen (/verwaltung/instagram) – nur Admins.
 *
 * Der Zugangsschlüssel wird vor dem Speichern bei Instagram geprüft, verschlüsselt gespeichert
 * (geheimnis.ts) und nie wieder angezeigt. Im Verlauf steht nur das verbundene Konto.
 */

import type { Datenbank } from '@/lib/db'
import {
  einstellungSchreiben,
  geschaetzterAblauf,
  INSTAGRAM_ZUGANG_SCHLUESSEL,
  InstagramFehler,
  instagramKontoPruefen,
  instagramTrennen,
  instagramZugangLesen,
  type InstagramZugang,
} from '@/lib/instagram'
import { verschluesseln } from '@/lib/verwaltung/geheimnis'
import type { Rechte } from '@/lib/verwaltung/rechte'
import { protokollieren } from '@/lib/verwaltung/verlauf'
import { KEINE_RECHTE } from './gemeinsam'

export type InstagramSpeicherErgebnis = { ok: true; benutzername: string } | { ok: false; meldung: string; felder?: Record<string, string> }

const OBJEKT_TYP = 'einstellungen'

export async function instagramZugangSpeichern(db: Datenbank, rechte: Rechte, eingabe: string | null): Promise<InstagramSpeicherErgebnis> {
  if (!rechte.istAdmin) return { ok: false, meldung: KEINE_RECHTE }

  // Beim Kopieren aus dem Meta-Dashboard rutschen leicht Leerzeichen oder Zeilenumbrüche mit.
  const token = (eingabe ?? '').replace(/\s+/g, '')
  const feldFehler = (text: string): InstagramSpeicherErgebnis => ({ ok: false, meldung: text, felder: { token: text } })
  if (!token) return feldFehler('Bitte den Zugangsschlüssel einfügen.')
  if (token.length > 2000 || !/^[\w.|-]+$/.test(token)) return feldFehler('Das sieht nicht nach einem Zugangsschlüssel von Instagram aus.')

  const verschluesselt = verschluesseln(token)
  if (!verschluesselt) return { ok: false, meldung: 'Auf dem Server fehlt CRON_SECRET – ohne ihn lässt sich der Schlüssel nicht sicher speichern.' }

  let benutzername: string
  try {
    benutzername = (await instagramKontoPruefen(token)).benutzername
  } catch (fehler) {
    return feldFehler(fehler instanceof InstagramFehler ? fehler.message : 'Der Schlüssel ließ sich nicht prüfen.')
  }

  const alt = instagramZugangLesen(db)
  const jetzt = new Date().toISOString()
  const neu: InstagramZugang = { token: verschluesselt, benutzername, erneuertAm: jetzt, gueltigBis: geschaetzterAblauf() }
  db.transaction(tx => {
    einstellungSchreiben(tx, INSTAGRAM_ZUGANG_SCHLUESSEL, neu)
    protokollieren(tx, rechte, {
      aktion: alt.token ? 'geaendert' : 'angelegt',
      objektTyp: OBJEKT_TYP,
      bezeichnung: `Instagram (@${benutzername})`,
      vorher: alt.token ? { konto: alt.benutzername, schluessel: 'gespeichert' } : null,
      nachher: { konto: benutzername, schluessel: 'gespeichert' },
    })
  })
  return { ok: true, benutzername }
}

export function instagramVerbindungTrennen(db: Datenbank, rechte: Rechte): { ok: true } | { ok: false; meldung: string } {
  if (!rechte.istAdmin) return { ok: false, meldung: KEINE_RECHTE }
  const alt = instagramZugangLesen(db)
  db.transaction(tx => {
    instagramTrennen(tx)
    if (alt.token) {
      protokollieren(tx, rechte, {
        aktion: 'geloescht',
        objektTyp: OBJEKT_TYP,
        bezeichnung: `Instagram (@${alt.benutzername ?? 'unbekannt'})`,
        vorher: { konto: alt.benutzername, schluessel: 'gespeichert' },
        nachher: null,
      })
    }
  })
  return { ok: true }
}
