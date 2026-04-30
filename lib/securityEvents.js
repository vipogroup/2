import { getDb } from '@/lib/db';

function getClientIp(req) {
  const forwarded = req?.headers?.get?.('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req?.headers?.get?.('x-real-ip') || 'unknown';
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const [local, domain] = email.split('@');
  if (!domain) return `${email.slice(0, 2)}***`;
  const localSafe = local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}***`;
  return `${localSafe}@${domain}`;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return `***${digits}`;
  return `***${digits.slice(-4)}`;
}

export async function logSecurityEvent(options = {}) {
  const {
    action,
    message,
    severity = 'medium',
    req,
    user,
    identifier,
    details = {},
  } = options;

  if (!action) return false;

  const ip = getClientIp(req);

  const tenantId = user?.tenantId ? String(user.tenantId) : null;
  const userId = user?._id || user?.id ? String(user._id || user.id) : null;
  const userEmail = user?.email ? String(user.email) : null;
  const actorName = user?.fullName || user?.name || userEmail || null;

  const identifierString = identifier ? String(identifier).trim().toLowerCase() : null;
  const maskedIdentifier = identifierString?.includes('@')
    ? maskEmail(identifierString)
    : maskPhone(identifierString);

  const entry = {
    action,
    category: 'security',
    entity: 'security',
    entityId: null,
    userId,
    userEmail,
    description: message || action,
    actorName,
    tenantId,
    ip,
    details: {
      message: message || action,
      severity,
      identifier: maskedIdentifier,
      ...details,
    },
    metadata: {
      severity,
      ip,
      method: req?.method || null,
      url: req?.url || null,
      userAgent: req?.headers?.get?.('user-agent') || null,
    },
    createdAt: new Date(),
  };

  try {
    const db = await getDb();
    await db.collection('activity_logs').insertOne(entry);
    return true;
  } catch (error) {
    console.error('[SecurityEvents] Failed to log security event:', error?.message || error);
    return false;
  }
}
