
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { assertTestHarnessAccess } from '@/lib/testHarness/gate';

function requireObjectId(value, field) {
  if (!value || typeof value !== 'string' || !ObjectId.isValid(value)) {
    const error = new Error(`${field} is invalid`);
    error.status = 400;
    throw error;
  }
  return new ObjectId(value);
}

async function GETHandler(request, _context, { requestId }) {
  const admin = await requireAdminApi(request);
  assertTestHarnessAccess({ user: admin, requestId, source: 'api/admin/test-harness/customer-orders' });

  const { searchParams } = new URL(request.url);
  const customerId = requireObjectId(searchParams.get('customerId'), 'customerId');

  const db = await getDb();
  const users = db.collection('users');

  const customer = await users.findOne(
    { _id: customerId },
    { projection: { email: 1, fullName: 1, phone: 1, role: 1 } },
  );

  if (!customer) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  const orders = await db
    .collection('orders')
    .find({
      $or: [
        { createdBy: customerId },
        { createdBy: customerId.toString() },
        ...(customer?.email ? [{ 'customer.email': customer.email }] : []),
      ],
    })
    .sort({ createdAt: -1 })
    .toArray();

  if (orders.length === 0) {
    return NextResponse.json({ ok: true, businesses: [], totalOrders: 0, totalSpent: 0, customerId: customerId.toString() });
  }

  const tenantIds = [
    ...new Set(
      orders
        .filter((o) => o.tenantId)
        .map((o) => o.tenantId.toString()),
    ),
  ].map((id) => new ObjectId(id));

  const tenants = tenantIds.length
    ? await db
        .collection('tenants')
        .find({ _id: { $in: tenantIds } })
        .project({ name: 1, slug: 1, logo: 1 })
        .toArray()
    : [];

  const tenantMap = new Map(tenants.map((t) => [t._id.toString(), t]));

  const ordersByTenant = {};
  const globalOrders = [];

  for (const order of orders) {
    const tenantIdStr = order.tenantId?.toString();
    if (tenantIdStr) {
      if (!ordersByTenant[tenantIdStr]) {
        ordersByTenant[tenantIdStr] = [];
      }
      ordersByTenant[tenantIdStr].push(order);
    } else {
      globalOrders.push(order);
    }
  }

  const businesses = Object.entries(ordersByTenant).map(([tenantId, tenantOrders]) => {
    const tenant = tenantMap.get(tenantId);
    return {
      tenantId,
      tenantName: tenant?.name || 'חנות',
      tenantSlug: tenant?.slug || '',
      tenantLogo: tenant?.logo || null,
      ordersCount: tenantOrders.length,
      totalSpent: tenantOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      lastOrderDate: tenantOrders[0]?.createdAt || null,
      orders: tenantOrders.map((o) => ({
        _id: o._id.toString(),
        createdAt: o.createdAt,
        status: o.status,
        totalAmount: o.totalAmount || 0,
        itemsCount: o.items?.length || 0,
        items:
          o.items
            ?.slice(0, 3)
            .map((item) => ({
              name: item.name || item.productName,
              price: item.price,
              quantity: item.quantity,
            })) || [],
      })),
    };
  });

  businesses.sort((a, b) => new Date(b.lastOrderDate) - new Date(a.lastOrderDate));

  if (globalOrders.length > 0) {
    businesses.push({
      tenantId: null,
      tenantName: 'הזמנות כלליות',
      tenantSlug: '',
      tenantLogo: null,
      ordersCount: globalOrders.length,
      totalSpent: globalOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      lastOrderDate: globalOrders[0]?.createdAt || null,
      orders: globalOrders.map((o) => ({
        _id: o._id.toString(),
        createdAt: o.createdAt,
        status: o.status,
        totalAmount: o.totalAmount || 0,
        itemsCount: o.items?.length || 0,
        items:
          o.items
            ?.slice(0, 3)
            .map((item) => ({
              name: item.name || item.productName,
              price: item.price,
              quantity: item.quantity,
            })) || [],
      })),
    });
  }

  return NextResponse.json({
    ok: true,
    customerId: customerId.toString(),
    businesses,
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
  });
}

export const GET = withErrorLogging(GETHandler);
