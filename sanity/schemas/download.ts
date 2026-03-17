import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'download',
  title: 'Download',
  type: 'document',
  fields: [
    defineField({ name: 'titel', title: 'Titel', type: 'string', validation: r => r.required() }),
    defineField({ name: 'beschreibung', title: 'Beschreibung', type: 'text', rows: 2 }),
    defineField({
      name: 'datei',
      title: 'Datei',
      type: 'file',
      description: 'Lade die Datei hier hoch (PDF, etc.)',
    }),
    defineField({
      name: 'dateiUrl',
      title: 'Datei-URL (Fallback)',
      type: 'url',
      description: 'Alternativer direkter Link zur Datei (z. B. /pdfs/Datei.pdf)',
    }),
    defineField({ name: 'kategorie', title: 'Kategorie', type: 'string' }),
    defineField({ name: 'datum', title: 'Datum', type: 'date', options: { dateFormat: 'DD.MM.YYYY' } }),
    defineField({ name: 'reihenfolge', title: 'Reihenfolge', type: 'number', initialValue: 0 }),
  ],
  orderings: [{ title: 'Datum (neueste zuerst)', name: 'datumDesc', by: [{ field: 'datum', direction: 'desc' }] }],
  preview: { select: { title: 'titel', subtitle: 'kategorie' } },
})
