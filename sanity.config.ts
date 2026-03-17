import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemas'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
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
              .title('News-Beiträge')
              .schemaType('newsPost')
              .child(S.documentTypeList('newsPost')),
            S.listItem()
              .title('Termine')
              .schemaType('termin')
              .child(S.documentTypeList('termin')),
            S.listItem()
              .title('Sparten')
              .schemaType('sparte')
              .child(S.documentTypeList('sparte')),
            S.listItem()
              .title('Trainingszeiten')
              .schemaType('trainingszeit')
              .child(S.documentTypeList('trainingszeit')),
            S.divider(),
            S.listItem()
              .title('Ansprechpartner')
              .schemaType('ansprechpartner')
              .child(S.documentTypeList('ansprechpartner')),
            S.listItem()
              .title('Downloads')
              .schemaType('download')
              .child(S.documentTypeList('download')),
            S.listItem()
              .title('Partner')
              .schemaType('partner')
              .child(S.documentTypeList('partner')),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
