export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';

/**
 * GET /api/agent/current-business
 * Get agent's current active business with stats
 */
export async function GET(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const agentId = new ObjectId(user.id);

    // Get agent with activeTenantId
    const agent = await db.collection('users').findOne(
      { _id: agentId },
      { projection: { activeTenantId: 1, tenantId: 1, referralId: 1, couponCode: 1 } }
    );

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get all active business connections
    const connections = await db.collection('agentbusinesses')
      .find({ agentId, status: 'active' })
      .toArray();

    if (connections.length === 0) {
      // Agent has no businesses - return default state
      return NextResponse.json({
        ok: true,
        hasBusinesses: false,
        currentBusiness: null,
        businesses: [],
        stats: getDefaultStats(),
      });
    }

    // Determine current tenant - use activeTenantId or first connection
    let currentTenantId = agent.activeTenantId;
    if (!currentTenantId) {
      // Use first active connection as default
      currentTenantId = connections[0].tenantId;
      // Update user's activeTenantId
      await db.collection('users').updateOne(
        { _id: agentId },
        { $set: { activeTenantId: currentTenantId } }
      );
    }

    // Find the current connection
    const currentConnection = connections.find(
      c => c.tenantId.toString() === currentTenantId.toString()
    ) || connections[0];

    // Get tenant details
    const tenant = await db.collection('tenants').findOne(
      { _id: currentConnection.tenantId },
      { projection: { name: 1, slug: 1, logo: 1, domain: 1 } }
    );

    // Get stats for this specific tenant
    const stats = await getAgentTenantStats(db, agentId, currentConnection.tenantId, req);

    // Get all tenant names for the selector
    const tenantIds = connections.map(c => c.tenantId);
    const tenants = await db.collection('tenants')
      .find({ _id: { $in: tenantIds } })
      .project({ name: 1, slug: 1, logo: 1 })
      .toArray();
    
    const tenantMap = new Map(tenants.map(t => [t._id.toString(), t]));

    const businesses = connections.map(conn => {
      const t = tenantMap.get(conn.tenantId.toString());
      return {
        tenantId: conn.tenantId.toString(),
        tenantName: t?.name || 'עסק',
        tenantSlug: t?.slug || '',
        tenantLogo: t?.logo || null,
        couponCode: conn.couponCode,
        commissionPercent: conn.commissionPercent,
        totalSales: conn.totalSales || 0,
        totalCommission: conn.totalCommission || 0,
        isActive: conn.tenantId.toString() === currentConnection.tenantId.toString(),
      };
    });

    return NextResponse.json({
      ok: true,
      hasBusinesses: true,
      currentBusiness: {
        tenantId: currentConnection.tenantId.toString(),
        tenantName: tenant?.name || 'עסק',
        tenantSlug: tenant?.slug || '',
        tenantLogo: tenant?.logo || null,
        tenantDomain: tenant?.domain || null,
        couponCode: currentConnection.couponCode,
        commissionPercent: currentConnection.commissionPercent,
      },
      businesses,
      stats,
    });
  } catch (err) {
    console.error('AGENT_CURRENT_BUSINESS_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getDefaultStats() {
  return {
    totalReferrals: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCommission: 0,
    pendingCommission: 0,
    availableBalance: 0,
    clicks: 0,
    conversionRate: 0,
    referralCode: null,
    referralLink: null,
  };
}

async function getAgentTenantStats(db, agentId, tenantId, req) {
  const orders = db.collection('orders');
  const referralLogs = db.collection('referral_logs');
  const agentBusinesses = db.collection('agentbusinesses');
  const withdrawals = db.collection('withdrawalRequests');

  // Get the agent-business connection
  const connection = await agentBusinesses.findOne({ agentId, tenantId });
  if (!connection) {
    return getDefaultStats();
  }

  // Orders filter: agent's orders for this tenant
  const ordersFilter = {
    tenantId,
    $or: [{ refAgentId: agentId }, { agentId: agentId }],
  };

  const [
    totalSalesCount,
    totalsAgg,
    pendingAgg,
    availableAgg,
    clicksAgg,
    completedWithdrawalsAgg,
  ] = await Promise.all([
    orders.countDocuments(ordersFilter),
    orders.aggregate([
      { $match: { ...ordersFilter, commissionAmount: { $gt: 0 }, status: { $in: ['paid', 'completed', 'shipped'] } } },
      { $group: { _id: null, totalCommission: { $sum: '$commissionAmount' }, totalRevenue: { $sum: '$totalAmount' } } },
    ]).toArray(),
    orders.aggregate([
      { $match: { ...ordersFilter, status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: null, pendingCommission: { $sum: '$commissionAmount' } } },
    ]).toArray(),
    orders.aggregate([
      { $match: { ...ordersFilter, commissionStatus: 'available', commissionAmount: { $gt: 0 } } },
      { $group: { _id: null, availableCommission: { $sum: '$commissionAmount' } } },
    ]).toArray(),
    referralLogs.aggregate([
      { $match: { agentId, tenantId } },
      { $group: { _id: '$action', total: { $sum: 1 } } },
    ]).toArray(),
    withdrawals.aggregate([
      { $match: { userId: agentId, tenantId, status: 'completed' } },
      { $group: { _id: null, totalWithdrawn: { $sum: '$amount' } } },
    ]).toArray(),
  ]);

  const totalRevenue = totalsAgg[0]?.totalRevenue || 0;
  const totalCommission = totalsAgg[0]?.totalCommission || 0;
  const pendingCommission = pendingAgg[0]?.pendingCommission || 0;
  const availableCommission = availableAgg[0]?.availableCommission || 0;
  const totalWithdrawn = completedWithdrawalsAgg[0]?.totalWithdrawn || 0;
  const clicks = clicksAgg.find(c => c._id === 'click')?.total || 0;

  const conversionRate = clicks > 0 ? Number(((totalSalesCount / clicks) * 100).toFixed(1)) : 0;
  const availableBalance = Math.max(0, availableCommission - totalWithdrawn);

  // Build referral link
  const baseUrl = resolveBaseUrl(req);
  const referralCode = connection.couponCode;
  const referralLink = `${baseUrl}/r/${encodeURIComponent(referralCode)}`;

  return {
    totalReferrals: connection.referralsCount || 0,
    totalSales: totalSalesCount,
    totalRevenue,
    totalCommission,
    pendingCommission,
    availableBalance,
    clicks,
    conversionRate,
    referralCode,
    referralLink,
  };
}

function resolveBaseUrl(req) {
  const sanitize = (raw) => raw.replace(/\/$/, '');
  const headers = req.headers;
  
  if (headers) {
    const proto = headers.get('x-forwarded-proto') || headers.get('x-forwarded-protocol') || 'https';
    const host = headers.get('x-forwarded-host') || headers.get('host');
    if (host && !host.startsWith('0.0.0.0') && host !== '::1') {
      return sanitize(`${proto}://${host}`);
    }
  }

  const envBase = process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
  if (envBase) {
    return sanitize(envBase);
  }

  return 'https://vipo-group.com';
}
