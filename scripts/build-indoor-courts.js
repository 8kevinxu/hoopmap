#!/usr/bin/env node
/*
 * Build data/courts.js — SF Recreation & Parks recreation centers that have an
 * INDOOR basketball gym. Run with:  npm run build:courts
 *
 * Two authoritative sources are combined:
 *   1. Which rec centers have an indoor basketball gym + their hours — verified
 *      from SF Rec & Park facility descriptions (sfrecpark.org / sf-parks.com)
 *      and recorded in the CENTERS table below.
 *   2. Exact coordinates / address / neighborhood — pulled live from DataSF's
 *      "Recreation and Parks Facilities" dataset (ib5c-xgwu) by property name.
 *
 * This replaces the earlier outdoor/OSM hybrid pipeline. Hours are the facility
 * operating hours; actual basketball OPEN-GYM times vary seasonally — verify on
 * sfrecpark.org.
 */

const fs = require('fs');
const path = require('path');

const DATASF =
  'https://data.sfgov.org/resource/ib5c-xgwu.json?' +
  "$select=property_name,facility_type,address,analysis_neighborhood,latitude,longitude&" +
  "$where=facility_type in('Rec Center','Fieldhouse','Rec Center/Pool')&$limit=200";

// Weekday order matches JS Date.getDay(): 0=Sun..6=Sat.
const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const time = (h, m = 0) => h * 60 + m;

// Build a 7-slot schedule from a {day:[openH, closeH]} spec; missing = closed.
function schedule(spec) {
  const out = [null, null, null, null, null, null, null];
  for (const [day, [o, c]] of Object.entries(spec)) {
    out[DAY_INDEX[day]] = [time(o), time(c)];
  }
  return out;
}

// Common SF Rec & Park pattern: Tue–Fri + Sat, closed Mon/Sun.
const tueFriSat = (oWk, cWk) =>
  schedule({
    tue: [oWk, cWk],
    wed: [oWk, cWk],
    thu: [oWk, cWk],
    fri: [oWk, cWk],
    sat: [9, 17],
  });

// Basketball open-gym blocks: a {day: [[startMin,endMin], ...]} spec into a
// 7-slot array (0=Sun..6=Sat) where each slot is an array of time blocks.
// Times below are the CURRENT (summer 2026) drop-in basketball schedules
// scraped from each center's sfrecpark.org facility page.
function bball(spec) {
  const out = [[], [], [], [], [], [], []];
  for (const [day, blocks] of Object.entries(spec)) out[DAY_INDEX[day]] = blocks;
  return out;
}
const t = time; // shorthand for blocks below

