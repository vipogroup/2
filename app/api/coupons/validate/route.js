import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import User from '@/models/User';
import { getCurrentTenant } from '@/lib/tenant/tenantMiddleware';

async function POSTHandler(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawCode = typeof body.code === 'string' ? body.code.trim() : '';

    if (!rawCode) {
      return NextResponse.json({ ok: false, error: 'code_required' }, { status: 400 });
    }

    await connectMongo();

    // Multi-Tenant: Get current tenant
    const tenant = await getCurrentTenant(request);

    const code = rawCode.toLowerCase();
    // Escape regex special characters to prevent ReDoS
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Build query with optional tenant filter
    const query = {
      couponCode: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
      role: 'agent',
    };
    
    // If tenant exists, filter by tenant
    if (tenant) {
      query.tenantId = tenant._id;
    }
    
    const agent = await User.findOne(query)
      .lean()
      .exec();

    if (!agent || agent.couponStatus !== 'active') {
      return NextResponse.json({ ok: false, error: 'coupon_not_found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        coupon: {
          code: agent.couponCode,
          discountPercent: agent.discountPercent ?? 0,
          commissionPercent: agent.commissionPercent ?? 0,
          agentId: String(agent._id),
          agentName: agent.fullName ?? '',
          status: agent.couponStatus,
          tenantId: agent.tenantId ? String(agent.tenantId) : null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('COUPON_VALIDATE_ERROR', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
