import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';

 function inferOrderTypeMeta(order) {
   const items = Array.isArray(order?.items) ? order.items : [];
   const groupItems = items.filter((item) => {
     const purchaseType = item?.purchaseType || item?.type;
     return (
       purchaseType === 'group' ||
       String(item?.groupPurchaseType || '').trim().toLowerCase() === 'shared_container'
     );
   });
   const isGroup = groupItems.length > 0 || order?.orderType === 'group' || order?.groupPurchaseId;

   if (!isGroup) {
     return { kind: 'regular', label: 'מכירה רגילה' };
   }

   const allSharedContainer =
     groupItems.length > 0 &&
     groupItems.every(
       (item) => String(item?.groupPurchaseType || '').trim().toLowerCase() === 'shared_container',
     );

   if (allSharedContainer) {
     return { kind: 'shared_container', label: 'מכולה משותפת' };
   }

   return { kind: 'group', label: 'רכישה קבוצתית' };
 }

/**
 * Get agent sales details for business dashboard
 * GET /api/business/commissions/agent/[agentId]
 */
async function GETHandler(req, { params }) {
  try {
    const user = await requireAuthApi(req);
    
    // Only business_admin can view
    if (user.role !== 'business_admin' && user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (!user.tenantId && user.role === 'business_admin') {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    const { agentId } = params;
    if (!agentId || !ObjectId.isValid(agentId)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const identifier = buildRateLimitKey(req, user.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const db = await getDb();
    const ordersCol = db.collection('orders');
    const usersCol = db.collection('users');

    // Get agent details
    const agent = await usersCol.findOne(
      { _id: new ObjectId(agentId) },
      {
        projection: {
          fullName: 1,
          phone: 1,
          email: 1,
          couponCode: 1,
          commissionPercent: 1,
          commissionBalance: 1,
          totalSales: 1,
          vatId: 1,
          companyName: 1,
          bankDetails: 1,
          preferredPayoutMethod: 1,
          paypalEmail: 1,
          createdAt: 1,
        },
      }
    );

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build filter for agent's orders
    const filter = {
      refAgentId: new ObjectId(agentId),
      commissionAmount: { $gt: 0 },
    };
    
    // Multi-Tenant: Filter by tenant
    if (user.role === 'business_admin' && user.tenantId) {
      filter.tenantId = new ObjectId(user.tenantId);
    }

    // Get agent's orders with commissions
    const orders = await ordersCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    // Calculate summary
    const summary = {
      totalOrders: orders.length,
      totalSales: 0,
      totalCommissions: 0,
      pendingCommissions: 0,
      availableCommissions: 0,
      claimedCommissions: 0,
    };

    const salesDetails = orders.map(order => {
      const customer = order.customer || {};
      const items = order.items || [];
      const orderTypeMeta = inferOrderTypeMeta(order);

      let commissionAvailableAt = order.commissionAvailableAt;
      if (!commissionAvailableAt && order.createdAt) {
        const daysUntilAvailable = orderTypeMeta.kind === 'regular' ? 30 : 100;
        commissionAvailableAt = new Date(
          new Date(order.createdAt).getTime() + daysUntilAvailable * 24 * 60 * 60 * 1000,
        );
      }
      
      summary.totalSales += order.totalAmount || 0;
      summary.totalCommissions += order.commissionAmount || 0;
      
      if (order.commissionStatus === 'pending') {
        summary.pendingCommissions += order.commissionAmount || 0;
      } else if (order.commissionStatus === 'available') {
        summary.availableCommissions += order.commissionAmount || 0;
      } else if (order.commissionStatus === 'claimed') {
        summary.claimedCommissions += order.commissionAmount || 0;
      }

      return {
        orderId: order._id.toString(),
        orderDate: order.createdAt,
        orderType: order.orderType || 'regular',
        orderTypeKind: orderTypeMeta.kind,
        orderTypeLabel: orderTypeMeta.label,
        items: items.map(item => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount: order.totalAmount,
        commissionPercent: order.commissionPercent || agent.commissionPercent || 0,
        commissionAmount: order.commissionAmount,
        commissionStatus: order.commissionStatus,
        commissionAvailableAt: commissionAvailableAt,
        customer: {
          name: customer.fullName || order.customerName || '',
          phone: customer.phone || order.customerPhone || '',
          email: customer.email || '',
        },
        deliveryMethod: order.deliveryMethod,
        status: order.status,
      };
    });

    return NextResponse.json({
      ok: true,
      agent: {
        id: agent._id.toString(),
        fullName: agent.fullName,
        phone: agent.phone,
        email: agent.email,
        couponCode: agent.couponCode,
        commissionPercent: agent.commissionPercent,
        commissionBalance: agent.commissionBalance,
        vatId: agent.vatId,
        companyName: agent.companyName,
        bankDetails: agent.bankDetails,
        preferredPayoutMethod: agent.preferredPayoutMethod,
        paypalEmail: agent.paypalEmail,
        createdAt: agent.createdAt,
      },
      summary,
      sales: salesDetails,
    });
  } catch (err) {
    console.error('AGENT_SALES_ERROR:', err);
    const status = err?.status || 500;
    const message =
      status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
