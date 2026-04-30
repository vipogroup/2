'use client';

/**
 * Browser-only: sessionStorage + first-party cookie, first-touch / last-touch updates.
 * Import only from client components.
 *
 * Persists marketing attribution only after the user accepts cookies (localStorage cookieConsent),
 * in line with common GDPR practice for non-essential storage.
 */

import {
  ATTRIBUTION_COOKIE_MAX_AGE_SEC,
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_STATE_KEY,
  ATTRIBUTION_STORAGE_LEGACY_KEY,
  collectAttributionFromUrlSearchParams,
  sanitizeAttribution,
  sanitizeAttributionOrderPayload,
} from '@/lib/attribution';

/** Dispatched from CookieConsent after the user accepts (marketing storage allowed). */
export const ATTRIBUTION_CONSENT_EVENT = 'vipo:cookie-consent';

export function hasMarketingAttributionConsent() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('cookieConsent') === 'true';
  } catch {
    return false;
  }
}

function readCookieRaw(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? m[1] : null;
}

function writeCookie(name, value, maxAgeSec) {
  if (typeof document === 'undefined') return;
  try {
    if (value.length > 3800) return;
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
  } catch {
    /* quota / private mode */
  }
}

function parseState(json) {
  if (!json || typeof json !== 'object') return null;
  const firstTouch = sanitizeAttribution(json.firstTouch);
  const lastTouch = sanitizeAttribution(json.lastTouch);
  return {
    firstTouch,
    lastTouch,
    firstCapturedAt: typeof json.firstCapturedAt === 'string' ? json.firstCapturedAt.slice(0, 40) : null,
    lastCapturedAt: typeof json.lastCapturedAt === 'string' ? json.lastCapturedAt.slice(0, 40) : null,
  };
}

function migrateLegacyFlat() {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const flat = sanitizeAttribution(parsed);
    sessionStorage.removeItem(ATTRIBUTION_STORAGE_LEGACY_KEY);
    if (!flat) return null;
    const now = new Date().toISOString();
    return {
      firstTouch: flat,
      lastTouch: flat,
      firstCapturedAt: now,
      lastCapturedAt: now,
    };
  } catch {
    return null;
  }
}

function readState() {
  if (!hasMarketingAttributionConsent()) return null;
  let state = null;
  try {
    const s = sessionStorage.getItem(ATTRIBUTION_STATE_KEY);
    if (s) state = parseState(JSON.parse(s));
  } catch {
    state = null;
  }
  if (!state) {
    try {
      const c = readCookieRaw(ATTRIBUTION_COOKIE_NAME);
      if (c) state = parseState(JSON.parse(decodeURIComponent(c)));
    } catch {
      state = null;
    }
  }
  if (!state) {
    const migrated = migrateLegacyFlat();
    if (migrated) {
      writeState(migrated);
      return migrated;
    }
  }
  return state;
}

function writeState(state) {
  if (!state || !hasMarketingAttributionConsent()) return;
  try {
    const minimal = {
      firstTouch: state.firstTouch || null,
      lastTouch: state.lastTouch || null,
      firstCapturedAt: state.firstCapturedAt || null,
      lastCapturedAt: state.lastCapturedAt || null,
    };
    const json = JSON.stringify(minimal);
    sessionStorage.setItem(ATTRIBUTION_STATE_KEY, json);
    writeCookie(ATTRIBUTION_COOKIE_NAME, json, ATTRIBUTION_COOKIE_MAX_AGE_SEC);
  } catch {
    /* */
  }
}

/**
 * Call on navigation when URL may contain UTM params (global capture).
 * @param {URLSearchParams | null | undefined} searchParams
 */
export function captureAttributionFromSearchParams(searchParams) {
  if (typeof window === 'undefined' || !searchParams || !hasMarketingAttributionConsent()) return;
  const fromUrl = sanitizeAttribution(collectAttributionFromUrlSearchParams(searchParams));
  if (!fromUrl) return;

  let state = readState();
  const now = new Date().toISOString();
  if (!state) {
    state = {
      firstTouch: fromUrl,
      lastTouch: fromUrl,
      firstCapturedAt: now,
      lastCapturedAt: now,
    };
    writeState(state);
    return;
  }
  if (!state.firstTouch) {
    state.firstTouch = fromUrl;
    state.firstCapturedAt = now;
  }
  state.lastTouch = fromUrl;
  state.lastCapturedAt = now;
  writeState(state);
}

/**
 * Build payload for POST /api/orders; merges live URL (wins for last-touch).
 * @param {URLSearchParams | null | undefined} searchParams
 */
export function getAttributionPayloadForOrder(searchParams) {
  if (typeof window === 'undefined') return null;
  const state = readState();
  const fromUrl = sanitizeAttribution(collectAttributionFromUrlSearchParams(searchParams));
  const lastTouch = fromUrl || state?.lastTouch || null;
  const lastCapturedAt = fromUrl
    ? new Date().toISOString()
    : state?.lastCapturedAt || null;

  const payload = {};
  if (state?.firstTouch) payload.firstTouch = state.firstTouch;
  if (lastTouch) payload.lastTouch = lastTouch;
  if (state?.firstCapturedAt) payload.firstCapturedAt = state.firstCapturedAt;
  if (lastCapturedAt) payload.lastCapturedAt = lastCapturedAt;

  return sanitizeAttributionOrderPayload(payload);
}
