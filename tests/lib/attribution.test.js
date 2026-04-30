import { describe, expect, it } from 'vitest';

import {
  collectAttributionFromUrlSearchParams,
  effectiveAttributionForReporting,
  firstTouchAttributionForReporting,
  hasAnyAttributionStored,
  sanitizeAttribution,
  sanitizeAttributionOrderPayload,
} from '@/lib/attribution';

describe('attribution', () => {
  it('sanitizeAttribution drops unknown keys and length-limits', () => {
    expect(
      sanitizeAttribution({
        utm_source: ' google ',
        evil: '<script>',
        utm_medium: 'x'.repeat(300),
      }),
    ).toEqual({
      utm_source: 'google',
      utm_medium: 'x'.repeat(200),
    });
  });

  it('sanitizeAttributionOrderPayload accepts nested first/last', () => {
    const p = sanitizeAttributionOrderPayload({
      firstTouch: { utm_source: 'fb' },
      lastTouch: { utm_source: 'google', utm_campaign: 'summer' },
      firstCapturedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    });
    expect(p?.firstTouch?.utm_source).toBe('fb');
    expect(p?.lastTouch?.utm_campaign).toBe('summer');
    expect(p?.firstCapturedAt).toContain('2026');
  });

  it('sanitizeAttributionOrderPayload falls back to legacy flat', () => {
    expect(sanitizeAttributionOrderPayload({ utm_source: 'newsletter' })?.utm_source).toBe('newsletter');
  });

  it('effectiveAttributionForReporting prefers lastTouch', () => {
    const a = {
      firstTouch: { utm_source: 'first' },
      lastTouch: { utm_source: 'last' },
    };
    expect(effectiveAttributionForReporting(a)?.utm_source).toBe('last');
  });

  it('effectiveAttributionForReporting uses flat legacy', () => {
    expect(effectiveAttributionForReporting({ utm_source: 'legacy' })?.utm_source).toBe('legacy');
  });

  it('firstTouchAttributionForReporting prefers nested firstTouch', () => {
    const a = {
      firstTouch: { utm_source: 'first' },
      lastTouch: { utm_source: 'last' },
    };
    expect(firstTouchAttributionForReporting(a)?.utm_source).toBe('first');
  });

  it('collectAttributionFromUrlSearchParams reads allowed keys', () => {
    const sp = new URLSearchParams('utm_source=ig&gclid=abc&foo=bar');
    expect(collectAttributionFromUrlSearchParams(sp)).toEqual({ utm_source: 'ig', gclid: 'abc' });
  });

  it('hasAnyAttributionStored detects nested', () => {
    expect(hasAnyAttributionStored({ lastTouch: { gclid: 'x' } })).toBe(true);
    expect(hasAnyAttributionStored({ firstTouch: {}, lastTouch: {} })).toBe(false);
  });
});
