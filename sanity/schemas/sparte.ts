import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'sparte',
  title: 'Sparte',
  type: 'document',
  fields: [
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name', maxLength: 96 }, validation: r => r.required() }),
    defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
    defineField({ name: 'icon', title: 'Icon (Emoji)', type: 'string' }),
    defineField({ name: 'farbe', title: 'Farbe (Hex)', type: 'string' }),
    defineField({ name: 'beschreibung', title: 'Kurzbeschreibung', type: 'text', rows: 2 }),
    defineField({ name: 'langbeschreibung', title: 'Langbeschreibung', type: 'text', rows: 5 }),
    defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'trainingszeiten_spartes',
      title: 'Trainingszeiten-Sparten (Keys)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Schlüssel zum Verknüpfen mit Trainingszeiten-Einträgen',
    }),
    defineField({
      name: 'mannschaften',
      title: 'Mannschaften & Gruppen',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string' }),
            defineField({ name: 'beschreibung', title: 'Beschreibung', type: 'text', rows: 2 }),
            defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
          ],
          preview: { select: { title: 'name' } },
        },
      ],
    }),
    defineField({
      name: 'ansprechpartner',
      title: 'Ansprechpartner & Trainer',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string' }),
            defineField({ name: 'rolle', title: 'Rolle', type: 'string' }),
            defineField({ name: 'email', title: 'E-Mail', type: 'string' }),
            defineField({ name: 'telefon', title: 'Telefon', type: 'string' }),
            defineField({ name: 'whatsapp', title: 'WhatsApp', type: 'string' }),
            defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
          ],
          preview: { select: { title: 'name', subtitle: 'rolle' } },
        },
      ],
    }),
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'beschreibung' } },
})
