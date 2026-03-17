import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: r => r.required(),
      description: 'Voller Name (z. B. Max Mustermann)',
    }),
    defineField({
      name: 'rollen',
      title: 'Rollen',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: ['Trainer', 'Co-Trainer', 'Betreuer', 'Ansprechpartner', 'Vorstand'].map(v => ({
          title: v,
          value: v,
        })),
      },
      description: 'Eine Person kann mehrere Rollen haben.',
    }),
    defineField({ name: 'email', title: 'E-Mail', type: 'string' }),
    defineField({ name: 'telefon', title: 'Telefon', type: 'string' }),
    defineField({ name: 'whatsapp', title: 'WhatsApp', type: 'string' }),
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
    {
      title: 'Reihenfolge',
      name: 'reihenfolgeAsc',
      by: [{ field: 'reihenfolge', direction: 'asc' }],
    },
    {
      title: 'Name',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'rollen.0',
      media: 'foto',
    },
  },
})
