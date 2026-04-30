export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { apiDebugLog } from '@/lib/apiDebugLog';

/**
 * GET /api/agent/marketplace
 * Get all available businesses an agent can join
 * Also accessible by admins to view the marketplace
 */
export async function GET(req) {
  try {
    let user;
    try {
      user = await requireAuthApi(req);
    } catch (authErr) {
      apiDebugLog('MARKETPLACE_AUTH_ERROR:', authErr.message);
      return NextResponse.json({ error: 'לא מחובר - נא להתחבר למערכת', authError: authErr.message }, { status: 401 });
    }
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    apiDebugLog('MARKETPLACE_USER:', { id: user.id, role: user.role, email: user.email });

    const db = await getDb();
    const agentId = new ObjectId(user.id);

    // Get ALL tenants first to debug
    const allTenants = await db.collection('tenants').find({}).toArray();
    apiDebugLog('MARKETPLACE_DEBUG: Total tenants in DB:', allTenants.length);
    apiDebugLog('MARKETPLACE_DEBUG: Tenants:', allTenants.map(t => ({ name: t.name, status: t.status, allowAgentJoin: t.allowAgentJoin })));

    // Get all visible tenants - include active, pending, and those without status
    // Exclude only suspended/inactive businesses
    const tenants = await db.collection('tenants')
      .find({})  // Get all tenants for now to debug
      .project({ 
        name: 1, 
        slug: 1, 
        logo: 1, 
        description: 1,
        defaultCommission: 1,
        allowAgentJoin: 1, // אם העסק מאפשר הצטרפות חופשית
        status: 1, // Include status for debugging
      })
      .toArray();
    
    apiDebugLog('MARKETPLACE_DEBUG: Filtered tenants:', tenants.length);

    // Get agent's existing connections (with error handling)
    let connectionMap = new Map();
    try {
      const connections = await db.collection('agentbusinesses')
        .find({ agentId })
        .project({ tenantId: 1, status: 1 })
        .toArray();

      connectionMap = new Map(
        connections.map(c => [String(c.tenantId), c.status])
      );
    } catch (connErr) {
      console.error('MARKETPLACE_CONN_ERROR:', connErr);
      // Continue without connections
    }

    // Get products count per tenant (with error handling)
    // Support both ObjectId and string tenantId formats
    let productCountMap = new Map();
    try {
      const productCounts = await db.collection('products').aggregate([
        { $match: { status: 'published', tenantId: { $exists: true } } },
        { $group: { _id: '$tenantId', count: { $sum: 1 } } }
      ]).toArray();

      // Map both ObjectId and string versions to same key
      productCounts.forEach(p => {
        const key = String(p._id);
        const existing = productCountMap.get(key) || 0;
        productCountMap.set(key, existing + p.count);
      });
      
      apiDebugLog('MARKETPLACE_DEBUG: Product counts:', Object.fromEntries(productCountMap));
    } catch (aggErr) {
      console.error('MARKETPLACE_AGG_ERROR:', aggErr);
      // Continue without product counts
    }

    // Build response
    const businesses = tenants
      .filter(t => t.allowAgentJoin !== false) // אם לא הוגדר, ברירת מחדל = מאפשר
      .map(tenant => {
        const tenantIdStr = tenant._id.toString();
        const connectionStatus = connectionMap.get(tenantIdStr);
        
        return {
          id: tenantIdStr,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo || null,
          description: tenant.description || '',
          commissionPercent: tenant.defaultCommission || 12,
          productsCount: productCountMap.get(tenantIdStr) || 0,
          isJoined: connectionStatus === 'active',
          isPending: connectionStatus === 'pending',
          wasBlocked: connectionStatus === 'blocked',
          canJoin: !connectionStatus || connectionStatus === 'left',
        };
      });

    return NextResponse.json({ ok: true, businesses });
  } catch (err) {
    console.error('AGENT_MARKETPLACE_GET_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
