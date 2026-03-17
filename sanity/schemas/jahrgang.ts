import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'jahrgang',
  title: 'Jahrgang',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Bezeichnung',
      type: 'string',
      validation: r => r.required(),
      description: 'z. B. U15, U17 oder Jahrgang 2011/2012',
    }),
    defineField({
      name: 'jahrgangVon',
      title: 'Jahrgang von',
      type: 'number',
      description: 'Älterer Jahrgang (z. B. 2011)',
    }),
    defineField({
      name: 'jahrgangBis',
      title: 'Jahrgang bis',
      type: 'number',
      description: 'Jüngerer Jahrgang (z. B. 2012)',
    }),
    defineField({
      name: 'altersklasse',
      title: 'Altersklasse',
      type: 'string',
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
      description: 'Optional: direkte Zuordnung von Trainern zu diesem Jahrgang.',
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
    { title: 'Bezeichnung', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'name',
      von: 'jahrgangVon',
      bis: 'jahrgangBis',
    },
    prepare(selection) {
      const { title, von, bis } = selection as { title?: string; von?: number; bis?: number }
      const hasRange = typeof von === 'number' && typeof bis === 'number'
      return {
        title: title || 'Jahrgang',
        subtitle: hasRange ? `${von}/${bis}` : undefined,
      }
    },
  },
})
