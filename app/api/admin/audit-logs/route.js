import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const { searchParams } = new URL(req.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const category = searchParams.get('category');
    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');

    const db = await getDb();
    const logsCol = db.collection('auditlogs');

    const query = {};
    if (category) query.category = category;
    if (action) query.action = action;
    if (actorId) query.actorId = new ObjectId(actorId);

    const [logs, total] = await Promise.all([
      logsCol.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      logsCol.countDocuments(query),
    ]);

    return NextResponse.json({
      ok: true,
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error('GET_AUDIT_LOGS_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/audit-logs
 * Create an audit log entry
 */
async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { action, category, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const db = await getDb();
    const logsCol = db.collection('auditlogs');

    const logEntry = {
      action,
      category: category || 'general',
      actorId: new ObjectId(admin.id),
      actorName: admin.fullName || admin.email || 'Admin',
      details: details || {},
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      userAgent: req.headers.get('user-agent') || '',
      createdAt: new Date(),
    };

    const result = await logsCol.insertOne(logEntry);

    return NextResponse.json({
      ok: true,
      logId: result.insertedId.toString(),
    });

  } catch (err) {
    console.error('CREATE_AUDIT_LOG_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
