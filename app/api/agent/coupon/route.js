import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth/requireAuth';
import { generateAgentCoupon, DEFAULT_AGENT_COMMISSION_PERCENT, DEFAULT_AGENT_DISCOUNT_PERCENT } from '@/lib/agents';

async function GETHandler(req) {
  try {
    const me = await requireAuth(req);
    if (!me) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    if (me.role !== 'agent') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const users = db.collection('users');

    const query = { role: 'agent' };
    if (ObjectId.isValid(me._id)) {
      query._id = new ObjectId(me._id);
    } else {
      query._id = me._id;
    }

    const projection = {
      fullName: 1,
      couponCode: 1,
      couponSlug: 1,
      couponSequence: 1,
      discountPercent: 1,
      commissionPercent: 1,
      couponStatus: 1,
      updatedAt: 1,
    };

    let agent = await users.findOne(query, { projection });
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });
    }

    if (!agent.couponCode) {
      try {
        const couponInfo = await generateAgentCoupon({
          fullName: agent.fullName || me.fullName || me.email || me.phone || 'agent',
          agentId: agent._id,
        });
        agent = {
          ...agent,
          couponCode: couponInfo?.couponCode || agent.couponCode || null,
          couponSlug: couponInfo?.couponSlug || agent.couponSlug || null,
          couponStatus: agent.couponStatus || 'active',
          discountPercent: agent.discountPercent ?? DEFAULT_AGENT_DISCOUNT_PERCENT,
          commissionPercent: agent.commissionPercent ?? DEFAULT_AGENT_COMMISSION_PERCENT,
        };
      } catch (couponErr) {
        console.error('AGENT_COUPON_GENERATE_FALLBACK_ERROR', couponErr);
      }
    }

    return NextResponse.json({
      ok: true,
      coupon: {
        code: agent.couponCode,
        slug: agent.couponSlug,
        sequence: agent.couponSequence,
        discountPercent: agent.discountPercent ?? 0,
        commissionPercent: agent.commissionPercent ?? 0,
        status: agent.couponStatus || 'inactive',
        updatedAt: agent.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('AGENT_COUPON_GET_ERROR', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
