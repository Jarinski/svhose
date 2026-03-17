import { defineField, defineType } from 'sanity'

const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export default defineType({
  name: 'trainingszeit',
  title: 'Trainingszeit',
  type: 'document',
  fields: [
    defineField({ name: 'sparte', title: 'Sparte', type: 'string', validation: r => r.required() }),
    defineField({ name: 'gruppe', title: 'Gruppe', type: 'string', validation: r => r.required() }),
    defineField({
      name: 'tag',
      title: 'Wochentag',
      type: 'string',
      options: { list: TAGE.map(t => ({ title: t, value: t })) },
      validation: r => r.required(),
    }),
    defineField({ name: 'uhrzeit', title: 'Uhrzeit', type: 'string' }),
    defineField({ name: 'ort', title: 'Ort', type: 'string' }),
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
    defineField({ name: 'trainer', title: 'Trainer', type: 'string' }),
    defineField({ name: 'email', title: 'E-Mail', type: 'string' }),
    defineField({ name: 'telefon', title: 'Telefon', type: 'string' }),
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
    select: { title: 'gruppe', subtitle: 'sparte', media: 'foto' },
  },
})
