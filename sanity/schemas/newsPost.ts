import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'newsPost',
  title: 'News-Beitrag',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Titel', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: r => r.required() }),
    defineField({ name: 'datum', title: 'Datum', type: 'date', options: { dateFormat: 'DD.MM.YYYY' }, validation: r => r.required() }),
    defineField({ name: 'category', title: 'Kategorie', type: 'string' }),
    defineField({ name: 'sparte', title: 'Sparte', type: 'string' }),
    defineField({ name: 'image', title: 'Bild', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'excerpt', title: 'Teaser-Text', type: 'text', rows: 3 }),
    defineField({
      name: 'body',
      title: 'Inhalt',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
          ],
          marks: {
            decorators: [
              { title: 'Fett', value: 'strong' },
              { title: 'Kursiv', value: 'em' },
            ],
          },
        },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
  ],
  orderings: [{ title: 'Datum (neueste zuerst)', name: 'datumDesc', by: [{ field: 'datum', direction: 'desc' }] }],
  preview: { select: { title: 'title', subtitle: 'datum', media: 'image' } },
})
