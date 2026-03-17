import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'mannschaft',
  title: 'Mannschaft',
  type: 'document',
  validation: Rule =>
    Rule.custom((doc) => {
      const typedDoc = doc as { bereich?: string; jahrgang?: { _ref?: string } } | undefined
      if (!typedDoc) return true

      if (typedDoc.bereich === 'Junioren' && !typedDoc.jahrgang?._ref) {
        return 'Bei Junioren bitte einen Jahrgang zuordnen.'
      }

      return true
    }),
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: r => r.required(),
    }),
    defineField({
      name: 'bereich',
      title: 'Bereich',
      type: 'string',
      options: {
        list: ['Junioren', 'Herren', 'Damen', 'Senioren', 'Freizeit'].map(v => ({ title: v, value: v })),
      },
      validation: r => r.required(),
      description: 'Hilft bei der Unterscheidung zwischen Jugend (mit Jahrgang) und Erwachsenen-Teams.',
    }),
    defineField({
      name: 'sparte',
      title: 'Sparte',
      type: 'reference',
      to: [{ type: 'sparte' }],
      validation: r => r.required(),
    }),
    defineField({
      name: 'jahrgang',
      title: 'Jahrgang',
      type: 'reference',
      to: [{ type: 'jahrgang' }],
      description: 'Für Junioren-Mannschaften bitte setzen; bei Herren/Damen meist leer.',
    }),
    defineField({
      name: 'beschreibung',
      title: 'Beschreibung',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'trainer',
      title: 'Trainerteam',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'person' }],
        },
      ],
      description: 'Verknüpfte Personen, die diese Mannschaft trainieren/betreuen.',
    }),
    defineField({
      name: 'foto',
      title: 'Foto',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'reihenfolge',
      title: 'Reihenfolge',
      type: 'number',
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: 'Reihenfolge', name: 'reihenfolgeAsc', by: [{ field: 'reihenfolge', direction: 'asc' }] },
    { title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'name',
      bereich: 'bereich',
      sparte: 'sparte.name',
      jahrgang: 'jahrgang.name',
      media: 'foto',
    },
    prepare(selection) {
      const { title, bereich, sparte, jahrgang, media } = selection as {
        title?: string
        bereich?: string
        sparte?: string
        jahrgang?: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        media?: any
      }
      return {
        title: title || 'Mannschaft',
        subtitle: [bereich, sparte, jahrgang].filter(Boolean).join(' · ') || undefined,
        media,
      }
    },
  },
})
