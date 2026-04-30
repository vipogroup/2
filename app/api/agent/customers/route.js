import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { requireAuthApi } from '@/lib/auth/server';
import { getTenantIdOrThrow, withTenant } from '@/lib/tenantGuard';

/**
 * GET /api/agent/customers?agentId=xxx&limit=50
 * Get customers referred by agent
 */
async function GETHandler(req) {
  try {
    const user = await requireAuthApi(req);
    let tenantObjectId;
    try {
      tenantObjectId = getTenantIdOrThrow(user);
    } catch {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!agentId) {
      return NextResponse.json({ ok: false, error: 'agentId required' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Get customers referred by this agent
    const customers = await users
      .find(
        withTenant({ referredBy: new ObjectId(agentId) }, tenantObjectId),
        {
          projection: {
            fullName: 1,
            email: 1,
            phone: 1,
            createdAt: 1,
            role: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      ok: true,
      agentId,
      customers: customers.map((c) => ({
        _id: String(c._id),
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        role: c.role,
        createdAt: c.createdAt,
      })),
      total: customers.length,
    });
  } catch (error) {
    console.error('AGENT_CUSTOMERS_ERROR:', error);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
