import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/system-reports
 * Get all system reports with pagination and filters
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'published';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const db = await getDb();
    const reportsCol = db.collection('systemreports');

    // Build query
    const query = {};
    if (type) query.type = type;
    if (status !== 'all') query.status = status;

    // Get total count
    const total = await reportsCol.countDocuments(query);

    // Get reports
    const reports = await reportsCol
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .project({
        title: 1,
        type: 1,
        category: 1,
        summary: 1,
        tags: 1,
        status: 1,
        stats: 1,
        createdByName: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .toArray();

    return NextResponse.json({
      ok: true,
      reports: reports.map(r => ({
        id: r._id.toString(),
        ...r,
        _id: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    console.error('SYSTEM_REPORTS_GET_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

/**
 * POST /api/admin/system-reports
 * Create a new system report
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
    const { title, type, category, summary, content, tags, stats } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const db = await getDb();
    const reportsCol = db.collection('systemreports');

    const now = new Date();
    const report = {
      title,
      type: type || 'custom',
      category: category || 'general',
      summary: summary || '',
      content,
      contentHtml: '',
      tags: tags || [],
      version: '1.0',
      status: 'published',
      stats: stats || {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        score: 0,
      },
      createdBy: new ObjectId(admin.id),
      createdByName: admin.fullName || admin.email || 'Admin',
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await reportsCol.insertOne(report);

    return NextResponse.json({
      ok: true,
      report: {
        id: result.insertedId.toString(),
        ...report,
      },
    });

  } catch (err) {
    console.error('SYSTEM_REPORTS_POST_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
