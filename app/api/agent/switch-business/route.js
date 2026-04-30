export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';

/**
 * POST /api/agent/switch-business
 * Switch agent's active business context
 */
export async function POST(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const db = await getDb();
    const agentId = new ObjectId(user.id);
    const tenantObjId = new ObjectId(tenantId);

    // Verify agent is connected to this business
    const connection = await db.collection('agentbusinesses').findOne({
      agentId,
      tenantId: tenantObjId,
      status: 'active',
    });

    if (!connection) {
      return NextResponse.json({ 
        error: 'אינך מחובר לעסק זה' 
      }, { status: 403 });
    }

    // Get tenant details
    const tenant = await db.collection('tenants').findOne({ _id: tenantObjId });
    if (!tenant) {
      return NextResponse.json({ error: 'העסק לא נמצא' }, { status: 404 });
    }

    // Update user's active tenant
    await db.collection('users').updateOne(
      { _id: agentId },
      { 
        $set: { 
          activeTenantId: tenantObjId,
          updatedAt: new Date(),
        } 
      }
    );

    return NextResponse.json({ 
      ok: true, 
      message: `עברת לעסק: ${tenant.name}`,
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        slug: tenant.slug,
      }
    });
  } catch (err) {
    console.error('AGENT_SWITCH_BUSINESS_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
