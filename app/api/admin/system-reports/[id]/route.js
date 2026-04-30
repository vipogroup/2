import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/system-reports/[id]
 * Get a single system report by ID
 */
async function GETHandler(req, { params }) {
  try {
    const { id } = params || {};
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const db = await getDb();
    const reportsCol = db.collection('systemreports');

    const report = await reportsCol.findOne({ _id: new ObjectId(id) });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      report: {
        id: report._id.toString(),
        ...report,
        _id: undefined,
      },
    });

  } catch (err) {
    console.error('SYSTEM_REPORT_GET_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

/**
 * DELETE /api/admin/system-reports/[id]
 * Delete a system report
 */
async function DELETEHandler(req, { params }) {
  try {
    const { id } = params || {};
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const db = await getDb();
    const reportsCol = db.collection('systemreports');

    const result = await reportsCol.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('SYSTEM_REPORT_DELETE_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

/**
 * PATCH /api/admin/system-reports/[id]
 * Update a system report (archive/publish)
 */
async function PATCHHandler(req, { params }) {
  try {
    const { id } = params || {};
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { status, title, summary } = body;

    const db = await getDb();
    const reportsCol = db.collection('systemreports');

    const updates = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (title) updates.title = title;
    if (summary) updates.summary = summary;

    const result = await reportsCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      report: {
        id: result.value._id.toString(),
        ...result.value,
        _id: undefined,
      },
    });

  } catch (err) {
    console.error('SYSTEM_REPORT_PATCH_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const DELETE = withErrorLogging(DELETEHandler);
export const PATCH = withErrorLogging(PATCHHandler);
