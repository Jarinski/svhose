import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'ansprechpartner',
  title: 'Ansprechpartner',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
    defineField({ name: 'funktion', title: 'Funktion', type: 'string' }),
    defineField({ name: 'gruppe', title: 'Gruppe', type: 'string', description: 'z.B. Vorstand, Abteilungsleiter, Weitere Ansprechpartner' }),
    defineField({ name: 'sparte', title: 'Sparte / Bereich (veraltet)', type: 'string' }),
    defineField({ name: 'email', title: 'E-Mail', type: 'string' }),
    defineField({ name: 'telefon', title: 'Telefon', type: 'string' }),
    defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'reihenfolge', title: 'Reihenfolge', type: 'number', initialValue: 0 }),
  ],
  orderings: [{ title: 'Reihenfolge', name: 'reihenfolgeAsc', by: [{ field: 'reihenfolge', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'funktion' } },
})
