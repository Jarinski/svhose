import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
    defineField({ name: 'logo', title: 'Logo', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'url', title: 'Website-URL', type: 'url' }),
    defineField({ name: 'reihenfolge', title: 'Reihenfolge', type: 'number', initialValue: 0 }),
  ],
  orderings: [{ title: 'Reihenfolge', name: 'reihenfolgeAsc', by: [{ field: 'reihenfolge', direction: 'asc' }] }],
  preview: { select: { title: 'name', media: 'logo' } },
})
