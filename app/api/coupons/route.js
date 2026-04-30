import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';

/**
 * GET /api/coupons
 * Admin endpoint to get coupons by userId or all coupons
 */
async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const users = db.collection('users');

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId');
    const code = searchParams.get('code');

    const query = { role: 'agent', couponCode: { $exists: true, $ne: null } };
    
    if (userId && ObjectId.isValid(userId)) {
      query._id = new ObjectId(userId);
    } else if (agentId && ObjectId.isValid(agentId)) {
      query._id = new ObjectId(agentId);
    }
    
    if (code) {
      query.couponCode = code;
    }

    const agents = await users
      .find(query, {
        projection: {
          _id: 1,
          fullName: 1,
          email: 1,
          couponCode: 1,
          couponSlug: 1,
          discountPercent: 1,
          commissionPercent: 1,
          couponStatus: 1,
        },
      })
      .limit(100)
      .toArray();

    const coupons = agents.map((a) => ({
      _id: String(a._id),
      userId: String(a._id),
      agentName: a.fullName,
      agentEmail: a.email,
      code: a.couponCode,
      slug: a.couponSlug,
      discountPercent: a.discountPercent || 0,
      commissionPercent: a.commissionPercent || 0,
      status: a.couponStatus || 'active',
    }));

    return NextResponse.json({
      ok: true,
      coupons,
      items: coupons,
      total: coupons.length,
    });
  } catch (error) {
    console.error('COUPONS_GET_ERROR:', error);
    const status = error?.status || 500;
    const message = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
