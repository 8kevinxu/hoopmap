# 🏀 HoopMap SF

Find an **indoor basketball court** to play at right now in San Francisco. The
app maps every **SF Recreation & Parks recreation center with an indoor gym** —
tap a pin for the weekly **open-gym basketball schedule**, facility hours, and
address. **"Open now"** filters to centers running drop-in basketball *right now*
(map pins fade when open gym isn't currently happening).

Built with **Expo / React Native**. The map is **Leaflet + OpenStreetMap**
rendered inside a `WebView` (no API key, no billing).

## Run it

```bash
npm install        # if you haven't already
npx expo start     # then press 'i' (iOS sim), 'a' (Android), or scan the QR in Expo Go
```

The first launch asks for location permission. If you decline, the map just
stays centered on San Francisco — everything else still works.

## Project layout

| File | What it does |
| --- | --- |
| `App.js` | Main screen: header, open-now filter, map, court detail card, geolocation |
| `components/CourtMap.js` | Leaflet map in a WebView; renders markers, handles taps |
| `assets/stephCurryIcon.js` | User-location marker image (data URI) |
| `data/courts.js` | **Generated** indoor-court list (do not edit by hand) |
| `scripts/build-indoor-courts.js` | Builds `data/courts.js` from verified + DataSF sources |
| `lib/hours.js` | `getOpenStatus()` — open-now logic from per-weekday schedules |

## Court data (SF Rec & Parks indoor gyms)

`data/courts.js` is **auto-generated** — don't edit it by hand. It's built from
two authoritative sources:

1. **Which rec centers have an indoor gym, their facility hours, and the
   per-center basketball open-gym schedule** — verified/scraped from each
   center's SF Rec & Park facility page and recorded in the `CENTERS` table in
   the build script. Each court carries two schedules:
   - `schedule[]` — facility operating hours (one block per day)
   - `basketball[]` — drop-in open-gym blocks (can be several per day)
2. **Coordinates, addresses, neighborhoods** — pulled live from DataSF's
   "Recreation and Parks Facilities" dataset (`ib5c-xgwu`) by property name.

Regenerate anytime (re-fetches coordinates from DataSF):

```bash
npm run build:courts
```

### Data caveat

Open-gym basketball times are the **summer 2026** schedules and vary seasonally
and by program — verify against [sfrecpark.org](https://sfrecpark.org). Two
centers have no open-gym blocks: **Mission** (its facility page is erroring) and
**Gene Friend** (page offline, likely renovation) — both verify on sfrecpark.org.

## Ideas for next

- **Auto-refresh schedules:** scrape open-gym times from sfrecpark.org in the
  build script instead of the hand-entered `CENTERS` table, so seasonal changes
  flow through automatically.
- **Distance sort:** rank courts by distance from the user.
- **Live availability:** let players check in ("I'm here / how crowded").
- **Outdoor courts / more sports:** the data model has room (`indoor`, `source`
  fields) to bring back outdoor courts or add other sports later.
