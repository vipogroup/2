export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';

/**
 * GET /api/agent/businesses
 * Get all businesses the agent is connected to
 */
export async function GET(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const agentId = new ObjectId(user.id);

    // Get all agent-business connections
    const connections = await db.collection('agentbusinesses')
      .find({ agentId, status: { $in: ['active', 'pending'] } })
      .toArray();

    if (connections.length === 0) {
      return NextResponse.json({ ok: true, businesses: [] });
    }

    // Get tenant details
    const tenantIds = connections.map(c => c.tenantId);
    const tenants = await db.collection('tenants')
      .find({ _id: { $in: tenantIds }, status: 'active' })
      .project({ name: 1, slug: 1, logo: 1, description: 1 })
      .toArray();

    const tenantMap = new Map(tenants.map(t => [t._id.toString(), t]));

    // Build response with stats
    const businesses = connections.map(conn => {
      const tenant = tenantMap.get(conn.tenantId.toString());
      return {
        id: conn._id.toString(),
        tenantId: conn.tenantId.toString(),
        tenantName: tenant?.name || 'עסק',
        tenantSlug: tenant?.slug || '',
        tenantLogo: tenant?.logo || null,
        couponCode: conn.couponCode,
        commissionPercent: conn.commissionPercent,
        status: conn.status,
        totalSales: conn.totalSales || 0,
        totalCommission: conn.totalCommission || 0,
        ordersCount: conn.ordersCount || 0,
        joinedAt: conn.joinedAt,
      };
    });

    return NextResponse.json({ ok: true, businesses });
  } catch (err) {
    console.error('AGENT_BUSINESSES_GET_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/agent/businesses
 * Join a new business
 */
export async function POST(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await req.json();

    if (!tenantId || !ObjectId.isValid(tenantId)) {
      return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
    }

    const db = await getDb();
    const agentId = new ObjectId(user.id);
    const tenantObjId = new ObjectId(tenantId);

    // Check if tenant exists and is active
    const tenant = await db.collection('tenants').findOne({ 
      _id: tenantObjId, 
      status: 'active' 
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Check if already connected
    const existing = await db.collection('agentbusinesses').findOne({
      agentId,
      tenantId: tenantObjId,
    });

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ error: 'Already connected to this business' }, { status: 400 });
      }
      // Reactivate if was blocked/left
      await db.collection('agentbusinesses').updateOne(
        { _id: existing._id },
        { 
          $set: { 
            status: 'active', 
            leftAt: null,
            updatedAt: new Date() 
          } 
        }
      );
      return NextResponse.json({ 
        ok: true, 
        message: 'Reconnected to business',
        couponCode: existing.couponCode 
      });
    }

    // Get agent info for coupon code generation
    const agent = await db.collection('users').findOne({ _id: agentId });
    const agentName = agent?.fullName?.split(' ')[0] || 'agent';
    
    // Generate unique coupon code for this agent+business
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const couponCode = `${agentName}-${tenant.slug || 'shop'}-${randomSuffix}`.toUpperCase();

    // Create connection
    const doc = {
      agentId,
      tenantId: tenantObjId,
      couponCode,
      commissionPercent: tenant.defaultCommission || 12,
      status: 'active',
      totalSales: 0,
      totalCommission: 0,
      ordersCount: 0,
      joinedAt: new Date(),
      leftAt: null,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('agentbusinesses').insertOne(doc);

    return NextResponse.json({ 
      ok: true, 
      message: 'Successfully joined business',
      couponCode,
      tenantName: tenant.name,
    }, { status: 201 });

  } catch (err) {
    console.error('AGENT_BUSINESSES_POST_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/businesses
 * Leave a business
 */
export async function DELETE(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId || !ObjectId.isValid(tenantId)) {
      return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
    }

    const db = await getDb();
    const agentId = new ObjectId(user.id);
    const tenantObjId = new ObjectId(tenantId);

    const result = await db.collection('agentbusinesses').updateOne(
      { agentId, tenantId: tenantObjId },
      { 
        $set: { 
          status: 'left', 
          leftAt: new Date(),
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Left business successfully' });

  } catch (err) {
    console.error('AGENT_BUSINESSES_DELETE_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
