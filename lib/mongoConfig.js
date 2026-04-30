const MONGO_URI_ENV_KEYS = ['MONGODB_URI', 'MONGODB_URI_SRV', 'MONGODB_URI_FALLBACK'];

function sanitizeEnvValue(rawValue) {
  const original = String(rawValue ?? '');
  let cleaned = original.replace(/\uFEFF/g, '').trim();

  if (cleaned.length >= 2) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    const hasWrappingQuotes = (first === '"' && last === '"') || (first === "'" && last === "'");
    if (hasWrappingQuotes) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  // Handle pasted env values that include literal escape markers or real CR/LF.
  cleaned = cleaned
    .replace(/^(?:\\r\\n|\\n|\\r|[\r\n])+/g, '')
    .replace(/(?:\\r\\n|\\n|\\r|[\r\n])+$/g, '');

  return {
    value: cleaned,
    changed: cleaned !== original,
  };
}

function getSanitizedEnvValue(envKey) {
  const rawValue = process.env[envKey] || '';
  const result = sanitizeEnvValue(rawValue);
  if (result.changed && rawValue) {
    console.warn(`[MONGO] Sanitized ${envKey} (removed wrapping/line-ending artifacts).`);
  }
  return result.value;
}

const dbName = getSanitizedEnvValue('MONGODB_DB');

const uriCandidatesRaw = [];
const seenUris = new Set();

for (const envKey of MONGO_URI_ENV_KEYS) {
  const value = getSanitizedEnvValue(envKey);
  if (!value || seenUris.has(value)) {
    continue;
  }
  seenUris.add(value);
  uriCandidatesRaw.push(value);
}

/**
 * In development, if both localhost and a remote URI (Atlas / SRV) are configured,
 * prefer remote first so /admin/products shows real tenants & products from the cloud DB.
 * Opt out with MONGODB_FORCE_LOCAL=1 when you intentionally use an empty local MongoDB.
 */
function isLocalMongoUri(connectionUri) {
  if (!connectionUri) return false;
  const u = String(connectionUri).toLowerCase();
  if (u.startsWith('mongodb+srv://')) return false;
  return /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(u);
}

function reorderCandidatesForDev(candidates) {
  const forceLocal =
    process.env.MONGODB_FORCE_LOCAL === '1' || process.env.MONGODB_FORCE_LOCAL === 'true';
  if (process.env.NODE_ENV !== 'development' || forceLocal || candidates.length < 2) {
    return candidates;
  }
  const local = [];
  const remote = [];
  for (const c of candidates) {
    if (isLocalMongoUri(c)) local.push(c);
    else remote.push(c);
  }
  if (remote.length > 0 && local.length > 0) {
    console.warn(
      '[MONGO] Development: trying remote URI(s) before localhost so data from Atlas matches production. Set MONGODB_FORCE_LOCAL=1 to prefer local MongoDB.',
    );
    return [...remote, ...local];
  }
  return candidates;
}

const uriCandidates = reorderCandidatesForDev(uriCandidatesRaw);

const uri = uriCandidates[0] || '';

// Only throw during runtime, not during build.
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

if (!isBuildTime) {
  if (!uri) {
    throw new Error('[X] Missing MongoDB URI. Set one of: MONGODB_URI, MONGODB_URI_SRV, MONGODB_URI_FALLBACK');
  }

  if (!dbName) {
    throw new Error('[X] Missing MONGODB_DB environment variable');
  }
}

if (process.env.NODE_ENV === 'development' && uri.startsWith('mongodb://127.0.0.1')) {
  console.warn('[i] Using local MongoDB instance (127.0.0.1). Make sure this is intended.');
}

export const mongoConfig = {
  uri,
  dbName,
  uriCandidates,
};
