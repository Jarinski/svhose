import { createClient } from '@sanity/client'
import { config } from 'dotenv'
config({ path: '.env.local' })
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})
const docs = await client.fetch('*[_type == "trainingszeit"] | order(sparte asc, gruppe asc) { _id, sparte, gruppe, tag, ort, uhrzeit }')
docs.forEach(d => console.log(JSON.stringify({ id: d._id, sp: d.sparte, gr: d.gruppe, tag: d.tag, ort: d.ort, uhr: d.uhrzeit })))
console.error(`\nTotal: ${docs.length}`)