// Verified indoor-basketball rec centers. `prop` matches DataSF property_name.
const CENTERS = [
  {
    prop: 'Mission Rec Center',
    name: 'Mission Recreation Center',
    sched: schedule({ tue: [9, 21], wed: [9, 21], thu: [9, 21], fri: [9, 21], sat: [9, 17] }),
    bball: bball({}), // facility page erroring online — open-gym schedule unavailable
    notes: 'Indoor gymnasium for basketball, volleyball, or indoor soccer. Open-gym schedule unavailable online — check sfrecpark.org.',
  },
  {
    prop: 'Moscone Rec Center',
    name: 'Moscone Recreation Center',
    sched: tueFriSat(10, 20),
    bball: bball({
      tue: [[t(15, 30), t(17)]],
      wed: [[t(13), t(14)]],
      thu: [[t(15, 30), t(17)]],
      fri: [[t(13), t(14)]],
      sat: [[t(13), t(16, 30)]],
    }),
    notes: 'Locals shoot hoops in the indoor basketball gym.',
  },
  {
    prop: "St. Mary's Rec Center",
    name: "St. Mary's Recreation Center",
    sched: tueFriSat(10, 21),
    bball: bball({
      tue: [[t(17, 30), t(21, 30)]],
      fri: [[t(17, 30), t(21, 30)]],
      sat: [[t(9), t(17)]],
    }),
    notes: 'Gymnasium with indoor basketball.',
  },
  {
    prop: 'Upper Noe Rec Center',
    name: 'Upper Noe Recreation Center',
    sched: schedule({ tue: [9, 21], wed: [9, 21], thu: [9, 21], fri: [9, 21], sat: [9, 17] }),
    bball: bball({ sat: [[t(9), t(12)]] }),
    notes: 'Full-size indoor gym.',
  },
  {
    prop: 'Hamilton Rec Center',
    name: 'Hamilton Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({
      tue: [[t(15, 30), t(20, 30)]],
      wed: [[t(15, 30), t(20, 30)]],
      thu: [[t(15, 30), t(20, 30)]],
      fri: [[t(15, 30), t(20, 30)]],
      sat: [[t(9, 30), t(16, 30)]],
    }),
    notes: 'Gymnasium with basketball open gym for all ages.',
  },
  {
    prop: 'Eureka Valley Rec Center',
    name: 'Eureka Valley Recreation Center',
    sched: tueFriSat(9, 20),
    bball: bball({ tue: [[t(9), t(11)], [t(18), t(20)]], thu: [[t(9), t(11)]] }),
    notes: 'Play a game of basketball inside; gym with drop-in hours.',
  },
  {
    prop: 'Eugene Friend Rec Center',
    name: 'Gene Friend Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({}), // facility page erroring — likely renovation
    notes: 'Gymnasium with basketball. Facility page is offline (renovation) — verify hours and open gym at sfrecpark.org.',
  },
  {
    prop: 'Richmond Rec Center',
    name: 'Richmond Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({
      tue: [[t(18), t(23, 45)]],
      wed: [[t(14, 45), t(20, 45)]],
      thu: [[t(13, 45), t(17, 30)]],
      fri: [[t(14, 45), t(20, 45)]],
      sat: [[t(13, 45), t(16, 30)]],
    }),
    notes: 'Gymnasium with basketball open gym.',
  },
  {
    prop: 'Sunset Rec Center',
    name: 'Sunset Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({ thu: [[t(17, 30), t(21)]], fri: [[t(17, 30), t(21)]] }),
    notes: 'Gymnasium with basketball.',
  },
  {
    prop: 'Palega Playground',
    name: 'Palega Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({
      tue: [[t(10), t(16)]],
      wed: [[t(10), t(16)]],
      thu: [[t(10), t(16)], [t(12), t(15, 30)]],
      fri: [[t(10), t(16)]],
      sat: [[t(9), t(10)], [t(10), t(11)], [t(11, 30), t(12, 30)]],
    }),
    notes: 'Indoor gymnasium (also has outdoor courts).',
  },
  {
    prop: 'Joseph Lee Rec Center',
    name: 'Joseph Lee Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({
      tue: [[t(10), t(17)]],
      wed: [[t(10), t(18)], [t(18), t(20)]],
      thu: [[t(10), t(17)]],
      fri: [[t(10), t(20)]],
      sat: [[t(14), t(16, 30)]],
    }),
    notes: 'Gymnasium — play basketball, ping-pong, tetherball or air hockey.',
  },
  {
    prop: 'Minnie and Lovie Rec Center',
    name: 'Minnie & Lovie Ward Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({
      wed: [[t(18, 45), t(20, 45)]],
      thu: [[t(16), t(18, 15)]],
      fri: [[t(16), t(20, 45)]],
      sat: [[t(10, 30), t(12, 30)], [t(12, 45), t(16, 45)]],
    }),
    notes: 'Gymnasium, auditorium, multipurpose rooms; basketball drop-in.',
  },
  {
    prop: 'Bernal Heights Rec Center',
    name: 'Bernal Heights Recreation Center',
    sched: tueFriSat(10, 20),
    bball: bball({
      tue: [[t(13), t(19, 45)]],
      wed: [[t(10), t(18)], [t(18), t(20)]],
      thu: [[t(13), t(19, 45)]],
      fri: [[t(10), t(19, 45)]],
      sat: [[t(10, 15), t(16, 45)]],
    }),
    notes: 'Clubhouse and gym with basketball. Closes 2–5pm daily for after-school programs.',
  },
  {
    prop: 'Betty Ann Ong Chinese Rec Center',
    name: 'Betty Ann Ong Recreation Center',
    sched: schedule({ mon: [14, 18], tue: [10, 21], wed: [10, 21], thu: [10, 21], fri: [10, 21], sat: [9, 17] }),
    bball: bball({
      tue: [[t(10), t(15, 30)]],
      wed: [[t(10), t(14)]],
      thu: [[t(10), t(20, 30)]],
      fri: [[t(16), t(20, 30)]],
      sat: [[t(9), t(13)]],
    }),
    notes: 'Gymnasium with basketball open gym.',
  },
  {
    prop: 'Glen Canyon Park',
    name: 'Glen Park Recreation Center',
    sched: tueFriSat(10, 21),
    bball: bball({
      tue: [[t(11, 30), t(18)]],
      wed: [[t(16), t(18)]],
      thu: [[t(16), t(19, 30)]],
      fri: [[t(12, 30), t(15)]],
      sat: [[t(12, 30), t(15)], [t(15), t(18)]],
    }),
    notes: 'Open gym for pickup basketball; Sat afternoon includes wheelchair basketball.',
  },
  {
    prop: 'Herz Playground',
    name: 'Herz Recreation Center',
    sched: schedule({ mon: [14, 18], tue: [10, 21], wed: [10, 21], thu: [10, 21], fri: [10, 21], sat: [9, 17] }),
    bball: bball({
      tue: [[t(14, 30), t(19, 45)]],
      wed: [[t(14, 30), t(20, 45)]],
      thu: [[t(14, 30), t(20, 45)]],
      fri: [[t(14, 30), t(20, 45)]],
      sat: [[t(9), t(16, 30)]],
    }),
    notes: 'New full-size indoor gym (bleacher seating for 200).',
  },
  {
    prop: 'Potrero Hill Rec Center',
    name: 'Potrero Hill Recreation Center',
    sched: schedule({ tue: [10, 20], wed: [10, 21], thu: [10, 21], fri: [10, 21], sat: [9, 17] }),
    bball: bball({
      tue: [[t(10), t(19, 30)]],
      wed: [[t(10), t(17)]],
      thu: [[t(10), t(17)]],
      fri: [[t(10), t(19, 30)]],
      sat: [[t(9), t(16, 30)]],
    }),
    notes: 'Full-size indoor basketball court with bleacher seating for 200.',
  },
];

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  console.log('Fetching rec-center coordinates from DataSF…');
  const rows = await (await fetch(DATASF, {
    headers: { 'User-Agent': 'HoopMapSF/1.0', Accept: '*/*' },
  })).json();

  // Lookup by property name; prefer a "Rec Center" row, else first with coords.
  const byProp = {};
  for (const r of rows) {
    if (!r.latitude || !r.longitude) continue;
    const cur = byProp[r.property_name];
    if (!cur || (cur.facility_type !== 'Rec Center' && r.facility_type === 'Rec Center')) {
      byProp[r.property_name] = r;
    }
  }

  const courts = CENTERS.map((c) => {
    const row = byProp[c.prop];
    if (!row) throw new Error(`No DataSF coordinates found for "${c.prop}"`);
    return {
      id: slug(c.name),
      name: c.name,
      address: row.address || '',
      neighborhood: row.analysis_neighborhood || '',
      lat: Number(Number(row.latitude).toFixed(6)),
      lng: Number(Number(row.longitude).toFixed(6)),
      indoor: true,
      hoops: 2,
      lights: true,
      schedule: c.sched,
      basketball: c.bball,
      source: 'sfrecpark',
      notes: c.notes,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'courts.js'),
    render(courts)
  );
  console.log(`\n✅ Wrote ${courts.length} indoor SF Rec & Park courts to data/courts.js`);
}

