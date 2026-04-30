const AUTH_CACHE_KEY = 'vipo_auth_me_cache_v1';
const DEFAULT_TTL_MS = 45 * 1000;

let memoryEntry = null;
let inFlightRequest = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function isValidEntry(entry) {
  return !!entry && typeof entry.ts === 'number' && 'user' in entry;
}

function isFresh(entry, ttlMs) {
  if (!isValidEntry(entry)) return false;
  return Date.now() - entry.ts <= ttlMs;
}

function readSessionEntry() {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_CACHE_KEY);
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
    window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(entry));
  } catch (_) {
    // ignore storage quota/private mode issues
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

function setEntry(user) {
  const nextEntry = { user: user || null, ts: Date.now() };
  memoryEntry = nextEntry;
  writeSessionEntry(nextEntry);
  return nextEntry;
}

export function clearAuthUserCache() {
  memoryEntry = null;
  inFlightRequest = null;
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch (_) {
    // ignore storage access failures
  }
}

export function readAuthUserCache(ttlMs = DEFAULT_TTL_MS) {
  const entry = getEntry();
  if (!entry || !isFresh(entry, ttlMs)) {
    return { hit: false, user: null };
  }
  return { hit: true, user: entry.user || null };
}

export async function fetchAuthUser(options = {}) {
  const { forceRefresh = false, ttlMs = DEFAULT_TTL_MS } = options;

  if (!forceRefresh) {
    const cached = readAuthUserCache(ttlMs);
    if (cached.hit) {
      return cached.user;
    }
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setEntry(null);
        return null;
      }

      if (!res.ok) {
        throw new Error(`Auth request failed with status ${res.status}`);
      }

      const data = await res.json();
      const user = data?.user || null;
      setEntry(user);
      return user;
    } catch (error) {
      const staleEntry = getEntry();
      if (staleEntry) {
        return staleEntry.user || null;
      }
      throw error;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}