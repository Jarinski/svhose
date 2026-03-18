import fs from 'fs'
import { createClient } from '@sanity/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const DAY_MAP = {
  Mo: 'Montag',
  Di: 'Dienstag',
  Mi: 'Mittwoch',
  Do: 'Donnerstag',
  Fr: 'Freitag',
  Sa: 'Samstag',
  So: 'Sonntag',
}

function norm(v) {
  return (v || '')
    .toString()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[“”„"']/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeOrt(v) {
  return norm(v)
    .replace(/\(ab februar\)/g, '')
    .replace(/ab februar/g, '')
    .replace(/ab feb\.?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeGroup(v) {
  return norm(v)
    .replace(/[()]/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\./g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeGroup(v) {
  return normalizeGroup(v)
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 1)
}

function groupScore(a, b) {
  const na = normalizeGroup(a)
  const nb = normalizeGroup(b)
  if (!na && !nb) return 1
  if (na && nb && na === nb) return 10

  const sa = new Set(tokenizeGroup(a))
  const sb = new Set(tokenizeGroup(b))
  if (!sa.size || !sb.size) return 0

  let inter = 0
  for (const tok of sa) {
    if (sb.has(tok)) inter++
  }
  const union = new Set([...sa, ...sb]).size
  return union ? inter / union : 0
}

function keyNoGroup(x) {
  return [norm(x.sparte), norm(x.tag), normalizeOrt(x.ort)].join('|')
}

function normalizeExcelRows(rows) {
  return rows
    .filter(r => r.sparte && r.gruppe && r.tag && r.uhrzeit)
    .filter(r => r.sparte !== 'Sparte')
    .map(r => ({
      sparte: r.sparte,
      gruppe: r.gruppe,
      tag: DAY_MAP[r.tag] || r.tag,
      ort: r.ort,
      uhrzeit: (r.uhrzeit || '').trim(),
    }))
}

const apply = process.argv.includes('--apply')

async function main() {
  const excelRaw = JSON.parse(fs.readFileSync('scripts/trainingszeiten-with-times.json', 'utf8'))
  const excel = normalizeExcelRows(excelRaw)

  const byNoGroup = new Map()

  for (const row of excel) {
    const kng = keyNoGroup(row)
    if (!byNoGroup.has(kng)) byNoGroup.set(kng, [])
    byNoGroup.get(kng).push(row)
  }

  for (const list of byNoGroup.values()) {
    list.sort((a, b) => a.uhrzeit.localeCompare(b.uhrzeit))
  }

  const docs = await client.fetch('*[_type == "trainingszeit"]{_id,sparte,gruppe,tag,ort,uhrzeit}')

  let matched = 0
  let mismatches = 0
  let updated = 0
  let unmatched = 0
  let ambiguous = 0

  for (const doc of docs) {
    const kng = keyNoGroup(doc)
    const candidates = byNoGroup.get(kng) || []

    let chosen = null

    if (candidates.length === 1) {
      chosen = candidates[0]
    } else if (candidates.length > 1) {
      const scored = candidates
        .map(c => ({ c, score: groupScore(doc.gruppe, c.gruppe) }))
        .sort((a, b) => b.score - a.score)

      if (scored[0]?.score >= 0.25) {
        const top = scored.filter(x => x.score === scored[0].score)
        if (top.length === 1) {
          chosen = top[0].c
        } else {
          const sameTime = top.filter(x => norm(x.c.uhrzeit) === norm(doc.uhrzeit))
          if (sameTime.length === 1) {
            chosen = sameTime[0].c
          }
        }
      }

      if (!chosen) {
        const uniqueTimes = [...new Set(candidates.map(c => c.uhrzeit))]
        if (uniqueTimes.length === 1) {
          chosen = candidates[0]
        }
      }

      if (!chosen) {
        ambiguous++
        console.log(`AMBIGUOUS  ${doc._id} | ${doc.sparte} | ${doc.gruppe} | ${doc.tag} | ${doc.ort}`)
        continue
      }
    }

    if (!chosen) {
      unmatched++
      console.log(`UNMATCHED   ${doc._id} | ${doc.sparte} | ${doc.gruppe} | ${doc.tag} | ${doc.ort}`)
      continue
    }

    matched++

    if (norm(doc.uhrzeit) !== norm(chosen.uhrzeit)) {
      mismatches++
      console.log(`MISMATCH    ${doc._id} | "${doc.uhrzeit || ''}" -> "${chosen.uhrzeit}"`)
      if (apply) {
        await client.patch(doc._id).set({ uhrzeit: chosen.uhrzeit }).commit()
        updated++
      }
    }
  }

  console.log('\n--- Ergebnis ---')
  console.log(`Sanity-Dokumente: ${docs.length}`)
  console.log(`Gematcht:         ${matched}`)
  console.log(`Diskrepanzen:     ${mismatches}`)
  console.log(`Aktualisiert:     ${updated}${apply ? '' : ' (Dry-Run)'}`)
  console.log(`Unmatched:        ${unmatched}`)
  console.log(`Ambiguous:        ${ambiguous}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
