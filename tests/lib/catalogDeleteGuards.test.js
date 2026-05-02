import { describe, expect, it } from 'vitest';

import {
  catalogRealDeleteGuardsOk,
  CATALOG_DELETE_CONFIRM_TOKEN,
  hasExactCoverage,
  normalizeList,
} from '@/lib/catalogDeleteGuards';

describe('catalogDeleteGuards', () => {
  it('normalizeList dedupes and trims', () => {
    expect(normalizeList([' a ', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('hasExactCoverage requires exact multiset match', () => {
    expect(hasExactCoverage(['1', '2'], ['2', '1'])).toBe(true);
    expect(hasExactCoverage(['1'], ['1', '1'])).toBe(false);
  });

  it('returns false in production when ALLOW flag is off', () => {
    expect(
      catalogRealDeleteGuardsOk({
        body: { confirm: CATALOG_DELETE_CONFIRM_TOKEN },
        nodeEnv: 'production',
        allowCatalogDelete: false,
        resolvedProductIds: [],
        requestedProductKeys: ['x'],
        mediaDeletionInvolved: false,
        tenantId: 't1',
      }),
    ).toBe(false);
  });

  it('dry-run style: no real delete without full confirm payload', () => {
    expect(
      catalogRealDeleteGuardsOk({
        body: { dryRun: true },
        nodeEnv: 'development',
        allowCatalogDelete: false,
        resolvedProductIds: ['p1'],
        requestedProductKeys: ['sku'],
        mediaDeletionInvolved: false,
        tenantId: 't1',
      }),
    ).toBe(false);
  });

  it('allows real delete in dev when all echoes match', () => {
    const body = {
      confirm: CATALOG_DELETE_CONFIRM_TOKEN,
      acknowledgeDataLoss: true,
      acknowledgeMediaDeletion: false,
      reason: 'cleanup',
      confirmEnvironment: 'development',
      confirmCollections: ['products', 'auditlogs'],
      confirmProductIds: ['p1'],
      confirmProductKeys: ['sku'],
      confirmTenantId: 't1',
    };
    expect(
      catalogRealDeleteGuardsOk({
        body,
        nodeEnv: 'development',
        allowCatalogDelete: false,
        resolvedProductIds: ['p1'],
        requestedProductKeys: ['sku'],
        mediaDeletionInvolved: false,
        tenantId: 't1',
      }),
    ).toBe(true);
  });

  it('blocks when media deletion involved but not acknowledged', () => {
    const body = {
      confirm: CATALOG_DELETE_CONFIRM_TOKEN,
      acknowledgeDataLoss: true,
      acknowledgeMediaDeletion: false,
      reason: 'cleanup',
      confirmEnvironment: 'development',
      confirmCollections: ['products', 'auditlogs'],
      confirmProductIds: [],
      confirmProductKeys: ['sku'],
      confirmTenantId: 't1',
    };
    expect(
      catalogRealDeleteGuardsOk({
        body,
        nodeEnv: 'development',
        allowCatalogDelete: true,
        resolvedProductIds: [],
        requestedProductKeys: ['sku'],
        mediaDeletionInvolved: true,
        tenantId: 't1',
      }),
    ).toBe(false);
  });
});
