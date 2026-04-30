import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters } from '@/lib/rateLimit';
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';

const WINDOW_MAP = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

async function GETHandler(request) {
  const admin = await requireAdminApi(request);

  const rateLimit = rateLimiters.admin(request, admin.id);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get('window') || '1h';
  const duration = WINDOW_MAP[windowParam] || WINDOW_MAP['1h'];

  const to = new Date();
  const from = new Date(to.getTime() - duration);

  const db = await getDb();
  const pipeline = [
    {
      $match: {
        ts: {
          $gte: from,
          $lte: to,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalErrors: { $sum: 1 },
        criticalCount: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0],
          },
        },
        errorCount: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'error'] }, 1, 0],
          },
        },
        warnCount: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'warn'] }, 1, 0],
          },
        },
        infoCount: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'info'] }, 1, 0],
          },
        },
        fingerprints: { $addToSet: '$fingerprint' },
        lastErrorAt: { $max: '$ts' },
      },
    },
    {
      $project: {
        _id: 0,
        totalErrors: '$totalErrors',
        criticalCount: '$criticalCount',
        errorCount: '$errorCount',
        warnCount: '$warnCount',
        infoCount: '$infoCount',
        uniqueFingerprints: {
          $size: {
            $ifNull: ['$fingerprints', []],
          },
        },
        lastErrorAt: '$lastErrorAt',
      },
    },
  ];

  const [stats] = await db.collection('error_events').aggregate(pipeline).toArray();

  return NextResponse.json({
    window: WINDOW_MAP[windowParam] ? windowParam : '1h',
    from: from.toISOString(),
    to: to.toISOString(),
    totalErrors: stats?.totalErrors || 0,
    criticalCount: stats?.criticalCount || 0,
    errorCount: stats?.errorCount || 0,
    warnCount: stats?.warnCount || 0,
    infoCount: stats?.infoCount || 0,
    uniqueFingerprints: stats?.uniqueFingerprints || 0,
    lastErrorAt: stats?.lastErrorAt ? new Date(stats.lastErrorAt).toISOString() : null,
  });
}

export const GET = withErrorLogging(GETHandler, {
  source: 'api',
});
