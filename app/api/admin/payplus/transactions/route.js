/**
 * Admin API - PayPlus Transactions
 * GET /api/admin/payplus/transactions - רשימת עסקאות
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';
import dbConnect from '@/lib/dbConnect';
import PaymentEvent from '@/models/PaymentEvent';

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const orderId = searchParams.get('orderId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const inDeadLetter = searchParams.get('inDeadLetter');

    // Build query
    const query = {};

    // Multi-Tenant: restrict business admins to their tenant
    if (!isSuperAdmin(admin) && admin?.tenantId) {
      query.tenantId = admin.tenantId;
    }
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (orderId) query.orderId = orderId;
    if (inDeadLetter === 'true') query.inDeadLetter = true;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      PaymentEvent.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'status totalAmount customerName')
        .lean(),
      PaymentEvent.countDocuments(query),
    ]);

    // Stats
    const stats = await PaymentEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return NextResponse.json({
      ok: true,
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, totalAmount: s.totalAmount };
        return acc;
      }, {}),
    });

  } catch (err) {
    console.error('[ADMIN_PAYPLUS_TRANSACTIONS]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
