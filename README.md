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
| `data/courts.js` | **Generated** bundled court list (offline fallback) |
| `data/courts.json` | **Generated** hostable court data the app fetches at launch |
| `scripts/build-indoor-courts.js` | Builds the data files; scrapes live schedules |
| `scripts/schedule-cache.json` | Last-good scraped schedule per facility (fallback) |
| `.github/workflows/refresh-schedules.yml` | Weekly cron that re-scrapes + commits |
| `lib/useCourts.js` | Fetches/caches court data at launch (bundled→cached→remote) |
| `lib/hours.js` | Open-now + basketball open-gym logic from per-weekday schedules |
| `lib/crowd.js` | Crowd check-in store (levels, freshness, "voted X ago") |
| `lib/reviews.js` | Per-court reviews store (Supabase + local fallback) |

## Court data (SF Rec & Parks indoor gyms)

`data/courts.js` is **auto-generated** — don't edit it by hand. It combines three
sources:

1. **Which rec centers have an indoor gym + facility hours** — curated in the
   `CENTERS` table in the build script (rarely changes).
2. **Coordinates, addresses, neighborhoods** — DataSF "Recreation and Parks
   Facilities" dataset (`ib5c-xgwu`), fetched by property name.
3. **Open-gym basketball times** — **scraped live each build** from the
   *Gymnasium* row of each center's sfrecpark.org facility page.

Each court carries:
- `schedule[]` — facility operating hours (one block per day)
- `basketball[]` — drop-in open-gym blocks (can be several per day)
- `scheduleSource` — `"live"` (scraped this run) · `"cache"` (last-good) · `"curated"`

Regenerate anytime:

```bash
npm run build:courts
```

### Auto-refresh (keeping schedules current)

The schedules are **seasonal**, so they're refreshed automatically:

- **Live scrape on every build** via a small cheerio parser. The facility-page
  season label (e.g. "Summer Schedule") is captured and stamped into the file.
- **Weekly GitHub Actions cron** (`.github/workflows/refresh-schedules.yml`)
  re-runs the build and commits `data/courts.js` only if it changed.
- **Resilience:** each center falls back `live → cache → curated`. A
  **validation gate** aborts the run (leaving the old data in place) if fewer
  than `MIN_LIVE_OK` centers scrape — so a site redesign **fails the Action and
  notifies you** instead of silently publishing empty schedules.

### Reviews

Each court's card has a **Reviews** section — a list of comments plus a box to
add one (optional name + text). Stored in `lib/reviews.js` with the same
Supabase-or-local pattern as check-ins; loaded lazily per court.

Guards for free-text content: body capped at 1000 chars, optional name at 50,
and a per-IP rate limit (10 reviews / 10 min) via a Supabase trigger. There's no
in-app delete — **moderate via the Supabase dashboard** (Table Editor → `reviews`)
if needed. A `rating` column exists (unused) so star ratings are an easy add.

**Seed your own initial data** in the Supabase SQL editor:

```sql
insert into public.reviews (court_id, author, body) values
  ('hamilton-recreation-center', 'Kevin', 'Great runs on weekday evenings, competitive.'),
  ('mission-recreation-center',  null,    'Gym can get packed after 6pm.');
```

(`court_id` matches the `id` in `data/courts.js` — e.g. `palega-recreation-center`.)

## Live updates for users (no app release needed)

The app fetches fresh data **on launch** instead of relying only on the bundled
file (`lib/useCourts.js`):

```
bundled data (instant, offline)  →  cached copy (last good)  →  remote fetch (revalidate)
```

1. The weekly cron commits `data/courts.json`.
2. Point the app at that file's hosted URL via an env var (no code change):
   ```
   EXPO_PUBLIC_COURTS_URL=https://raw.githubusercontent.com/<user>/hoopmap/main/data/courts.json
   ```
   (Put it in a `.env` file or your EAS build env. Needs a **public** repo for the
   raw URL; or host `courts.json` on GitHub Pages / any CDN.)
3. On launch the app renders bundled data instantly, then swaps in the cached
   copy, then revalidates from the URL and caches the result. Offline or a failed
   fetch just keeps the last good data — it never blocks or crashes.

