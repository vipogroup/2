import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';
import { getCurrentTenant } from '@/lib/tenant/tenantMiddleware';
import { apiDebugLog } from '@/lib/apiDebugLog';

/**
 * POST /api/referral/track
 * Track a referral click by ref code (coupon code or agent ID)
 * Body: { refCode, url, action }
 */
async function POSTHandler(req) {
  try {
    const body = await req.json();
    const { refCode, url, action = 'click' } = body;

    if (!refCode) {
      return NextResponse.json({ ok: false, error: 'refCode required' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');
    const referralLogs = db.collection('referral_logs');

    // Multi-Tenant: Get current tenant
    const tenant = await getCurrentTenant(req);

    // Build base query with optional tenant filter
    const baseQuery = { role: 'agent' };
    if (tenant) {
      baseQuery.tenantId = tenant._id;
    }

    // Find agent by ref code - could be couponCode, referralId, or ObjectId
    let agent = null;

    // First try to find by couponCode
    agent = await users.findOne({ ...baseQuery, couponCode: refCode });

    // If not found, try referralId
    if (!agent) {
      agent = await users.findOne({ ...baseQuery, referralId: refCode });
    }

    // If still not found, try as ObjectId
    if (!agent) {
      try {
        const objectId = new ObjectId(refCode);
        agent = await users.findOne({ ...baseQuery, _id: objectId });
      } catch {
        // Not a valid ObjectId, ignore
      }
    }

    if (!agent) {
      // Agent not found, but still return ok to not expose info
      apiDebugLog('Referral track: agent not found for code:', refCode);
      return NextResponse.json({ ok: true, tracked: false });
    }

    // Get request headers for tracking
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    const referer = headersList.get('referer') || null;

    // Create log document with tenantId
    const logDoc = {
      agentId: agent._id,
      refCode,
      ip: ip.split(',')[0].trim(),
      userAgent,
      referer,
      url: url || null,
      action,
      createdAt: new Date(),
      // Multi-Tenant: Add tenantId from agent
      ...(agent.tenantId && { tenantId: agent.tenantId }),
    };

    await referralLogs.insertOne(logDoc);

    apiDebugLog('Referral click logged for agent:', agent._id, 'refCode:', refCode);

    // Return tenantId so client can store it for product filtering
    return NextResponse.json({ 
      ok: true, 
      tracked: true,
      tenantId: agent.tenantId?.toString() || null 
    });
  } catch (error) {
    console.error('REFERRAL_TRACK_ERROR:', error);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
