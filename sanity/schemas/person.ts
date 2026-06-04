import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'person',
  title: 'Person (fortgeschrittene Verwaltung)',
  type: 'document',
  description: 'Fortgeschrittene Verwaltung: Personen nur bearbeiten, wenn klar ist, dass Trainer:innen oder Ansprechpartner:innen hier zentral gepflegt und bei Mannschaften/Gruppen verwendet werden.',
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
      description: 'Fortgeschrittene Verwaltung: Eine zentral gepflegte Person kann mehrere Rollen haben.',
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
