/**
 * Admin API - Priority Customers
 * GET /api/admin/priority/customers - רשימת לקוחות מסונכרנים
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { escapeRegex } from '@/lib/utils/sanitize';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import IntegrationSyncMap from '@/models/IntegrationSyncMap';

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const syncStatus = searchParams.get('syncStatus');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build query
    const query = { priorityCustomerId: { $exists: true, $ne: null } };
    
    if (syncStatus) {
      query.prioritySyncStatus = syncStatus;
    }
    
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { fullName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
        { priorityCustomerId: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [customers, total, syncStats] = await Promise.all([
      User.find(query)
        .select('fullName email phone priorityCustomerId prioritySyncStatus lastPrioritySyncAt vatId companyName')
        .sort({ lastPrioritySyncAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      User.aggregate([
        { $match: { priorityCustomerId: { $exists: true, $ne: null } } },
        { $group: { _id: '$prioritySyncStatus', count: { $sum: 1 } } },
      ]),
    ]);

    // Get not synced count
    const notSyncedCount = await User.countDocuments({
      $or: [
        { priorityCustomerId: { $exists: false } },
        { priorityCustomerId: null },
      ],
      role: { $in: ['customer', 'agent'] },
    });

    return NextResponse.json({
      ok: true,
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        synced: syncStats.find(s => s._id === 'synced')?.count || 0,
        pending: syncStats.find(s => s._id === 'pending')?.count || 0,
        failed: syncStats.find(s => s._id === 'failed')?.count || 0,
        notSynced: notSyncedCount,
      },
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_CUSTOMERS]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
