import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/errorTracking/errorLogger', () => ({
  withErrorLogging: (handler) => handler,
}));

vi.mock('@/lib/mongoose', () => ({
  connectMongo: vi.fn().mockResolvedValue({ readyState: 1 }),
}));

vi.mock('@/lib/auth/server', () => ({
  requireAdminApi: vi.fn().mockResolvedValue({
    id: 'admin-test',
    role: 'admin',
    tenantId: '507f1f77bcf86cd799439011',
  }),
}));

vi.mock('@/lib/pushSender', () => ({
  pushToTags: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/priority/productSyncService', () => ({
  syncProductToPriority: vi.fn().mockResolvedValue({ synced: false }),
}));

vi.mock('@/lib/tenant', () => ({
  getCurrentTenant: vi.fn().mockResolvedValue(null),
  isSuperAdmin: vi.fn().mockReturnValue(false),
}));

vi.mock('@/models/Product', () => ({
  default: {
    create: vi.fn().mockResolvedValue({ _id: 'prod-test', name: 'Test product' }),
  },
}));

vi.mock('@/models/Message', () => ({
  default: {
    create: vi.fn().mockResolvedValue({ _id: 'msg-test' }),
  },
}));

vi.mock('@/models/Catalog', () => ({
  default: {
    findById: vi.fn().mockResolvedValue(null),
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

let POST;

beforeAll(async () => {
  ({ POST } = await import('@/app/api/products/route'));
});

describe('POST /api/products', () => {
  it('returns 400 when media.images is missing', async () => {
    const payload = {
      name: 'Test product',
      description: 'Test description',
      category: 'קטגוריה',
      subCategory: 'תת קטגוריה',
      price: 100,
      media: { images: [] },
    };

    const request = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe('חובה להוסיף לפחות תמונה אחת');
  });
});
