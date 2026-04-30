const ALERTS_CACHE_KEY = 'vipo_admin_unread_alerts_cache_v1';
const DEFAULT_TTL_MS = 20 * 1000;

let memoryEntry = null;
let inFlightRequest = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function isValidEntry(entry) {
  return !!entry && typeof entry.ts === 'number' && typeof entry.count === 'number';
}

function isFresh(entry, ttlMs) {
  if (!isValidEntry(entry)) return false;
  return Date.now() - entry.ts <= ttlMs;
}

function readSessionEntry() {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(ALERTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidEntry(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function writeSessionEntry(entry) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(entry));
  } catch (_) {
    // ignore storage failures
  }
}

function getEntry() {
  if (isValidEntry(memoryEntry)) return memoryEntry;
  const sessionEntry = readSessionEntry();
  if (sessionEntry) {
    memoryEntry = sessionEntry;
    return sessionEntry;
  }
  return null;
}

function setEntry(count) {
  const nextEntry = { count: normalizeCount(count), ts: Date.now() };
  memoryEntry = nextEntry;
  writeSessionEntry(nextEntry);
  return nextEntry;
}

export function clearAdminUnreadAlertsCache() {
  memoryEntry = null;
  inFlightRequest = null;
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(ALERTS_CACHE_KEY);
  } catch (_) {
    // ignore storage failures
  }
}

export async function fetchUnreadAdminAlerts(options = {}) {
  const { forceRefresh = false, ttlMs = DEFAULT_TTL_MS } = options;

  if (!forceRefresh) {
    const cached = getEntry();
    if (cached && isFresh(cached, ttlMs)) {
      return cached.count;
    }
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const res = await fetch('/api/admin/alerts?unread=true', {
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setEntry(0);
        return 0;
      }

      if (!res.ok) {
        throw new Error(`Alerts request failed with status ${res.status}`);
      }

      const data = await res.json();
      const unreadCount = normalizeCount(data?.unreadCount);
      setEntry(unreadCount);
      return unreadCount;
    } catch (error) {
      const stale = getEntry();
      if (stale) {
        return stale.count;
      }
      throw error;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}