// Social activity feed: one chronological stream merging friends' "down to
// hoop" signals (and joinable sessions) with upcoming planned runs. The Activity
// sheet renders these; the header badge shows how many are unread.
//
// "Unread" is tracked locally: a single "last seen the feed" timestamp in
// AsyncStorage. An item counts as unread when its created_at is newer than that
// and it isn't your own post.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSignals } from './signals';
import { loadUpcomingRuns } from './runs';

const SEEN_KEY = 'hoopmap:feedSeenAt';

// Unified, soonest-first activity from friends' signals + upcoming runs. Each
// item is tagged with `kind` and carries the original signal/run object so the
// sheet can render and act on it.
export async function loadFeed() {
  const [signals, runs] = await Promise.all([loadSignals(), loadUpcomingRuns()]);
  const items = [
    ...signals.map((s) => ({
      kind: 'signal',
      id: s.id,
      createdAt: s.createdAt,
      // Confirmed session time, else scheduled start, else null ("right now").
      eventTime: s.plannedAt || s.startsAt || null,
      mine: s.mine,
      signal: s,
    })),
    ...runs.map((r) => ({
      kind: 'run',
      id: r.id,
      createdAt: r.createdAt,
      eventTime: r.startsAt,
      mine: r.mine,
      run: r,
    })),
  ];
  // Soonest first; "right now" signals (no eventTime) sort to the top.
  const at = (x) => (x.eventTime ? new Date(x.eventTime).getTime() : Date.now());
  items.sort((a, b) => at(a) - at(b));
  return items;
}

export async function getFeedSeenAt() {
  try {
    const v = await AsyncStorage.getItem(SEEN_KEY);
    return v ? Number(v) : 0;
  } catch (e) {
    return 0;
  }
}

export async function markFeedSeen() {
  try {
    await AsyncStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch (e) {
    // Non-fatal: the badge just won't clear until next time.
  }
}

// How many feed items are newer than `seenAt` and aren't the user's own — you
// don't need to be alerted about things you posted.
export function unreadCount(items, seenAt) {
  return items.filter((it) => {
    if (it.mine) return false;
    const c = it.createdAt ? new Date(it.createdAt).getTime() : 0;
    return c > seenAt;
  }).length;
}
