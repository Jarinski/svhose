import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'trainingsplatz',
  title: 'Trainingsplatz',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: r => r.required(),
      description: 'z. B. Sportplatz Holm-Seppensen, Halle Nordheidehalle',
    }),
    defineField({
      name: 'typ',
      title: 'Typ',
      type: 'string',
      options: {
        list: ['Sportplatz', 'Halle', 'Fitnessraum', 'Sonstiges'].map(v => ({ title: v, value: v })),
      },
      initialValue: 'Sportplatz',
    }),
    defineField({
      name: 'adresse',
      title: 'Adresse',
      type: 'string',
    }),
    defineField({
      name: 'beschreibung',
      title: 'Hinweis',
      type: 'text',
      rows: 2,
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
      typ: 'typ',
      adresse: 'adresse',
    },
    prepare(selection) {
      const { title, typ, adresse } = selection as {
        title?: string
        typ?: string
        adresse?: string
      }
      return {
        title: title || 'Trainingsplatz',
        subtitle: [typ, adresse].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})