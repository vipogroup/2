import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';

const COLLECTION = 'pushSubscriptions';

async function getCollection() {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.createIndex({ endpoint: 1 }, { unique: true }).catch(() => {});
  await col.createIndex({ userId: 1 }).catch(() => {});
  await col.createIndex({ tags: 1 }).catch(() => {});
  await col.createIndex({ tenantId: 1 }).catch(() => {});
  await col.createIndex({ consentAt: 1 }).catch(() => {});
  return col;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const unique = [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
  return unique.slice(0, 20);
}

export async function upsertPushSubscription({
  endpoint,
  keys,
  userId = null,
  role = null,
  tags = [],
  userAgent = null,
  ip = null,
  consentAt = null,
  consentVersion = null,
  consentMeta = null,
  lastConsentAction = 'accepted',
  revokedAt = null,
  tenantId = null, // Multi-Tenant: Add tenantId support
}) {
  if (!endpoint || !keys) {
    throw new Error('INVALID_SUBSCRIPTION');
  }

  const col = await getCollection();
  const normalizedTags = normalizeTags(tags);

  const userObjectId = userId && ObjectId.isValid(userId) ? new ObjectId(userId) : null;

  const now = new Date();
  
  // Multi-Tenant: Convert tenantId to ObjectId if valid
  const tenantObjectId = tenantId && ObjectId.isValid(tenantId) ? new ObjectId(tenantId) : null;
  
  const setFields = {
    keys,
    userId,
    userObjectId,
    role,
    tags: normalizedTags,
    userAgent,
    ip,
    updatedAt: now,
    tenantId: tenantObjectId, // Multi-Tenant: Store tenantId (explicit to avoid stale tenant)
  };

  if (consentAt) {
    const consentDate = consentAt instanceof Date ? consentAt : new Date(consentAt);
    if (!Number.isNaN(consentDate.getTime())) {
      setFields.consentAt = consentDate;
      setFields.lastConsentAction = lastConsentAction;
      setFields.revokedAt = null;
    }
  }

  if (consentVersion) {
    setFields.consentVersion = String(consentVersion);
  }

  if (consentMeta && typeof consentMeta === 'object') {
    setFields.consentMeta = consentMeta;
  }

  if (revokedAt) {
    const revokedDate = revokedAt instanceof Date ? revokedAt : new Date(revokedAt);
    if (!Number.isNaN(revokedDate.getTime())) {
      setFields.revokedAt = revokedDate;
      setFields.lastConsentAction = 'revoked';
    }
  }

  // Always include lastConsentAction in $set to avoid conflicts
  if (!setFields.lastConsentAction) {
    setFields.lastConsentAction = lastConsentAction;
  }

  const setOnInsert = {
    endpoint,
    createdAt: now,
  };

  if (!setFields.consentAt) {
    setOnInsert.consentAt = now;
  }

  const update = {
    $set: setFields,
    $setOnInsert: setOnInsert,
  };

  await col.updateOne({ endpoint }, update, { upsert: true });
}

export async function removePushSubscription(endpoint) {
  if (!endpoint) return { deletedCount: 0 };
  const col = await getCollection();
  const now = new Date();
  const result = await col.updateOne(
    { endpoint },
    {
      $set: {
        revokedAt: now,
        lastConsentAction: 'revoked',
        updatedAt: now,
      },
    },
  );

  if (result.matchedCount === 0) {
    return { deletedCount: 0 };
  }

  return { deletedCount: result.modifiedCount };
}

export async function findSubscriptionsByUserIds(userIds = []) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const col = await getCollection();

  const ids = userIds.filter(Boolean).map(String);
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

  const query = {
    $and: [
      { $or: [{ userId: { $in: ids } }, { userObjectId: { $in: objectIds } }] },
      { $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] }
    ]
  };

  return col.find(query).toArray();
}

export async function findSubscriptionsByTags(tags = [], tenantId = null) {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  const col = await getCollection();

  const query = {
    tags: { $in: tags },
    $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
  };

  if (tenantId) {
    const tenantObjectId = ObjectId.isValid(tenantId) ? new ObjectId(tenantId) : null;
    if (tenantObjectId) {
      query.tenantId = tenantObjectId;
    }
  }

  return col.find(query).toArray();
}

export async function getAllSubscriptions(includeRevoked = false) {
  const col = await getCollection();
  if (includeRevoked) {
    return col.find({}).toArray();
  }
  // ברירת מחדל: רק subscriptions פעילים
  return col.find({
    $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }]
  }).toArray();
}

export async function findSubscriptionsByRoles(roles = [], tenantId = null) {
  console.log('FIND_SUBS_BY_ROLES: Called with roles:', roles, 'tenantId:', tenantId);
  if (!Array.isArray(roles) || roles.length === 0) return [];
  const normalized = [...new Set(roles.map((role) => String(role).trim().toLowerCase()))]
    .filter((role) => ['customer', 'agent', 'admin', 'business_admin'].includes(role));
  console.log('FIND_SUBS_BY_ROLES: Normalized roles:', normalized);
  if (!normalized.length) return [];

  const col = await getCollection();
  const query = {
    role: { $in: normalized },
    $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
  };
  
  // Multi-Tenant: Filter by tenantId if provided
  if (tenantId) {
    const tenantObjectId = ObjectId.isValid(tenantId) ? new ObjectId(tenantId) : null;
    if (tenantObjectId) {
      query.tenantId = tenantObjectId;
    }
  }
  
  console.log('FIND_SUBS_BY_ROLES: Query:', JSON.stringify(query));

  const results = await col.find(query).toArray();
  console.log('FIND_SUBS_BY_ROLES: Found', results.length, 'subscriptions');
  if (results.length > 0) {
    console.log('FIND_SUBS_BY_ROLES: First result role:', results[0].role, 'userId:', results[0].userId);
  }
  return results;
}

// מחיקה מוחלטת של כל ה-subscriptions של משתמש
export async function deleteAllUserSubscriptions(userId) {
  if (!userId) return { deletedCount: 0 };
  const col = await getCollection();
  
  const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  
  const query = {
    $or: [
      { userId: String(userId) },
      ...(userObjectId ? [{ userObjectId }] : [])
    ]
  };
  
  console.log('DELETE_ALL_SUBS: Deleting subscriptions for user:', userId);
  const result = await col.deleteMany(query);
  console.log('DELETE_ALL_SUBS: Deleted count:', result.deletedCount);
  
  return { deletedCount: result.deletedCount };
}
