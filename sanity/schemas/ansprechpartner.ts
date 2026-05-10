import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'ansprechpartner',
  title: 'Ansprechpartner',
  type: 'document',
  fieldsets: [
    { name: 'sortierungVerwaltung', title: 'Sortierung / Verwaltung', options: { collapsible: true, collapsed: true } },
    { name: 'legacyVerwaltung', title: 'Legacy / Verwaltung', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
    defineField({
      name: 'funktion',
      title: 'Funktion / Rolle',
      type: 'string',
      description: 'Rolle im Verein, z. B. 1. Vorsitzende:r, Jugendleitung oder Kassenwart:in.',
    }),
    defineField({
      name: 'email',
      title: 'E-Mail',
      type: 'string',
      description: 'Öffentliche Kontaktadresse. Optional.',
    }),
    defineField({
      name: 'telefon',
      title: 'Telefon',
      type: 'string',
      description: 'Optional. Mobilnummern können auf der Website zusätzlich als WhatsApp-Kontakt genutzt werden.',
    }),
    defineField({
      name: 'foto',
      title: 'Foto',
      type: 'image',
      options: { hotspot: true },
      description: 'Optionales Foto der Kontaktperson.',
    }),
    defineField({
      name: 'gruppe',
      title: 'Bereich im Kontaktbuch',
      type: 'string',
      description: 'Steuert, unter welcher Überschrift der Kontakt auf der Ansprechpartner-Seite erscheint.',
      options: {
        list: ['Vorstand', 'Abteilungsleiter', 'Weitere Ansprechpartner'],
      },
      initialValue: 'Weitere Ansprechpartner',
    }),
    defineField({
      name: 'reihenfolge',
      title: 'Sortierung',
      type: 'number',
      description: 'Optional. Kleinere Zahlen erscheinen weiter oben.',
      initialValue: 0,
      fieldset: 'sortierungVerwaltung',
    }),
    defineField({
      name: 'sparte',
      title: 'Alter Bereich / Sparte',
      type: 'string',
      description: 'Veraltetes Feld für ältere Inhalte. Nur ändern, wenn du weißt, warum es nötig ist.',
      fieldset: 'legacyVerwaltung',
    }),
  ],
  orderings: [
    { title: 'Reihenfolge', name: 'reihenfolgeAsc', by: [{ field: 'reihenfolge', direction: 'asc' }] },
    { title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', funktion: 'funktion', gruppe: 'gruppe', media: 'foto' },
    prepare({ title, funktion, gruppe, media }) {
      const subtitle = [funktion, gruppe].filter(Boolean).join(' · ')
      return {
        title,
        subtitle,
        media,
      }
    },
  },
})
