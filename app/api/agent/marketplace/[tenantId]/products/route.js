export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';

/**
 * GET /api/agent/marketplace/[tenantId]/products
 * Get all products for a specific business
 */
export async function GET(req, { params }) {
  try {
    let user;
    try {
      user = await requireAuthApi(req);
    } catch (authErr) {
      return NextResponse.json({ error: 'לא מחובר - נא להתחבר למערכת' }, { status: 401 });
    }
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = params;
    
    if (!tenantId || !ObjectId.isValid(tenantId)) {
      return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
    }

    const db = await getDb();
    const tenantObjId = new ObjectId(tenantId);

    // Get tenant info
    const tenant = await db.collection('tenants').findOne(
      { _id: tenantObjId },
      { projection: { name: 1, slug: 1, defaultCommission: 1, agentSettings: 1 } }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'עסק לא נמצא' }, { status: 404 });
    }

    // Get products for this tenant (support both ObjectId and string format)
    const products = await db.collection('products')
      .find({ 
        $or: [
          { tenantId: tenantObjId },
          { tenantId: tenantId } // string format
        ],
        status: 'published'
      })
      .project({
        name: 1,
        description: 1,
        price: 1,
        images: 1,
        category: 1,
        stockCount: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const commissionPercent = tenant.agentSettings?.defaultCommissionPercent || tenant.defaultCommission || 12;

    return NextResponse.json({ 
      ok: true, 
      products,
      business: {
        id: tenantId,
        name: tenant.name,
        slug: tenant.slug,
        commissionPercent,
      }
    });
  } catch (err) {
    console.error('MARKETPLACE_PRODUCTS_GET_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
