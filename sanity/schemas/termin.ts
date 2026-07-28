import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'termin',
  title: 'Termine',
  type: 'document',
  fields: [
    defineField({
      name: 'titel',
      title: 'Titel des Termins',
      type: 'string',
      description:
        'Kurz und eindeutig, z. B. „Mitgliederversammlung“, „Sommerfest“ oder „Heimspiel 1. Herren“. Normale Vereinstermine können hier gepflegt werden. Automatisch synchronisierte Spieltermine aus Fußball/Tischtennis bitte nur in Ausnahmefällen bearbeiten, da sie beim nächsten Sync überschrieben werden können.',
      validation: r => r.required(),
    }),
    defineField({
      name: 'datum',
      title: 'Datum',
      type: 'date',
      description: 'Der Tag, an dem der Termin stattfindet.',
      options: { dateFormat: 'DD.MM.YYYY' },
      validation: r => r.required(),
    }),
    defineField({
      name: 'uhrzeit',
      title: 'Uhrzeit',
      type: 'string',
      description: 'Beginn des Termins als Text, z. B. „18:30“, „10:00–13:00“ oder „ganztägig“.',
    }),
    defineField({
      name: 'ort',
      title: 'Ort',
      type: 'string',
      description: 'Wo findet der Termin statt? Zum Beispiel Sportplatz, Sporthalle oder Vereinsheim.',
    }),
    defineField({
      name: 'sparte',
      title: 'Bereich / Sparte',
      type: 'string',
      description: 'Für welchen Bereich ist der Termin gedacht? Zum Beispiel „Gesamtverein“, „Fußball“, „Tischtennis“ oder „Kinderturnen“.',
    }),
    defineField({
      name: 'beschreibung',
      title: 'Beschreibung',
      type: 'text',
      rows: 3,
      description: 'Kurzer Zusatztext mit den wichtigsten Informationen für Besucherinnen und Besucher.',
    }),
    defineField({
      name: 'bild',
      title: 'Bild',
      type: 'image',
      description: 'Optionales Bild für den Termin. Wenn möglich ein aussagekräftiges Querformat verwenden.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'tags',
      title: 'Tags / Filterbegriffe',
      type: 'array',
      description: 'Optionale Schlagworte für Filter und Einordnung, z. B. „Jugend“, „Turnier“, „Verein“ oder „Heimspiel“.',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'fussballDeId',
      title: 'Automatische Fußball-ID / Systemfeld',
      type: 'string',
      description:
        'Technisches Feld für automatisch synchronisierte Fußballtermine. Wird automatisch gesetzt und sollte nicht manuell geändert werden.',
      readOnly: true,
      hidden: ({ currentUser }) => !currentUser?.roles?.some((r: { name: string }) => r.name === 'administrator'),
    }),
  ],
  orderings: [{ title: 'Datum (aufsteigend)', name: 'datumAsc', by: [{ field: 'datum', direction: 'asc' }] }],
  preview: { select: { title: 'titel', subtitle: 'datum' } },
})
