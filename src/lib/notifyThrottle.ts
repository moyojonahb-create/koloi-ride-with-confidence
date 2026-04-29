// Throttle banners + sounds so a given (rideId, key) cannot fire more than
// once within a short window. Stored in-memory + localStorage so it survives
// React re-renders and brief navigations on the same device.

const WINDOW_MS = 30_000;
const STORAGE_KEY = "pickme.notifyThrottle";

type Store = Record<string, number>;

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    // GC stale entries
    const now = Date.now();
    const fresh: Store = {};
    for (const [k, ts] of Object.entries(parsed)) {
      if (now - ts < WINDOW_MS * 4) fresh[k] = ts;
    }
    return fresh;
  } catch {
    return {};
  }
}

function save(s: Store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

/**
 * Returns true if the event should fire (and records the timestamp);
 * false if it was throttled.
 */
export function shouldFireOnce(scope: string, key: string, windowMs: number = WINDOW_MS): boolean {
  const id = `${scope}::${key}`;
  const store = load();
  const now = Date.now();
  const last = store[id] ?? 0;
  if (now - last < windowMs) return false;
  store[id] = now;
  save(store);
  return true;
}

/** Reset throttle for a scope (e.g. when a ride completes). */
export function resetThrottle(scope: string) {
  const store = load();
  let changed = false;
  for (const k of Object.keys(store)) {
    if (k.startsWith(`${scope}::`)) { delete store[k]; changed = true; }
  }
  if (changed) save(store);
}
