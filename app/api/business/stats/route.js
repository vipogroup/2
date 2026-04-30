import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';

async function GETHandler(req) {
  try {
    const user = await requireAuthApi(req);

    const allowedRoles = new Set(['business_admin', 'admin', 'super_admin']);
    if (!allowedRoles.has(user.role)) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const { ObjectId } = await import('mongodb');
    let tenantId = null;

    if (user.role === 'business_admin') {
      if (!user.tenantId || !ObjectId.isValid(user.tenantId)) {
        return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
      }
      tenantId = new ObjectId(user.tenantId);
    } else if (user.tenantId && ObjectId.isValid(user.tenantId)) {
      tenantId = new ObjectId(user.tenantId);
    } else {
      const { searchParams } = new URL(req.url);
      const tenantIdParam = searchParams.get('tenantId');
      if (!tenantIdParam || !ObjectId.isValid(tenantIdParam)) {
        return NextResponse.json({ error: 'tenant_id_required' }, { status: 400 });
      }
      tenantId = new ObjectId(tenantIdParam);
    }

    const db = await getDb();

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get monthly sales
    const monthlyOrdersAgg = await db.collection('orders').aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: monthStart },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
    ]).toArray();
    
    const monthlySales = monthlyOrdersAgg[0]?.totalSales || 0;
    const monthlyOrders = monthlyOrdersAgg[0]?.orderCount || 0;
    
    // Get total products count
    const totalProducts = await db.collection('products').countDocuments({
      tenantId,
      status: 'published',
    });
    
    // Get total customers (unique customers from orders)
    const customersAgg = await db.collection('orders').aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$customer.email' } },
      { $count: 'total' },
    ]).toArray();
    const totalCustomers = customersAgg[0]?.total || 0;
    
    // Get all-time stats
    const allTimeAgg = await db.collection('orders').aggregate([
      {
        $match: {
          tenantId,
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
    ]).toArray();
    
    return NextResponse.json({
      monthlySales,
      monthlyOrders,
      totalProducts,
      totalCustomers,
      allTimeSales: allTimeAgg[0]?.totalSales || 0,
      allTimeOrders: allTimeAgg[0]?.orderCount || 0,
    });
    
  } catch (err) {
    console.error('GET /api/business/stats error:', err);
    return NextResponse.json({ error: 'שגיאה בטעינת הנתונים' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
