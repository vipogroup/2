import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDb = vi.fn();

vi.mock('@/lib/errorTracking/errorLogger', () => ({
  withErrorLogging: (handler) => handler,
}));

vi.mock('@/lib/db', () => ({
  getDb: mockGetDb,
}));

let GET;

beforeAll(async () => {
  ({ GET } = await import('@/app/api/health/route'));
});

beforeEach(() => {
  mockGetDb.mockReset();
});

describe('GET /api/health', () => {
  it('returns lightweight health by default', async () => {
    const response = await GET(new Request('http://localhost/api/health'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.mode).toBe('basic');
    expect(json.checks.mongodb.status).toBe('skipped');
    expect(json.checks.mongodb.message).toContain('skipped');
  });

  it('returns deep health success when Mongo ping succeeds', async () => {
    const commandMock = vi.fn().mockResolvedValue({ ok: 1 });
    mockGetDb.mockResolvedValue({ command: commandMock });

    const response = await GET(new Request('http://localhost/api/health?check=db'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.mode).toBe('deep');
    expect(json.checks.mongodb.status).toBe('connected');
    expect(typeof json.checks.mongodb.latencyMs).toBe('number');
    expect(commandMock).toHaveBeenCalledWith({ ping: 1 });
  });

  it('returns degraded deep health when Mongo is unavailable', async () => {
    mockGetDb.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/health?check=db'));
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.status).toBe('degraded');
    expect(json.mode).toBe('deep');
    expect(json.checks.mongodb.status).toBe('error');
  });
});
