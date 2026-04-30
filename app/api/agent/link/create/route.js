import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { requireAuthApi } from '@/lib/auth/server';
import { getTenantIdOrThrow, withTenant } from '@/lib/tenantGuard';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';

function buildProductQuery(id) {
  const normalizedId = typeof id === 'string' ? id.trim() : '';
  if (!normalizedId) return null;

  const conditions = [];
  if (ObjectId.isValid(normalizedId)) {
    conditions.push({ _id: new ObjectId(normalizedId) });
  }
  conditions.push({ legacyId: normalizedId });
  conditions.push({ 'seo.slug': normalizedId.toLowerCase() });

  return conditions.length === 1 ? conditions[0] : { $or: conditions };
}

/**
 * POST /api/agent/link/create
 * Create a unique referral link for an agent
 * Body: { agentId, productId (optional) }
 */
async function POSTHandler(req) {
  try {
    const body = await req.json();
    const { agentId, productId } = body;

    if (!agentId) {
      return NextResponse.json({ ok: false, error: 'agentId required' }, { status: 400 });
    }

    let user;
    try {
      user = await requireAuthApi(req);
    } catch (err) {
      const status = err?.status || 401;
      const error = status === 401 ? 'unauthorized' : 'forbidden';
      return NextResponse.json({ ok: false, error }, { status });
    }

    let tenantObjectId;
    try {
      tenantObjectId = getTenantIdOrThrow(user);
    } catch {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Verify agent exists
    const agent = await users.findOne(
      withTenant({ _id: new ObjectId(agentId), role: 'agent' }, tenantObjectId),
      { projection: { _id: 1, fullName: 1, email: 1 } },
    );

    if (!agent) {
      return NextResponse.json({ ok: false, error: 'agent not found' }, { status: 404 });
    }

    // Generate referral link
    const baseUrl = (process.env.PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
    let refLink = `${baseUrl}/?ref=${encodeURIComponent(agentId)}`;

    // If productId provided, add it to the link
    if (productId) {
      let productDoc = null;
      try {
        const products = db.collection('products');
        const query = buildProductQuery(productId);
        if (query) {
          productDoc = await products.findOne(query, { projection: { _id: 1, legacyId: 1, seo: 1 } });
        }
      } catch (err) {
        console.warn('AGENT_LINK_CREATE_PRODUCT_LOOKUP_FAILED', productId, err?.message);
      }

      const fallbackProduct = { _id: encodeURIComponent(String(productId)) };
      const productPath = getProductPublicPath(productDoc || fallbackProduct);
      refLink = `${baseUrl}${productPath}?ref=${encodeURIComponent(agentId)}`;
    }

    return NextResponse.json({
      ok: true,
      agentId: String(agent._id),
      agentName: agent.fullName,
      refLink,
      shortCode: String(agent._id).substring(0, 8), // Short code for display
    });
  } catch (error) {
    console.error('AGENT_LINK_CREATE_ERROR:', error);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
