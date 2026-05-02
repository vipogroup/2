import { describe, expect, it } from 'vitest';

import {
  CATALOG_FORBIDDEN_PLACEHOLDER_PRICE,
  isForbiddenCatalogPrice,
} from '@/lib/catalogPriceGuards';

describe('catalogPriceGuards', () => {
  it('flags placeholder 12345', () => {
    expect(isForbiddenCatalogPrice(CATALOG_FORBIDDEN_PLACEHOLDER_PRICE)).toBe(true);
  });

  it('flags non-positive prices', () => {
    expect(isForbiddenCatalogPrice(0)).toBe(true);
    expect(isForbiddenCatalogPrice(-1)).toBe(true);
  });

  it('allows normal prices', () => {
    expect(isForbiddenCatalogPrice(99.5)).toBe(false);
  });
});
