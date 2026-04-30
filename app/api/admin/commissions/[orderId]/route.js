import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

async function PUTHandler(req, { params }) {
  try {
    const user = await requireAuthApi(req);
    if (user.role !== 'admin' && user.role !== 'business_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = params || {};
    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await req.json();
    const { commissionAvailableAt } = body;

    if (!commissionAvailableAt) {
      return NextResponse.json({ error: 'Missing commissionAvailableAt' }, { status: 400 });
    }

    const db = await getDb();
    const ordersCol = db.collection('orders');

    // Multi-Tenant: Verify order belongs to user's tenant
    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    if (!isSuperAdmin(user) && user.tenantId) {
      const orderTenantId = order.tenantId?.toString();
      const userTenantId = user.tenantId?.toString();
      if (orderTenantId && orderTenantId !== userTenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const result = await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          commissionAvailableAt: new Date(commissionAvailableAt),
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Commission release date updated successfully' 
    });

  } catch (e) {
    console.error('Error updating commission date:', e);
    const status = e?.status || 500;
    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Server error' }, 
      { status }
    );
  }
}

export const PUT = withErrorLogging(PUTHandler);
