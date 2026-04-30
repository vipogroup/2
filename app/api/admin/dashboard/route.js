import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';
import { buildAdminDashboardFileFallback } from '@/lib/adminFallbackData';
import { jsonAdminFallback } from '@/lib/adminFallbackResponse';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';

// Force dynamic rendering - this route uses cookies/auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
    }

    const db = await getDb();
    const users = db.collection('users');
    const orders = db.collection('orders');
    const products = db.collection('products');
    const referralLogs = db.collection('referral_logs');

    // Multi-Tenant: Build filter based on user type
    const tenantFilter = {};
    if (!isSuperAdmin(admin) && admin.tenantId) {
      tenantFilter.tenantId = new ObjectId(admin.tenantId);
    }

    // Get total counts (filtered by tenant for Business Admin)
    const totalUsers = await users.countDocuments(tenantFilter);
    const totalAgents = await users.countDocuments({ ...tenantFilter, role: 'agent' });
    const totalCustomers = await users.countDocuments({ ...tenantFilter, role: 'customer' });
    const totalOrders = await orders.countDocuments(tenantFilter);
    const totalProducts = await products.countDocuments(tenantFilter);

    // Get new users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await users
      .find(
        { ...tenantFilter, createdAt: { $gte: thirtyDaysAgo } },
        {
          projection: {
            fullName: 1,
            email: 1,
            phone: 1,
            role: 1,
            createdAt: 1,
            referredBy: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // Get referrer names for new users
    const newUsersWithReferrer = await Promise.all(
      newUsers.map(async (user) => {
        let referrerName = null;
        if (user.referredBy) {
          const referrer = await users.findOne(
            { _id: user.referredBy },
            { projection: { fullName: 1, email: 1 } },
          );
          referrerName = referrer ? referrer.fullName || referrer.email : null;
        }
        return {
          _id: String(user._id),
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
          referredBy: user.referredBy ? String(user.referredBy) : null,
          referrerName,
        };
      }),
    );

    // Get agent commission stats
    const agentStats = await users
      .find(
        { ...tenantFilter, role: 'agent' },
        {
          projection: {
            fullName: 1,
            email: 1,
            referralsCount: 1,
            totalSales: 1,
            commissionBalance: 1,
          },
        },
      )
      .sort({ commissionBalance: -1 })
      .limit(10)
      .toArray();

    // Get total commissions paid
    const commissionPipeline = [
      ...(Object.keys(tenantFilter).length > 0 ? [{ $match: tenantFilter }] : []),
      {
        $group: {
          _id: null,
          total: { $sum: '$commissionAmount' },
        },
      },
    ];
    const totalCommissions = await orders.aggregate(commissionPipeline).toArray();

    // Get product stats (filtered by tenant)
    const groupProducts = await products.countDocuments({ ...tenantFilter, type: 'group' });
    const onlineProducts = await products.countDocuments({ ...tenantFilter, type: 'online' });

    // Get total clicks from referral logs (filtered by tenant)
    const totalClicks = await referralLogs.countDocuments({ ...tenantFilter, action: 'click' });

    // Get recent orders (filtered by tenant)
    const recentOrders = await orders
      .find(
        tenantFilter,
        {
          projection: {
            productName: 1,
            customerName: 1,
            totalAmount: 1,
            commissionAmount: 1,
            status: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers,
        totalAgents,
        totalCustomers,
        totalOrders,
        totalProducts,
        groupProducts,
        onlineProducts,
        totalCommissions: totalCommissions[0]?.total || 0,
        totalClicks,
      },
      newUsers: newUsersWithReferrer,
      agentStats: agentStats.map((a) => ({
        _id: String(a._id),
        fullName: a.fullName,
        email: a.email,
        referralsCount: a.referralsCount || 0,
        totalSales: a.totalSales || 0,
        commissionBalance: a.commissionBalance || 0,
      })),
      recentOrders: recentOrders.map((o) => ({
        _id: String(o._id),
        productName: o.productName,
        customerName: o.customerName,
        totalAmount: o.totalAmount,
        commissionAmount: o.commissionAmount,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error('ADMIN_DASHBOARD_ERROR:', error);
    const status = error?.status || 500;

    if (status === 401 || status === 403) {
      const message = status === 401 ? 'Unauthorized' : 'Forbidden';
      return NextResponse.json({ ok: false, error: message }, { status });
    }

    if (isDbUnavailableError(error)) {
      return jsonAdminFallback(await buildAdminDashboardFileFallback());
    }

    const message =
      status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'server error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
