/**
 * scripts/patch-uhrzeiten-final.mjs
 *
 * Setzt alle fehlenden Uhrzeiten in Sanity – direkt per _id.
 * Korrigiert auch fehlerhafte Werte aus dem ersten Lauf.
 * Legt fehlende Dokumente neu an.
 *
 * node scripts/patch-uhrzeiten-final.mjs
 */

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

// ─── 1. Patches: id → uhrzeit ────────────────────────────────────────────────
//   Enthält auch Korrekturen von falsch gesetzten Werten aus dem ersten Lauf.

const PATCHES = {
  // ── Akrobatik ──────────────────────────────────────────────────────────────
  'tz-akrobatik-anf-nger-dienstag-0':         '15:00 - 16:00',  // Korrektur (war 15:30-20:00)
  'tz-akrobatik-girls-dienstag-1':             '16:00 - 18:00',
  'tz-akrobatik-girls-freitag-2':              '17:30 - 19:00',
  'tz-akrobatik-friends-dienstag-3':           '18:00 - 20:00',
  'tz-akrobatik-friends-freitag-4':            '19:00 - 21:00',
  'tz-akrobatik-sportakrobatik-samstag-5':     '09:00 - 12:00',

  // ── Fitness ────────────────────────────────────────────────────────────────
  'tz-fitness-sitzgymnastik-f-r-senioren-montag-9':          '14:45 - 15:45',  // Korrektur
  'tz-fitness-fit-am-nachmittag--erwachsene--montag-10':     '16:00 - 17:00',
  'tz-fitness-step-aerobic--erwachsene--montag-11':          '18:30 - 20:00',
  'tz-fitness-step-aerobic--erwachsene--donnerstag-12':      '19:30 - 21:00',

  // ── Fußball Freizeit ───────────────────────────────────────────────────────
  'tz-fu-ball-freizeit-just4fun--hobbymannschaft--montag-71':    '19:00 - 21:00',
  'tz-fu-ball-freizeit-just4fun--hobbymannschaft--dienstag-72':  '20:00 - 22:00',
  'tz-fu-ball-freizeit-hoseunited--hobbymannschaft--sonntag-73': '19:00 - 21:00',
  'tz-fu-ball-freizeit-hoseunited--hobbymannschaft--sonntag-74': '19:00 - 21:00',

  // ── Fußball Herren ─────────────────────────────────────────────────────────
  'tz-fu-ball-herren-herren-mittwoch-20':  '19:30 - 21:00',   // KuRa Platz ab Februar

  // ── Fußball Juniorinnen ────────────────────────────────────────────────────
  'tz-fu-ball-juniorinnen-e-m-dchen---e-juniorinnen--jg--2013-2016--dienstag-22':   '16:15 - 17:30',
  'tz-fu-ball-juniorinnen-e-m-dchen---e-juniorinnen--jg--2013-2016--donnerstag-23': '16:15 - 17:30',
  'tz-fu-ball-juniorinnen-e-m-dchen---e-juniorinnen--jg--2013-2016--sonntag-24':    '09:00 - 10:30',

  // ── Fußball Junioren U17 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u17--jg--2009-10--montag-25':   '17:00 - 19:00',   // Sommer Sportanlage
  'tz-fu-ball-junioren-u17--jg--2009-10--donnerstag-26': '17:00 - 19:00', // Sommer Sportanlage
  'tz-fu-ball-junioren-u17--jg--2009-10--freitag-27':  '16:30 - 18:00',   // Sommer Sportanlage
  'tz-fu-ball-junioren-u17--jg--2009-10--montag-28':   '18:00 - 19:30',   // Winter KuRa
  'tz-fu-ball-junioren-u17--jg--2009-10--samstag-29':  '12:30 - 14:30',   // Winter Wiesenschule
  'tz-fu-ball-junioren-u17--jg--2009-10--mittwoch-30': '18:30 - 20:00',   // Winter IGS-SZ1
  'tz-fu-ball-junioren-u17---torwart--jg--2009-10--sonntag-31': '17:00 - 18:00', // Torwart

  // ── Fußball Junioren U15 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u15--jg--2011--dienstag-32':    '17:00 - 18:30',
  'tz-fu-ball-junioren-u15---torwart--jg--2011--mittwoch-33': '17:00 - 18:00',
  'tz-fu-ball-junioren-u15--jg--2011--freitag-34':     '15:45 - 17:15',
  'tz-fu-ball-junioren-u15--jg--2011--mittwoch-35':    '17:30 - 19:00',   // IGS-SZ1
  'tz-fu-ball-junioren-u15--jg--2011--samstag-36':     '18:15 - 19:45',

  // ── Fußball Junioren U14 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u14--jg--2012--dienstag-37':    '17:30 - 19:00',
  'tz-fu-ball-junioren-u14--jg--2012--freitag-38':     '16:00 - 18:00',   // Sportplatz
  'tz-fu-ball-junioren-u14--jg--2012--donnerstag-39':  '16:00 - 17:30',
  'tz-fu-ball-junioren-u14--jg--2012--freitag-40':     '17:00 - 19:00',   // Turnhalle Wiesenschule
  'tz-fu-ball-junioren-u14--jg--2012--sonntag-41':     '10:45 - 12:15',

  // ── Fußball Junioren U13 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u13--jg--2013--dienstag-42':    '17:30 - 19:00',   // Sportplatz
  'tz-fu-ball-junioren-u13--jg--2013--donnerstag-43':  '17:30 - 19:00',
  'tz-fu-ball-junioren-u13--jg--2013--dienstag-44':    '17:00 - 18:30',   // KuRa
  'tz-fu-ball-junioren-u13--jg--2013--samstag-45':     '16:30 - 18:00',
  'tz-fu-ball-junioren-u13--jg--2013--sonntag-46':     '16:00 - 18:00',

  // ── Fußball Junioren U12 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u12--jg--2014--montag-47':      '17:30 - 19:00',
  'tz-fu-ball-junioren-u12--jg--2014--donnerstag-48':  '17:30 - 19:00',
  'tz-fu-ball-junioren-u12--jg--2014--dienstag-49':    '17:00 - 18:30',
  'tz-fu-ball-junioren-u12--jg--2014--samstag-50':     '14:15 - 16:00',

  // ── Fußball Junioren U11 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u11--jg--2015--dienstag-51':    '17:30 - 18:45',
  'tz-fu-ball-junioren-u11--jg--2015--donnerstag-52':  '17:30 - 18:45',
  'tz-fu-ball-junioren-u11--jg--2015--sonntag-53':     '12:30 - 14:00',
  'tz-fu-ball-junioren-u11--jg--2015--samstag-54':     '12:30 - 14:00',

  // ── Fußball Junioren U10 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u10--jg--2016--mittwoch-55':    '16:00 - 17:30',
  'tz-fu-ball-junioren-u10--jg--2016--freitag-56':     '16:00 - 17:30',
  'tz-fu-ball-junioren-u10--jg--2016--donnerstag-57':  '16:00 - 17:30',
  'tz-fu-ball-junioren-u10--jg--2016--sonntag-58':     '09:00 - 10:30',

  // ── Fußball Junioren U09 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u09--jg--2017--montag-59':      '16:30 - 18:00',   // Sportplatz
  'tz-fu-ball-junioren-u09--jg--2017--donnerstag-60':  '16:00 - 17:30',
  'tz-fu-ball-junioren-u09--jg--2017--montag-61':      '17:10 - 18:20',   // Turnhalle
  'tz-fu-ball-junioren-u09--jg--2017--samstag-62':     '09:00 - 10:30',

  // ── Fußball Junioren U08 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u08--jg--2018--montag-63':      '16:30 - 18:00',
  'tz-fu-ball-junioren-u08--jg--2018--donnerstag-64':  '16:00 - 17:30',
  'tz-fu-ball-junioren-u08--jg--2018--sonntag-65':     '09:00 - 10:30',

  // ── Fußball Junioren U07 ───────────────────────────────────────────────────
  'tz-fu-ball-junioren-u07--jg--2019--montag-66':      '17:10 - 18:20',
  'tz-fu-ball-junioren-u07--jg--2019--samstag-67':     '10:45 - 12:15',

  // ── Fußball Junioren Minikicker ────────────────────────────────────────────
  'tz-fu-ball-junioren-minikicker--jg--2020-und-j-nger--donnerstag-68': '16:00 - 17:00',   // Sportplatz
  'tz-fu-ball-junioren-minikicker--jg--2020-und-j-nger--donnerstag-69': '15:00 - 16:15',   // Turnhalle

  // ── Judo ───────────────────────────────────────────────────────────────────
  'tz-judo-kinder---anf-nger--5-7-jahre--dienstag-75':               '16:30 - 17:30',
  'tz-judo-kinder---anf-nger---fortgeschrittene--bis-9-jahre--donnerstag-76': '16:30 - 17:30',
  'tz-judo-kinder---anf-nger---fortgeschrittene--ab-9-jahre--donnerstag-77':  '17:30 - 18:30',

  // ── Mutter-Kind Turnen ─────────────────────────────────────────────────────
  'tz-mutter-kind-turnen-kinder--0-2-jahre--freitag-81': '16:30 - 17:30',
  'tz-mutter-kind-turnen-kinder--2-4-jahre--freitag-82': '15:30 - 16:30',

  // ── Nordic Walking (Korrektur: war 15:00-17:30) ────────────────────────────
  'tz-nordic-walking-f-r-jedermann-mittwoch-83': '15:00 - 16:30',

  // ── Tischtennis (Korrektur Freitag: war 17:30-19:00) ──────────────────────
  'tz-tischtennis-kinder-und-erwachsene-freitag-87': '17:30 - 22:00',
}

