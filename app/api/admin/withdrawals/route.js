import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'completed'];

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

async function GETHandler(req) {
  try {
    const db = await getDb();
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const withdrawals = db.collection('withdrawalRequests');
    const users = db.collection('users');
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 20), 100);
    const skip = (page - 1) * limit;

    // Multi-Tenant: Build tenant filter
    const tenantFilter = {};
    if (!isSuperAdmin(admin) && admin.tenantId) {
      tenantFilter.tenantId = new ObjectId(admin.tenantId);
    }

    const query = { ...tenantFilter };
    if (status && ALLOWED_STATUSES.includes(status)) {
      query.status = status;
    }

    // Fetch paginated withdrawals with user details
    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const items = await withdrawals.aggregate(pipeline).toArray();
    const total = await withdrawals.countDocuments(query);

    // Stats: pending count/amount, completed this month (filtered by tenant)
    const grouped = await withdrawals
      .aggregate([
        { $match: tenantFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ])
      .toArray();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedAgg = await withdrawals
      .aggregate([
        {
          $match: {
            ...tenantFilter,
            status: 'completed',
            processedAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ])
      .toArray();

    const pendingStats = grouped.find((g) => g._id === 'pending') || { count: 0, amount: 0 };
    const completedStats = completedAgg[0] || { amount: 0, count: 0 };

    const userMap = new Map();
    if (items.length > 0) {
      const userIds = items
        .map((item) => item.user?._id)
        .filter(Boolean)
        .map((id) => id);

      if (userIds.length > 0) {
        const uniqueUserIds = [...new Set(userIds)];
        const usersDocs = await users
          .find({ _id: { $in: uniqueUserIds } })
          .project({ fullName: 1, email: 1, phone: 1, role: 1 })
          .toArray();
        usersDocs.forEach((doc) => {
          userMap.set(String(doc._id), {
            id: String(doc._id),
            fullName: doc.fullName || '',
            email: doc.email || '',
            phone: doc.phone || '',
            role: doc.role || 'agent',
          });
        });
      }
    }

    const withdrawalsData = items.map((item) => ({
      id: String(item._id),
      userId: String(item.userId),
      amount: item.amount,
      status: item.status,
      notes: item.notes ?? '',
      adminNotes: item.adminNotes ?? '',
      snapshotBalance: item.snapshotBalance ?? 0,
      snapshotOnHold: item.snapshotOnHold ?? 0,
      processedBy: item.processedBy ? String(item.processedBy) : null,
      processedAt: item.processedAt || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      user: userMap.get(String(item.userId)) || null,
    }));

    return NextResponse.json({
      ok: true,
      withdrawals: withdrawalsData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      stats: {
        pendingCount: pendingStats.count,
        pendingAmount: pendingStats.amount,
        completedThisMonth: completedStats.amount,
        completedCountThisMonth: completedStats.count,
      },
    });
  } catch (err) {
    console.error('ADMIN_WITHDRAWALS_LIST_ERROR:', err);
    const status = err?.status || 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
