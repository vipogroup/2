import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { getNotificationTemplate } from '@/lib/notifications/templates';

const COLLECTION = 'scheduledNotifications';

async function getCollection() {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.createIndex({ status: 1, scheduleAt: 1 }).catch(() => {});
  await col.createIndex({ templateType: 1 }).catch(() => {});
  return col;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sanitizeAudience(input) {
  if (!Array.isArray(input)) return [];
  const allowed = ['customer', 'agent', 'admin', 'all'];
  const unique = [...new Set(input.map((item) => String(item).toLowerCase().trim()))];
  return unique.filter((item) => allowed.includes(item));
}

function sanitizeRecurrence(input) {
  if (!input || typeof input !== 'object') return null;
  const type = String(input.type || '').toLowerCase();
  if (type === 'interval') {
    const every = Number.parseInt(input.every, 10);
    const unit = String(input.unit || '').toLowerCase();
    if (!Number.isFinite(every) || every <= 0) return null;
    if (!['day', 'week'].includes(unit)) return null;
    return { type: 'interval', every, unit };
  }
  if (type === 'weekly') {
    return { type: 'interval', every: 1, unit: 'week' };
  }
  if (type === 'daily') {
    return { type: 'interval', every: 1, unit: 'day' };
  }
  return null;
}

function computeNextRun(scheduleAt, recurrence) {
  if (!recurrence) return null;
  if (!scheduleAt) return null;
  const base = scheduleAt instanceof Date ? scheduleAt : new Date(scheduleAt);
  if (Number.isNaN(base.getTime())) return null;

  if (recurrence.type === 'interval') {
    const next = new Date(base);
    const { every, unit } = recurrence;
    if (unit === 'day') {
      next.setDate(next.getDate() + every);
    } else if (unit === 'week') {
      next.setDate(next.getDate() + every * 7);
    } else {
      return null;
    }
    return next;
  }

  return null;
}

export async function listScheduledNotifications(filter = {}) {
  const col = await getCollection();
  const query = {};
  if (filter.status) {
    query.status = { $in: Array.isArray(filter.status) ? filter.status : [filter.status] };
  }
  if (filter.templateType) {
    query.templateType = filter.templateType;
  }

  return col
    .find(query)
    .sort({ scheduleAt: 1 })
    .toArray();
}

export async function getScheduledNotification(id) {
  if (!id) return null;
  const col = await getCollection();
  const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!objectId) return null;
  return col.findOne({ _id: objectId });
}

export async function scheduleNotification({
  templateType,
  scheduleAt,
  audience = [],
  payloadOverrides = {},
  recurrence = null,
  timezone = 'UTC',
  metadata = {},
  createdBy = null,
}) {
  if (!templateType) {
    throw new Error('template_type_required');
  }

  const template = await getNotificationTemplate(templateType);
  if (!template) {
    const err = new Error('template_not_found');
    err.status = 400;
    throw err;
  }
  if (template.enabled === false) {
    const err = new Error('template_disabled');
    err.status = 400;
    throw err;
  }

  const scheduleDate = toDate(scheduleAt);
  if (!scheduleDate) {
    const err = new Error('invalid_schedule_time');
    err.status = 400;
    throw err;
  }

  const sanitizedAudience = sanitizeAudience(audience);
  if (!sanitizedAudience.length) {
    sanitizedAudience.push(...template.audience);
  }
  const sanitizedRecurrence = sanitizeRecurrence(recurrence);

  const now = new Date();
  const doc = {
    templateType,
    scheduleAt: scheduleDate,
    originalScheduleAt: scheduleDate,
    timezone: timezone || 'UTC',
    audience: sanitizedAudience,
    payloadOverrides: typeof payloadOverrides === 'object' && payloadOverrides ? payloadOverrides : {},
    recurrence: sanitizedRecurrence,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    nextRunAt: scheduleDate,
    metadata: typeof metadata === 'object' && metadata ? metadata : {},
    createdBy,
  };

  const col = await getCollection();
  const result = await col.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function cancelScheduledNotification(id) {
  const col = await getCollection();
  const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!objectId) return { ok: false, error: 'invalid_id' };

  const res = await col.findOneAndUpdate(
    { _id: objectId },
    { $set: { status: 'cancelled', updatedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (!res.value) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true, item: res.value };
}

export async function updateScheduledNotification(id, updates = {}) {
  const col = await getCollection();
  const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!objectId) return { ok: false, error: 'invalid_id' };

  const allowedStatus = ['pending', 'paused'];
  const set = { updatedAt: new Date() };

  if (updates.status && allowedStatus.includes(updates.status)) {
    set.status = updates.status;
  }

  if (updates.nextRunAt) {
    const next = toDate(updates.nextRunAt);
    if (next) {
      set.nextRunAt = next;
    }
  }

  if (updates.scheduleAt) {
    const scheduleDate = toDate(updates.scheduleAt);
    if (scheduleDate) {
      set.scheduleAt = scheduleDate;
      if (!set.nextRunAt) {
        set.nextRunAt = scheduleDate;
      }
    }
  }

  if (updates.payloadOverrides && typeof updates.payloadOverrides === 'object') {
    set.payloadOverrides = updates.payloadOverrides;
  }

  if (updates.metadata && typeof updates.metadata === 'object') {
    set.metadata = updates.metadata;
  }

  const res = await col.findOneAndUpdate(
    { _id: objectId },
    { $set: set },
    { returnDocument: 'after' },
  );

  if (!res.value) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true, item: res.value };
}

export async function markScheduledNotificationSent(id) {
  const col = await getCollection();
  const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!objectId) return { ok: false, error: 'invalid_id' };

  const doc = await col.findOne({ _id: objectId });
  if (!doc) return { ok: false, error: 'not_found' };

  const now = new Date();
  const next = computeNextRun(now, doc.recurrence);
  const update = {
    lastRunAt: now,
    updatedAt: now,
  };

  if (next) {
    update.nextRunAt = next;
    update.status = 'pending';
  } else {
    update.nextRunAt = null;
    update.status = 'completed';
  }

  await col.updateOne({ _id: objectId }, { $set: update });
  return { ok: true, nextRunAt: next || null };
}

export async function fetchDueScheduledNotifications(referenceDate = new Date()) {
  const col = await getCollection();
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  return col
    .find({
      status: 'pending',
      nextRunAt: { $lte: now },
    })
    .sort({ nextRunAt: 1 })
    .toArray();
}

export async function recordScheduledNotificationFailure(id, error) {
  const col = await getCollection();
  const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!objectId) return { ok: false, error: 'invalid_id' };

  const now = new Date();
  const set = {
    status: 'paused',
    updatedAt: now,
    lastErrorAt: now,
  };

  if (error) {
    const message = typeof error === 'string' ? error : error?.message;
    if (message) set.lastError = message;
    if (error?.stack) set.lastErrorStack = error.stack;
  }

  const update = {
    $set: set,
    $inc: { failureCount: 1 },
  };

  await col.updateOne({ _id: objectId }, update);
  return { ok: true };
}
