/**
 * API Route: /api/admin/tenant-payments
 * ניהול תשלומים לעסקים - Super Admin בלבד
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminGuard } from '@/lib/auth/requireAuth';
import { isSuperAdmin } from '@/lib/tenant';
import { ObjectId } from 'mongodb';

/**
 * GET - קבלת רשימת תשלומים ממתינים לעסקים
 */
async function GETHandler(request) {
  try {
    const authResult = await requireAdminGuard(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    if (!isSuperAdmin(authResult.user)) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }
    
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Get all active tenants with pending balance
    const query = { status: 'active' };
    if (tenantId) {
      query._id = new ObjectId(tenantId);
    }
    
    const tenants = await db.collection('tenants').find(query).toArray();
    
    // Calculate pending payments for each tenant
    const pendingPayments = await Promise.all(tenants.map(async (tenant) => {
      // Get orders that need to be paid out
      const orders = await db.collection('orders').aggregate([
        {
          $match: {
            tenantId: tenant._id,
            paymentStatus: { $in: ['success', 'final-success'] },
            tenantPaidOut: { $ne: true },
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            orders: { $push: { _id: '$_id', totalAmount: '$totalAmount', createdAt: '$createdAt' } },
          }
        }
      ]).toArray();
      
      const stats = orders[0] || { totalSales: 0, orderCount: 0, orders: [] };
      const platformCommission = stats.totalSales * (tenant.platformCommissionRate || 5) / 100;
      const amountDue = stats.totalSales - platformCommission;
      
      return {
        tenantId: tenant._id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        platformCommissionRate: tenant.platformCommissionRate || 5,
        totalSales: Math.round(stats.totalSales * 100) / 100,
        orderCount: stats.orderCount,
        platformCommission: Math.round(platformCommission * 100) / 100,
        amountDue: Math.round(amountDue * 100) / 100,
        lastPaymentAt: tenant.billing?.lastPaymentAt || null,
        totalPaid: tenant.billing?.totalPaid || 0,
        paymentMethod: tenant.billing?.paymentMethod || null,
        bankDetails: tenant.billing?.bankDetails || null,
      };
    }));
    
    // Filter only tenants with pending payments
    const tenantsWithPending = pendingPayments.filter(t => t.amountDue > 0);
    
    return NextResponse.json({
      ok: true,
      payments: tenantsWithPending,
      totalPending: tenantsWithPending.reduce((sum, t) => sum + t.amountDue, 0),
      totalPlatformCommission: tenantsWithPending.reduce((sum, t) => sum + t.platformCommission, 0),
    });
  } catch (error) {
    console.error('GET /api/admin/tenant-payments error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת התשלומים' }, { status: 500 });
  }
}

/**
 * POST - תיעוד תשלום לעסק
 */
async function POSTHandler(request) {
  try {
    const authResult = await requireAdminGuard(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    if (!isSuperAdmin(authResult.user)) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }
    
    const body = await request.json();
    const { tenantId, amount, paymentMethod, reference, notes } = body;
    
    if (!tenantId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 });
    }
    
    const db = await getDb();
    const now = new Date();
    
    // Get tenant
    const tenant = await db.collection('tenants').findOne({ _id: new ObjectId(tenantId) });
    if (!tenant) {
      return NextResponse.json({ error: 'העסק לא נמצא' }, { status: 404 });
    }
    
    // Create payment record
    const payment = {
      tenantId: new ObjectId(tenantId),
      amount,
      paymentMethod: paymentMethod || 'bank_transfer',
      reference: reference || null,
      notes: notes || null,
      createdAt: now,
      createdBy: authResult.user._id,
    };

    const { insertedId } = await db.collection('tenant_payments').insertOne(payment);
    payment._id = insertedId;
    
    // Update tenant billing
    await db.collection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      {
        $set: {
          'billing.lastPaymentAt': now,
        },
        $inc: {
          'billing.totalPaid': amount,
        }
      }
    );
    
    // Mark orders as paid out
    await db.collection('orders').updateMany(
      {
        tenantId: new ObjectId(tenantId),
        paymentStatus: { $in: ['success', 'final-success'] },
        tenantPaidOut: { $ne: true },
      },
      {
        $set: {
          tenantPaidOut: true,
          tenantPaidOutAt: now,
          tenantPaymentId: insertedId,
        }
      }
    );
    
    return NextResponse.json({
      ok: true,
      payment,
      message: `תשלום של ${amount} ש"ח לעסק ${tenant.name} תועד בהצלחה`,
    });
  } catch (error) {
    console.error('POST /api/admin/tenant-payments error:', error);
    return NextResponse.json({ error: 'שגיאה בתיעוד התשלום' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
