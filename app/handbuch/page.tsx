import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, LogIn } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Studio-Handbuch – SV Holm-Seppensen',
  description:
    'Anleitung für die Redaktion: News posten, Trainer und Ansprechpartner pflegen, Termine und Trainingszeiten aktualisieren im Sanity Studio.',
}

function Field({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[0.85em] font-mono bg-[#0a0a0a]/[0.06] border border-[#0a0a0a]/10 rounded px-1.5 py-0.5 whitespace-nowrap">
      {children}
    </code>
  )
}

function Btn({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[0.85em] font-mono bg-[#0a0a0a] text-[#f5f5f0] rounded px-1.5 py-0.5 whitespace-nowrap">
      {children}
    </code>
  )
}

function Callout({ type, label, children }: { type: 'tip' | 'warn'; label: string; children: React.ReactNode }) {
  const styles =
    type === 'warn'
      ? 'border-amber-300/60 bg-amber-50 text-amber-950'
      : 'border-emerald-300/60 bg-emerald-50 text-emerald-950'
  const labelColor = type === 'warn' ? 'text-amber-700' : 'text-emerald-700'
  return (
    <div className={`border rounded px-5 py-4 text-sm leading-relaxed max-w-2xl ${styles}`}>
      <div className={`text-[11px] tracking-[0.15em] uppercase font-semibold mb-1.5 ${labelColor}`}>{label}</div>
      <div className="text-[#0a0a0a]/80">{children}</div>
    </div>
  )
}

interface Chapter {
  num: string
  title: string
  tag: string
  goal: React.ReactNode
  steps: React.ReactNode[]
  callouts?: React.ReactNode[]
}

const CHAPTERS: Chapter[] = [
  {
    num: '01',
    title: 'News posten',
    tag: 'War in WordPress: „Beitrag erstellen“',
    goal: <>Links auf <Field>News</Field> → oben auf das <Field>+</Field>.</>,
    steps: [
      <>Überschrift eintragen — der Titel im Menü aktualisiert sich sofort mit.</>,
      <>Beitragsbild hochladen (optional, aber empfohlen).</>,
      <>Text schreiben. Fett, Kursiv und Bilder mitten im Text sind möglich, wie in einem einfachen Editor.</>,
      <>Kategorie und Bereich/Sparte auswählen (beides optional, hilft aber bei der Einordnung).</>,
      <>Bei <Field>URL-Name</Field> einmal auf „Generate“ klicken, danach nicht mehr ändern.</>,
      <><Btn>Publish</Btn> klicken.</>,
    ],
    callouts: [
      <Callout type="tip" label="Gut zu wissen" key="c1">
        Das Veröffentlichungsdatum wird bei neuen Beiträgen automatisch auf heute gesetzt — ihr müsst es
        nicht anfassen, außer der Beitrag soll rückdatiert werden.
      </Callout>,
    ],
  },
  {
    num: '02',
    title: 'Trainer wechseln',
    tag: 'Für eine Mannschaft, die schon einen Trainer hat',
    goal: <>Links auf <Field>Mannschaften / Trainingsgruppen</Field> → gewünschtes Team öffnen.</>,
    steps: [
      <>Zum Feld <Field>Trainer:innen und Ansprechpartner:innen</Field> scrollen.</>,
      <>Beim bisherigen Namen auf <Field>···</Field> klicken → <Field>Replace</Field>.</>,
      <>Neuen Namen eintippen, aus der Liste auswählen.</>,
      <><Btn>Publish</Btn> klicken.</>,
    ],
    callouts: [
      <Callout type="tip" label="Warum das so einfach ist" key="c1">
        Trainer:innen werden zentral einmal unter <Field>Personen</Field> gepflegt. Ihr wählt hier nur
        aus, wer schon vorhanden ist — deshalb reicht ein Klick.
      </Callout>,
    ],
  },
  {
    num: '03',
    title: 'Neuen Trainer anlegen & zuweisen',
    tag: 'Wenn die Person noch gar nicht im System ist',
    goal: <>Das ist ein Vorgang in zwei Etappen — beide sind kurz, aber die Reihenfolge zählt.</>,
    steps: [
      <>Links auf <Field>Personen</Field> → <Field>+</Field> → Name eintragen, Rolle „Trainer“ ankreuzen → <Btn>Publish</Btn>.</>,
      <>Erst <em>danach</em> zur Mannschaft wechseln und die Person wie in Schritt 02 über <Field>Add item</Field> zuweisen.</>,
    ],
    callouts: [
      <Callout type="warn" label="Achtung, häufigste Stolperfalle" key="c1">
        Wenn ihr die neue Person zuerst der Mannschaft zuweist und <em>dann</em> versucht, die Mannschaft
        zu veröffentlichen, meldet das Studio nur vage „Es gibt Validierungsfehler“. Der Grund: die
        Person selbst wurde noch nie veröffentlicht. Einfach kurz zu <Field>Personen</Field> wechseln und
        dort <Btn>Publish</Btn> klicken — danach lässt sich auch die Mannschaft ganz normal speichern.
      </Callout>,
    ],
  },
  {
    num: '04',
    title: 'Ansprechpartner wechseln',
    tag: 'Neue Person für eine bestehende Rolle, z. B. „1. Vorsitzende:r“ oder Abteilungsleitung',
    goal: <>Links auf <Field>Ansprechpartner / Kontaktseite</Field> → den bestehenden Eintrag öffnen, dessen Rolle neu besetzt wird.</>,
    steps: [
      <>Beim Feld <Field>Zentrale Person</Field> auf <Field>···</Field> klicken → <Field>Replace</Field>.</>,
      <>Neuen Namen eintippen und aus der Liste auswählen — Foto, E-Mail und Telefon wechseln automatisch mit, ohne dass ihr sie einzeln eintragen müsst.</>,
      <><Field>Funktion / Rolle</Field> bei Bedarf anpassen (z. B. wenn sich auch die Bezeichnung ändert).</>,
      <><Btn>Publish</Btn> klicken.</>,
    ],
    callouts: [
      <Callout type="tip" label="Ganz neuer Ansprechpartner statt Ersatz" key="c1">
        Soll eine Rolle neu dazukommen statt ersetzt zu werden: links auf <Field>+</Field> klicken statt
        einen bestehenden Eintrag zu öffnen, dann genauso bei <Field>Zentrale Person</Field> suchen oder
        über <Field>Create...</Field> direkt neu anlegen (Reihenfolge-Regel aus Kapitel 03 beachten,
        falls die Person neu ist).
      </Callout>,
    ],
  },
  {
    num: '05',
    title: 'Telefonnummer, E-Mail und Foto ändern',
    tag: 'Für jemanden, der schon im System steht — nur die Daten haben sich geändert',
    goal: <>Links auf <Field>Personen</Field> → die gesuchte Person über das Suchfeld oben finden und öffnen.</>,
    steps: [
      <><Field>E-Mail</Field> oder <Field>Telefon</Field> anklicken, alten Wert markieren und den neuen eintippen.</>,
      <>Für ein neues Foto: beim Feld <Field>Foto</Field> auf <Field>···</Field> klicken → <Field>Upload</Field> für ein Bild von eurem Rechner, oder <Field>Select</Field> für ein bereits hochgeladenes. <Field>Clear field</Field> entfernt das Foto ganz.</>,
      <><Btn>Publish</Btn> klicken.</>,
    ],
    callouts: [
      <Callout type="tip" label="Einmal ändern, überall aktuell" key="c1">
        Trainer:innen und Ansprechpartner:innen verweisen meist auf genau diese eine zentrale Person.
        Ändert ihr hier die Telefonnummer oder das Foto, wirkt sich das automatisch überall aus, wo die
        Person auftaucht — Trainerliste, Kontaktseite, Mannschaftskarte. Ihr müsst es nicht an mehreren
        Stellen einzeln nachtragen.
      </Callout>,
      <Callout type="warn" label="Ausnahme" key="c2">
        Ist bei einem Ansprechpartner-Eintrag keine <Field>Zentrale Person</Field> ausgewählt, sondern
        Name/E-Mail/Telefon direkt im Ansprechpartner-Eintrag eingetragen (ältere Einträge), dann ändert
        ihr die Daten direkt dort statt unter „Personen“.
      </Callout>,
    ],
  },
  {
    num: '06',
    title: 'Termin anlegen',
    tag: 'Der unkomplizierteste Inhaltstyp im ganzen Studio',
    goal: <>Links auf <Field>Termine</Field> → <Field>+</Field>. Reine Textfelder, keine Verknüpfungen.</>,
    steps: [
      <><Field>Titel des Termins</Field>, <Field>Datum</Field> und optional <Field>Uhrzeit</Field> und <Field>Ort</Field> ausfüllen.</>,
      <><Field>Bereich / Sparte</Field> und eine kurze <Field>Beschreibung</Field> ergänzen, falls sinnvoll.</>,
      <><Btn>Publish</Btn> klicken.</>,
    ],
    callouts: [
      <Callout type="warn" label="Ausnahme" key="c1">
        Spieltermine mit dem Vermerk „Automatische Fußball-ID“ werden nachts automatisch aus
        fussball.de/click-tt nachgezogen. Handänderungen daran können beim nächsten Sync wieder
        überschrieben werden — für die reguläre Terminpflege betrifft euch das nicht.
      </Callout>,
    ],
  },
  {
    num: '07',
    title: 'Trainingszeit ändern',
    tag: 'Tag, Uhrzeit oder Ort einer bestehenden Gruppe anpassen',
    goal: <>Links auf <Field>Trainingszeiten</Field> → passenden Eintrag öffnen (Sparte, Wochentag und Uhrzeit stehen schon in der Liste).</>,
    steps: [
      <><Field>Wochentag</Field> per Dropdown oder <Field>Uhrzeit</Field> als Text anpassen.</>,
      <><Btn>Publish</Btn> klicken.</>,
    ],
    callouts: [
      <Callout type="tip" label="Zwei Wege, ein Eintrag" key="c1">
        Oben im Formular steht „Empfohlen: zentrale Auswahl“ (Mannschaft + Trainingsplatz aus der Liste
        wählen). Bei älteren Einträgen ist stattdessen der Bereich „Direkte Eingaben“ ausgefüllt — beides
        ist gültig, für eine reine Zeitänderung müsst ihr nur das jeweils passende Feld anfassen.
      </Callout>,
    ],
  },
]

const BRIDGE = [
  ['Beiträge', 'News'],
  ['Medienbibliothek', 'Bild direkt im jeweiligen Feld hochladen'],
  ['Entwurf / Veröffentlichen', 'Draft / Publish — heißt fast genauso'],
  ['Kategorien & Schlagworte', 'Feste Auswahllisten pro Inhaltstyp'],
  ['Seiten-Editor (Gutenberg)', 'Kein freier Seitenbau — jeder Inhalt hat feste Felder'],
]

const UNTERSCHIEDE = [
  {
    titel: 'Keine freie Seitengestaltung',
    text: 'Jeder Inhaltstyp (News, Termin, Mannschaft, …) hat feste, vorgegebene Felder statt eines Baukastens mit Blöcken.',
  },
  {
    titel: 'Änderungen brauchen ca. 60 Sekunden',
    text: 'Bis eine Änderung auf der Website sichtbar wird — kein sofortiges Live-Update wie manchmal bei WordPress-Themes.',
  },
  {
    titel: 'Bilder gehören zum Feld',
    text: 'Nicht zu einer zentralen Mediathek. Hochladen passiert direkt dort, wo das Bild gebraucht wird.',
  },
  {
    titel: 'Referenzen statt Freitext',
    text: 'Trainer, Sparten und Trainingsplätze werden oft aus einer Liste ausgewählt statt eingetippt — verhindert Tippfehler, verlangt aber, dass die Person/der Ort vorher einmal angelegt wurde.',
  },
]

const ZUGRIFF = [
  { name: 'Henrik Behrndt', rolle: '1. Vorsitzender' },
  { name: 'Saad Fidaoui', rolle: 'Öffentlichkeitsarbeit' },
  { name: 'Nina Fenz', rolle: 'Abteilungsleitung Tischtennis' },
]

export default function HandbuchPage() {
  return (
    <div className="pt-32 pb-24">
      {/* ── Hero ── */}
      <div className="px-6 max-w-7xl mx-auto mb-16">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-4">Redaktions-Handbuch</div>
        <h1 className="font-display text-6xl md:text-8xl tracking-tight mb-10">
          VOM WORDPRESS-<br />DASHBOARD INS STUDIO
        </h1>
        <div className="w-16 h-px bg-[#0a0a0a] mb-10" />
        <div className="max-w-2xl">
          <p className="text-xl text-[#6b6b6b] font-light leading-relaxed">
            Die Website zieht von WordPress auf ein neues System um: <strong className="text-[#0a0a0a] font-normal">Sanity Studio</strong>.
            Die guten Nachrichten zuerst — News schreiben, Trainer wechseln, Termine anlegen funktioniert
            am Ende genauso einfach wie vorher. Nur die Oberfläche ist neu. Dieses Handbuch übersetzt, was
            ihr aus WordPress kennt.
          </p>
        </div>
      </div>

      {/* ── WordPress → Studio Bridge ── */}
      <div className="px-6 max-w-7xl mx-auto mb-16">
        <div className="border border-[#0a0a0a]/10 max-w-3xl">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 px-6 py-3 border-b border-[#0a0a0a]/10">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]">WordPress</div>
            <div />
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b]">Studio</div>
          </div>
          {BRIDGE.map(([wp, sanity], i) => (
            <div
              key={wp}
              className={`grid grid-cols-[1fr_auto_1fr] gap-x-4 px-6 py-3 items-center text-sm ${i !== BRIDGE.length - 1 ? 'border-b border-[#0a0a0a]/10' : ''}`}
            >
              <div className="text-[#6b6b6b]">{wp}</div>
              <ArrowRight size={13} className="text-[#0a0a0a]/30" />
              <div className="text-[#0a0a0a] font-medium">{sanity}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Einstieg: Login + Draft/Publish ── */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#0a0a0a]/10">
          <div className="bg-[#f5f5f0] p-8">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Einstieg</div>
            <h2 className="font-display text-2xl tracking-tight mb-4">EINLOGGEN</h2>
            <p className="text-sm text-[#0a0a0a]/80 leading-relaxed mb-4">
              Das Studio läuft unter <Field>/studio</Field> auf der Vereins-Website. Anders als bei
              WordPress gibt es keinen Benutzernamen + Passwort speziell für die Website — ihr meldet
              euch mit einem bestehenden Google- oder GitHub-Konto an, oder per E-Mail-Link. Beim
              allerersten Mal muss euch jemand mit Zugriff vorher als Mitglied im Projekt hinzufügen.
            </p>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 bg-[#0a0a0a] text-[#f5f5f0] px-6 py-3.5 text-sm tracking-[0.08em] uppercase font-medium hover:bg-[#1a1a1a] transition-colors mb-5"
            >
              <LogIn size={16} /> Zum Studio
            </Link>
            <p className="text-xs text-[#6b6b6b] leading-relaxed">
              Es gibt noch keine feinen Rollen wie „Autor“ oder „Redakteur“ — wer eingeloggt ist, kann
              aktuell alles bearbeiten. Geht also mit der gleichen Vorsicht ran wie bisher mit dem
              WordPress-Admin-Zugang.
            </p>
          </div>
          <div className="bg-[#f5f5f0] p-8">
            <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-3">Das Wichtigste</div>
            <h2 className="font-display text-2xl tracking-tight mb-4">ENTWURF &amp; PUBLISH</h2>
            <p className="text-sm text-[#0a0a0a]/80 leading-relaxed mb-4">
              Jede Änderung wird zuerst automatisch als <strong>Entwurf</strong> gespeichert — genau wie
              bei WordPress. Auf der echten Website passiert aber <strong>gar nichts</strong>, bis ihr
              unten rechts auf <Btn>Publish</Btn> klickt. Danach dauert es rund 60 Sekunden, bis die
              Änderung live ist.
            </p>
            <p className="text-xs text-[#6b6b6b] leading-relaxed">
              Das gilt für jeden Inhaltstyp: News, Termine, Trainingszeiten, Personen — überall gibt es
              diesen einen Knopf.
            </p>
          </div>
        </div>
      </div>

      {/* ── Wer hat Zugriff ── */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Einstieg</div>
        <h2 className="font-display text-3xl tracking-tight mb-8">WER HAT ZUGRIFF</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#0a0a0a]/10 max-w-3xl mb-6">
          {ZUGRIFF.map(p => (
            <div key={p.name} className="bg-[#f5f5f0] p-6">
              <div className="font-medium text-[#0a0a0a] mb-1">{p.name}</div>
              <div className="text-xs text-[#6b6b6b]">{p.rolle}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#6b6b6b] max-w-2xl leading-relaxed">
          Neuer Zugang nötig? Das läuft nicht über die Website, sondern direkt bei Sanity
          (manage.sanity.io → Members → Invite). Nur der Projekt-Owner kann neue Mitglieder einladen.
        </p>
      </div>

      {/* ── Kapitel ── */}
      <div className="px-6 max-w-7xl mx-auto mb-20">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#6b6b6b] mb-3">Schritt für Schritt</div>
        <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-12">DIE HÄUFIGSTEN AUFGABEN</h2>

        <div className="space-y-16 max-w-3xl">
          {CHAPTERS.map(ch => (
            <div key={ch.num} id={`kapitel-${ch.num}`} className="scroll-mt-24">
              <div className="flex items-start gap-5 mb-5">
                <span className="font-display text-2xl bg-[#0a0a0a] text-[#f5f5f0] w-11 h-11 flex items-center justify-center shrink-0 leading-none">
                  {ch.num}
                </span>
                <div>
                  <h3 className="font-display text-2xl tracking-tight leading-none mb-1.5">{ch.title.toUpperCase()}</h3>
                  <div className="text-xs text-[#6b6b6b]">{ch.tag}</div>
                </div>
              </div>

              <p className="text-sm text-[#0a0a0a]/80 leading-relaxed mb-5">{ch.goal}</p>

              <ol className="space-y-3 mb-5">
                {ch.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#0a0a0a]/80 leading-relaxed">
                    <span className="shrink-0 w-6 h-6 rounded-full border border-[#0a0a0a]/20 flex items-center justify-center text-[11px] font-mono text-[#6b6b6b] mt-0.5">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              {ch.callouts?.length ? <div className="space-y-3">{ch.callouts}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {/* ── Was ist anders ── */}
      <div className="bg-[#0a0a0a] text-[#f5f5f0] py-20 px-6 mb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#6b6b6b] mb-6">Referenz</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-12">WAS IST ANDERS ALS BEI WORDPRESS?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#f5f5f0]/10">
            {UNTERSCHIEDE.map(u => (
              <div key={u.titel} className="bg-[#0a0a0a] p-8">
                <div className="font-display text-lg tracking-tight mb-3">{u.titel.toUpperCase()}</div>
                <p className="text-[#6b6b6b] text-sm leading-relaxed">{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
