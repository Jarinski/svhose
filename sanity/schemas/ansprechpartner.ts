import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'ansprechpartner',
  title: 'Ansprechpartner',
  type: 'document',
  validation: Rule =>
    Rule.custom((doc) => {
      const typedDoc = doc as { person?: { _ref?: string }; name?: string } | undefined
      if (!typedDoc?.person?._ref && !typedDoc?.name) {
        return 'Bitte entweder eine zentrale Person auswählen oder einen Namen eintragen.'
      }
      return true
    }),
  fieldsets: [
    { name: 'sortierungVerwaltung', title: 'Sortierung / Verwaltung', options: { collapsible: true, collapsed: true } },
    { name: 'legacyVerwaltung', title: 'Legacy / Verwaltung', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: 'person',
      title: 'Zentrale Person',
      type: 'reference',
      to: [{ type: 'person' }],
      description: 'Empfohlen: Person zentral auswählen. Name, E-Mail, Telefon und Foto kommen dann aus der zentralen Personenverwaltung.',
    }),
    defineField({
      name: 'name',
      title: 'Name (Fallback / alter Eintrag)',
      type: 'string',
      description: 'Nur nutzen, wenn keine zentrale Person ausgewählt wird.',
    }),
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
      description: 'Optionaler Fallback. Wenn eine zentrale Person ausgewählt ist, kommt die E-Mail normalerweise von dort.',
    }),
    defineField({
      name: 'telefon',
      title: 'Telefon',
      type: 'string',
      description: 'Optionaler Fallback. Wenn eine zentrale Person ausgewählt ist, kommt die Telefonnummer normalerweise von dort.',
    }),
    defineField({
      name: 'foto',
      title: 'Foto',
      type: 'image',
      options: { hotspot: true },
      description: 'Optionaler Fallback. Wenn eine zentrale Person ausgewählt ist, kommt das Foto normalerweise von dort.',
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
    select: { title: 'name', personName: 'person.name', funktion: 'funktion', gruppe: 'gruppe', media: 'foto', personMedia: 'person.foto' },
    prepare({ title, personName, funktion, gruppe, media, personMedia }) {
      const subtitle = [funktion, gruppe].filter(Boolean).join(' · ')
      return {
        title: personName || title || 'Ansprechpartner',
        subtitle,
        media: personMedia || media,
      }
    },
  },
})