function render(courts) {
  const body = courts
    .map(
      (c) => `  {
    id: ${JSON.stringify(c.id)},
    name: ${JSON.stringify(c.name)},
    address: ${JSON.stringify(c.address)},
    neighborhood: ${JSON.stringify(c.neighborhood)},
    lat: ${c.lat},
    lng: ${c.lng},
    indoor: true,
    hoops: ${c.hoops},
    lights: true,
    schedule: ${JSON.stringify(c.schedule)},
    basketball: ${JSON.stringify(c.basketball)},
    source: "sfrecpark",
    notes: ${JSON.stringify(c.notes)},
  },`
    )
    .join('\n');

  return `// AUTO-GENERATED by scripts/build-indoor-courts.js — do not edit by hand.
// Regenerate with: npm run build:courts
// Generated: ${new Date().toISOString()}
//
// SF Recreation & Parks recreation centers with an INDOOR basketball gym.
// Indoor-basketball determination + hours: verified from SF Rec & Park facility
// descriptions (sfrecpark.org / sf-parks.com). Coordinates, addresses and
// neighborhoods: DataSF "Recreation and Parks Facilities" dataset (ib5c-xgwu).
//
// schedule[]  = FACILITY hours, indexed 0=Sun..6=Sat; [openMin,closeMin] or null.
// basketball[] = drop-in OPEN-GYM basketball blocks, same day index; each day is
//   an array of [startMin,closeMin] blocks (empty when no basketball that day).
//   Scraped from each center's sfrecpark.org facility page (summer 2026) and
//   subject to seasonal change — verify on sfrecpark.org.

export const COURTS = [
${body}
];

export default COURTS;
`;
}

main().catch((e) => {
  console.error('\n❌ Failed:', e.message);
  process.exit(1);
});
