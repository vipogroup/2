/**
 * Marketing attribution (UTM + ad click ids) — shared server/client pure logic.
 * - Whitelist-only keys, length caps (injection-safe for stored documents).
 * - Supports legacy flat documents and v2 { firstTouch, lastTouch, capturedAt }.
 */

/** @deprecated legacy session key; migrated client-side to v2 state */
export const ATTRIBUTION_STORAGE_LEGACY_KEY = 'vipo_attribution';

export const ATTRIBUTION_STATE_KEY = 'vipo_attribution_v2';

/** First-party cookie: survives new tab (SameSite=Lax, 30d window — common for ad attribution) */
export const ATTRIBUTION_COOKIE_NAME = 'vipo_attr_v2';

/** 30 days */
export const ATTRIBUTION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const ALLOWED_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
];

const MAX_LEN = 200;
const MAX_ISO_LEN = 40;

export function sanitizeAttribution(input) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const k of ALLOWED_KEYS) {
    const v = input[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    out[k] = s.slice(0, MAX_LEN);
  }
  return Object.keys(out).length ? out : null;
}

/** @param {URLSearchParams | null | undefined} searchParams */
export function collectAttributionFromUrlSearchParams(searchParams) {
  if (!searchParams) return {};
  const out = {};
  for (const k of ALLOWED_KEYS) {
    const v = searchParams.get(k);
    if (v) out[k] = v;
  }
  return out;
}

function sanitizeIso(s) {
  if (typeof s !== 'string' || !s.trim()) return null;
  return s.trim().slice(0, MAX_ISO_LEN);
}

/**
 * Normalize client/server payload: nested first/last or legacy flat object.
 * Returns null if nothing valid remains.
 */
export function sanitizeAttributionOrderPayload(input) {
  if (!input || typeof input !== 'object') return null;

  if (input.firstTouch != null || input.lastTouch != null) {
    const firstTouch = sanitizeAttribution(input.firstTouch);
    const lastTouch = sanitizeAttribution(input.lastTouch);
    const out = {};
    if (firstTouch) out.firstTouch = firstTouch;
    if (lastTouch) out.lastTouch = lastTouch;
    const fc = sanitizeIso(input.firstCapturedAt);
    const lc = sanitizeIso(input.lastCapturedAt);
    if (fc) out.firstCapturedAt = fc;
    if (lc) out.lastCapturedAt = lc;
    return Object.keys(out).length ? out : null;
  }

  return sanitizeAttribution(input);
}

/** True if a single attribution snapshot has any marketing field */
export function hasAttributionFields(x) {
  if (!x || typeof x !== 'object') return false;
  return Boolean(
    x.utm_source ||
      x.utm_medium ||
      x.utm_campaign ||
      x.utm_content ||
      x.utm_term ||
      x.gclid ||
      x.fbclid,
  );
}

/**
 * Stored order attribution: v2 nested or legacy flat.
 * For reporting, prefer last-touch (conversion credit), then legacy flat, then first-touch.
 */
export function effectiveAttributionForReporting(a) {
  if (!a || typeof a !== 'object') return null;
  if (a.lastTouch && typeof a.lastTouch === 'object' && hasAttributionFields(a.lastTouch)) {
    return a.lastTouch;
  }
  if (hasAttributionFields(a)) return a;
  if (a.firstTouch && typeof a.firstTouch === 'object' && hasAttributionFields(a.firstTouch)) {
    return a.firstTouch;
  }
  return null;
}

/** First-touch slice (for journey vs last-touch comparison). */
export function firstTouchAttributionForReporting(a) {
  if (!a || typeof a !== 'object') return null;
  if (a.firstTouch && typeof a.firstTouch === 'object' && hasAttributionFields(a.firstTouch)) {
    return a.firstTouch;
  }
  if (hasAttributionFields(a)) return a;
  return null;
}

export function hasAnyAttributionStored(a) {
  if (!a || typeof a !== 'object') return false;
  if (hasAttributionFields(a)) return true;
  if (hasAttributionFields(a.firstTouch)) return true;
  if (hasAttributionFields(a.lastTouch)) return true;
  return false;
}
