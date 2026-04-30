/**
 * Simple in-memory rate limiter for API routes
 *
 * Usage:
 *   import { checkRateLimit } from '@/lib/rateLimit';
 *
 *   export async function POST(req) {
 *     const rateLimitResult = checkRateLimit(req, 'login', { maxRequests: 5, windowMs: 60000 });
 *     if (!rateLimitResult.allowed) {
 *       return NextResponse.json({ error: rateLimitResult.message }, { status: 429 });
 *     }
 *     // ... rest of handler
 *   }
 */

// In-memory store: Map<key, { count: number, resetAt: number }>
const store = new Map();

const automationKey = process.env.AUTOMATION_KEY || 'test-automation-key';

// Allow disabling rate limits for automated tests / internal scripts
const isRateLimitDisabled = () => {
  if (process.env.DISABLE_RATE_LIMIT === 'true') return true;
  return process.env.NODE_ENV === 'test';
};

const hasAutomationBypass = (req) => {
  try {
    if (typeof req?.headers?.get === 'function') {
      const headerValue = req.headers.get('x-automation-key');
      if (headerValue && headerValue === automationKey) return true;
    }
    const rawHeader = req?.headers?.['x-automation-key'] || req?.headers?.['X-AUTOMATION-KEY'];
    if (rawHeader && rawHeader === automationKey) return true;
  } catch {}
  return false;
};

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Get client IP from request
 * @param {Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  // Try various headers used by proxies/load balancers
  const forwarded = req.headers?.get?.('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers?.get?.('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return 'unknown';
}

export function buildRateLimitKey(req, userId) {
  const ip = getClientIp(req);
  return `${userId || 'anonymous'}:${ip}`;
}

/**
 * Check rate limit for a request
 * @param {Request} req - The incoming request
 * @param {string} routeKey - Unique identifier for the route (e.g., 'login', 'register')
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Maximum requests allowed in window (default: 10)
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns {{ allowed: boolean, remaining: number, resetAt: number, message?: string }}
 */
export function checkRateLimit(req, routeKey, options = {}) {
  if (isRateLimitDisabled() || hasAutomationBypass(req)) {
    const windowMs = options.windowMs || 60 * 1000;
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: Date.now() + windowMs,
    };
  }

  const { maxRequests = 10, windowMs = 60 * 1000, identifier } = options;

  cleanup();

  const derivedIdentifier =
    typeof identifier === 'function'
      ? identifier(req)
      : identifier || getClientIp(req);
  const key = `${routeKey}:${derivedIdentifier || 'unknown'}`;
  const now = Date.now();

  let entry = store.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count += 1;

  // Check if over limit
  if (entry.count > maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
      retryAfter: retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Auth endpoints: 5 requests per minute
  auth: (req) => checkRateLimit(req, 'auth', { maxRequests: 5, windowMs: 60 * 1000 }),

  // OTP: 3 requests per 5 minutes
  otp: (req) => checkRateLimit(req, 'otp', { maxRequests: 3, windowMs: 5 * 60 * 1000 }),

  // Registration: 3 requests per 10 minutes
  register: (req) => checkRateLimit(req, 'register', { maxRequests: 3, windowMs: 10 * 60 * 1000 }),

  // Login: 5 requests per 5 minutes
  login: (req) => checkRateLimit(req, 'login', { maxRequests: 10, windowMs: 5 * 60 * 1000 }),

  // Orders GET listings: 60 requests per 5 minutes per identifier (user/IP)
  ordersList: (req, identifier) =>
    checkRateLimit(req, 'orders:list', {
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
      identifier,
    }),

  // Orders creation: 30 requests per 5 minutes per user/IP
  ordersCreate: (req, identifier) =>
    checkRateLimit(req, 'orders:create', {
      maxRequests: 30,
      windowMs: 5 * 60 * 1000,
      identifier,
    }),

  // Withdrawals creation: 5 requests per 10 minutes per user/IP
  withdrawals: (req, identifier) =>
    checkRateLimit(req, 'withdrawals:create', {
      maxRequests: 5,
      windowMs: 10 * 60 * 1000,
      identifier,
    }),

  // Admin APIs: 60 requests per 5 minutes per admin user/IP
  admin: (req, identifier) =>
    checkRateLimit(req, 'admin:api', {
      maxRequests: 60,
      windowMs: 5 * 60 * 1000,
      identifier,
    }),

  // Agent stats lookup: 30 requests per 5 minutes per agent/admin/IP
  agentStats: (req, identifier) =>
    checkRateLimit(req, 'agent:stats', {
      maxRequests: 30,
      windowMs: 5 * 60 * 1000,
      identifier,
    }),

  // PayPlus session creation: 10 requests per 10 minutes per user/IP
  payplusSession: (req, identifier) =>
    checkRateLimit(req, 'payplus:session', {
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
      identifier,
    }),

  // Admin product uploads: 20 uploads per 10 minutes per admin/IP
  adminProductUploads: (req, identifier) =>
    checkRateLimit(req, 'admin:uploads', {
      maxRequests: 20,
      windowMs: 10 * 60 * 1000,
      identifier,
    }),

  adminAlertsCreate: (req, identifier) =>
    checkRateLimit(req, 'admin:alerts:create', {
      maxRequests: 5,
      windowMs: 60 * 1000,
      identifier,
    }),
};
