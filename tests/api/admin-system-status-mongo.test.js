import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDb = vi.fn();
const mockJwtVerify = vi.fn();
const mockAdminRateLimiter = vi.fn();

vi.mock('@/lib/errorTracking/errorLogger', () => ({
  withErrorLogging: (handler) => handler,
}));

vi.mock('@/lib/db', () => ({
  getDb: mockGetDb,
}));

vi.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimiters: {
    admin: mockAdminRateLimiter,
  },
}));

let GET;

function makeAuthorizedRequest() {
  return new Request('http://localhost/api/admin/system-status', {
    headers: {
      cookie: 'auth_token=test-token',
    },
  });
}

beforeAll(async () => {
  ({ GET } = await import('@/app/api/admin/system-status/route'));
});

beforeEach(() => {
  mockGetDb.mockReset();
  mockJwtVerify.mockReset();
  mockAdminRateLimiter.mockReset();

  process.env.JWT_SECRET = 'test-secret';

  mockJwtVerify.mockResolvedValue({
    payload: {
      id: 'admin-1',
      role: 'admin',
    },
  });

  mockAdminRateLimiter.mockReturnValue({ allowed: true });
});

describe('GET /api/admin/system-status Mongo mapping', () => {
  it('maps mongo circuit-open errors to warning status', async () => {
    const err = new Error('mongo_circuit_open');
    err.code = 'MONGO_CIRCUIT_OPEN';
    mockGetDb.mockRejectedValue(err);

    const response = await GET(makeAuthorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.results.mongodb.status).toBe('warning');
    expect(json.results.mongodb.code).toBe('MONGO_CIRCUIT_OPEN');
  });

  it('maps auth failures to MONGO_AUTH_FAILED', async () => {
    const err = new Error('authentication failed');
    err.code = 18;
    mockGetDb.mockRejectedValue(err);

    const response = await GET(makeAuthorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.results.mongodb.status).toBe('error');
    expect(json.results.mongodb.code).toBe('MONGO_AUTH_FAILED');
  });

  it('maps connectivity failures to MONGO_CONNECTIVITY_FAILED', async () => {
    const err = new Error('ReplicaSetNoPrimary: server selection timed out');
    mockGetDb.mockRejectedValue(err);

    const response = await GET(makeAuthorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.results.mongodb.status).toBe('error');
    expect(json.results.mongodb.code).toBe('MONGO_CONNECTIVITY_FAILED');
  });

  it('returns connected when db ping succeeds', async () => {
    const commandMock = vi.fn().mockResolvedValue({ ok: 1 });
    mockGetDb.mockResolvedValue({ command: commandMock });

    const response = await GET(makeAuthorizedRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.results.mongodb.status).toBe('connected');
    expect(commandMock).toHaveBeenCalledWith({ ping: 1 });
  });
});
