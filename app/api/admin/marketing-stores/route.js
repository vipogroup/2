import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';
import { escapeRegex } from '@/lib/utils/sanitize';

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;
    const search = (searchParams.get('q') || '').trim();

    const db = await getDb();
    const usersCol = db.collection('users');
    const ordersCol = db.collection('orders');

    const tenantFilter = {};
    if (!isSuperAdmin(admin) && admin.tenantId) {
      tenantFilter.tenantId = new ObjectId(admin.tenantId);
    }

    const filter = {
      ...tenantFilter,
      role: 'agent',
      agentKind: 'marketing_store',
    };

    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
        { companyName: { $regex: safeSearch, $options: 'i' } },
        { couponCode: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const projection = { passwordHash: 0, password: 0 };

    const [total, stores] = await Promise.all([
      usersCol.countDocuments(filter),
      usersCol
        .find(filter, { projection })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const storeIds = stores.map((s) => s._id);
    const statsById = new Map();

    if (storeIds.length > 0) {
      const now = new Date();

      const pipeline = [
        ...(Object.keys(tenantFilter).length > 0 ? [{ $match: tenantFilter }] : []),
        {
          $addFields: {
            effectiveAgentId: { $ifNull: ['$refAgentId', '$agentId'] },
          },
        },
        {
          $match: {
            effectiveAgentId: { $in: storeIds },
            commissionAmount: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: '$effectiveAgentId',
            ordersCount: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalCommission: { $sum: { $ifNull: ['$commissionAmount', 0] } },
            pendingCommission: {
              $sum: {
                $cond: [
                  { $eq: ['$commissionStatus', 'pending'] },
                  { $ifNull: ['$commissionAmount', 0] },
                  0,
                ],
              },
            },
            availableCommission: {
              $sum: {
                $cond: [
                  { $eq: ['$commissionStatus', 'available'] },
                  { $ifNull: ['$commissionAmount', 0] },
                  0,
                ],
              },
            },
            claimedCommission: {
              $sum: {
                $cond: [
                  { $eq: ['$commissionStatus', 'claimed'] },
                  { $ifNull: ['$commissionAmount', 0] },
                  0,
                ],
              },
            },
            readyToReleaseCommission: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$commissionStatus', 'pending'] },
                      { $eq: ['$commissionSettled', true] },
                      { $ne: ['$commissionAvailableAt', null] },
                      { $lte: ['$commissionAvailableAt', now] },
                      { $eq: ['$status', 'completed'] },
                    ],
                  },
                  { $ifNull: ['$commissionAmount', 0] },
                  0,
                ],
              },
            },
            lastOrderAt: { $max: '$createdAt' },
          },
        },
      ];

      const rows = await ordersCol.aggregate(pipeline).toArray();
      for (const row of rows) {
        statsById.set(String(row._id), row);
      }
    }

    const items = stores.map((store) => {
      const stats = statsById.get(String(store._id)) || {};
      return {
        ...store,
        _id: String(store._id),
        tenantId: store.tenantId ? String(store.tenantId) : null,
        stats: {
          ordersCount: stats.ordersCount || 0,
          totalRevenue: stats.totalRevenue || 0,
          totalCommission: stats.totalCommission || 0,
          pendingCommission: stats.pendingCommission || 0,
          availableCommission: stats.availableCommission || 0,
          claimedCommission: stats.claimedCommission || 0,
          readyToReleaseCommission: stats.readyToReleaseCommission || 0,
          lastOrderAt: stats.lastOrderAt || null,
        },
      };
    });

    return NextResponse.json({ ok: true, items, total, page, limit });
  } catch (err) {
    console.error('ADMIN_MARKETING_STORES_GET_ERROR', err);
    const status = err?.status || 500;
    return NextResponse.json(
      { ok: false, error: err?.message || 'Server error' },
      { status },
    );
  }
}

export const GET = withErrorLogging(GETHandler);
