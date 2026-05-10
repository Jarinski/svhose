import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'newsPost',
  title: 'News-Beitrag',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Überschrift', type: 'string', validation: r => r.required() }),
    defineField({ name: 'image', title: 'Beitragsbild', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'body',
      title: 'Text',
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
    defineField({
      name: 'excerpt',
      title: 'Kurzbeschreibung / Teaser',
      type: 'text',
      rows: 3,
      description: 'Kurzer Anreißer für Übersichten. Optional.',
    }),
    defineField({
      name: 'datum',
      title: 'Veröffentlichungsdatum',
      type: 'date',
      options: { dateFormat: 'DD.MM.YYYY' },
      initialValue: () => new Date().toISOString().slice(0, 10),
      description: 'Wird bei neuen Beiträgen automatisch auf heute gesetzt.',
      validation: r => r.required(),
    }),
    defineField({
      name: 'category',
      title: 'Kategorie',
      type: 'string',
      description: 'Optional. Hilft bei der Einordnung der News.',
      options: {
        list: ['Allgemein', 'Verein', 'Fußball', 'Tischtennis', 'Turnen', 'Jugend', 'Veranstaltung'],
      },
    }),
    defineField({
      name: 'sparte',
      title: 'Bereich / Sparte',
      type: 'string',
      description: 'Optional. Nur ausfüllen, wenn die News klar zu einem Bereich gehört.',
    }),
    defineField({
      name: 'slug',
      title: 'URL-Name',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description: 'Wird automatisch aus der Überschrift erzeugt. Nur ändern, wenn du genau weißt, was du tust.',
      validation: r => r.required(),
    }),
  ],
  orderings: [{ title: 'Datum (neueste zuerst)', name: 'datumDesc', by: [{ field: 'datum', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', datum: 'datum', category: 'category', sparte: 'sparte', media: 'image' },
    prepare({ title, datum, category, sparte, media }) {
      const subtitle = [datum, category, sparte].filter(Boolean).join(' · ')
      return {
        title,
        subtitle,
        media,
      }
    },
  },
})