// ─── 2. Neue Dokumente anlegen ───────────────────────────────────────────────
//   Einträge, die in Sanity noch nicht existieren.

const NEW_DOCS = [
  // Judo: zweite Dienstagsstunde Kinder / Anfänger 5–7 Jahre
  {
    _id:   'tz-judo-kinder-anf-nger-5-7-jahre-dienstag-extra',
    _type: 'trainingszeit',
    sparte: 'Judo',
    gruppe: 'Kinder / Anfänger (5–7 Jahre)',
    tag:    'Dienstag',
    uhrzeit: '17:30 - 18:30',
    ort:     'Turnhalle Mühlenschule',
    jahreszeit: 'ganzjährig',
    frequenz:   'jede Woche',
    trainer:  'Nils Hausmann, Nils Aepler',
    email:    'judo.svhose@gmail.com',
    telefon:  '',
  },
  // Kinderturnen: zweite Mittwochsstunde
  {
    _id:   'tz-kinderturnen-kinder-grundschule-mittwoch-extra',
    _type: 'trainingszeit',
    sparte: 'Kinderturnen',
    gruppe: 'Kinder, ab Grundschule bis 12 Jahre',
    tag:    'Mittwoch',
    uhrzeit: '16:30 - 17:30',
    ort:     'Turnhalle Mühlenschule',
    jahreszeit: 'ganzjährig',
    frequenz:   'jede Woche',
    trainer:  'Sabrina Müller',
    email:    'sabrina.mueller1986@outlook.de',
    telefon:  '0172-9820462',
  },
  // Nordic Walking: zweite Mittwochsstunde
  {
    _id:   'tz-nordic-walking-f-r-jedermann-mittwoch-extra',
    _type: 'trainingszeit',
    sparte: 'Nordic Walking',
    gruppe: 'Für jedermann',
    tag:    'Mittwoch',
    uhrzeit: '17:30 - 19:00',
    ort:     'Bolzplatz Tostedter Weg',
    jahreszeit: 'ganzjährig',
    frequenz:   'jede Woche',
    trainer:  'Dierk Ulber',
    email:    'dirk.ulber@sv-holm-seppensen.de',
    telefon:  '0151-70001967',
  },
  // Nordic Walking: Japanisches Intervall Walking (NEU ab 01.01.2026)
  {
    _id:   'tz-nordic-walking-japanisches-intervall-walking-mittwoch',
    _type: 'trainingszeit',
    sparte: 'Nordic Walking',
    gruppe: 'Japanisches Intervall Walking',
    tag:    'Mittwoch',
    uhrzeit: '16:30 - 17:15',
    ort:     'Bolzplatz Tostedter Weg',
    jahreszeit: 'ganzjährig',
    frequenz:   'jede Woche',
    trainer:  'Dierk Ulber',
    email:    'dirk.ulber@sv-holm-seppensen.de',
    telefon:  '0151-70001967',
  },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  let updated = 0
  let created = 0
  let errors  = 0

  console.log(`\n🔧  Setze ${Object.keys(PATCHES).length} Uhrzeiten per direktem ID-Patch …\n`)

  for (const [id, uhrzeit] of Object.entries(PATCHES)) {
    try {
      await client.patch(id).set({ uhrzeit }).commit()
      console.log(`  ✓  ${id}  →  ${uhrzeit}`)
      updated++
    } catch (err) {
      console.error(`  ✗  ${id}:`, err.message)
      errors++
    }
  }

  console.log(`\n➕  Lege ${NEW_DOCS.length} neue Dokumente an …\n`)

  for (const doc of NEW_DOCS) {
    try {
      await client.createOrReplace(doc)
      console.log(`  ✓  NEU: ${doc.sparte} | ${doc.gruppe} | ${doc.tag}  →  ${doc.uhrzeit}`)
      created++
    } catch (err) {
      console.error(`  ✗  NEU ${doc._id}:`, err.message)
      errors++
    }
  }

  console.log(`\n✅  Fertig!`)
  console.log(`   Aktualisiert: ${updated}`)
  console.log(`   Neu angelegt: ${created}`)
  console.log(`   Fehler:       ${errors}`)
}

main().catch(err => {
  console.error('Fehler:', err)
  process.exit(1)
})
