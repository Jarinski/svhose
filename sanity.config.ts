import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemas'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  name: 'sv-holm-seppensen',
  title: 'SV Holm-Seppensen CMS',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Inhalte')
          .items([
            S.documentTypeListItem('newsPost').title('News'),
            S.documentTypeListItem('termin').title('Termine'),
            S.documentTypeListItem('trainingszeit').title('Trainingszeiten'),
            S.documentTypeListItem('ansprechpartner').title('Ansprechpartner / Kontaktseite'),
            S.documentTypeListItem('sparte').title('Sparten bearbeiten'),
            S.divider(),
            S.listItem()
              .title('Weitere Inhalte / Verwaltung (fortgeschritten)')
              .child(
                S.list()
                  .title('Weitere Inhalte / Verwaltung')
                  .items([
                    S.documentTypeListItem('download').title('Downloads'),
                    S.documentTypeListItem('partner').title('Partner'),
                    S.divider(),
                    S.documentTypeListItem('person').title('Personen / Trainer (fortgeschritten)'),
                    S.documentTypeListItem('mannschaft').title('Mannschaften / Gruppen (fortgeschritten)'),
                    S.documentTypeListItem('jahrgang').title('Jahrgänge (fortgeschritten)'),
                    S.documentTypeListItem('trainingsplatz').title('Trainingsplätze (fortgeschritten)'),
                  ])
              ),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
