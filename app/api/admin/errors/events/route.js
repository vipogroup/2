import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters } from '@/lib/rateLimit';
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';

const ALLOWED_SEVERITIES = new Set(['info', 'warn', 'error', 'critical']);
const ALLOWED_SOURCES = new Set(['server', 'api', 'db', 'client']);
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseCursor(cursorValue) {
  try {
    const decoded = Buffer.from(cursorValue, 'base64').toString('utf8');
    const [tsMsStr, idStr] = decoded.split('_');
    if (!tsMsStr || !idStr) {
      return null;
    }

    const ts = new Date(Number(tsMsStr));
    if (Number.isNaN(ts.getTime())) {
      return null;
    }

    if (!ObjectId.isValid(idStr)) {
      return null;
    }

    return { ts, id: new ObjectId(idStr) };
  } catch (err) {
    return null;
  }
}

async function GETHandler(request) {
  const admin = await requireAdminApi(request);

  const rateLimit = rateLimiters.admin(request, admin.id);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);

  const includeStack = searchParams.get('includeStack') === '1';

  const limitParam = parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const filter = {};

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if (fromParam || toParam) {
    const tsFilter = {};
    if (fromParam) {
      const fromDate = new Date(fromParam);
      if (!Number.isNaN(fromDate.getTime())) {
        tsFilter.$gte = fromDate;
      } else {
        return NextResponse.json({ error: 'Invalid from parameter' }, { status: 400 });
      }
    }
    if (toParam) {
      const toDate = new Date(toParam);
      if (!Number.isNaN(toDate.getTime())) {
        tsFilter.$lte = toDate;
      } else {
        return NextResponse.json({ error: 'Invalid to parameter' }, { status: 400 });
      }
    }
    if (Object.keys(tsFilter).length > 0) {
      filter.ts = tsFilter;
    }
  }

  const severity = searchParams.get('severity');
  if (severity) {
    if (!ALLOWED_SEVERITIES.has(severity)) {
      return NextResponse.json({ error: 'Invalid severity parameter' }, { status: 400 });
    }
    filter.severity = severity;
  }

  const source = searchParams.get('source');
  if (source) {
    if (!ALLOWED_SOURCES.has(source)) {
      return NextResponse.json({ error: 'Invalid source parameter' }, { status: 400 });
    }
    filter.source = source;
  }

  const fingerprint = searchParams.get('fingerprint');
  if (fingerprint) {
    filter.fingerprint = fingerprint;
  }

  const requestId = searchParams.get('requestId');
  if (requestId) {
    filter.requestId = requestId;
  }

  const query = searchParams.get('q');
  if (query) {
    filter.message = { $regex: escapeRegExp(query), $options: 'i' };
  }

  const cursorParam = searchParams.get('cursor');
  if (cursorParam) {
    const parsedCursor = parseCursor(cursorParam);
    if (!parsedCursor) {
      return NextResponse.json({ error: 'Invalid cursor parameter' }, { status: 400 });
    }
    filter.$or = [
      { ts: { $lt: parsedCursor.ts } },
      { ts: parsedCursor.ts, _id: { $lt: parsedCursor.id } },
    ];
  }

  const db = await getDb();

  const projection = {
    ts: 1,
    severity: 1,
    source: 1,
    type: 1,
    message: 1,
    route: 1,
    method: 1,
    status: 1,
    requestId: 1,
    fingerprint: 1,
    meta: 1,
  };

  if (includeStack) {
    projection.stack = 1;
  }

  const cursor = db
    .collection('error_events')
    .find(filter, { projection })
    .sort({ ts: -1, _id: -1 })
    .limit(limit + 1);

  const docs = await cursor.toArray();

  let nextCursor = null;
  if (docs.length > limit) {
    const last = docs.pop();
    nextCursor = Buffer.from(
      `${new Date(last.ts).getTime()}_${last._id.toString()}`,
      'utf8',
    ).toString('base64');
  }

  const items = docs.map((doc) => {
    const base = {
      ts: doc.ts,
      severity: doc.severity,
      source: doc.source,
      type: doc.type,
      message: doc.message,
      route: doc.route,
      method: doc.method,
      status: doc.status,
      requestId: doc.requestId,
      fingerprint: doc.fingerprint,
      meta: doc.meta || {},
    };

    if (includeStack && doc.stack) {
      base.stack = doc.stack;
    }

    return base;
  });

  return NextResponse.json({
    items,
    nextCursor,
  });
}

export const GET = withErrorLogging(GETHandler, {
  source: 'api',
});
