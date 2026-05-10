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
            S.listItem()
              .title('News')
              .schemaType('newsPost')
              .child(S.documentTypeList('newsPost')),
            S.listItem()
              .title('Ansprechpartner')
              .schemaType('ansprechpartner')
              .child(S.documentTypeList('ansprechpartner')),
            S.listItem()
              .title('Trainingszeiten')
              .schemaType('trainingszeit')
              .child(S.documentTypeList('trainingszeit')),
            S.divider(),
            S.listItem()
              .title('Weitere Inhalte / Verwaltung')
              .child(
                S.list()
                  .title('Weitere Inhalte / Verwaltung')
                  .items([
                    S.listItem()
                      .title('Termine')
                      .schemaType('termin')
                      .child(S.documentTypeList('termin')),
                    S.listItem()
                      .title('Sparten')
                      .schemaType('sparte')
                      .child(S.documentTypeList('sparte')),
                    S.listItem()
                      .title('Downloads')
                      .schemaType('download')
                      .child(S.documentTypeList('download')),
                    S.listItem()
                      .title('Partner')
                      .schemaType('partner')
                      .child(S.documentTypeList('partner')),
                    S.listItem()
                      .title('Personen')
                      .schemaType('person')
                      .child(S.documentTypeList('person')),
                    S.listItem()
                      .title('Mannschaften')
                      .schemaType('mannschaft')
                      .child(S.documentTypeList('mannschaft')),
                    S.listItem()
                      .title('Jahrgänge')
                      .schemaType('jahrgang')
                      .child(S.documentTypeList('jahrgang')),
                    S.listItem()
                      .title('Trainingsplätze')
                      .schemaType('trainingsplatz')
                      .child(S.documentTypeList('trainingsplatz')),
                  ])
              ),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
