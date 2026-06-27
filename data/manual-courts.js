// Hand-curated courts from sources OUTSIDE the SF Rec & Parks pipeline.
//
// scripts/build-indoor-courts.js regenerates data/courts.js from sfrecpark.org +
// DataSF and will clobber anything added there. Courts in THIS file are merged in
// at runtime by lib/useCourts.js (deduped by id) and are never overwritten, so
// this is where non-SF / non-sfrecpark gyms live.
//
// Same schema as data/courts.js. Times are minutes-from-midnight; arrays are
// indexed 0=Sun..6=Sat. `schedule[i]` = facility hours [openMin,closeMin] or null;
// `basketball[i]` = drop-in open-gym basketball blocks [[startMin,endMin], ...].
//
// Optional `disclaimer` overrides the default "verify on sfrecpark.org" footnote
// shown on the court detail screen.

const hm = (h, m = 0) => h * 60 + m; // hours:minutes -> minutes from midnight

export const MANUAL_COURTS = [
  {
    id: "san-bruno-rac",
    name: "Recreation & Aquatic Center (RAC)",
    address: "251 City Park Way",
    neighborhood: "San Bruno",
    lat: 37.6167,
    lng: -122.4138,
    indoor: true,
    hoops: 2,
    lights: true,
    // Facility hours: Mon–Fri 6a–9p, Sat 8a–8p, Sun 12p–5p.
    schedule: [
      [hm(12), hm(17)], // Sun
      [hm(6), hm(21)], // Mon
      [hm(6), hm(21)], // Tue
      [hm(6), hm(21)], // Wed
      [hm(6), hm(21)], // Thu
      [hm(6), hm(21)], // Fri
      [hm(8), hm(20)], // Sat
    ],
    // Drop-in basketball (Side 1 + Side 2 pickup) from the posted weekly gym
    // schedule. The gym is shared with volleyball/pickleball/rentals, so blocks
    // shrink mid-day; gym closes ~10 min before the facility.
    basketball: [
      [[hm(12), hm(14)]], // Sun — youth (17 & under)
      [[hm(6), hm(20, 50)]], // Mon
      [[hm(6), hm(11, 30)]], // Tue
      [[hm(6), hm(16, 30)]], // Wed
      [[hm(6), hm(11, 30)]], // Thu
      [[hm(6), hm(20, 50)]], // Fri
      [[hm(16, 30), hm(19, 50)]], // Sat
    ],
    scheduleSource: "curated",
    source: "sanbruno",
    notes:
      "Two-side gymnasium; drop-in basketball shares the gym with volleyball, pickleball, and rentals, so open-gym blocks shift through the day. Sunday drop-in is youth only (17 & under).",
    disclaimer:
      "Gym schedule changes weekly — verify at sanbruno.ca.gov or call (650) 616-7058.",
  },
];

export default MANUAL_COURTS;
