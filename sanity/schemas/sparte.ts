import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'sparte',
  title: 'Sparte',
  type: 'document',
  description: 'Bestehende Sparte pflegen. Neue Sparten bitte nur durch Admins oder technische Pflege anlegen.',
  fields: [
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name', maxLength: 96 }, description: 'Technischer URL-Name der Sparte. Bei bestehenden Sparten normalerweise nicht ändern. Neue Sparten bitte nur durch Admins oder technische Pflege anlegen.', validation: r => r.required() }),
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
      description: 'Technische Zuordnung zu Trainingszeiten. Bitte nur ändern, wenn klar ist, welche bestehenden Trainingszeiten zu dieser Sparte gehören.',
    }),
    defineField({
      name: 'mannschaften',
      title: 'Mannschaften & Gruppen (Altbestand)',
      type: 'array',
      description: 'Mannschaften und Trainer bitte künftig unter Mannschaften / Trainingsgruppen pflegen. Dieser Bereich ist Altbestand.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
            defineField({
              name: 'bereich',
              title: 'Bereich',
              type: 'string',
              options: {
                list: ['Junioren', 'Juniorinnen', 'Herren', 'Damen', 'Senioren', 'Freizeit'].map(v => ({ title: v, value: v })),
              },
              description: 'Optional, hilft bei der Einordnung der Gruppe.',
            }),
            defineField({
              name: 'jahrgangText',
              title: 'Jahrgang / Altersklasse',
              type: 'string',
              description: 'Einfach eintragen, z. B. „Jg. 2011/12“, „C/D-Juniorinnen“ oder „ab 6 Jahre“.',
            }),
            defineField({ name: 'beschreibung', title: 'Beschreibung', type: 'text', rows: 2 }),
            defineField({
              name: 'trainer',
              title: 'Trainer & Ansprechpartner',
              type: 'array',
              description: 'Empfohlen: zentrale Personen auswählen. Bestehende manuelle Einträge bleiben als Fallback möglich.',
              of: [
                {
                  type: 'reference',
                  to: [{ type: 'person' }],
                },
                {
                  type: 'object',
                  title: 'Manueller Kontakt (Fallback)',
                  fields: [
                    defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
                    defineField({ name: 'rolle', title: 'Rolle', type: 'string', initialValue: 'Trainer' }),
                    defineField({ name: 'email', title: 'E-Mail', type: 'string' }),
                    defineField({ name: 'telefon', title: 'Telefon', type: 'string' }),
                    defineField({ name: 'whatsapp', title: 'WhatsApp', type: 'string' }),
                    defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
                  ],
                  preview: { select: { title: 'name', subtitle: 'rolle', media: 'foto' } },
                },
              ],
            }),
            defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
          ],
          preview: {
            select: { title: 'name', bereich: 'bereich', jahrgangText: 'jahrgangText', media: 'foto' },
            prepare(selection) {
              const { title, bereich, jahrgangText, media } = selection as {
                title?: string
                bereich?: string
                jahrgangText?: string
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                media?: any
              }
              return {
                title: title || 'Mannschaft / Gruppe',
                subtitle: [bereich, jahrgangText].filter(Boolean).join(' · ') || undefined,
                media,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'ansprechpartner',
      title: 'Ansprechpartner & Trainer',
      type: 'array',
      description: 'Übergeordnete Ansprechpartner:innen dieser Sparte. Empfohlen: zentrale Personen auswählen. Bestehende manuelle Einträge bleiben als Fallback möglich.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'person' }],
        },
        {
          type: 'object',
          title: 'Manueller Kontakt (Fallback)',
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
    defineField({
      name: 'downloads',
      title: 'Downloads & Formulare',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'titel', title: 'Titel', type: 'string' }),
            defineField({ name: 'beschreibung', title: 'Beschreibung', type: 'text', rows: 2 }),
            defineField({
              name: 'datei',
              title: 'Datei',
              type: 'file',
              description: 'Lade die Datei hier hoch (PDF, etc.)',
            }),
            defineField({
              name: 'dateiUrl',
              title: 'Datei-URL (Fallback)',
              type: 'url',
              description: 'Alternativer direkter Link zur Datei (z. B. /pdfs/Datei.pdf)',
            }),
          ],
          preview: { select: { title: 'titel' } },
        },
      ],
      description: 'Sparten-spezifische Downloads und Formulare',
    }),
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'beschreibung' } },
})
