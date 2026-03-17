import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'termin',
  title: 'Termin',
  type: 'document',
  fields: [
    defineField({ name: 'titel', title: 'Titel', type: 'string', validation: r => r.required() }),
    defineField({ name: 'datum', title: 'Datum', type: 'date', options: { dateFormat: 'DD.MM.YYYY' }, validation: r => r.required() }),
    defineField({ name: 'uhrzeit', title: 'Uhrzeit', type: 'string' }),
    defineField({ name: 'ort', title: 'Ort', type: 'string' }),
    defineField({ name: 'sparte', title: 'Sparte', type: 'string' }),
    defineField({ name: 'beschreibung', title: 'Beschreibung', type: 'text', rows: 3 }),
    defineField({ name: 'bild', title: 'Bild', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }] }),
  ],
  orderings: [{ title: 'Datum (aufsteigend)', name: 'datumAsc', by: [{ field: 'datum', direction: 'asc' }] }],
  preview: { select: { title: 'titel', subtitle: 'datum' } },
})
