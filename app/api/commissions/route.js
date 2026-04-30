import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

/**
 * GET /api/commissions
 * Admin endpoint to query commissions from orders
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const orders = db.collection('orders');

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const query = {
      commissionAmount: { $gt: 0 },
    };

    // Tenant filter for non-super-admin
    if (!isSuperAdmin(admin) && admin.tenantId) {
      query.tenantId = new ObjectId(admin.tenantId);
    } else if (tenantId && ObjectId.isValid(tenantId)) {
      query.tenantId = new ObjectId(tenantId);
    }

    if (agentId && ObjectId.isValid(agentId)) {
      query.$or = [
        { agentId: new ObjectId(agentId) },
        { refAgentId: new ObjectId(agentId) },
      ];
    }

    if (status) {
      query.commissionStatus = status;
    }

    const items = await orders
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const commissions = items.map((o) => ({
      _id: String(o._id),
      orderId: String(o._id),
      agentId: o.agentId ? String(o.agentId) : o.refAgentId ? String(o.refAgentId) : null,
      tenantId: o.tenantId ? String(o.tenantId) : null,
      amount: o.commissionAmount || 0,
      orderTotal: o.totalAmount || 0,
      status: o.commissionStatus || 'pending',
      customerName: o.customer?.fullName || o.customerName || 'לא ידוע',
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      ok: true,
      commissions,
      items: commissions,
      total: commissions.length,
    });
  } catch (error) {
    console.error('COMMISSIONS_GET_ERROR:', error);
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
