import { describe, expect, it } from 'vitest';

import { assertTenantAccessOrThrow } from '@/lib/products/productListScope';

describe('productListScope.assertTenantAccessOrThrow', () => {
  it('throws 401 when user is null', () => {
    expect(() => assertTenantAccessOrThrow(null, 't1')).toThrow('Unauthorized');
  });

  it('allows super_admin for any tenant id', () => {
    expect(() =>
      assertTenantAccessOrThrow({ role: 'super_admin', tenantId: null }, 'other-tenant'),
    ).not.toThrow();
  });

  it('allows same-tenant member (customer) for own tenant', () => {
    expect(() =>
      assertTenantAccessOrThrow({ role: 'customer', tenantId: 'a' }, 'a'),
    ).not.toThrow();
  });

  it('forbids customer requesting another tenant', () => {
    expect(() =>
      assertTenantAccessOrThrow({ role: 'customer', tenantId: 'a' }, 'b'),
    ).toThrow('Forbidden');
  });

  it('forbids business_admin for wrong tenant', () => {
    expect(() =>
      assertTenantAccessOrThrow({ role: 'business_admin', tenantId: 'a' }, 'b'),
    ).toThrow('Forbidden');
  });

  it('forbids admin with tenant from querying another tenant', () => {
    expect(() =>
      assertTenantAccessOrThrow({ role: 'admin', tenantId: 'store-a' }, 'store-b'),
    ).toThrow('Forbidden');
  });

  it('allows admin with tenant for own tenant', () => {
    expect(() =>
      assertTenantAccessOrThrow({ role: 'admin', tenantId: 'store-a' }, 'store-a'),
    ).not.toThrow();
  });

  it('tenantless admin is treated as super (legacy) and may query another tenant id', () => {
    expect(() =>
      assertTenantAccessOrThrow({ role: 'admin', tenantId: null, email: 'not-listed@example.com' }, 'any-tenant'),
    ).not.toThrow();
  });
});
