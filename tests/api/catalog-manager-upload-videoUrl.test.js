import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/errorTracking/errorLogger', () => ({
  withErrorLogging: (handler) => handler,
}));

vi.mock('@/lib/mongoose', () => ({
  connectMongo: vi.fn().mockResolvedValue({ readyState: 1 }),
}));

vi.mock('@/lib/catalogTemplates', () => ({
  resolveCatalogTemplate: vi.fn().mockResolvedValue({
    key: 'tpl-test',
    titlePrefix: 'תבנית בדיקה',
    category: 'קטגוריה',
    subCategory: 'תת קטגוריה',
    seo: {},
    tags: [],
    faq: '',
    structuredData: '',
    description: '',
    shortDescription: '',
  }),
}));

vi.mock('@/lib/auth/server', () => ({
  requireAdminApi: vi.fn().mockResolvedValue({
    id: 'admin-test',
    role: 'super_admin',
    email: 'm0587009938@gmail.com',
    tenantId: null,
  }),
}));

vi.mock('@/lib/superAdmins', () => ({
  isSuperAdminUser: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/productSync', () => ({
  syncProductUpsert: vi.fn().mockResolvedValue({ ok: false, skipped: true }),
}));

vi.mock('@/models/Tenant', () => ({
  default: {
    findById: vi.fn().mockResolvedValue({
      _id: 'tenant-test',
      name: 'Tenant Test',
      status: 'active',
      save: vi.fn().mockResolvedValue(true),
    }),
  },
}));

let capturedProductPayload = null;

vi.mock('@/models/Product', () => {
  class Product {
    constructor(payload) {
      capturedProductPayload = payload;
      this.payload = payload;
    }

    async save() {
      return { _id: 'product-test', ...this.payload };
    }

    static async findById() {
      return { _id: 'product-test' };
    }
  }

  return { default: Product };
});

let POST;

beforeAll(async () => {
  ({ POST } = await import('@/app/api/catalog-manager/upload/route'));
});

beforeEach(() => {
  capturedProductPayload = null;
});

describe('POST /api/catalog-manager/upload', () => {
  it('persists media.videoUrl when provided', async () => {
    const videoUrl = ' https://res.cloudinary.com/demo/video/upload/v1/sample.mp4 ';
    const request = new Request('http://localhost/api/catalog-manager/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'tenant-test',
        templateKey: 'tpl-test',
        products: [
          {
            title: 'Test Product',
            name: 'Test Product',
            sku: 'SKU-TEST-1',
            category: 'קטגוריה',
            subCategory: 'תת קטגוריה',
            price: 100,
            images: [
              'https://example.com/image-1.jpg',
              'https://example.com/image-2.jpg',
              'https://example.com/image-3.jpg',
              'https://example.com/image-4.jpg',
              'https://example.com/image-5.jpg',
            ],
            videoUrl,
            purchaseType: 'regular',
            stainless: { length: 100, width: 60, height: 90 },
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(capturedProductPayload).toBeTruthy();
    expect(capturedProductPayload.media.videoUrl).toBe(videoUrl.trim());
  });
});
