import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { requireAuthApi } from '@/lib/auth/server';
import { getTenantIdOrThrow, withTenant } from '@/lib/tenantGuard';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function resolveBaseUrl(req) {
  const sanitize = (raw) => raw.replace(/\/$/, '');

  const headers = req.headers;
  if (headers) {
    const proto =
      headers.get('x-forwarded-proto') ||
      headers.get('x-forwarded-protocol') ||
      headers.get('x-url-scheme') ||
      'http';
    const host = headers.get('x-forwarded-host') || headers.get('host');

    if (host && !host.startsWith('0.0.0.0') && host !== '::1') {
      return sanitize(`${proto}://${host}`);
    }
  }

  // Fallback to the URL the route was invoked with (might be 0.0.0.0 in dev)
  try {
    const requestUrl = new URL(req.url);
    if (requestUrl.origin && !requestUrl.hostname.startsWith('0.0.0.0')) {
      return sanitize(requestUrl.origin);
    }
  } catch {}

  const envBase =
    process.env.PUBLIC_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_HOME_URL ||
    process.env.NEXTAUTH_URL;

  if (envBase) {
    try {
      const parsed = new URL(envBase);
      parsed.pathname = parsed.pathname.replace(/\/$/, '');
      return sanitize(parsed.toString());
    } catch {
      return sanitize(envBase);
    }
  }

  return 'http://localhost:3001';
}

/**
 * GET /api/agent/stats?agentId=xxx
 * Get agent statistics - referrals, sales, commissions, clicks, etc.
 */
async function GETHandler(req) {
  try {
    const user = await requireAuthApi(req);
    if (user.role !== 'agent' && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'business_admin') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    let tenantObjectId;
    try {
      tenantObjectId = getTenantIdOrThrow(user);
    } catch {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const identifier = buildRateLimitKey(req, user.id);
    const rateLimit = rateLimiters.agentStats(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);

    let targetAgentId = null;
    if (user.role === 'agent') {
      targetAgentId = user.id;
    } else if (user.role === 'admin' || user.role === 'business_admin') {
      targetAgentId = (searchParams.get('agentId') || '').trim();
      if (!targetAgentId) {
        return NextResponse.json({ ok: false, error: 'agentId required' }, { status: 400 });
      }
    }

    let agentObjectId;
    try {
      agentObjectId = new ObjectId(targetAgentId);
    } catch (err) {
      return NextResponse.json({ ok: false, error: 'invalid_agent_id' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');
    const orders = db.collection('orders');
    const referralLogs = db.collection('referral_logs');

    // Get agent (with tenant filter if applicable)
    const agentFilter = withTenant({ _id: agentObjectId, role: 'agent' }, tenantObjectId);
    const agent = await users.findOne(
      agentFilter,
      {
        projection: {
          referralsCount: 1,
          totalSales: 1,
          commissionBalance: 1,
          fullName: 1,
          email: 1,
          tenantId: 1,
        },
      },
    );

    if (!agent) {
      return NextResponse.json({ ok: false, error: 'agent not found' }, { status: 404 });
    }

    // Query for orders linked to this agent via refAgentId OR agentId (coupon)
    // Also filter by tenant if applicable
    const agentOrdersFilter = withTenant(
      { $or: [{ refAgentId: agentObjectId }, { agentId: agentObjectId }] },
      tenantObjectId,
    );

    // Get total sales
    const totalSales = await orders.countDocuments(agentOrdersFilter);

    // Get total commission earned
    const commissionResult = await orders
      .aggregate([
        { $match: agentOrdersFilter },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: '$commissionAmount' },
            totalOrderValue: { $sum: '$totalAmount' },
          },
        },
      ])
      .toArray();

    const totalCommission = commissionResult[0]?.totalCommission || 0;
    const totalOrderValue = commissionResult[0]?.totalOrderValue || 0;

    // Get clicks/views from referral logs
    const clicksResult = await referralLogs
      .aggregate([
        { $match: withTenant({ agentId: agentObjectId }, tenantObjectId) },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const clicks = clicksResult.find((r) => r._id === 'click')?.count || 0;
    const views = clicksResult.find((r) => r._id === 'view')?.count || 0;

    // Calculate conversion rate
    const conversionRate = clicks > 0 ? ((totalSales / clicks) * 100).toFixed(1) : 0;

    const referralCode = agent.couponCode || agent.referralId || targetAgentId;
    const baseUrl = resolveBaseUrl(req);
    const referralLink = `${baseUrl}/api/join?ref=${encodeURIComponent(referralCode)}`;

    return NextResponse.json({
      ok: true,
      agentId: String(agent._id),
      agentName: agent.fullName,
      agentEmail: agent.email,
      referral: {
        code: referralCode,
        link: referralLink,
      },
      stats: {
        totalReferrals: agent.referralsCount || 0,
        totalSales: totalSales || agent.totalSales || 0,
        commissionBalance: agent.commissionBalance || 0,
        totalCommissionEarned: totalCommission,
        totalOrderValue,
        clicks,
        views,
        conversionRate: parseFloat(conversionRate),
      },
    });
  } catch (error) {
    console.error('AGENT_STATS_ERROR:', error);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
