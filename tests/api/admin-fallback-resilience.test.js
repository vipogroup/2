import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDb = vi.fn();
const mockRequireAdminApi = vi.fn();
const mockRequireAdminGuard = vi.fn();
const mockIsSuperAdminMiddleware = vi.fn();
const mockIsSuperAdmin = vi.fn();
const mockRateLimiter = vi.fn();
const mockBuildRateLimitKey = vi.fn();

vi.mock('@/lib/errorTracking/errorLogger', () => ({
  withErrorLogging: (handler) => handler,
}));

vi.mock('@/lib/db', () => ({
  getDb: mockGetDb,
}));

vi.mock('@/lib/auth/server', () => ({
  requireAdminApi: mockRequireAdminApi,
}));

vi.mock('@/lib/auth/requireAuth', () => ({
  requireAdminGuard: mockRequireAdminGuard,
}));

vi.mock('@/lib/tenant/tenantMiddleware', () => ({
  isSuperAdmin: mockIsSuperAdminMiddleware,
}));

vi.mock('@/lib/tenant', () => ({
  isSuperAdmin: mockIsSuperAdmin,
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimiters: {
    admin: mockRateLimiter,
  },
  buildRateLimitKey: mockBuildRateLimitKey,
}));

vi.mock('@/lib/cloudinary', () => ({
  getCloudinary: vi.fn(() => ({ api: {} })),
}));

let dashboardGET;
let tenantStatsGET;
let tenantMediaUsageGET;

function createDbOutageError() {
  const err = new Error('mongo_circuit_open');
  err.code = 'MONGO_CIRCUIT_OPEN';
  err.name = 'MongoServerSelectionError';
  return err;
}

beforeAll(async () => {
  ({ GET: dashboardGET } = await import('@/app/api/admin/dashboard/route'));
  ({ GET: tenantStatsGET } = await import('@/app/api/admin/tenant-stats/route'));
  ({ GET: tenantMediaUsageGET } = await import('@/app/api/admin/tenant-media-usage/route'));
});

beforeEach(() => {
  mockGetDb.mockReset();
  mockRequireAdminApi.mockReset();
  mockRequireAdminGuard.mockReset();
  mockIsSuperAdminMiddleware.mockReset();
  mockIsSuperAdmin.mockReset();
  mockRateLimiter.mockReset();
  mockBuildRateLimitKey.mockReset();

  mockGetDb.mockRejectedValue(createDbOutageError());
  mockRequireAdminApi.mockResolvedValue({
    id: 'super-admin-id',
    role: 'super_admin',
    tenantId: null,
  });
  mockRequireAdminGuard.mockResolvedValue({
    ok: true,
    user: { id: 'super-admin-id', role: 'super_admin' },
  });
  mockIsSuperAdminMiddleware.mockReturnValue(true);
  mockIsSuperAdmin.mockReturnValue(true);
  mockRateLimiter.mockReturnValue({ allowed: true });
  mockBuildRateLimitKey.mockReturnValue('rate-limit-key');
});

describe('Admin fallback resilience', () => {
  it('returns dashboard fallback with observability headers', async () => {
    const request = new Request('http://localhost/api/admin/dashboard');
    const response = await dashboardGET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-vipo-data-mode')).toBe('fallback');
    expect(response.headers.get('x-vipo-fallback')).toBe('1');
    expect(response.headers.get('x-vipo-fallback-reason')).toBe('db_unavailable');
    expect(response.headers.get('x-vipo-fallback-source')).toBe('fallback_marketplace_files');

    expect(json.ok).toBe(true);
    expect(json.fallback).toBe(true);
    expect(json.degraded).toBe(true);
    expect(json.fallbackSchemaVersion).toBe(2);
    expect(typeof json.generatedAt).toBe('string');
    expect(json.stats.totalProducts).toBeGreaterThan(0);
    expect(json.stats.activeTenants).toBeGreaterThan(0);
    expect(json.stats.totalProducts).toBe(json.stats.groupProducts + json.stats.onlineProducts);
  });

  it('returns tenant-stats fallback with tenant rows from snapshot files', async () => {
    const request = new Request('http://localhost/api/admin/tenant-stats?period=month');
    const response = await tenantStatsGET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-vipo-data-mode')).toBe('fallback');
    expect(json.ok).toBe(true);
    expect(json.fallback).toBe(true);
    expect(json.degraded).toBe(true);
    expect(Array.isArray(json.tenants)).toBe(true);
    expect(json.tenants.length).toBeGreaterThan(0);
    expect(json.totals.activeTenants).toBe(json.tenants.length);
  });

  it('returns tenant-media fallback with non-empty totals and headers', async () => {
    const request = new Request('http://localhost/api/admin/tenant-media-usage');
    const response = await tenantMediaUsageGET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-vipo-data-mode')).toBe('fallback');
    expect(json.ok).toBe(true);
    expect(json.fallback).toBe(true);
    expect(json.degraded).toBe(true);
    expect(Array.isArray(json.tenants)).toBe(true);
    expect(json.tenants.length).toBeGreaterThan(0);

    const summedProducts = json.tenants.reduce((sum, tenant) => sum + (tenant.productCount || 0), 0);
    expect(json.totals.productCount).toBe(summedProducts);
  });
});
