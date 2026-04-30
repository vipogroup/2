import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';
import { requireAuthApi } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * POST /api/referral/log
 * Log a referral click/view/action
 * Body: { agentId, productId (optional), action, url }
 */
async function POSTHandler(req) {
  try {
    // Rate limiting: 30 per minute (public endpoint for tracking)
    const rateLimit = checkRateLimit(req, 'referral-log', { maxRequests: 30, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: rateLimit.message }, { status: 429 });
    }

    const body = await req.json();
    const { agentId, productId, action = 'click', url } = body;

    if (!agentId || !url) {
      return NextResponse.json({ ok: false, error: 'agentId and url required' }, { status: 400 });
    }

    const db = await getDb();
    const referralLogs = db.collection('referral_logs');

    // Get request headers for tracking
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    const referer = headersList.get('referer') || null;

    // Create log document
    const logDoc = {
      agentId: new ObjectId(agentId),
      productId: productId ? new ObjectId(productId) : null,
      ip: ip.split(',')[0].trim(), // Get first IP if multiple
      userAgent,
      referer,
      url,
      action,
      createdAt: new Date(),
    };

    const result = await referralLogs.insertOne(logDoc);

    return NextResponse.json({
      ok: true,
      logId: String(result.insertedId),
    });
  } catch (error) {
    console.error('REFERRAL_LOG_ERROR:', error);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}

/**
 * GET /api/referral/log?agentId=xxx&productId=xxx&action=xxx
 * Get referral logs with filters (requires auth)
 */
async function GETHandler(req) {
  try {
    // Require authentication to view logs
    await requireAuthApi(req);

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const productId = searchParams.get('productId');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');

    const db = await getDb();
    const referralLogs = db.collection('referral_logs');

    // Build query
    const query = {};
    if (agentId) query.agentId = new ObjectId(agentId);
    if (productId) query.productId = new ObjectId(productId);
    if (action) query.action = action;

    // Get logs
    const logs = await referralLogs.find(query).sort({ createdAt: -1 }).limit(limit).toArray();

    // Get stats
    const stats = await referralLogs
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      ok: true,
      logs: logs.map((log) => ({
        ...log,
        _id: String(log._id),
        agentId: String(log.agentId),
        productId: log.productId ? String(log.productId) : null,
      })),
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      total: logs.length,
    });
  } catch (error) {
    console.error('REFERRAL_LOG_GET_ERROR:', error);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
