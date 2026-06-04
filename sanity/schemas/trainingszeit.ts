import { defineField, defineType } from 'sanity'

const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export default defineType({
  name: 'trainingszeit',
  title: 'Trainingszeit',
  type: 'document',
  fieldsets: [
    {
      name: 'empfohlenesModell',
      title: 'Empfohlen: zentrale Auswahl',
      options: { collapsible: true, collapsed: false },
    },
    {
      name: 'fallbackAltbestand',
      title: 'Direkte Eingaben für bestehende Einträge',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'kontaktHinweisFallback',
      title: 'Ansprechpartner / Hinweis direkt eintragen',
      options: { collapsible: true, collapsed: true },
    },
  ],
  description: 'Bestehende Trainingszeiten bearbeiten. Neue Gruppen/Mannschaften bitte nur nach Rücksprache anlegen.',
  validation: Rule =>
    Rule.custom((doc) => {
      const typedDoc = doc as {
        mannschaft?: { _ref?: string }
        sparte?: string
        gruppe?: string
        trainingsplatz?: { _ref?: string }
        ort?: string
      } | undefined

      if (!typedDoc) return true

      const hasMannschaft = Boolean(typedDoc.mannschaft?._ref)
      const hasLegacyGroup = Boolean(typedDoc.sparte && typedDoc.gruppe)
      if (!hasMannschaft && !hasLegacyGroup) {
        return 'Bitte entweder eine Mannschaft auswählen oder Sparte + Gruppe ausfüllen.'
      }

      const hasPlatzRef = Boolean(typedDoc.trainingsplatz?._ref)
      if (!hasPlatzRef && !typedDoc.ort) {
        return 'Bitte einen Trainingsplatz auswählen oder ein Ort-Fallback eintragen.'
      }

      return true
    }),
  fields: [
    defineField({
      name: 'mannschaft',
      title: 'Gruppe / Mannschaft',
      type: 'reference',
      to: [{ type: 'mannschaft' }],
      description: 'Empfohlen, wenn die Gruppe/Mannschaft bereits in der zentralen Verwaltung vorhanden ist. Neue Gruppen/Mannschaften bitte nur nach Rücksprache anlegen.',
      fieldset: 'empfohlenesModell',
    }),
    defineField({
      name: 'trainingsplatz',
      title: 'Trainingsplatz',
      type: 'reference',
      to: [{ type: 'trainingsplatz' }],
      description: 'Empfohlen, wenn der Trainingsplatz bereits in der zentralen Verwaltung vorhanden ist. Sonst den Ort unten direkt eintragen.',
      fieldset: 'empfohlenesModell',
    }),
    defineField({
      name: 'tag',
      title: 'Wochentag',
      type: 'string',
      options: { list: TAGE.map(t => ({ title: t, value: t })) },
      validation: r => r.required(),
    }),
    defineField({
      name: 'uhrzeit',
      title: 'Uhrzeit',
      type: 'string',
      description: 'Optional, z. B. 18:00–19:30.',
    }),
    defineField({
      name: 'jahreszeit',
      title: 'Jahreszeit',
      type: 'string',
      options: { list: ['ganzjährig', 'Sommer', 'Winter'].map(v => ({ title: v, value: v })) },
      initialValue: 'ganzjährig',
      description: 'Gilt die Trainingszeit ganzjährig, im Sommer oder im Winter?',
    }),
    defineField({
      name: 'frequenz',
      title: 'Frequenz',
      type: 'string',
      options: { list: ['jede Woche', 'alle 2 Wochen'].map(v => ({ title: v, value: v })) },
      initialValue: 'jede Woche',
      description: 'Wie oft findet das Training statt?',
    }),
    defineField({
      name: 'foto',
      title: 'Gruppenfoto',
      type: 'image',
      options: { hotspot: true },
      description: 'Optionales Foto der Mannschaft / Trainingsgruppe.',
    }),
    defineField({
      name: 'sparte',
      title: 'Sparte direkt eintragen',
      type: 'string',
      description: 'Nur ausfüllen, wenn oben keine Gruppe/Mannschaft ausgewählt ist. Bestehende Einträge dürfen hier weiter gepflegt werden.',
      fieldset: 'fallbackAltbestand',
    }),
    defineField({
      name: 'gruppe',
      title: 'Gruppe direkt eintragen',
      type: 'string',
      description: 'Nur ausfüllen, wenn oben keine Gruppe/Mannschaft ausgewählt ist. Neue Gruppen/Mannschaften bitte nur nach Rücksprache anlegen.',
      fieldset: 'fallbackAltbestand',
    }),
    defineField({
      name: 'ort',
      title: 'Ort direkt eintragen',
      type: 'string',
      description: 'Nur ausfüllen, wenn oben kein Trainingsplatz ausgewählt ist. Bestehende Einträge dürfen hier weiter gepflegt werden.',
      fieldset: 'fallbackAltbestand',
    }),
    defineField({
      name: 'trainer',
      title: 'Trainer direkt eintragen',
      type: 'string',
      description: 'Optional, falls der Kontakt nicht zentral bei der Gruppe/Mannschaft gepflegt wird.',
      fieldset: 'kontaktHinweisFallback',
    }),
    defineField({
      name: 'email',
      title: 'E-Mail direkt eintragen',
      type: 'string',
      description: 'Optional, falls die E-Mail nicht zentral bei der Gruppe/Mannschaft gepflegt wird.',
      fieldset: 'kontaktHinweisFallback',
    }),
    defineField({
      name: 'telefon',
      title: 'Telefon direkt eintragen',
      type: 'string',
      description: 'Optional, falls die Telefonnummer nicht zentral bei der Gruppe/Mannschaft gepflegt wird.',
      fieldset: 'kontaktHinweisFallback',
    }),
  ],
  orderings: [
    { title: 'Sparte', name: 'sparteAsc', by: [{ field: 'sparte', direction: 'asc' }] },
    { title: 'Wochentag', name: 'tagAsc', by: [{ field: 'tag', direction: 'asc' }] },
  ],
  preview: {
    select: {
      gruppeFallback: 'gruppe',
      sparteFallback: 'sparte',
      mannschaftName: 'mannschaft.name',
      sparteName: 'mannschaft.sparte.name',
      ortFallback: 'ort',
      platzName: 'trainingsplatz.name',
      tag: 'tag',
      uhrzeit: 'uhrzeit',
      media: 'foto',
    },
    prepare(selection) {
      const {
        gruppeFallback,
        sparteFallback,
        mannschaftName,
        sparteName,
        ortFallback,
        platzName,
        tag,
        uhrzeit,
        media,
      } = selection as {
        gruppeFallback?: string
        sparteFallback?: string
        mannschaftName?: string
        sparteName?: string
        ortFallback?: string
        platzName?: string
        tag?: string
        uhrzeit?: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        media?: any
      }

      const title = mannschaftName || gruppeFallback || 'Trainingszeit'
      const ort = platzName || ortFallback
      const subtitle = [sparteName || sparteFallback, tag, uhrzeit, ort].filter(Boolean).join(' · ') || undefined

      return {
        title,
        subtitle,
        media,
      }
    },
  },
})
