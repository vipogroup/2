import crypto from 'crypto';

const REDACTION_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'accesstoken',
  'refreshtoken',
  'password',
  'otp',
  'secret',
  'apikey',
  'api-key',
  'x-api-key',
]);

const MAX_STRING_LENGTH = 2000;
const TTL_DAYS = parseInt(process.env.ERROR_EVENTS_TTL_DAYS || '30', 10);

export function redactSensitive(meta) {
  if (!meta || typeof meta !== 'object') {
    return meta;
  }

  if (Array.isArray(meta)) {
    return meta.map((item) => redactSensitive(item));
  }

  const clone = {};

  Object.entries(meta).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (REDACTION_KEYS.has(lowerKey)) {
      clone[key] = '***REDACTED***';
      return;
    }

    if (value && typeof value === 'object') {
      clone[key] = redactSensitive(value);
      return;
    }

    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      clone[key] = `${value.slice(0, MAX_STRING_LENGTH)}…`;
      return;
    }

    clone[key] = value;
  });

  return clone;
}

function normaliseDynamicTokens(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[0-9a-f]{24}/gi, '[objectid]')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '[uuid]')
    .replace(/\b\d{6,}\b/g, '[number]')
    .replace(/\b\d{4}-\d{2}-\d{2}[ t]\d{2}:\d{2}:\d{2}(?:\.\d+)?z?/gi, '[datetime]');
}

export function buildFingerprint({ type, route, message, stack }) {
  const normalizedRoute = normaliseDynamicTokens(route || '');
  const normalizedMessage = normaliseDynamicTokens((message || '').slice(0, 300));
  let topFrame = '';

  if (stack) {
    const [firstLine, ...rest] = stack.split('\n');
    const candidate = rest.find((line) => line.includes(' at '));
    topFrame = normaliseDynamicTokens((candidate || firstLine || '').trim()).slice(0, 200);
  }

  const base = `${type || 'UNKNOWN'}|${normalizedRoute}|${normalizedMessage}|${topFrame}`;
  return crypto.createHash('sha1').update(base).digest('hex');
}

export async function ensureErrorEventIndexes(db) {
  const collection = db.collection('error_events');

  await Promise.all([
    collection.createIndex({ ts: -1 }),
    collection.createIndex({ fingerprint: 1, ts: -1 }),
    collection.createIndex({ severity: 1, ts: -1 }),
    collection.createIndex({ source: 1, ts: -1 }),
    collection.createIndex({ type: 1, ts: -1 }),
    collection.createIndex({ requestId: 1, ts: -1 }),
    collection.createIndex({ route: 1, status: 1, ts: -1 }),
    collection.createIndex(
      { ts: 1 },
      {
        expireAfterSeconds: Math.max(60 * 60 * 24 * TTL_DAYS, 60 * 60 * 24 * 14),
      },
    ),
  ]);
}

export function baseErrorEvent(event = {}) {
  return {
    ts: event.ts || new Date(),
    severity: event.severity || 'error',
    source: event.source || 'server',
    type: event.type || 'UNHANDLED',
    message: event.message || 'Unknown error',
    stack: event.stack || null,
    route: event.route || null,
    method: event.method || null,
    status: event.status ?? null,
    requestId: event.requestId,
    userId: event.userId ? String(event.userId) : null,
    tenantId: event.tenantId ? String(event.tenantId) : null,
    ip: event.ip || null,
    userAgent: event.userAgent || null,
    fingerprint: event.fingerprint || buildFingerprint(event),
    meta: redactSensitive(event.meta || {}),
    environment: event.environment || process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',
    buildId: event.buildId || process.env.VERCEL_GIT_COMMIT_SHA || null,
    deploymentId: event.deploymentId || process.env.VERCEL_DEPLOYMENT_ID || null,
    firstSeen: event.firstSeen || new Date(),
    lastSeen: event.lastSeen || new Date(),
  };
}

export async function insertErrorEvent(db, event) {
  const doc = baseErrorEvent(event);
  if (!doc.requestId) {
    throw new Error('requestId is required for error event');
  }

  await ensureErrorEventIndexes(db);
  await db.collection('error_events').insertOne(doc);
  return doc;
}

const errorEventUtils = {
  ensureErrorEventIndexes,
  insertErrorEvent,
  baseErrorEvent,
  buildFingerprint,
  redactSensitive,
};

export default errorEventUtils;
