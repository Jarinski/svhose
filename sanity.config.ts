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
            S.documentTypeListItem('trainingszeit').title('Trainingszeiten'),
            S.documentTypeListItem('mannschaft').title('Mannschaften / Gruppen'),
            S.documentTypeListItem('person').title('Personen / Trainer'),
            S.documentTypeListItem('sparte').title('Sparten'),
            S.documentTypeListItem('ansprechpartner').title('Ansprechpartner'),
            S.divider(),
            S.listItem()
              .title('Weitere Inhalte / Verwaltung')
              .child(
                S.list()
                  .title('Weitere Inhalte / Verwaltung')
                  .items([
                    S.documentTypeListItem('termin').title('Termine'),
                    S.documentTypeListItem('download').title('Downloads'),
                    S.documentTypeListItem('partner').title('Partner'),
                    S.documentTypeListItem('jahrgang').title('Jahrgänge'),
                    S.documentTypeListItem('trainingsplatz').title('Trainingsplätze'),
                  ])
              ),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
