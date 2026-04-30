import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function getAdminOverview({ from, to, tenantId }) {
  const db = await getDb();
  const Users = db.collection('users');
  const Orders = db.collection('orders');

  // Multi-Tenant: Build tenant filter
  const tenantFilter = tenantId ? { tenantId: new ObjectId(tenantId) } : {};

  const timeFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { $gte: new Date(from) } : {}),
            ...(to ? { $lte: new Date(to) } : {}),
          },
        }
      : {};

  const [newCustomers, ordersAgg] = await Promise.all([
    Users.countDocuments({ role: 'customer', ...tenantFilter, ...timeFilter }),
    Orders.aggregate([
      { $match: { status: { $in: ['paid', 'completed'] }, ...tenantFilter, ...timeFilter } },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          gmv: { $sum: '$totalAmount' },
          commissions: { $sum: { $multiply: ['$totalAmount', 0.1] } },
        },
      },
    ]).toArray(),
  ]);

  const o = ordersAgg[0] || { ordersCount: 0, gmv: 0, commissions: 0 };

  const activeAgents = await Users.countDocuments({ role: 'agent', isActive: true, ...tenantFilter });

  return {
    newCustomers,
    activeAgents,
    ordersCount: o.ordersCount,
    gmv: o.gmv,
    commissions: o.commissions,
  };
}

export async function getByProduct({ from, to, tenantId }) {
  const db = await getDb();
  const Orders = db.collection('orders');
  
  // Multi-Tenant: Build tenant filter
  const tenantFilter = tenantId ? { tenantId: new ObjectId(tenantId) } : {};
  
  const timeFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { $gte: new Date(from) } : {}),
            ...(to ? { $lte: new Date(to) } : {}),
          },
        }
      : {};
  return Orders.aggregate([
    { $match: { status: { $in: ['paid', 'completed'] }, ...tenantFilter, ...timeFilter } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $last: '$items.name' },
        qty: { $sum: { $ifNull: ['$items.quantity', '$items.qty'] } },
        revenue: { 
          $sum: { 
            $multiply: [
              { $ifNull: ['$items.quantity', '$items.qty'] }, 
              { $ifNull: ['$items.unitPrice', '$items.price'] }
            ] 
          } 
        },
      },
    },
    { $sort: { revenue: -1 } },
  ]).toArray();
}

export async function getByAgent({ from, to, tenantId }) {
  const db = await getDb();
  const Orders = db.collection('orders');
  
  // Multi-Tenant: Build tenant filter
  const tenantFilter = tenantId ? { tenantId: new ObjectId(tenantId) } : {};
  
  const timeFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { $gte: new Date(from) } : {}),
            ...(to ? { $lte: new Date(to) } : {}),
          },
        }
      : {};
  return Orders.aggregate([
    { $match: { status: { $in: ['paid', 'completed'] }, ...tenantFilter, ...timeFilter } },
    {
      $group: {
        _id: '$agentId',
        orders: { $sum: 1 },
        gmv: { $sum: '$totalAmount' },
        commissions: { $sum: { $multiply: ['$totalAmount', 0.1] } },
      },
    },
    { $sort: { gmv: -1 } },
  ]).toArray();
}
