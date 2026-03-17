import { defineField, defineType } from 'sanity'

const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export default defineType({
  name: 'trainingszeit',
  title: 'Trainingszeit',
  type: 'document',
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
      title: 'Mannschaft / Jahrgang',
      type: 'reference',
      to: [{ type: 'mannschaft' }],
      description: 'Empfohlen: verknüpft die Trainingszeit direkt mit einer Mannschaft.',
    }),
    defineField({
      name: 'trainingsplatz',
      title: 'Trainingsplatz',
      type: 'reference',
      to: [{ type: 'trainingsplatz' }],
      description: 'Empfohlen: verknüpft den Ort über einen zentralen Trainingsplatz-Datensatz.',
    }),
    defineField({
      name: 'sparte',
      title: 'Sparte (Fallback)',
      type: 'string',
      description: 'Nur nutzen, wenn keine Mannschaft verknüpft ist (Altbestand).',
    }),
    defineField({
      name: 'gruppe',
      title: 'Gruppe (Fallback)',
      type: 'string',
      description: 'Nur nutzen, wenn keine Mannschaft verknüpft ist (Altbestand).',
    }),
    defineField({
      name: 'tag',
      title: 'Wochentag',
      type: 'string',
      options: { list: TAGE.map(t => ({ title: t, value: t })) },
      validation: r => r.required(),
    }),
    defineField({ name: 'uhrzeit', title: 'Uhrzeit', type: 'string' }),
    defineField({
      name: 'ort',
      title: 'Ort (Fallback)',
      type: 'string',
      description: 'Nur nutzen, wenn kein Trainingsplatz verknüpft ist (Altbestand).',
    }),
    defineField({
      name: 'jahreszeit',
      title: 'Jahreszeit',
      type: 'string',
      options: { list: ['ganzjährig', 'Sommer', 'Winter'].map(v => ({ title: v, value: v })) },
    }),
    defineField({
      name: 'frequenz',
      title: 'Frequenz',
      type: 'string',
      options: { list: ['jede Woche', 'alle 2 Wochen'].map(v => ({ title: v, value: v })) },
    }),
    defineField({
      name: 'trainer',
      title: 'Trainer (Fallback)',
      type: 'string',
      description: 'Optional, falls kein Trainer über die Mannschaft gepflegt ist.',
    }),
    defineField({ name: 'email', title: 'E-Mail (Fallback)', type: 'string' }),
    defineField({ name: 'telefon', title: 'Telefon (Fallback)', type: 'string' }),
    defineField({
      name: 'foto',
      title: 'Gruppenfoto',
      type: 'image',
      options: { hotspot: true },
      description: 'Foto der Mannschaft / Trainingsgruppe',
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