Until `EXPO_PUBLIC_COURTS_URL` is set, the app simply uses the bundled data.

### Data caveat

Open-gym times reflect the current season scraped from sfrecpark.org and vary by
program — verify on [sfrecpark.org](https://sfrecpark.org). **Gene Friend** has
no open-gym blocks (facility page offline, likely renovation) and falls back to
curated data.

## Live crowd check-ins

Tap a court → **"How crowded right now?"** → vote **Empty / Moderate / Packed**.
Your pick is highlighted; **tap it again to remove your check-in**, or tap a
different level to switch. The latest check-in shows as e.g. "🔴 Packed · voted
12 min ago", plus a short **history** ("👥 4 check-ins in the last hour" and the
recent votes), and animates the map marker:

- **Empty** → sleepy `z z z` drifting off the basketball
- **Moderate** → no animation
- **Packed** → pulsing glow + a flickering 🔥

Check-ins expire after `FRESH_WINDOW_MS` (2h) — after that the gym's current
state is "unknown" again (no animation), though the last report time still shows.

**Storage is pluggable** (`lib/crowd.js`): it uses **Supabase** (shared across
all users + real-time) when configured, and falls back to **on-device storage**
otherwise. No UI changes between the two.

### Enable shared / real-time check-ins (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query →** paste [`supabase/schema.sql`](supabase/schema.sql)
   → **Run** (creates the `check_ins` table, public read/insert/delete policies,
   and turns on real-time). *Already ran an older version? Re-run just the new
   `... for delete ...` policy so the tap-to-undo works.*
3. **Project Settings → API →** copy the **Project URL** and **anon public key**.
4. Add them to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```
5. Restart with a cache clear: `npx expo start -c`.

Now check-ins write to Supabase, everyone sees the same counts, and a real-time
subscription pushes other users' check-ins to the map live. Until the env vars
are set, the app uses local on-device check-ins (you see only your own).

**Real-time is incremental:** each new check-in is merged into state by `id`
(`mergeCheckIn`) rather than refetching the whole table — so cost scales with
*check-ins*, not *users × check-ins*.

**Anti-spam (two layers, no cooldown):**
1. *Client* — each device holds a **single vote per court** (switching replaces
   it, tapping your pick again removes it), so taps can't inflate the count and
   misclicks are instantly fixable.
2. *Server* — a Supabase `BEFORE INSERT` trigger caps check-ins per client IP
   (default 30 / 60s; tune in `supabase/schema.sql`). Unlike the client guard,
   it can't be bypassed by clearing app storage.

Both are pragmatic backstops, not airtight: the anonymous model means shared
Wi-Fi / mobile CGNAT users share an IP. True per-user protection would need
auth or device attestation.

## Accounts (optional)

Accounts are the foundation for social features. They're **optional** — the map,
check-ins, and reviews all work signed-out; you only need an account for social.

Sign-in is **email + password** via Supabase Auth (`lib/auth.js`). Tap **Sign in**
in the header to create an account (with a display name) or log in; the session
persists across launches. Profiles live in a `profiles` table (`id → auth.users`,
`display_name`), auto-created on signup by a DB trigger and **public-readable** so
names can show in social features.

Setup (on top of the Supabase steps under *Live crowd check-ins*):

1. Re-run [`supabase/schema.sql`](supabase/schema.sql) — it now also creates the
   `profiles` table, its policies, and the signup trigger (all idempotent).
2. **Authentication → Providers → Email** is enabled by default. For frictionless
   testing, turn **off "Confirm email"** there; keep it **on** for production
   (sign-up then asks the user to confirm via email before first login).

When Supabase isn't configured, the account button is simply hidden.

## Ideas for next

- **Social / "let's hoop":** accounts now exist (above) — next is a friends graph
  and lightweight intents: ping friends "want to hoop?", or broadcast "planning to
  hoop at 6pm" / "hooping at Hamilton at 6pm" so people can join. Still needs the
  friends graph and notifications.
- **Distance sort:** rank courts by distance from the user.
- **Outdoor courts / more sports:** the data model has room (`indoor`, `source`
  fields) to bring back outdoor courts or add other sports later.
